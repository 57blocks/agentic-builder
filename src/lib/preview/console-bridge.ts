import fs from "fs/promises";
import path from "path";

/**
 * Marker used to find a previously injected bridge.
 *
 * Bumping this version causes \`ensureConsoleBridgeInjected\` to strip the
 * old <script> tag and reinject the latest one. Bump whenever BRIDGE_SCRIPT
 * gains a feature the UI depends on (caller capture, error normalization,
 * etc.) so users don't have to manually edit the generated index.html.
 */
const BRIDGE_MARKER = "data-agentic-console-bridge";
const BRIDGE_VERSION = "2";
const BRIDGE_VERSION_ATTR = "data-agentic-console-bridge-version";

/** The script that runs inside the previewed Vite app. Forwards console + errors to window.parent via postMessage. */
const BRIDGE_SCRIPT = `(function(){
  if (window.__agenticConsoleBridgeInstalled) return;
  window.__agenticConsoleBridgeInstalled = true;
  var origin = "*";
  // Capture the call site of a console.* invocation. The bridge itself runs
  // as an inline <script>, so its frames don't carry a module URL with a
  // file extension. We walk the stack until we hit the first frame whose URL
  // ends in a real source extension (Vite serves them as
  // /src/App.tsx?t=...&type=...). That is the user's actual call point and
  // is exactly what Chrome devtools would show as "App.tsx:42".
  function callerFromError(err) {
    try {
      var stack = err && err.stack;
      if (!stack) return null;
      var lines = String(stack).split("\\n");
      for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        var m = line.match(
          /((?:https?|file):\\/\\/[^\\s)]*?\\.(?:tsx|ts|jsx|mjs|cjs|js))(?:[?#][^\\s)]*)?:(\\d+):(\\d+)/
        );
        if (m) {
          return { file: m[1], line: parseInt(m[2], 10), col: parseInt(m[3], 10) };
        }
      }
    } catch (e) { /* ignore */ }
    return null;
  }
  function post(type, level, args, caller) {
    try {
      var parts = [];
      for (var i = 0; i < args.length; i++) {
        var a = args[i];
        if (a instanceof Error) {
          parts.push({ kind: "error", name: a.name, message: a.message, stack: a.stack });
          continue;
        }
        var t = typeof a;
        if (t === "string" || t === "number" || t === "boolean" || a === null || a === undefined) {
          parts.push({ kind: "primitive", value: String(a) });
        } else {
          try { parts.push({ kind: "json", value: JSON.stringify(a, null, 2).slice(0, 4000) }); }
          catch (e) { parts.push({ kind: "primitive", value: Object.prototype.toString.call(a) }); }
        }
      }
      var payload = {
        source: "agentic-preview",
        type: type,
        level: level,
        ts: Date.now(),
        parts: parts,
        url: location.href,
      };
      if (caller) payload.caller = caller;
      window.parent.postMessage(payload, origin);
    } catch (e) { /* ignore */ }
  }
  var methods = ["log", "info", "warn", "error", "debug"];
  for (var i = 0; i < methods.length; i++) (function (m) {
    var orig = console[m];
    console[m] = function () {
      var caller = callerFromError(new Error());
      try { post("console", m, Array.prototype.slice.call(arguments), caller); } catch (e) {}
      if (orig) return orig.apply(console, arguments);
    };
  })(methods[i]);
  function fmtLocation(filename, lineno, colno) {
    if (!filename) return "";
    var loc = filename;
    if (lineno != null) loc += ":" + lineno;
    if (colno != null) loc += ":" + colno;
    return " @ " + loc;
  }
  function postError(type, name, message, stack, location, caller) {
    // Re-use the structured "error" part so the listener side renders these
    // exactly like \`console.error(new Error(...))\` — same color, same
    // expandable stack — instead of falling through the generic JSON branch.
    var fullMessage = (message || "(unknown error)") + (location || "");
    try {
      var payload = {
        source: "agentic-preview",
        type: type,
        level: "error",
        ts: Date.now(),
        parts: [{ kind: "error", name: name || "Error", message: fullMessage, stack: stack || null }],
        url: window.location.href,
      };
      if (caller) payload.caller = caller;
      window.parent.postMessage(payload, origin);
    } catch (e) {}
  }
  window.addEventListener("error", function (ev) {
    var loc = fmtLocation(ev.filename, ev.lineno, ev.colno);
    var stack = ev.error && ev.error.stack ? ev.error.stack : null;
    var name = ev.error && ev.error.name ? ev.error.name : "Error";
    var caller = ev.filename
      ? { file: ev.filename, line: ev.lineno || 0, col: ev.colno || 0 }
      : callerFromError(ev.error);
    postError("error", name, ev.message, stack, loc, caller);
  });
  window.addEventListener("unhandledrejection", function (ev) {
    var reason = ev.reason;
    if (reason && typeof reason === "object") {
      postError(
        "unhandledrejection",
        reason.name || "UnhandledRejection",
        reason.message || String(reason),
        reason.stack || null,
        "",
        callerFromError(reason)
      );
    } else {
      postError("unhandledrejection", "UnhandledRejection", String(reason), null, "", null);
    }
  });
  try {
    window.parent.postMessage({ source: "agentic-preview", type: "bridge_ready", ts: Date.now(), url: location.href }, origin);
  } catch (e) {}
})();`;

/** Build the <script> tag wrapper, including a marker attribute for idempotent injection. */
export function buildBridgeScriptTag(): string {
  return `<script ${BRIDGE_MARKER} ${BRIDGE_VERSION_ATTR}="${BRIDGE_VERSION}">${BRIDGE_SCRIPT}</script>`;
}

// Matches any previously-injected bridge tag (any version) so we can replace
// it wholesale instead of stacking multiple versions in the head.
const EXISTING_BRIDGE_RE = new RegExp(
  `<script\\s+${BRIDGE_MARKER}[^>]*>[\\s\\S]*?<\\/script>\\s*`,
  "i",
);

/**
 * Ensure the bridge script is injected into the index.html of an app directory.
 *
 * - If no bridge is present, the latest version is inserted before </head>.
 * - If a bridge is present but its version differs from BRIDGE_VERSION, the
 *   old tag is stripped and the new one inserted (idempotent across upgrades).
 * - If the current version is already present, this is a no-op.
 *
 * Returns true when the file was written.
 */
export async function ensureConsoleBridgeInjected(appDir: string): Promise<boolean> {
  const indexPath = path.join(appDir, "index.html");
  let html: string;
  try {
    html = await fs.readFile(indexPath, "utf-8");
  } catch {
    return false;
  }

  const expectedVersionAttr = `${BRIDGE_VERSION_ATTR}="${BRIDGE_VERSION}"`;
  if (html.includes(BRIDGE_MARKER) && html.includes(expectedVersionAttr)) {
    return false;
  }

  // Strip any older bridge tag so the file ends up with exactly one script.
  let cleaned = html.replace(EXISTING_BRIDGE_RE, "");
  const tag = buildBridgeScriptTag();
  const headClose = cleaned.indexOf("</head>");
  const updated =
    headClose >= 0
      ? cleaned.slice(0, headClose) + tag + "\n" + cleaned.slice(headClose)
      : tag + "\n" + cleaned;
  await fs.writeFile(indexPath, updated, "utf-8");
  return true;
}
