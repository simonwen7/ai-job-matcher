// src/app/api/analyze/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

type AnalyzeResult = {
  score: number; // 0-100
  summary: string;
  missingSkills: string[];
  suggestions: string[];
  strengths: string[];
};

function safeJsonParse<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function clampScore(n: any) {
  const x = Number(n);
  if (Number.isNaN(x)) return 0;
  return Math.max(0, Math.min(100, Math.round(x)));
}

function normalizeResult(raw: any): AnalyzeResult {
  const score = clampScore(raw?.score);

  const summary =
    typeof raw?.summary === "string" && raw.summary.trim()
      ? raw.summary.trim()
      : "No summary available.";

  const missingSkills = Array.isArray(raw?.missingSkills)
    ? raw.missingSkills.map((s: any) => String(s).trim()).filter(Boolean)
    : [];

  const suggestions = Array.isArray(raw?.suggestions)
    ? raw.suggestions.map((s: any) => String(s).trim()).filter(Boolean)
    : [];

  const strengths = Array.isArray(raw?.strengths)
    ? raw.strengths.map((s: any) => String(s).trim()).filter(Boolean)
    : [];

  return { score, summary, missingSkills, suggestions, strengths };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const resume = String(body?.resume ?? "").trim();
    const job = String(body?.job ?? "").trim();

    if (!resume || !job) {
      return NextResponse.json({ error: "Missing resume or job description." }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "OPENAI_API_KEY is not set." }, { status: 500 });
    }

    const client = new OpenAI({ apiKey });

    // ✅ 强制模型输出 JSON（不用 markdown）
    const system = `
You are an ATS-style resume-job matching assistant.
Return ONLY valid JSON. No markdown, no extra text.
Output schema:
{
  "score": number,                 // 0-100
  "summary": string,               // 2-4 sentences, direct and specific
  "strengths": string[],           // 3-6 bullets
  "missingSkills": string[],       // 5-12 items, short skill phrases
  "suggestions": string[]          // 5-10 actionable suggestions
}

Rules:
- missingSkills must be concrete skills/keywords that appear in job descriptions (tools, frameworks, domains).
- suggestions must be actionable edits (what to add/change, where).
- Keep all items concise (<= 14 words each).
    `.trim();

    const user = `
RESUME:
${resume}

JOB DESCRIPTION:
${job}
    `.trim();

    const resp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });

    const text = resp.choices?.[0]?.message?.content?.trim() ?? "";

    // 1) 先直接 JSON parse
    let parsed = safeJsonParse<any>(text);

    // 2) 如果模型夹带了额外文本，尝试截取第一个 {...} 区间再 parse
    if (!parsed) {
      const start = text.indexOf("{");
      const end = text.lastIndexOf("}");
      if (start !== -1 && end !== -1 && end > start) {
        parsed = safeJsonParse<any>(text.slice(start, end + 1));
      }
    }

    // 3) 最终兜底：给一个可用结构
    const result = normalizeResult(parsed ?? { score: 0, summary: text });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
