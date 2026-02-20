"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";

type AnalyzeResult = {
  score: number; // 0-100
  summary: string;
  strengths: string[];
  missingSkills: string[];
  suggestions: string[];
};

function normalizeExtractedText(raw: string) {
  let s = (raw || "")
    .replace(/\r\n/g, "\n")
    .replace(/\u00A0/g, " ") // nbsp
    // 额外：一些常见的“瘦空格/窄空格”也统一成普通空格
    .replace(/[\u2000-\u200B\u202F\u205F\u3000]/g, " ");

  // 0) 先把一些奇怪的“分隔点/多空格”弄干净一点（保留换行）
  s = s
    .split("\n")
    .map((line) => line.replace(/[ \t]{2,}/g, " ").trimEnd())
    .join("\n");

  // 1) 修复年份被拆成 "20 24" / "19 98" 这种：=> 2024 / 1998
  //    只对 19xx / 20xx 生效，避免误伤普通数字
  s = s.replace(/\b(19|20)\s+(\d{2})\b/g, "$1$2");

  // 2) 修复年份被拆成 "2 0 2 4" 这种：=> 2024（连续数字间空格去掉）
  //    反复跑几次直到稳定
  for (let i = 0; i < 6; i++) {
    const next = s.replace(/\b(\d)\s+(?=\d\b)/g, "$1");
    if (next === s) break;
    s = next;
  }

  // 2.5) 修复月份/年份被拆开 + 规整破碎空格/破折号
  for (let i = 0; i < 6; i++) {
    const next = s
      .replace(/\b(J)\s*(a)\s*(n)\b/gi, "Jan")
      .replace(/\b(F)\s*(e)\s*(b)\b/gi, "Feb")
      .replace(/\b(M)\s*(a)\s*(r)\b/gi, "Mar")
      .replace(/\b(A)\s*(p)\s*(r)\b/gi, "Apr")
      .replace(/\b(M)\s*(a)\s*(y)\b/gi, "May")
      .replace(/\b(J)\s*(u)\s*(n)\b/gi, "Jun")
      .replace(/\b(J)\s*(u)\s*(l)\b/gi, "Jul")
      .replace(/\b(A)\s*(u)\s*(g)\b/gi, "Aug")
      .replace(/\b(S)\s*(e)\s*(p)\b/gi, "Sep")
      .replace(/\b(O)\s*(c)\s*(t)\b/gi, "Oct")
      .replace(/\b(N)\s*(o)\s*(v)\b/gi, "Nov")
      .replace(/\b(D)\s*(e)\s*(c)\b/gi, "Dec")
      .replace(
        /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d)\s*(\d)\s*(\d)\s*(\d)\b/gi,
        "$1 $2$3$4$5"
      )
      .replace(/\s*([–—-])\s*/g, " $1 ");

    if (next === s) break;
    s = next;
  }

  // 3) 修复单词被拆成 "S UMMARY" / "P ROJECTS"
  s = s.replace(/\b([A-Za-z])\s+([A-Za-z]{2,})\b/g, "$1$2");

  // 4) 修复 "S U M M A R Y" 每个字母都拆开
  for (let i = 0; i < 8; i++) {
    const next = s.replace(/\b([A-Za-z])\s+(?=[A-Za-z]\b)/g, "$1");
    if (next === s) break;
    s = next;
  }

  // 5) 修复词内连字符被拆开：end - to - end / mid - range
  //    仅在“字母/数字-字母/数字”合并，避免日期范围
  s = s.replace(/\b([A-Za-z0-9])\s*-\s*([A-Za-z0-9])\b/g, "$1-$2");

  // 6) 再清一次行内多余空格
  s = s
    .split("\n")
    .map((line) => line.replace(/[ \t]{2,}/g, " ").trim())
    .join("\n");

  return s.trim();
}

