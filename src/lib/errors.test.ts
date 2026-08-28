import { describe, expect, it } from "vitest";
import { mapAnalyzeApiError, mapExtractApiError } from "@/lib/errors";

describe("mapAnalyzeApiError", () => {
  it("returns user-safe messages for server failures", () => {
    expect(mapAnalyzeApiError(500)).toBe(
      "Analysis is temporarily unavailable. Please try again in a moment."
    );
  });

  it("hides sensitive provider configuration errors", () => {
    expect(mapAnalyzeApiError(500, "OPENAI_API_KEY is not set.")).toBe(
      "Analysis is temporarily unavailable. Please try again in a moment."
    );
  });
});

describe("mapExtractApiError", () => {
  it("preserves validation messages for client errors", () => {
    expect(mapExtractApiError(400, "File is too large. Maximum size is 4 MB.")).toBe(
      "File is too large. Maximum size is 4 MB."
    );
  });

  it("returns a friendly fallback for extraction failures", () => {
    expect(mapExtractApiError(500)).toBe(
      "Could not extract text from this file. Try a different file or paste your resume as text."
    );
  });
});
