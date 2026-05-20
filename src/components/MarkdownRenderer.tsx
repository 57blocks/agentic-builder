"use client";

import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import mermaid from "mermaid";

mermaid.initialize({
  startOnLoad: false,
  theme: "default",
});

// ── Mermaid diagram renderer ──

function MermaidBlock({ code }: { code: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const id = useRef(`mermaid-${Math.random().toString(36).slice(2, 8)}`).current;

  useEffect(() => {
    let cancelled = false;
    mermaid
      .render(id, code)
      .then(({ svg }) => {
        if (cancelled) return;
        // mermaid.render can succeed (resolve) but return an SVG containing error text
        // instead of a proper diagram — treat those as render failures.
        if (/class="error[^"]*"|Syntax error|diagram error|aria-roledescription="error"/i.test(svg)) {
          setError("Mermaid syntax error in diagram source");
        } else {
          setSvg(svg);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? String(err));
      });
    return () => { cancelled = true; };
  }, [code, id]);

  if (error) {
    return (
      <div className="mb-4 overflow-hidden rounded-md border border-amber-200">
        <div className="flex items-center gap-1.5 bg-amber-50 px-3 py-1.5 text-[11px] text-amber-700 font-medium border-b border-amber-200">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          Diagram render error — showing source
        </div>
        <pre className="m-0 overflow-x-auto bg-[#f6f8fa] p-4 text-[13px] leading-relaxed">
          <code className="text-[#1f2328]">{code}</code>
        </pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="mb-4 flex items-center justify-center rounded-md border border-[#d0d7de] bg-white p-8 text-[13px] text-[#94a3b8]">
        Loading diagram…
      </div>
    );
  }

  return (
    <div
      className="mb-4 flex justify-center overflow-x-auto rounded-md border border-[#d0d7de] bg-white p-4"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

// ── Helper to detect a MermaidBlock child ──
function isMermaidBlock(node: React.ReactNode): boolean {
  return React.isValidElement(node) && node.type === MermaidBlock;
}

// ── Components factory ──

function createMarkdownComponents(variant: "default" | "prd"): Components {
  const isPrd = variant === "prd";

  function codeComponent({
    children,
    className,
  }: {
    children?: React.ReactNode;
    className?: string;
  }) {
    const lang = className?.replace("language-", "") ?? "";

    // ── Mermaid ──
    if (lang === "mermaid") {
      const diagramCode = String(children ?? "").replace(/\n$/, "");
      return <MermaidBlock code={diagramCode} />;
    }

    const isBlock = !!className?.includes("language-");
    if (isBlock) {
      if (isPrd) {
        return (
          <code className="block font-mono text-[13px] leading-relaxed text-[#1f2328]">
            {children}
          </code>
        );
      }
      return (
        <code className="block text-xs leading-relaxed text-emerald-700">
          {children}
        </code>
      );
    }

    if (isPrd) {
      return (
        <code className="rounded-md border border-[#afb8c133] bg-[#f6f8fa] px-[0.4em] py-[0.2em] font-mono text-[0.85em] text-[#1f2328]">
          {children}
        </code>
      );
    }
    return (
      <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-emerald-700">
        {children}
      </code>
    );
  }

  if (isPrd) {
    return {
      h1: ({ children }) => (
        <h1 className="mb-4 mt-6 border-b border-[#d0d7de] pb-3 text-[2em] font-semibold leading-tight text-[#1f2328]">
          {children}
        </h1>
      ),
      h2: ({ children }) => (
        <h2 className="mb-4 mt-8 border-b border-[#d0d7de] pb-2 text-[1.5em] font-semibold leading-tight text-[#1f2328]">
          {children}
        </h2>
      ),
      h3: ({ children }) => (
        <h3 className="mb-3 mt-6 text-[1.25em] font-semibold leading-tight text-[#1f2328]">
          {children}
        </h3>
      ),
      h4: ({ children }) => (
        <h4 className="mb-2 mt-5 text-[1em] font-semibold leading-tight text-[#1f2328]">
          {children}
        </h4>
      ),
      h5: ({ children }) => (
        <h5 className="mb-2 mt-4 text-[0.875em] font-semibold leading-tight text-[#1f2328]">
          {children}
        </h5>
      ),
      h6: ({ children }) => (
        <h6 className="mb-2 mt-4 text-[0.85em] font-semibold leading-tight text-[#57606a]">
          {children}
        </h6>
      ),
      p: ({ children }) => (
        <p className="mb-4 mt-0 text-[16px] leading-[1.75] text-[#1f2328]">{children}</p>
      ),
      ul: ({ children }) => (
        <ul className="mb-4 mt-0 list-disc space-y-1 pl-6 text-[16px] leading-[1.75] text-[#1f2328]">
          {children}
        </ul>
      ),
      ol: ({ children }) => (
        <ol className="mb-4 mt-0 list-decimal space-y-1 pl-6 text-[16px] leading-[1.75] text-[#1f2328]">
          {children}
        </ol>
      ),
      li: ({ children }) => (
        <li className="leading-[1.75] [&>p]:mb-1">{children}</li>
      ),
      strong: ({ children }) => (
        <strong className="font-semibold text-[#1f2328]">{children}</strong>
      ),
      em: ({ children }) => <em className="italic text-[#1f2328]">{children}</em>,
      a: ({ href, children }) => (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#0969da] underline decoration-[#0969da]/40 underline-offset-2 transition-colors hover:text-[#0550ae] hover:decoration-[#0550ae]"
        >
          {children}
        </a>
      ),
      code: codeComponent,
      pre: ({ children }) => {
        const child = React.Children.count(children) === 1 ? React.Children.toArray(children)[0] : null;
        if (child && isMermaidBlock(child)) return <>{children}</>;
        return (
          <pre className="mb-4 mt-0 overflow-x-auto rounded-md border border-[#d0d7de] bg-[#f6f8fa] p-4 text-[13px] leading-relaxed [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#8c959f] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:h-1.5">
            {children}
          </pre>
        );
      },
      blockquote: ({ children }) => (
        <blockquote className="mb-4 mt-0 border-l-4 border-[#d0d7de] pl-4 text-[16px] leading-[1.75] text-[#57606a] [&>p]:mb-0">
          {children}
        </blockquote>
      ),
      table: ({ children }) => (
        <div className="mb-6 mt-0 overflow-x-auto [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#8c959f] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:h-1.5">
          <table className="w-full border-collapse text-[14px] text-[#1f2328]">
            {children}
          </table>
        </div>
      ),
      thead: ({ children }) => (
        <thead className="bg-[#f6f8fa] text-[#1f2328]">
          {children}
        </thead>
      ),
      tbody: ({ children }) => (
        <tbody className="divide-y divide-[#d0d7de]">{children}</tbody>
      ),
      tr: ({ children }) => (
        <tr className="border-t border-[#d0d7de] transition-colors hover:bg-[#f6f8fa]">{children}</tr>
      ),
      th: ({ children }) => (
        <th className="border border-[#d0d7de] px-4 py-2 text-left font-semibold text-[#1f2328]">{children}</th>
      ),
      td: ({ children }) => (
        <td className="border border-[#d0d7de] px-4 py-2 text-[#1f2328]">{children}</td>
      ),
      hr: () => (
        <hr className="my-6 border-0 border-t border-[#d0d7de]" />
      ),
    };
  }

  return {
    h1: ({ children }) => (
      <h1 className="mb-4 text-xl font-bold text-zinc-900">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="mb-3 mt-6 text-lg font-semibold text-zinc-800">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="mb-2 mt-4 text-base font-semibold text-indigo-700">
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4 className="mb-1 mt-3 text-sm font-semibold text-indigo-600">
        {children}
      </h4>
    ),
    p: ({ children }) => (
      <p className="mb-3 text-sm leading-relaxed text-zinc-600">{children}</p>
    ),
    ul: ({ children }) => (
      <ul className="mb-3 list-disc space-y-1.5 pl-5 text-sm text-zinc-600 marker:text-indigo-500">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="mb-3 list-decimal space-y-1.5 pl-5 text-sm text-zinc-600">
        {children}
      </ol>
    ),
    li: ({ children }) => (
      <li className="leading-relaxed [&>p]:mb-0">{children}</li>
    ),
    strong: ({ children }) => (
      <strong className="font-semibold text-zinc-800">{children}</strong>
    ),
    em: ({ children }) => <em className="text-zinc-700">{children}</em>,
    a: ({ href, children }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-indigo-600 underline decoration-indigo-300 hover:decoration-indigo-500"
      >
        {children}
      </a>
    ),
    code: codeComponent,
    pre: ({ children }) => {
      const child = React.Children.count(children) === 1 ? React.Children.toArray(children)[0] : null;
      if (child && isMermaidBlock(child)) return <>{children}</>;
      return (
        <pre className="mb-3 overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-50 p-4 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-300 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:h-1.5">
          {children}
        </pre>
      );
    },
    blockquote: ({ children }) => (
      <blockquote className="mb-3 border-l-2 border-indigo-400 pl-4 text-sm italic text-zinc-500">
        {children}
      </blockquote>
    ),
    table: ({ children }) => (
      <div className="mb-3 overflow-x-auto rounded-lg border border-zinc-200 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-300 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:h-1.5">
        <table className="w-full text-sm">{children}</table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="bg-zinc-100 text-xs font-semibold text-zinc-600">
        {children}
      </thead>
    ),
    tbody: ({ children }) => <tbody>{children}</tbody>,
    tr: ({ children }) => (
      <tr className="border-b border-zinc-200 last:border-0">{children}</tr>
    ),
    th: ({ children }) => (
      <th className="px-3 py-2 text-left font-semibold">{children}</th>
    ),
    td: ({ children }) => (
      <td className="px-3 py-2 text-zinc-700">{children}</td>
    ),
    hr: () => <hr className="my-6 border-zinc-200" />,
  };
}

const defaultComponents = createMarkdownComponents("default");

interface MarkdownRendererProps {
  content: string;
  className?: string;
  /** Richer typography for PRD review (dark, deliverable-style). */
  variant?: "default" | "prd";
}

/**
 * Split content by <div class="prd-changed-section">...</div> markers emitted
 * by the PRD patch path (see src/lib/agents/pm/prd-patch.ts). Each plain
 * chunk and each changed chunk is rendered as its own ReactMarkdown block;
 * the changed chunks get a wrapper div with the `prd-changed-section` class
 * so CSS in globals.css can highlight + fade them.
 *
 * This avoids needing rehype-raw to allow inline HTML through react-markdown.
 */
const CHANGED_SECTION_REGEX =
  /<div class="prd-changed-section">([\s\S]*?)<\/div>/g;

interface ContentChunk {
  kind: "plain" | "changed";
  text: string;
}

function splitChangeMarkers(content: string): ContentChunk[] {
  // Fast path — no markers present.
  if (!content.includes('class="prd-changed-section"')) {
    return [{ kind: "plain", text: content }];
  }
  const parts: ContentChunk[] = [];
  let lastIdx = 0;
  CHANGED_SECTION_REGEX.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = CHANGED_SECTION_REGEX.exec(content)) !== null) {
    if (m.index > lastIdx) {
      const plain = content.slice(lastIdx, m.index);
      if (plain.trim().length > 0) parts.push({ kind: "plain", text: plain });
    }
    const inner = m[1].replace(/^\n+|\n+$/g, "");
    if (inner.length > 0) parts.push({ kind: "changed", text: inner });
    lastIdx = CHANGED_SECTION_REGEX.lastIndex;
  }
  if (lastIdx < content.length) {
    const tail = content.slice(lastIdx);
    if (tail.trim().length > 0) parts.push({ kind: "plain", text: tail });
  }
  return parts;
}

export default function MarkdownRenderer({
  content,
  className = "",
  variant = "default",
}: MarkdownRendererProps) {
  if (!content) return null;
  const components =
    variant === "prd" ? createMarkdownComponents("prd") : defaultComponents;
  const proseClass =
    variant === "prd"
      ? "prose prose-slate max-w-none prose-headings:font-semibold prose-headings:text-[#1f2328] prose-p:text-[#1f2328] prose-li:text-[#1f2328]"
      : "prose prose-sm prose-zinc max-w-none";

  const chunks = splitChangeMarkers(content);

  return (
    <div className={`${proseClass} ${className}`}>
      {/* Hide Mermaid error SVGs that may leak before React catches up */}
      <style>{`svg[aria-roledescription="error"] { display: none !important; }`}</style>
      {chunks.map((chunk, idx) => {
        const md = (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={components}
          >
            {chunk.text}
          </ReactMarkdown>
        );
        if (chunk.kind === "changed") {
          return (
            <div key={idx} className="prd-changed-section">
              {md}
            </div>
          );
        }
        return <React.Fragment key={idx}>{md}</React.Fragment>;
      })}
    </div>
  );
}