function toBullets(raw: string): { title?: string; bullets: string[] } {
  const text = normalizeExtractedText(raw);
  if (!text) return { bullets: [] };

  let s = text
    .replace(/\r\n/g, "\n")
    .replace(/\s*\|\s*/g, "\n• ")
    .trim();

  const headings = [
    "EDUCATION",
    "PROFESSIONAL EXPERIENCE",
    "WORK EXPERIENCE",
    "EXPERIENCE",
    "PROJECTS",
    "SKILLS",
    "SUMMARY",
    "CERTIFICATIONS",
    "AWARDS",
  ];

  for (const h of headings) {
    const re = new RegExp(`\\b${h}\\b`, "g");
    s = s.replace(re, `\n\n${h}\n`);
  }

  const lines = s
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);

  const bullets: string[] = [];
  let title: string | undefined;

  const isHeading = (line: string) =>
    headings.includes(line) || (/^[A-Z][A-Z\s/&-]{4,}$/.test(line) && line.length <= 40);

  const isDateLike = (line: string) =>
    /\b(20\d{2}|19\d{2})\b/.test(line) || /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/i.test(line);

  const splitLong = (line: string) => {
    const L = line.trim();
    if (L.length <= 140) return [L];
    const parts = L
      .split(/(?<=[.!?;])\s+/)
      .map((p) => p.trim())
      .filter(Boolean);

    if (parts.length === 1) {
      const out: string[] = [];
      let cur = "";
      for (const w of L.split(" ")) {
        if ((cur + " " + w).trim().length > 120) {
          out.push(cur.trim());
          cur = w;
        } else {
          cur = (cur + " " + w).trim();
        }
      }
      if (cur) out.push(cur.trim());
      return out;
    }
    return parts;
  };

  if (lines.length) {
    const first = lines[0];
    if (/(Email:|Phone:|University|LinkedIn|github|@)/i.test(first) || first.length <= 60) {
      title = first;
      lines.shift();
    }
  }

  for (const line0 of lines) {
    const line = line0.replace(/^•\s*/, "").trim();

    if (isHeading(line)) {
      bullets.push(`## ${line}`);
      continue;
    }

    if (isDateLike(line) && line.length <= 90) {
      bullets.push(line);
      continue;
    }

    const parts = splitLong(line);
    for (const p of parts) {
      if (!p) continue;
      bullets.push(p);
    }
  }

  const finalBullets = bullets.map((b) => (b.startsWith("## ") ? b : `• ${b}`));
  return { title, bullets: finalBullets };
}

