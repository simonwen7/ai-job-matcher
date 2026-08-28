const SENSITIVE_PATTERNS = [/OPENAI_API_KEY/i, /api[_-]?key/i, /sk-[a-zA-Z0-9]+/];

function isSensitiveMessage(message: string): boolean {
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(message));
}

export function mapAnalyzeApiError(status: number, error?: string): string {
  if (status === 400) {
    return error && !isSensitiveMessage(error)
      ? error
      : "Please provide both a resume and a job description.";
  }
  if (status === 500) {
    return "Analysis is temporarily unavailable. Please try again in a moment.";
  }
  return "Something went wrong. Please try again.";
}

export function mapExtractApiError(status: number, error?: string): string {
  if (status === 400) {
    if (error && !isSensitiveMessage(error)) return error;
    return "Could not read the uploaded file.";
  }
  if (status === 500) {
    return "Could not extract text from this file. Try a different file or paste your resume as text.";
  }
  return "Upload failed. Please try again.";
}
