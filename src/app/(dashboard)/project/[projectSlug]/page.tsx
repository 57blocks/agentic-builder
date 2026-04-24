"use client";

import { useState } from "react";
import PipelineNav from "@/components/PipelineNav";

// Stage indicator data
const STAGES = [
  {
    id: "01",
    name: "Preparation",
    desc: "Resource mapping & logic flow",
    active: true,
  },
  {
    id: "02",
    name: "Kick-off",
    desc: "Environment spinning",
    active: false,
  },
  {
    id: "03",
    name: "Coding",
    desc: "Autonomous logic generation",
    active: false,
  },
  {
    id: "04",
    name: "Preview",
    desc: "Final testing & verification",
    active: false,
  },
] as const;

function ArrowRightIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M1 5h8M5 1l4 4-4 4" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#712ae2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="8.5" strokeWidth="2.5" />
      <line x1="12" y1="11" x2="12" y2="16" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="11.667" height="11.667" viewBox="0 0 14 14" fill="none" stroke="#712ae2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2.5 7L5.5 10L11.5 4" />
    </svg>
  );
}

function AttachIcon() {
  return (
    <svg width="9.375" height="15" viewBox="0 0 12 18" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M10 7V13a4 4 0 0 1-8 0V5a2.5 2.5 0 0 1 5 0v8a1 1 0 0 1-2 0V7" />
    </svg>
  );
}

function BoltIcon() {
  return (
    <svg width="16.5" height="16.5" viewBox="0 0 20 20" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M13 2L4.09 12.36A1 1 0 0 0 5 14h6l-1 6 8.91-10.36A1 1 0 0 0 18 8h-6l1-6z" />
    </svg>
  );
}

function MonitorIcon() {
  return (
    <svg width="20" height="16" viewBox="0 0 24 20" fill="none" stroke="#64748b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2" y="2" width="20" height="14" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="16" height="20" viewBox="0 0 20 24" fill="none" stroke="#64748b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function QuestionIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="2.5" />
    </svg>
  );
}

