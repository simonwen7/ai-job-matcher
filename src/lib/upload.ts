import { MAX_UPLOAD_BYTES, MAX_UPLOAD_MB, SUPPORTED_EXTENSIONS } from "./constants";

export function isSupportedFileName(name: string): boolean {
  const lower = name.toLowerCase();
  return SUPPORTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function validateFileSize(bytes: number): { ok: true } | { ok: false; message: string } {
  if (bytes === 0) {
    return { ok: false, message: "File is empty. Please choose a different file." };
  }
  if (bytes > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      message: `File is too large. Maximum size is ${MAX_UPLOAD_MB} MB.`,
    };
  }
  return { ok: true };
}

export function validateUpload(
  name: string,
  bytes: number
): { ok: true } | { ok: false; message: string } {
  if (!isSupportedFileName(name)) {
    return {
      ok: false,
      message: "Unsupported file type. Please upload a PDF, DOCX, or TXT file.",
    };
  }
  return validateFileSize(bytes);
}
