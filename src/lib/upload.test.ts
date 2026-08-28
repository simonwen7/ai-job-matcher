import { describe, expect, it } from "vitest";
import { MAX_UPLOAD_BYTES } from "@/lib/constants";
import { isSupportedFileName, validateFileSize, validateUpload } from "@/lib/upload";

describe("isSupportedFileName", () => {
  it("accepts supported resume formats", () => {
    expect(isSupportedFileName("resume.pdf")).toBe(true);
    expect(isSupportedFileName("Resume.DOCX")).toBe(true);
    expect(isSupportedFileName("notes.txt")).toBe(true);
  });

  it("rejects unsupported formats", () => {
    expect(isSupportedFileName("resume.doc")).toBe(false);
    expect(isSupportedFileName("resume.png")).toBe(false);
  });
});

describe("validateFileSize", () => {
  it("rejects empty files", () => {
    expect(validateFileSize(0)).toEqual({
      ok: false,
      message: "File is empty. Please choose a different file.",
    });
  });

  it("rejects files above the upload limit", () => {
    const result = validateFileSize(MAX_UPLOAD_BYTES + 1);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("4 MB");
    }
  });

  it("accepts files within the upload limit", () => {
    expect(validateFileSize(1024)).toEqual({ ok: true });
  });
});

describe("validateUpload", () => {
  it("rejects unsupported file types before size checks", () => {
    const result = validateUpload("resume.doc", 1000);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("Unsupported file type");
    }
  });
});
