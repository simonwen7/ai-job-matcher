/**
 * Vercel serverless functions enforce a 4.5 MB request/response body limit.
 * @see https://vercel.com/docs/functions/limitations#request-body-size
 * Use 4 MB to leave headroom for multipart form boundaries and metadata.
 */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
export const MAX_UPLOAD_MB = 4;

export const SUPPORTED_EXTENSIONS = [".pdf", ".docx", ".txt"] as const;

/**
 * Typical resumes are under 8,000 characters (~2 pages).
 * 20,000 allows multi-page technical resumes without encouraging oversized LLM requests.
 */
export const MAX_RESUME_CHARS = 20_000;

/**
 * Typical job descriptions are under 5,000 characters.
 * 12,000 covers long postings with legal/benefits boilerplate.
 */
export const MAX_JOB_CHARS = 12_000;

export function formatCharLimit(n: number): string {
  return n.toLocaleString("en-US");
}