function clampScore(x: unknown) {
  const n = typeof x === "number" ? x : Number(x);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

// ✅ 关键：把后端返回的“可能缺字段/字段类型不对”的 data，规范成 AnalyzeResult
function normalizeAnalyzeResult(data: any): AnalyzeResult {
  return {
    score: clampScore(data?.score),
    summary: typeof data?.summary === "string" ? data.summary : "",
    strengths: Array.isArray(data?.strengths) ? data.strengths.filter((x: any) => typeof x === "string") : [],
    missingSkills: Array.isArray(data?.missingSkills)
      ? data.missingSkills.filter((x: any) => typeof x === "string")
      : [],
    suggestions: Array.isArray(data?.suggestions) ? data.suggestions.filter((x: any) => typeof x === "string") : [],
  };
}

export default function AnalyzePage() {
  const [resume, setResume] = useState("");
  const [job, setJob] = useState("");

  const [loadingExtract, setLoadingExtract] = useState(false);
  const [loadingAnalyze, setLoadingAnalyze] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResult | null>(null);

  // ✅ 关键：判断是否是“通过上传文件”获得的简历文本
  const [resumeSource, setResumeSource] = useState<"paste" | "file">("paste");

  const formatted = useMemo(() => toBullets(resume), [resume]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setResult(null);
    setLoadingExtract(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/extract", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data?.error || "Extract failed");
      if (typeof data?.text !== "string") throw new Error("No text returned from /api/extract");

      setResumeSource("file");
      setResume(data.text);
    } catch (err: any) {
      setError(err?.message || "Upload failed");
    } finally {
      setLoadingExtract(false);
      e.target.value = "";
    }
  };

  const handleAnalyze = async () => {
    setError(null);
    setLoadingAnalyze(true);
    setResult(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume, job }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data?.error || "Analyze failed");

      // ✅ 不直接 setResult(data)，避免字段不全/类型不对导致 UI 报错
      setResult(normalizeAnalyzeResult(data));
    } catch (err: any) {
      setError(err?.message || "Analyze failed");
    } finally {
      setLoadingAnalyze(false);
    }
  };

  const handleClear = () => {
    setResume("");
    setJob("");
    setResult(null);
    setError(null);
    setResumeSource("paste");
  };

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-neutral-950 text-gray-900 dark:text-neutral-100">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-bold">Analyze Resume</h1>
          <Link href="/" className="text-gray-600 dark:text-neutral-300 hover:underline">
            ← Back
          </Link>
        </div>

        {/* Resume */}
        <section className="mt-8 rounded-2xl bg-white dark:bg-neutral-900 p-6 shadow-sm ring-1 ring-black/5 dark:ring-white/10">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Resume</h2>
            <span className="text-sm text-gray-500 dark:text-neutral-400">
              {loadingExtract ? "Extracting..." : "Paste or upload"}
            </span>
          </div>

          <input
            type="file"
            accept=".pdf,.docx,.txt"
            onChange={handleFileUpload}
            className="mt-4 block w-full text-sm
              file:mr-4 file:rounded-lg file:border-0
              file:bg-black file:px-4 file:py-2 file:text-white hover:file:bg-gray-800
              dark:file:bg-white dark:file:text-black"
          />
          <p className="mt-2 text-xs text-gray-500 dark:text-neutral-400">Supports: .pdf / .docx / .txt</p>

          {/* ✅ 如果是“粘贴模式”，才显示 textarea */}
          {resumeSource !== "file" && (
            <textarea
              value={resume}
              onChange={(e) => {
                setResumeSource("paste");
                setResume(e.target.value);
              }}
              placeholder="Paste your resume..."
              className="mt-4 h-56 w-full resize-none rounded-xl border border-black/20 dark:border-white/15
                bg-white dark:bg-neutral-950 text-black dark:text-white
                placeholder:text-gray-400 dark:placeholder:text-neutral-500
                p-4 outline-none font-mono text-sm leading-6"
            />
          )}

          {/* ✅ 只要有内容，就显示 bullet 预览（文件模式时只显示这个，不显示 textarea） */}
          {resume.trim() && (
            <div className="mt-6 rounded-xl border border-black/20 dark:border-white/15 bg-white/60 dark:bg-neutral-950/60 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs text-gray-500 dark:text-neutral-400">Preview (bullet points)</div>

                {/* ✅ 让用户从 file 模式切回 paste 模式 */}
                {resumeSource === "file" && (
                  <button
                    type="button"
                    onClick={() => setResumeSource("paste")}
                    className="text-xs underline text-gray-600 dark:text-neutral-300 hover:text-black dark:hover:text-white"
                  >
                    Edit as text
                  </button>
                )}
              </div>

              {formatted.title && (
                <div className="mb-3 font-semibold text-sm text-gray-900 dark:text-neutral-100">
                  {formatted.title}
                </div>
              )}

              <div className="space-y-2">
                {formatted.bullets.map((b, i) =>
                  b.startsWith("## ") ? (
                    <div key={i} className="mt-4 mb-1 font-bold text-sm tracking-wide">
                      {b.replace(/^##\s*/, "")}
                    </div>
                  ) : (
                    <div key={i} className="flex gap-2 text-sm leading-6">
                      <span className="mt-[2px]">•</span>
                      <span className="break-words">{b.replace(/^•\s*/, "")}</span>
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </section>

        {/* Job */}
        <section className="mt-6 rounded-2xl bg-white dark:bg-neutral-900 p-6 shadow-sm ring-1 ring-black/5 dark:ring-white/10">
          <h2 className="text-lg font-semibold">Job Description</h2>
          <textarea
            value={job}
            onChange={(e) => setJob(e.target.value)}
            placeholder="Paste job description..."
            className="mt-4 h-40 w-full resize-none rounded-xl border border-black/20 dark:border-white/15
              bg-white dark:bg-neutral-950 text-black dark:text-white
              placeholder:text-gray-400 dark:placeholder:text-neutral-500
              p-4 outline-none font-mono text-sm leading-6"
          />
        </section>

        <div className="mt-6 flex gap-4">
          <button
            onClick={handleAnalyze}
            disabled={loadingAnalyze || !resume.trim() || !job.trim()}
            className="rounded-xl bg-black px-6 py-3 text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed
              dark:bg-white dark:text-black dark:hover:bg-neutral-200"
          >
            {loadingAnalyze ? "Analyzing..." : "Analyze"}
          </button>

          <button
            onClick={handleClear}
            className="rounded-xl border border-black/30 bg-white px-6 py-3 text-black hover:bg-gray-100
              dark:border-white/15 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
          >
            Clear
          </button>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
            {error}
          </div>
        )}

        {/* ✅ Result (progress + 3 blocks) */}
        {result && (
          <div className="mt-8 rounded-2xl bg-white dark:bg-neutral-900 p-6 shadow-sm ring-1 ring-black/5 dark:ring-white/10">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">Match Score</h2>
                {result.summary ? (
                  <p className="mt-1 text-sm text-gray-600 dark:text-neutral-300">{result.summary}</p>
                ) : (
                  <p className="mt-1 text-sm text-gray-500 dark:text-neutral-400">No summary returned.</p>
                )}
              </div>

              <div className="shrink-0 text-right">
                <div className="text-3xl font-extrabold">{clampScore(result.score)}%</div>
                <div className="text-xs text-gray-500 dark:text-neutral-400">Overall fit</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-5">
              <div className="h-3 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                <div
                  className="h-full rounded-full bg-black dark:bg-white transition-all"
                  style={{ width: `${clampScore(result.score)}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-xs text-gray-500 dark:text-neutral-400">
                <span>Low</span>
                <span>Medium</span>
                <span>High</span>
              </div>
            </div>

            {/* 3-column blocks */}
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {/* Strengths */}
              <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-neutral-950/40 p-4">
                <div className="mb-2 text-sm font-semibold">Strengths</div>
                {result.strengths.length > 0 ? (
                  <ul className="space-y-2 text-sm text-gray-800 dark:text-neutral-200">
                    {result.strengths.slice(0, 6).map((s, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="mt-[2px]">•</span>
                        <span className="break-words">{s}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-sm text-gray-500 dark:text-neutral-400">No strengths extracted.</div>
                )}
              </div>

              {/* Missing Skills */}
              <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-neutral-950/40 p-4">
                <div className="mb-2 text-sm font-semibold">Missing Skills</div>
                {result.missingSkills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {result.missingSkills.slice(0, 14).map((k, i) => (
                      <span
                        key={i}
                        className="rounded-full border border-black/15 dark:border-white/15 px-2 py-1 text-xs text-gray-800 dark:text-neutral-200"
                      >
                        {k}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 dark:text-neutral-400">No missing skills found.</div>
                )}
              </div>

              {/* Suggestions */}
              <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-neutral-950/40 p-4">
                <div className="mb-2 text-sm font-semibold">Suggestions</div>
                {result.suggestions.length > 0 ? (
                  <ol className="space-y-2 text-sm text-gray-800 dark:text-neutral-200 list-decimal pl-4">
                    {result.suggestions.slice(0, 8).map((t, i) => (
                      <li key={i} className="break-words">
                        {t}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <div className="text-sm text-gray-500 dark:text-neutral-400">No suggestions generated.</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
