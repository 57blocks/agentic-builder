const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");

const isDev = process.env.NODE_ENV !== "production";

// ── Parallel-instance support ────────────────────────────────────────────
// Two parallel codegen projects launch two Electron instances. Each one
// reads:
//   BUILDER_DEV_URL          — Next.js dev server URL (default :3000)
//   BUILDER_INSTANCE_LABEL   — short tag prefixed in the window title
// Pair this with `--user-data-dir=...` (passed on the electron CLI) to
// keep cookies / localStorage / cache fully partitioned between the two
// instances. See `scripts/start-parallel-dev.sh --electron` for the
// canonical invocation.
const DEV_URL = (process.env.BUILDER_DEV_URL ?? "http://localhost:3000").trim();
const INSTANCE_LABEL = (process.env.BUILDER_INSTANCE_LABEL ?? "").trim();

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: "#ffffff",
    titleBarStyle: "hiddenInset",
    title: INSTANCE_LABEL
      ? `Agentic Builder · ${INSTANCE_LABEL}`
      : "Agentic Builder",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL(DEV_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../out/index.html"));
  }

  return mainWindow;
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

ipcMain.handle("get-platform", () => process.platform);
ipcMain.handle("get-app-version", () => app.getVersion());

ipcMain.handle("select-folder", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ["openDirectory", "createDirectory"],
    title: "Select project directory",
    buttonLabel: "Select Folder",
  });
  return canceled ? null : filePaths[0];
});

// ── Reference-URL render capture ───────────────────────────────────────────
// Render an arbitrary URL in a hidden, sandboxed window so client-side-rendered
// SPAs produce real design signal. Returns a full-page screenshot (JPEG data
// URL via CDP captureBeyondViewport) plus CSS tokens scraped from the rendered
// page.
//
// Auth handling: the capture stays HIDDEN for public pages. Only when a login
// wall is detected (password field present, or the URL matches a login pattern)
// does the SAME window become visible so the user can sign in; we then poll
// until login resolves, re-navigate to the target, and capture silently. The
// session is PERSISTENT (`persist:agentic-refcap`), so a given site only needs
// to be logged into once — subsequent captures take the silent path.
const RENDER_TIMEOUT_MS = 20_000;
const CAPTURE_TIMEOUT_MS = 15_000;
const POST_LOAD_DELAY_MS = 2_500;
const SHOT_WIDTH = 1_440;
const MAX_SHOT_HEIGHT = 6_000;
const LOGIN_WAIT_TIMEOUT_MS = 5 * 60_000;
const LOGIN_POLL_INTERVAL_MS = 1_500;
const CAPTURE_PARTITION = "persist:agentic-refcap";
const LOGIN_URL_PATTERN = /\b(login|log-in|signin|sign-in|sso|oauth|authenticate|auth\/|account\/login)\b/i;

// Set while a capture is waiting on interactive login; invoked when the renderer
// presses the manual "I've logged in — capture now" fallback button.
let manualCaptureResolve = null;

const TOKEN_EXTRACT_SCRIPT = `(() => {
  const vars = {};
  for (const sheet of Array.from(document.styleSheets)) {
    let rules;
    try { rules = sheet.cssRules; } catch (e) { continue; } // cross-origin sheet: skip
    if (!rules) continue;
    for (const rule of Array.from(rules)) {
      if (!rule.style) continue;
      for (const prop of Array.from(rule.style)) {
        if (prop.startsWith('--')) vars[prop] = rule.style.getPropertyValue(prop).trim();
      }
    }
  }
  const b = getComputedStyle(document.body);
  return JSON.stringify({
    cssVars: vars,
    fontFamily: b.fontFamily,
    backgroundColor: b.backgroundColor,
    color: b.color,
  });
})()`;

// Returns { hasPassword, href } from the live page.
const DETECT_LOGIN_SCRIPT = `(() => JSON.stringify({
  hasPassword: !!document.querySelector('input[type="password"]'),
  href: location.href,
}))()`;

function isValidHttpUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** A page looks like a login wall if it has a password field or an auth-like URL. */
function looksLikeLogin(href, hasPassword) {
  return Boolean(hasPassword) || LOGIN_URL_PATTERN.test(href || "");
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Race a promise against a cancelable timeout (avoids dangling rejected timers). */
function withTimeout(promise, ms, message) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([
    Promise.resolve(promise).finally(() => clearTimeout(timer)),
    timeout,
  ]);
}

/** Best-effort login detection on the currently-loaded page. */
async function detectLogin(win) {
  try {
    const json = await win.webContents.executeJavaScript(DETECT_LOGIN_SCRIPT, true);
    const { hasPassword, href } = JSON.parse(json);
    return looksLikeLogin(href, hasPassword);
  } catch {
    return false; // navigation in flight / unreadable — assume not a login wall
  }
}

/**
 * Poll a now-visible window until the user has signed in (no password field and
 * URL no longer matches the login pattern). Resolves { ok } or a failure reason
 * if the user closes the window or the wait times out.
 */
function waitForLogin(win) {
  return new Promise((resolve) => {
    const deadline = Date.now() + LOGIN_WAIT_TIMEOUT_MS;
    let done = false;
    const finish = (value) => {
      if (done) return;
      done = true;
      clearInterval(timer);
      manualCaptureResolve = null;
      try { win.removeListener("closed", onClosed); } catch { /* noop */ }
      resolve(value);
    };
    const onClosed = () => finish({ ok: false, reason: "closed" });
    win.once("closed", onClosed);
    // Manual fallback: renderer button forces capture even if auto-detection
    // hasn't flipped (e.g. a residual password field on the landing page).
    manualCaptureResolve = () => finish({ ok: true, manual: true });
    const timer = setInterval(async () => {
      if (done) return;
      if (win.isDestroyed()) return finish({ ok: false, reason: "closed" });
      if (Date.now() > deadline) return finish({ ok: false, reason: "timeout" });
      if (!(await detectLogin(win))) finish({ ok: true });
    }, LOGIN_POLL_INTERVAL_MS);
  });
}

async function captureReferenceUrl(url, sender) {
  if (!isValidHttpUrl(url)) {
    return { ok: false, error: "A valid http(s) URL is required" };
  }
  const notify = (channel) => {
    try {
      if (sender && !sender.isDestroyed()) sender.send(channel);
    } catch { /* renderer gone */ }
  };

  const win = new BrowserWindow({
    show: false,
    width: SHOT_WIDTH,
    height: 1024,
    title: "Capturing reference page · Agentic Builder",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      images: true,
      // Persistent session so an authenticated site only needs login once.
      partition: CAPTURE_PARTITION,
    },
  });
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));

  const dbg = win.webContents.debugger;
  let attached = false;
  try {
    await withTimeout(win.loadURL(url), RENDER_TIMEOUT_MS, "Render timed out after 20s");

    // Give client-side frameworks time to hydrate / fetch data.
    await delay(POST_LOAD_DELAY_MS);

    // If we hit a login wall, reveal the window for interactive sign-in, then
    // re-navigate to the intended target once authenticated.
    if (await detectLogin(win)) {
      win.setTitle("Sign in to capture this reference page · Agentic Builder");
      win.show();
      win.focus();
      // Tell the renderer to surface the manual "capture now" fallback button.
      notify("reference-url:login-needed");
      const result = await waitForLogin(win);
      if (!result.ok) {
        return {
          ok: false,
          needsAuth: true,
          error:
            result.reason === "timeout"
              ? "Login timed out — please try again."
              : "Login window was closed before sign-in completed.",
        };
      }
      // Re-navigate to the intended target now that we have a session. The
      // window stays VISIBLE through capture — hiding it here can leave the
      // compositor without frames and stall Page.captureScreenshot.
      await withTimeout(win.loadURL(url), RENDER_TIMEOUT_MS, "Render timed out after 20s");
      await delay(POST_LOAD_DELAY_MS);
    }

    // Best-effort token extraction (independent of screenshot success).
    let tokens = null;
    try {
      const json = await win.webContents.executeJavaScript(TOKEN_EXTRACT_SCRIPT, true);
      tokens = JSON.parse(json);
    } catch {
      /* tokens stay null; screenshot is the primary signal */
    }

    // Full-page screenshot via the Chrome DevTools Protocol. Timeout-protected
    // so an unexpected stall can never hang the IPC (infinite spinner).
    dbg.attach("1.3");
    attached = true;
    const data = await withTimeout(
      (async () => {
        const { contentSize } = await dbg.sendCommand("Page.getLayoutMetrics");
        const height = Math.min(Math.ceil(contentSize.height) || 1024, MAX_SHOT_HEIGHT);
        const shot = await dbg.sendCommand("Page.captureScreenshot", {
          format: "jpeg",
          quality: 80,
          captureBeyondViewport: true,
          clip: { x: 0, y: 0, width: SHOT_WIDTH, height, scale: 1 },
        });
        return shot.data;
      })(),
      CAPTURE_TIMEOUT_MS,
      "Screenshot capture timed out",
    );

    return {
      ok: true,
      screenshotDataUrl: `data:image/jpeg;base64,${data}`,
      tokens,
      finalUrl: win.webContents.getURL() || url,
    };
  } catch (err) {
    console.error("[render-reference-url] capture failed:", err);
    return { ok: false, error: err instanceof Error ? err.message : "Render failed" };
  } finally {
    try {
      if (attached) dbg.detach();
    } catch {
      /* already detached */
    }
    if (!win.isDestroyed()) win.destroy();
  }
}

