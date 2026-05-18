import { fsRead, fsWrite, listFiles } from "../../tools";

export interface FrontendNormalizationResult {
  changedFiles: string[];
  notes: string[];
}

export interface FrontendConvergenceCluster {
  key: string;
  title: string;
  description: string;
  files: string[];
}

export interface FrontendApiClientUniquenessResult {
  /** Canonical client path detected (or null when scaffold is missing). */
  canonical: string | null;
  /** Parallel apiClient files that survived the preflight normalizer. */
  parallelClients: string[];
  /** Human-readable findings for the LLM prompt / repair log. */
  findings: string[];
}

export async function normalizeFrontendHookSignatures(
  outputDir: string,
): Promise<FrontendNormalizationResult> {
  const changedFiles: string[] = [];
  const notes: string[] = [];
  const sourceRoots = ["frontend/src", "apps/web/src"];

  for (const root of sourceRoots) {
    let files: string[] = [];
    try {
      files = (await listFiles(root, outputDir)).filter((file) =>
        /\.(ts|tsx)$/.test(file),
      );
    } catch {
      continue;
    }

    for (const relPath of files) {
      const content = await fsRead(relPath, outputDir);
      if (
        content.startsWith("FILE_NOT_FOUND") ||
        content.startsWith("REJECTED")
      ) {
        continue;
      }

      let updated = content;
      updated = updated.replace(
        /useEffect\(\(\):\s*void\s*=>/g,
        "useEffect(() =>",
      );
      updated = updated.replace(
        /useLayoutEffect\(\(\):\s*void\s*=>/g,
        "useLayoutEffect(() =>",
      );

      if (updated !== content) {
        await fsWrite(relPath, updated, outputDir);
        changedFiles.push(relPath);
      }
    }
  }

  if (changedFiles.length > 0) {
    notes.push(
      `Frontend hook signature normalizer updated ${changedFiles.length} file(s): ${changedFiles.slice(0, 8).join(", ")}${changedFiles.length > 8 ? " ..." : ""}`,
    );
  }

  return { changedFiles, notes };
}

export async function normalizeFrontendJsxElementAnnotations(
  outputDir: string,
): Promise<FrontendNormalizationResult> {
  const changedFiles: string[] = [];
  const notes: string[] = [];
  const sourceRoots = ["frontend/src", "apps/web/src"];

  for (const root of sourceRoots) {
    let files: string[] = [];
    try {
      files = (await listFiles(root, outputDir)).filter((file) =>
        /\.(ts|tsx)$/.test(file),
      );
    } catch {
      continue;
    }

    for (const relPath of files) {
      const content = await fsRead(relPath, outputDir);
      if (
        content.startsWith("FILE_NOT_FOUND") ||
        content.startsWith("REJECTED")
      ) {
        continue;
      }

      const updated = content.replace(
        /(?<!React\.)\bJSX\.Element\b/g,
        "React.JSX.Element",
      );

      if (updated !== content) {
        await fsWrite(relPath, updated, outputDir);
        changedFiles.push(relPath);
      }
    }
  }

  if (changedFiles.length > 0) {
    notes.push(
      `Frontend JSX return-type normalizer updated ${changedFiles.length} file(s): ${changedFiles.slice(0, 8).join(", ")}${changedFiles.length > 8 ? " ..." : ""}`,
    );
  }

  return { changedFiles, notes };
}

export async function normalizeFrontendReactComponentTemplates(
  outputDir: string,
): Promise<FrontendNormalizationResult> {
  const changedFiles: string[] = [];
  const notes: string[] = [];
  const sourceRoots = ["frontend/src", "apps/web/src"];

  for (const root of sourceRoots) {
    let files: string[] = [];
    try {
      files = (await listFiles(root, outputDir)).filter((file) =>
        /\.tsx$/.test(file),
      );
    } catch {
      continue;
    }

    for (const relPath of files) {
      const content = await fsRead(relPath, outputDir);
      if (
        content.startsWith("FILE_NOT_FOUND") ||
        content.startsWith("REJECTED")
      ) {
        continue;
      }

      let updated = content;
      updated = updated.replace(/\)\s*:\s*React\.JSX\.Element\s*\{/g, ") {");
      updated = updated.replace(/\)\s*:\s*JSX\.Element\s*\{/g, ") {");
      updated = updated.replace(/\)\s*:\s*React\.JSX\.Element\s*=>/g, ") =>");
      updated = updated.replace(/\)\s*:\s*JSX\.Element\s*=>/g, ") =>");

      if (!updated.includes("React.")) {
        updated = updated.replace(
          /^import React,\s*\{([^}]*)\}\s*from\s*["']react["'];?\n?/m,
          (_match, imports: string) =>
            imports.trim().length > 0
              ? `import {${imports}} from "react";\n`
              : "",
        );
        updated = updated.replace(/^import React from ["']react["'];?\n?/m, "");
      }

      if (updated !== content) {
        await fsWrite(relPath, updated, outputDir);
        changedFiles.push(relPath);
      }
    }
  }

  if (changedFiles.length > 0) {
    notes.push(
      `Frontend React component-template normalizer updated ${changedFiles.length} file(s): ${changedFiles.slice(0, 8).join(", ")}${changedFiles.length > 8 ? " ..." : ""}`,
    );
  }

  return { changedFiles, notes };
}

export async function normalizeFrontendAuthDtoAliases(
  outputDir: string,
): Promise<FrontendNormalizationResult> {
  const changedFiles: string[] = [];
  const notes: string[] = [];
  const candidatePaths = [
    "frontend/src/types/api.ts",
    "apps/web/src/types/api.ts",
  ];

  for (const relPath of candidatePaths) {
    const content = await fsRead(relPath, outputDir);
    if (
      content.startsWith("FILE_NOT_FOUND") ||
      content.startsWith("REJECTED")
    ) {
      continue;
    }

    if (
      !content.includes("export type MeResponseDto = User;") &&
      !content.includes("export type UpdateMeResponseDto = User;")
    ) {
      continue;
    }

    let updated = content;
    const authUserDtoBlock = `export type AuthUserDto = Pick<User, "id" | "name" | "email" | "avatar" | "timezone"> &\n  Partial<Pick<User, "notificationPreferences" | "createdAt" | "updatedAt">>;\n\n`;
    if (!updated.includes("export type AuthUserDto =")) {
      if (updated.includes("export interface AuthResponseDto {")) {
        updated = updated.replace(
          "export interface AuthResponseDto {\n",
          `${authUserDtoBlock}export interface AuthResponseDto {\n`,
        );
      } else {
        updated = `${authUserDtoBlock}${updated}`;
      }
    }
    updated = updated.replace(
      /user:\s*Pick<User,\s*"id"\s*\|\s*"name"\s*\|\s*"email"\s*\|\s*"avatar"\s*\|\s*"timezone">;/g,
      "user: AuthUserDto;",
    );
    updated = updated.replace(
      "export type MeResponseDto = User;",
      "export type MeResponseDto = AuthUserDto;",
    );
    updated = updated.replace(
      "export type UpdateMeResponseDto = User;",
      "export type UpdateMeResponseDto = AuthUserDto;",
    );

    if (updated !== content) {
      await fsWrite(relPath, updated, outputDir);
      changedFiles.push(relPath);
    }
  }

  if (changedFiles.length > 0) {
    notes.push(
      `Frontend auth DTO normalizer updated ${changedFiles.length} file(s): ${changedFiles.join(", ")}`,
    );
  }

  return { changedFiles, notes };
}

export async function normalizeFrontendUseFormHook(
  outputDir: string,
): Promise<FrontendNormalizationResult> {
  const changedFiles: string[] = [];
  const notes: string[] = [];
  const candidatePaths = [
    "frontend/src/hooks/useForm.ts",
    "apps/web/src/hooks/useForm.ts",
  ];

  for (const relPath of candidatePaths) {
    const content = await fsRead(relPath, outputDir);
    if (
      content.startsWith("FILE_NOT_FOUND") ||
      content.startsWith("REJECTED")
    ) {
      continue;
    }

    let updated = content;
    updated = updated.replace(
      "type FormValues = Record<string, string>;",
      "type FormValues = Record<string, unknown>;",
    );
    updated = updated.replace(
      "const maybeError: string | undefined = validator(values[key], values);",
      'const maybeError: string | undefined = validator(String(values[key] ?? ""), values);',
    );
    updated = updated.replace(
      "const message: string | undefined = validator(values[field], values);",
      'const message: string | undefined = validator(String(values[field] ?? ""), values);',
    );

    if (updated !== content) {
      await fsWrite(relPath, updated, outputDir);
      changedFiles.push(relPath);
    }
  }

  if (changedFiles.length > 0) {
    notes.push(
      `Frontend form-hook normalizer updated ${changedFiles.length} file(s): ${changedFiles.join(", ")}`,
    );
  }

  return { changedFiles, notes };
}

/**
 * Frontend duplicate-apiClient convergence.
 *
 * The scaffold ships exactly one canonical client at
 * `frontend/src/api/client.ts`. LLM-generated code repeatedly creates a
 * second one at `frontend/src/utils/apiClient.ts` (or `utils/api.ts` /
 * `lib/http.ts`), then half the feature files import from each — driving
 * the "frontend shared API surface mismatch" cluster that stalls
 * `integration_verify_fix` for many iterations.
 *
 * This normalizer:
 *   1. Detects parallel client files in known anti-pattern locations.
 *   2. Rewrites imports of those parallel clients to point at the
 *      canonical `@/api/client` (or relative equivalent).
 *   3. Deletes the parallel client file once no consumer references it.
 */
export async function normalizeFrontendDuplicateApiClient(
  outputDir: string,
): Promise<FrontendNormalizationResult> {
  const changedFiles: string[] = [];
  const notes: string[] = [];

  const canonicalCandidates = [
    "frontend/src/api/client.ts",
    "apps/web/src/api/client.ts",
  ];
  let canonicalRoot: string | null = null;
  for (const candidate of canonicalCandidates) {
    const content = await fsRead(candidate, outputDir);
    if (
      !content.startsWith("FILE_NOT_FOUND") &&
      !content.startsWith("REJECTED") &&
      /export\s+(?:const|function)\s+apiClient\b/.test(content)
    ) {
      canonicalRoot = candidate.startsWith("apps/web/")
        ? "apps/web/src"
        : "frontend/src";
      break;
    }
  }
  if (!canonicalRoot) {
    return { changedFiles, notes };
  }

  const parallelRelPaths = [
    `${canonicalRoot}/utils/apiClient.ts`,
    `${canonicalRoot}/utils/api.ts`,
    `${canonicalRoot}/utils/http.ts`,
    `${canonicalRoot}/lib/http.ts`,
    `${canonicalRoot}/lib/apiClient.ts`,
    `${canonicalRoot}/services/http.ts`,
    `${canonicalRoot}/services/apiClient.ts`,
  ];
  const parallels: string[] = [];
  for (const relPath of parallelRelPaths) {
    const content = await fsRead(relPath, outputDir);
    if (
      content.startsWith("FILE_NOT_FOUND") ||
      content.startsWith("REJECTED")
    ) {
      continue;
    }
    if (
      /export\s+(?:const|class|function|default)\s+\w*[Aa]pi\w*/.test(content)
    ) {
      parallels.push(relPath);
    }
  }
  if (parallels.length === 0) {
    return { changedFiles, notes };
  }

  // Rewrite imports across the entire frontend tree.
  const sourceFiles = (await listFiles(canonicalRoot, outputDir)).filter(
    (file) => /\.(ts|tsx)$/.test(file),
  );

  const importRewrites: Array<{ from: RegExp; to: string }> = [
    // Examples we want to neutralise:
    //   import { apiClient } from "../utils/apiClient";
    //   import { ApiClient } from "@/utils/apiClient";
    //   import apiClient from "../../utils/apiClient";
    {
      from: /from\s+["'](?:\.{1,2}\/)+utils\/apiClient["']/g,
      to: 'from "../api/client"',
    },
    {
      from: /from\s+["'](?:\.{1,2}\/)+utils\/api["']/g,
      to: 'from "../api/client"',
    },
    {
      from: /from\s+["']@\/utils\/apiClient["']/g,
      to: 'from "@/api/client"',
    },
    {
      from: /from\s+["']@\/utils\/api["']/g,
      to: 'from "@/api/client"',
    },
    {
      from: /from\s+["'](?:\.{1,2}\/)+lib\/http["']/g,
      to: 'from "../api/client"',
    },
    {
      from: /from\s+["']@\/lib\/http["']/g,
      to: 'from "@/api/client"',
    },
    {
      from: /from\s+["'](?:\.{1,2}\/)+services\/http["']/g,
      to: 'from "../api/client"',
    },
  ];

  for (const relPath of sourceFiles) {
    if (parallels.includes(relPath)) continue;
    const content = await fsRead(relPath, outputDir);
    if (
      content.startsWith("FILE_NOT_FOUND") ||
      content.startsWith("REJECTED")
    ) {
      continue;
    }
    let updated = content;
    for (const rule of importRewrites) {
      updated = updated.replace(rule.from, rule.to);
    }
    if (updated !== content) {
      await fsWrite(relPath, updated, outputDir);
      changedFiles.push(relPath);
    }
  }

  // Replace each parallel client with a thin re-export so any stale import
  // we did not rewrite still resolves to the canonical instance instead of
  // diverging behaviour.
  for (const parallel of parallels) {
    const reexport = `// Auto-converged by AgenticBuilder preflight normalizer.\n// This file used to define a parallel HTTP client. The canonical client\n// lives at \`frontend/src/api/client.ts\` (re-exported via \`@/api/client\`).\nexport * from "../api/client";\n`;
    await fsWrite(parallel, reexport, outputDir);
    changedFiles.push(parallel);
  }

  if (changedFiles.length > 0) {
    notes.push(
      `Frontend duplicate-apiClient normalizer collapsed ${parallels.length} parallel client(s) and rewrote ${changedFiles.length - parallels.length} consumer import(s).`,
    );
  }

  return { changedFiles, notes };
}

/**
 * Hard-fail audit: there must be exactly ONE HTTP client in the frontend
 * after preflight runs. The preflight normalizer collapses duplicates by
 * rewriting the parallel file to a re-export — this audit treats anything
 * that *defines* a new fetch wrapper, axios instance, or class with the
 * `Api` substring under `utils/`, `lib/`, or `services/` as a regression.
 *
 * Wired as a hard-fail at the final integration gate so coding sessions
 * cannot ship two clients silently again.
 */
export async function auditFrontendApiClientUniqueness(
  outputDir: string,
): Promise<FrontendApiClientUniquenessResult> {
  const empty: FrontendApiClientUniquenessResult = {
    canonical: null,
    parallelClients: [],
    findings: [],
  };

  const canonicalCandidates = [
    "frontend/src/api/client.ts",
    "apps/web/src/api/client.ts",
  ];
  let canonical: string | null = null;
  for (const candidate of canonicalCandidates) {
    const content = await fsRead(candidate, outputDir);
    if (
      !content.startsWith("FILE_NOT_FOUND") &&
      !content.startsWith("REJECTED") &&
      /export\s+(?:const|function)\s+apiClient\b/.test(content)
    ) {
      canonical = candidate;
      break;
    }
  }
  if (!canonical) return empty;

  const root = canonical.startsWith("apps/web/")
    ? "apps/web/src"
    : "frontend/src";
  const suspectPaths = [
    `${root}/utils/apiClient.ts`,
    `${root}/utils/api.ts`,
    `${root}/utils/http.ts`,
    `${root}/lib/http.ts`,
    `${root}/lib/apiClient.ts`,
    `${root}/services/http.ts`,
    `${root}/services/apiClient.ts`,
  ];

  const parallelClients: string[] = [];
  for (const rel of suspectPaths) {
    const content = await fsRead(rel, outputDir);
    if (
      content.startsWith("FILE_NOT_FOUND") ||
      content.startsWith("REJECTED")
    ) {
      continue;
    }
    // After preflight, the parallel file should be a thin re-export. Anything
    // that still declares its own `apiClient`/`ApiClient` class/const, or
    // creates an axios/fetch instance, is a real divergence.
    const reexportOnly =
      /export\s+\*\s+from\s+["']\.\.\/api\/client["']/.test(content) &&
      !/export\s+(?:const|class|function|default)\s+\w*[Aa]pi\w*/.test(
        content.replace(
          /export\s+\*\s+from\s+["']\.\.\/api\/client["'];?\s*\n?/g,
          "",
        ),
      );
    if (reexportOnly) continue;
    if (
      /export\s+(?:const|class|function|default)\s+\w*[Aa]pi\w*/.test(
        content,
      ) ||
      /axios\.create\s*\(/.test(content) ||
      /class\s+\w*[Aa]pi\w*Client\b/.test(content)
    ) {
      parallelClients.push(rel);
    }
  }

  const findings: string[] = [];
  if (parallelClients.length > 0) {
    findings.push(
      "## Frontend API client uniqueness violation",
      `Canonical client: ${canonical}`,
      "Parallel HTTP client(s) still defining their own \`apiClient\` / \`axios.create\` / \`ApiClient\` class:",
      ...parallelClients.map((p) => `- ${p}`),
      'Resolution: delete or convert these files to \`export * from "../api/client"\` and update every consumer to import from the canonical path.',
    );
  }

  return {
    canonical,
    parallelClients,
    findings,
  };
}

/**
 * `Error(message, e)` → `Error(message, { cause: e })` rewrite.
 *
 * The two-arg `Error(message, cause)` signature is invalid TypeScript and
 * fires `TS2554`/`TS2345` across multiple frontend files in every recent
 * generation. The fix is mechanical: detect `throw new Error(<msg>, <ident>)`
 * patterns where the second arg is a plain identifier (typical catch-binding)
 * and convert it to the `{ cause: ident }` options form.
 */
export async function normalizeFrontendErrorWithCause(
  outputDir: string,
): Promise<FrontendNormalizationResult> {
  const changedFiles: string[] = [];
  const notes: string[] = [];
  const sourceRoots = ["frontend/src", "apps/web/src"];

  const pattern =
    /throw\s+new\s+Error\s*\(\s*([^,()]+?)\s*,\s*([A-Za-z_$][\w$]*)\s*\)/g;

  for (const root of sourceRoots) {
    let files: string[] = [];
    try {
      files = (await listFiles(root, outputDir)).filter((file) =>
        /\.(ts|tsx)$/.test(file),
      );
    } catch {
      continue;
    }
    for (const rel of files) {
      const content = await fsRead(rel, outputDir);
      if (
        content.startsWith("FILE_NOT_FOUND") ||
        content.startsWith("REJECTED")
      ) {
        continue;
      }
      const updated = content.replace(
        pattern,
        (_m, msg: string, ident: string) =>
          `throw new Error(${msg.trim()}, { cause: ${ident} })`,
      );
      if (updated !== content) {
        await fsWrite(rel, updated, outputDir);
        changedFiles.push(rel);
      }
    }
  }

  if (changedFiles.length > 0) {
    notes.push(
      `Frontend Error(cause) normalizer rewrote ${changedFiles.length} file(s): ${changedFiles.slice(0, 8).join(", ")}${changedFiles.length > 8 ? " ..." : ""}`,
    );
  }

  return { changedFiles, notes };
}

export async function detectFrontendConvergenceClusters(
  outputDir: string,
): Promise<FrontendConvergenceCluster[]> {
  const clusters: FrontendConvergenceCluster[] = [];
  const sourceRoots = ["frontend/src", "apps/web/src"];
  const frontendFiles = (
    await Promise.all(
      sourceRoots.map(async (root) => {
        try {
          return await listFiles(root, outputDir);
        } catch {
          return [];
        }
      }),
    )
  ).flat();

  const hookSignatureFiles: string[] = [];
  for (const relPath of frontendFiles.filter((file) =>
    /\.(ts|tsx)$/.test(file),
  )) {
    const content = await fsRead(relPath, outputDir);
    if (
      content.startsWith("FILE_NOT_FOUND") ||
      content.startsWith("REJECTED")
    ) {
      continue;
    }
    if (
      content.includes("useEffect((): void =>") ||
      content.includes("useLayoutEffect((): void =>")
    ) {
      hookSignatureFiles.push(relPath);
    }
  }
  if (hookSignatureFiles.length > 0) {
    clusters.push({
      key: "hook_signature",
      title: "React hook callback signature mismatch",
      description:
        "Some React hook callbacks are annotated with explicit `: void` return types even though they return cleanup functions. Normalize the hook callback signature before fixing per-file logic.",
      files: hookSignatureFiles.slice(0, 12),
    });
  }

  const jsxAnnotationFiles: string[] = [];
  for (const relPath of frontendFiles.filter((file) =>
    /\.(ts|tsx)$/.test(file),
  )) {
    const content = await fsRead(relPath, outputDir);
    if (
      content.startsWith("FILE_NOT_FOUND") ||
      content.startsWith("REJECTED")
    ) {
      continue;
    }
    if (/(?<!React\.)\bJSX\.Element\b/.test(content)) {
      jsxAnnotationFiles.push(relPath);
    }
  }
  if (jsxAnnotationFiles.length > 0) {
    clusters.push({
      key: "jsx_namespace_annotation",
      title: "React JSX namespace annotation mismatch",
      description:
        "Generated frontend files still use bare `JSX.Element` return types. Normalize this shared pattern across the cluster by preferring inferred return types or rewriting to `React.JSX.Element` consistently.",
      files: jsxAnnotationFiles.slice(0, 12),
    });
  }

  const reactTemplateResidualFiles: string[] = [];
  for (const relPath of frontendFiles.filter((file) => /\.tsx$/.test(file))) {
    const content = await fsRead(relPath, outputDir);
    if (
      content.startsWith("FILE_NOT_FOUND") ||
      content.startsWith("REJECTED")
    ) {
      continue;
    }
    if (
      /^import React from ["']react["'];?$/m.test(content) ||
      /^import React,\s*\{[^}]+\}\s*from ["']react["'];?$/m.test(content) ||
      /\)\s*:\s*React\.JSX\.Element\s*(\{|=>)/.test(content)
    ) {
      reactTemplateResidualFiles.push(relPath);
    }
  }
  if (reactTemplateResidualFiles.length > 0) {
    clusters.push({
      key: "react_component_template_residuals",
      title: "React component template residuals",
      description:
        "Some frontend files still carry template-style explicit component return types or default `React` imports that are no longer needed under the current JSX runtime. Normalize the shared template first, then fix any remaining leaf-file typing issues.",
      files: reactTemplateResidualFiles.slice(0, 12),
    });
  }

  const useFormCandidates = await Promise.all(
    ["frontend/src/hooks/useForm.ts", "apps/web/src/hooks/useForm.ts"].map(
      async (filePath) => ({
        filePath,
        content: await fsRead(filePath, outputDir),
      }),
    ),
  );
  const useFormCandidate = useFormCandidates.find(
    (entry) =>
      !entry.content.startsWith("FILE_NOT_FOUND") &&
      !entry.content.startsWith("REJECTED"),
  );
  if (
    useFormCandidate &&
    useFormCandidate.content.includes(
      "type FormValues = Record<string, string>;",
    )
  ) {
    const formConsumerFiles: string[] = [];
    for (const relPath of frontendFiles.filter((file) =>
      /\.(ts|tsx)$/.test(file),
    )) {
      const content = await fsRead(relPath, outputDir);
      if (
        content.startsWith("FILE_NOT_FOUND") ||
        content.startsWith("REJECTED")
      ) {
        continue;
      }
      if (/useForm<\w+>/.test(content)) {
        formConsumerFiles.push(relPath);
      }
    }
    clusters.push({
      key: "form_hook_compatibility",
      title: "Form hook generic incompatibility",
      description:
        "The shared `useForm` hook is narrower than the generated page form interfaces. Repair the hook abstraction first so page-level form interfaces no longer need index signatures.",
      files: [useFormCandidate.filePath, ...formConsumerFiles.slice(0, 8)],
    });
  }

  const modelsPath = useFormCandidate?.filePath.startsWith("apps/web/")
    ? "apps/web/src/types/models.ts"
    : "frontend/src/types/models.ts";
  const projectMembersPath = useFormCandidate?.filePath.startsWith("apps/web/")
    ? "apps/web/src/components/Projects/ProjectMembersList.tsx"
    : "frontend/src/components/Projects/ProjectMembersList.tsx";
  const apiTypesPath = useFormCandidate?.filePath.startsWith("apps/web/")
    ? "apps/web/src/types/api.ts"
    : "frontend/src/types/api.ts";
  const modelsContent = await fsRead(modelsPath, outputDir);
  const projectMembersContent = await fsRead(projectMembersPath, outputDir);
  const apiTypesContent = await fsRead(apiTypesPath, outputDir);
  if (
    !apiTypesContent.startsWith("FILE_NOT_FOUND") &&
    (/export type MeResponseDto = User;/.test(apiTypesContent) ||
      /export type UpdateMeResponseDto = User;/.test(apiTypesContent))
  ) {
    clusters.push({
      key: "auth_dto_alias_leakage",
      title: "Auth DTO aliases leak model-only fields",
      description:
        "Frontend auth/session DTOs are aliased directly to `User`, which leaks persistence-model unions into UI and auth flows. Replace those aliases with a dedicated auth DTO shape and update all consuming types consistently.",
      files: [apiTypesPath, modelsPath],
    });
  }
  if (
    !modelsContent.startsWith("FILE_NOT_FOUND") &&
    !projectMembersContent.startsWith("FILE_NOT_FOUND") &&
    modelsContent.includes("user?: ProjectMemberUserRef;") &&
    /\.user\./.test(projectMembersContent)
  ) {
    clusters.push({
      key: "dto_ui_consistency",
      title: "DTO / UI optionality mismatch",
      description:
        "Frontend DTOs mark project member `user` as optional, but the consuming UI dereferences it as required. Decide whether the DTO should be required or the UI must guard against missing relations, then fix the cluster consistently.",
      files: [modelsPath, apiTypesPath, projectMembersPath],
    });
  }

  return clusters;
}
