import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type AnalyzeResult = {
  score: number;
  summary: string;
  strengths: string[];
  missingSkills: string[];
  suggestions: string[];
};

function clampScore(n: number) {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY in environment variables." },
        { status: 500 }
      );
    }

    const body = await req.json();

    // ✅ 兼容前端发的 {resume, job} 以及你原来设计的 {resumeText, jobText}
    const resumeText = String(body?.resumeText ?? body?.resume ?? "").trim();
    const jobText = String(body?.jobText ?? body?.job ?? "").trim();

    if (!resumeText || !jobText) {
      return NextResponse.json(
        { error: "resumeText and jobText are required." },
        { status: 400 }
      );
    }

    // ✅ 防止超长
    const RESUME_MAX = 12000;
    const JOB_MAX = 12000;
    const resume = resumeText.slice(0, RESUME_MAX);
    const job = jobText.slice(0, JOB_MAX);

    const system = `
You are an expert recruiter + resume coach.
Goal: Evaluate how well the resume matches the job description using semantic understanding (not keyword matching).
Return ONLY valid JSON. No markdown. No extra text.
Language: Use the same language as the job description (if mixed, prefer the job description language).
Scoring:
- 0-39: weak match
- 40-69: partial match
- 70-89: strong match
- 90-100: excellent match
Make missingSkills concrete and job-relevant (avoid generic like "communication" unless job truly demands it).
Suggestions must be actionable (e.g., add bullet X, learn tool Y, quantify impact).
`;

    const user = `
JOB DESCRIPTION:
${job}

RESUME:
${resume}

Return JSON with this exact shape:
{
  "score": number (0-100),
  "summary": string (2-4 sentences),
  "strengths": string[] (3-6 items),
  "missingSkills": string[] (0-8 items),
  "suggestions": string[] (3-8 items)
}
`;

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: "Model returned invalid JSON.", raw },
        { status: 500 }
      );
    }

    const result: AnalyzeResult = {
      score: clampScore(Number(parsed?.score)),
      summary: String(parsed?.summary ?? ""),
      strengths: Array.isArray(parsed?.strengths) ? parsed.strengths.map(String) : [],
      missingSkills: Array.isArray(parsed?.missingSkills) ? parsed.missingSkills.map(String) : [],
      suggestions: Array.isArray(parsed?.suggestions) ? parsed.suggestions.map(String) : [],
    };

    return NextResponse.json(result);
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: err?.message ?? "Server error occurred." },
      { status: 500 }
    );
  }
}
