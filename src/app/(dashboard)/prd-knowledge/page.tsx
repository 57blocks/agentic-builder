"use client";

import { useCallback, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

import type {
  PrdKnowledgeListItem,
  PrdKnowledgeListResponse,
} from "@/app/api/memory/prd/records/route";

type Tab = "pending" | "active" | "deprecated";

export default function PrdKnowledgePage() {
  const [tab, setTab] = useState<Tab>("pending");
  const [records, setRecords] = useState<PrdKnowledgeListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<PrdKnowledgeListItem | null>(null);
  const [filterIndustry, setFilterIndustry] = useState<string>("");
  const [filterProductType, setFilterProductType] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({ status: tab });
    if (filterIndustry) qs.set("industry", filterIndustry);
    if (filterProductType) qs.set("productType", filterProductType);
    const res = await fetch(`/api/memory/prd/records?${qs.toString()}`);
    const data = (await res.json()) as PrdKnowledgeListResponse;
    setRecords(data.records);
    setLoading(false);
  }, [tab, filterIndustry, filterProductType]);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = { pending: 0, active: 0, deprecated: 0 };
  for (const r of records) counts[r.status]++;

  const act = async (id: string, action: "approve" | "reject" | "delete") => {
    if (action === "delete") {
      await fetch(`/api/memory/prd/${id}`, { method: "DELETE" });
    } else {
      await fetch(`/api/memory/prd/${id}/${action}`, { method: "POST" });
    }
    setSelected(null);
    await load();
  };

  const industries = Array.from(new Set(records.map((r) => r.industry))).sort();
  const productTypes = Array.from(
    new Set(records.map((r) => r.productType))
  ).sort();

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">PRD Knowledge</h1>
        <button
          onClick={() => void load()}
          className="text-sm px-3 py-1 border rounded"
        >
          Refresh
        </button>
      </header>

      <div className="flex gap-2">
        {(["pending", "active", "deprecated"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1 rounded ${tab === t ? "bg-indigo-600 text-white" : "bg-gray-100"}`}
          >
            {t} ({counts[t]})
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <select
          value={filterIndustry}
          onChange={(e) => setFilterIndustry(e.target.value)}
          className="border rounded px-2 py-1 text-sm"
        >
          <option value="">All industries</option>
          {industries.map((i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </select>
        <select
          value={filterProductType}
          onChange={(e) => setFilterProductType(e.target.value)}
          className="border rounded px-2 py-1 text-sm"
        >
          <option value="">All product types</option>
          {productTypes.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {records.map((r) => (
            <article
              key={r.id}
              onClick={() => setSelected(r)}
              className="border rounded p-4 hover:shadow cursor-pointer"
            >
              <div className="flex gap-1 text-xs mb-2">
                <span className="px-2 py-0.5 bg-indigo-50 rounded">
                  {r.industry}
                </span>
                <span className="px-2 py-0.5 bg-gray-100 rounded">
                  {r.productType}
                </span>
                <span className="px-2 py-0.5 bg-gray-100 rounded">
                  {r.tier}
                </span>
              </div>
              <h3 className="font-medium">{r.title}</h3>
              <p className="text-sm text-gray-600 line-clamp-3 mt-1">
                {r.summary}
              </p>
              <p className="text-xs text-gray-400 mt-2">
                hits: {r.hits} · score: {r.score.toFixed(2)}
                {r.sourceProjectId
                  ? ` · from ${r.sourceProjectId.slice(0, 8)}`
                  : ""}
              </p>
            </article>
          ))}
        </div>
      )}

      {selected ? (
        <div
          className="fixed inset-0 bg-black/40 flex justify-end z-50"
          onClick={() => setSelected(null)}
        >
          <aside
            onClick={(e) => e.stopPropagation()}
            className="w-2/3 max-w-4xl bg-white p-6 overflow-y-auto"
          >
            <header className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold">{selected.title}</h2>
                <p className="text-sm text-gray-500">
                  {selected.industry} · {selected.productType} ·{" "}
                  {selected.tier} · {selected.status}
                </p>
              </div>
              <div className="flex gap-2">
                {selected.status === "pending" ? (
                  <>
                    <button
                      onClick={() => void act(selected.id, "approve")}
                      className="px-3 py-1 bg-green-600 text-white rounded"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => void act(selected.id, "reject")}
                      className="px-3 py-1 bg-red-100 text-red-700 rounded"
                    >
                      Reject
                    </button>
                  </>
                ) : null}
                {selected.status === "active" ? (
                  <button
                    onClick={() => void act(selected.id, "reject")}
                    className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded"
                  >
                    Deprecate
                  </button>
                ) : null}
                {selected.status === "deprecated" ? (
                  <>
                    <button
                      onClick={() => void act(selected.id, "approve")}
                      className="px-3 py-1 bg-green-100 text-green-700 rounded"
                    >
                      Restore
                    </button>
                    <button
                      onClick={() => void act(selected.id, "delete")}
                      className="px-3 py-1 bg-red-600 text-white rounded"
                    >
                      Delete
                    </button>
                  </>
                ) : null}
                <button
                  onClick={() => setSelected(null)}
                  className="px-3 py-1 border rounded"
                >
                  Close
                </button>
              </div>
            </header>

            <section className="grid grid-cols-2 gap-6">
              <div className="prose prose-sm max-w-none">
                <h3>Full PRD</h3>
                <ReactMarkdown>{selected.fullPrd}</ReactMarkdown>
              </div>
              <div className="text-sm">
                <h3 className="font-semibold mb-2">Extracted Sections</h3>
                <p className="mb-3 text-gray-700">{selected.summary}</p>
                {Object.entries(selected.sections).map(([key, val]) => (
                  <details key={key} open className="mb-2">
                    <summary className="cursor-pointer text-gray-600">
                      {key}
                    </summary>
                    {Array.isArray(val) ? (
                      <ul className="list-disc list-inside">
                        {val.map((v, i) => (
                          <li key={i}>{v}</li>
                        ))}
                      </ul>
                    ) : (
                      <p>{val as string}</p>
                    )}
                  </details>
                ))}
              </div>
            </section>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
