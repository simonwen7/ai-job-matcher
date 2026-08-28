import { NextResponse } from "next/server";
import OpenAI from "openai";
import {
  buildSystemPrompt,
  normalizeResult,
  parseModelJsonResponse,
  validateAnalyzeInput,
} from "@/lib/analyze";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const resume = String(body?.resume ?? "").trim();
    const job = String(body?.job ?? "").trim();

    const inputError = validateAnalyzeInput(resume, job);
    if (inputError) {
      return NextResponse.json({ error: inputError }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("Analyze failed: OpenAI API key is not configured.");
      return NextResponse.json(
        { error: "Analysis is temporarily unavailable. Please try again in a moment." },
        { status: 500 }
      );
    }

    const client = new OpenAI({ apiKey });

    const user = `
RESUME:
${resume}

JOB DESCRIPTION:
${job}
    `.trim();

    let resp;
    try {
      resp = await client.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.2,
        messages: [
          { role: "system", content: buildSystemPrompt() },
          { role: "user", content: user },
        ],
      });
    } catch {
      return NextResponse.json(
        { error: "Analysis is temporarily unavailable. Please try again in a moment." },
        { status: 500 }
      );
    }

    const text = resp.choices?.[0]?.message?.content?.trim() ?? "";
    const parsed = parseModelJsonResponse(text);
    const result = normalizeResult(parsed ?? { score: 0, summary: "Unable to parse analysis results." });

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Analysis is temporarily unavailable. Please try again in a moment." },
      { status: 500 }
    );
  }
}