ipcMain.handle("render-reference-url", (event, url) =>
  captureReferenceUrl(typeof url === "string" ? url.trim() : "", event.sender),
);

// ── Project cover capture ────────────────────────────────────────────────────
// Lightweight viewport screenshot of a (typically localhost) preview URL, used
// as a project's cover/thumbnail. Unlike captureReferenceUrl this never reveals
// a window or runs the login flow — it expects a public/local page — and it
// grabs a fixed-aspect hero shot (the visible viewport, not the full scroll
// height) so it crops nicely into a card.
const COVER_WIDTH = 1_280;
const COVER_HEIGHT = 800; // 16:10 — matches the card aspect ratio

async function captureCoverUrl(url) {
  if (!isValidHttpUrl(url)) {
    return { ok: false, error: "A valid http(s) URL is required" };
  }

  const win = new BrowserWindow({
    show: false,
    width: COVER_WIDTH,
    height: COVER_HEIGHT,
    title: "Capturing project cover · Agentic Builder",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      images: true,
    },
  });
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));

  const dbg = win.webContents.debugger;
  let attached = false;
  try {
    await withTimeout(win.loadURL(url), RENDER_TIMEOUT_MS, "Render timed out after 20s");
    // Give the generated app time to hydrate / fetch initial data.
    await delay(POST_LOAD_DELAY_MS);

    dbg.attach("1.3");
    attached = true;
    const data = await withTimeout(
      dbg
        .sendCommand("Page.captureScreenshot", {
          format: "jpeg",
          quality: 72,
          captureBeyondViewport: false,
          clip: { x: 0, y: 0, width: COVER_WIDTH, height: COVER_HEIGHT, scale: 1 },
        })
        .then((shot) => shot.data),
      CAPTURE_TIMEOUT_MS,
      "Screenshot capture timed out",
    );

    return { ok: true, screenshotDataUrl: `data:image/jpeg;base64,${data}` };
  } catch (err) {
    console.error("[capture-url] cover capture failed:", err);
    return { ok: false, error: err instanceof Error ? err.message : "Capture failed" };
  } finally {
    try {
      if (attached) dbg.detach();
    } catch {
      /* already detached */
    }
    if (!win.isDestroyed()) win.destroy();
  }
}

ipcMain.handle("capture-url", (_event, url) =>
  captureCoverUrl(typeof url === "string" ? url.trim() : ""),
);

// Manual fallback trigger from the renderer: force capture during interactive
// login even if auto-detection hasn't flipped to "logged in".
ipcMain.on("reference-url:capture-now", () => {
  if (manualCaptureResolve) manualCaptureResolve();
});
