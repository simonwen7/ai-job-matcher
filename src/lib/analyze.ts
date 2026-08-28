import { formatCharLimit, MAX_JOB_CHARS, MAX_RESUME_CHARS } from "./constants";

export type AnalyzeResult = {
  score: number;
  summary: string;
  missingSkills: string[];
  suggestions: string[];
  strengths: string[];
};

export function clampScore(n: unknown): number {
  const x = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(100, Math.round(x)));
}

export function normalizeResult(raw: unknown): AnalyzeResult {
  const data = raw as Record<string, unknown> | null | undefined;
  const score = clampScore(data?.score);

  const summary =
    typeof data?.summary === "string" && data.summary.trim()
      ? data.summary.trim()
      : "No summary available.";

  const missingSkills = Array.isArray(data?.missingSkills)
    ? data.missingSkills
        .filter((s): s is string => typeof s === "string")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const suggestions = Array.isArray(data?.suggestions)
    ? data.suggestions
        .filter((s): s is string => typeof s === "string")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const strengths = Array.isArray(data?.strengths)
    ? data.strengths
        .filter((s): s is string => typeof s === "string")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  return { score, summary, missingSkills, suggestions, strengths };
}

export function safeJsonParse<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export function parseModelJsonResponse(text: string): unknown | null {
  const trimmed = text.trim();
  let parsed = safeJsonParse<unknown>(trimmed);
  if (parsed) return parsed;

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    parsed = safeJsonParse<unknown>(trimmed.slice(start, end + 1));
    if (parsed) return parsed;
  }

  return null;
}

export function getResumeLengthError(resume: string): string | null {
  if (resume.trim().length > MAX_RESUME_CHARS) {
    return `Resume is too long. Maximum length is ${formatCharLimit(MAX_RESUME_CHARS)} characters.`;
  }
  return null;
}

export function getJobLengthError(job: string): string | null {
  if (job.trim().length > MAX_JOB_CHARS) {
    return `Job description is too long. Maximum length is ${formatCharLimit(MAX_JOB_CHARS)} characters.`;
  }
  return null;
}

export function validateAnalyzeInput(resume: string, job: string): string | null {
  if (!resume.trim() || !job.trim()) {
    return "Please provide both a resume and a job description.";
  }
  return getResumeLengthError(resume) ?? getJobLengthError(job);
}

export function buildSystemPrompt(): string {
  return `
You are a resume-to-job-description alignment assistant.
Return ONLY valid JSON. No markdown, no extra text.
Output schema:
{
  "score": number,                 // 0-100 directional alignment estimate
  "summary": string,               // 2-4 sentences, direct and specific
  "strengths": string[],           // 3-6 bullets
  "missingSkills": string[],       // 5-12 items, short skill phrases
  "suggestions": string[]          // 5-10 actionable suggestions
}

Rules:
- Compare the resume against the pasted job description only. This is alignment analysis, not ATS scoring or hiring prediction.
- missingSkills must be concrete skills/keywords from the job description (tools, frameworks, domains) that are not clearly supported by the resume.
- suggestions must be actionable edits (what to add/change, where).
- Keep all items concise (<= 14 words each).
- Strengths must only reflect qualifications clearly supported by evidence in the resume.
- If a job requirement is not present in the resume, treat it as a possible gap in missingSkills rather than inventing evidence.

Integrity rules (mandatory):
- Never recommend claiming skills, tools, responsibilities, education, certifications, projects, or work experience that are not supported by the resume.
- If the job description requires something missing from the resume, clearly identify it as a gap.
- Recommendations may suggest: emphasizing verified adjacent experience, clarifying existing evidence, learning the missing skill, or gaining the experience through a real project/course/work opportunity.
- Never tell the user to fabricate qualifications.
  `.trim();
}

/** Marker used in tests to ensure anti-fabrication guardrails remain in the prompt. */
export const ANTI_FABRICATION_MARKER = "Never tell the user to fabricate qualifications";