export default function Home() {
  const [mode, setMode] = useState<"Quick" | "Advanced">("Quick");
  const [prompt, setPrompt] = useState("");

  return (
    <div className="flex flex-col min-h-screen relative" style={{
      background: "linear-gradient(90deg, rgb(248, 249, 255) 0%, rgb(248, 249, 255) 100%)",
    }}>
      {/* Background decorative blurs */}
      <div className="pointer-events-none absolute right-[-100px] top-[-200px] w-[600px] h-[600px] rounded-[300px] bg-[#dbeafe] blur-[40px] opacity-40" />
      <div className="pointer-events-none absolute bottom-[-100px] left-[-100px] w-[500px] h-[500px] rounded-[250px] bg-[#faf5ff] blur-[40px] opacity-40" />

      {/* Top Header / AppBar */}
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-[#e2e8f0] bg-white/80 backdrop-blur-[6px] px-8">
        {/* Left: Pipeline title + Stage Tabs */}
        <div className="flex items-center gap-8">
          <span className="text-[18px] font-black text-[#0f172a] leading-7">Pipeline</span>
          <PipelineNav />
        </div>

        {/* Right: Icons + Deploy */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-0">
            <button className="p-2 hover:bg-slate-50 rounded transition-colors">
              <MonitorIcon />
            </button>
            <button className="p-2 hover:bg-slate-50 rounded transition-colors">
              <BellIcon />
            </button>
            <button className="p-2 hover:bg-slate-50 rounded transition-colors">
              <QuestionIcon />
            </button>
          </div>
          <button className="px-4 py-2 bg-[#712ae2] text-white text-[14px] font-bold tracking-[0.35px] rounded-[2px] hover:bg-[#5b22b8] transition-colors">
            Deploy Agent
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 flex-col items-center justify-center px-8 py-[60px]">
        <div className="flex flex-col items-center w-full max-w-[896px]">

          {/* Hero Heading */}
          <div className="flex flex-col items-center gap-3 text-center">
            {/* Phase badge */}
            <div className="inline-flex items-center justify-center px-[13px] py-[3.5px] rounded-[12px] bg-[rgba(113,42,226,0.1)] border border-[rgba(113,42,226,0.2)]">
              <span className="text-[16px] font-normal tracking-[3.2px] uppercase text-[#712ae2] leading-6 font-space-grotesk">
                PHASE 01: SETUP
              </span>
            </div>

            {/* Main heading */}
            <h1 className="text-[48px] font-bold tracking-[-0.96px] text-[#0b1c30] leading-[52.8px]">
              Ready to build
            </h1>

            {/* Subtitle */}
            <p className="text-[18px] text-[#7c839b] text-center leading-[28.8px] max-w-[576px]">
              Define the objective of your autonomous agent. Our pipeline will
              handle the orchestration, coding, and deployment steps.
            </p>
          </div>

          {/* Prompt Input Area */}
          <div className="w-full mt-12">
            <div className="relative w-full rounded-[8px] border border-[#e2e8f0] bg-white/90 backdrop-blur-[2px] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)] p-[9px]">
              {/* Textarea */}
              <div className="min-h-[160px] px-6 py-6 flex items-start">
                <textarea
                  className="w-full flex-1 resize-none bg-transparent text-[16px] text-[#0b1c30] placeholder-[#94a3b8] leading-6 outline-none"
                  rows={5}
                  placeholder={`Describe what your agent should do... e.g., 'Build a market research agent that scrapes top tech news and summarizes them into a Slack report every morning.'`}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
              </div>

              {/* Bottom toolbar */}
              <div className="flex items-center justify-between bg-[rgba(248,250,252,0.5)] border-t border-[#f1f5f9] rounded-bl-[4px] rounded-br-[4px] px-4 py-[16px]">
                {/* Mode toggle */}
                <div className="flex items-center gap-2 bg-[rgba(226,232,240,0.5)] rounded-[4px] p-1">
                  {(["Quick", "Advanced"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      className={`px-4 py-[6px] text-[12px] font-semibold rounded-[2px] transition-colors ${
                        mode === m
                          ? "bg-white text-[#0f172a] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
                          : "text-[#64748b]"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                {/* Right actions */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <AttachIcon />
                    <BoltIcon />
                  </div>
                  <button className="flex items-center gap-2 px-8 py-[10px] bg-[#131b2e] text-white text-[16px] font-bold rounded-[4px] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1)] hover:bg-[#1e2d47] transition-colors">
                    Initialize Pipeline
                    <ArrowRightIcon />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Stage Indicators Grid */}
          <div className="w-full max-w-[768px] mt-12">
            <div className="grid grid-cols-4 gap-6">
              {STAGES.map((stage) => (
                <div key={stage.id} className="relative flex flex-col items-start">
                  {/* Left accent bar */}
                  <div
                    className={`absolute left-[-4px] top-0 bottom-0 w-[3px] rounded-[12px] ${
                      stage.active
                        ? "bg-[#712ae2] shadow-[0px_0px_8px_0px_rgba(113,42,226,0.5)]"
                        : "bg-[#e2e8f0]"
                    }`}
                  />
                  <div className={`flex flex-col gap-[3.5px] pl-4 ${!stage.active ? "opacity-50" : ""}`}>
                    <span
                      className={`text-[10px] font-bold uppercase leading-[15px] font-space-grotesk ${
                        stage.active ? "text-[#712ae2]" : "text-[#94a3b8]"
                      }`}
                    >
                      STAGE {stage.id}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-bold text-[#0b1c30] leading-5">
                        {stage.name}
                      </span>
                      {stage.active && <CheckIcon />}
                    </div>
                    <p className="text-[12px] text-[#64748b] leading-4">
                      {stage.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Contextual Hint */}
          <div className="mt-12">
            <div className="flex items-center gap-3 px-[25px] py-[13px] rounded-[12px] bg-white/60 backdrop-blur-[2px] border border-[#e2e8f0] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
              <InfoIcon />
              <p className="text-[14px] text-[#7c839b] leading-5">
                You can upload existing project documentation to accelerate the{" "}
                <strong className="text-[#7c839b] font-bold">Preparation</strong>{" "}
                phase.
              </p>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
