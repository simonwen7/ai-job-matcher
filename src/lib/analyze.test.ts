import { describe, expect, it } from "vitest";
import { MAX_JOB_CHARS, MAX_RESUME_CHARS } from "@/lib/constants";
import {
  ANTI_FABRICATION_MARKER,
  buildSystemPrompt,
  clampScore,
  getJobLengthError,
  getResumeLengthError,
  normalizeResult,
  parseModelJsonResponse,
  validateAnalyzeInput,
} from "@/lib/analyze";

describe("clampScore", () => {
  it("clamps values into 0-100", () => {
    expect(clampScore(72.6)).toBe(73);
    expect(clampScore(-10)).toBe(0);
    expect(clampScore(150)).toBe(100);
  });

  it("returns 0 for non-numeric values", () => {
    expect(clampScore("not-a-number")).toBe(0);
    expect(clampScore(undefined)).toBe(0);
    expect(clampScore(null)).toBe(0);
  });
});

describe("normalizeResult", () => {
  it("fills defaults for malformed model output", () => {
    const result = normalizeResult({
      score: "85",
      summary: "  Good overlap.  ",
      strengths: ["Python", 42, ""],
      missingSkills: ["Kubernetes", null],
      suggestions: ["Add cloud projects"],
    });

    expect(result).toEqual({
      score: 85,
      summary: "Good overlap.",
      strengths: ["Python"],
      missingSkills: ["Kubernetes"],
      suggestions: ["Add cloud projects"],
    });
  });

  it("uses fallback summary when missing", () => {
    const result = normalizeResult({ score: 50 });
    expect(result.summary).toBe("No summary available.");
    expect(result.strengths).toEqual([]);
    expect(result.missingSkills).toEqual([]);
    expect(result.suggestions).toEqual([]);
  });
});

describe("parseModelJsonResponse", () => {
  it("parses valid JSON", () => {
    expect(parseModelJsonResponse('{"score":80}')).toEqual({ score: 80 });
  });

  it("extracts JSON from surrounding text", () => {
    expect(parseModelJsonResponse('Here is the result: {"score":65} thanks')).toEqual({ score: 65 });
  });

  it("returns null for invalid JSON", () => {
    expect(parseModelJsonResponse("not json at all")).toBeNull();
  });
});

describe("validateAnalyzeInput", () => {
  it("requires both resume and job description", () => {
    expect(validateAnalyzeInput("", "job")).toBe("Please provide both a resume and a job description.");
    expect(validateAnalyzeInput("resume", "   ")).toBe("Please provide both a resume and a job description.");
    expect(validateAnalyzeInput("resume", "job")).toBeNull();
  });

  it("accepts resume within limit", () => {
    const resume = "a".repeat(MAX_RESUME_CHARS);
    expect(getResumeLengthError(resume)).toBeNull();
    expect(validateAnalyzeInput(resume, "job description")).toBeNull();
  });

  it("rejects resume above limit", () => {
    const resume = "a".repeat(MAX_RESUME_CHARS + 1);
    expect(getResumeLengthError(resume)).toBe(
      "Resume is too long. Maximum length is 20,000 characters."
    );
    expect(validateAnalyzeInput(resume, "job description")).toBe(
      "Resume is too long. Maximum length is 20,000 characters."
    );
  });

  it("accepts job description within limit", () => {
    const job = "b".repeat(MAX_JOB_CHARS);
    expect(getJobLengthError(job)).toBeNull();
    expect(validateAnalyzeInput("resume", job)).toBeNull();
  });

  it("rejects job description above limit", () => {
    const job = "b".repeat(MAX_JOB_CHARS + 1);
    expect(getJobLengthError(job)).toBe(
      "Job description is too long. Maximum length is 12,000 characters."
    );
    expect(validateAnalyzeInput("resume", job)).toBe(
      "Job description is too long. Maximum length is 12,000 characters."
    );
  });
});

describe("buildSystemPrompt", () => {
  it("frames analysis as resume-to-job-description alignment", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain("resume-to-job-description alignment assistant");
    expect(prompt).not.toContain("ATS-style");
  });

  it("includes anti-fabrication guardrails", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain(ANTI_FABRICATION_MARKER);
    expect(prompt).toContain("Never recommend claiming skills");
    expect(prompt).toContain("Strengths must only reflect qualifications clearly supported");
  });
});
