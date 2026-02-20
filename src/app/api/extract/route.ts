import { NextResponse } from "next/server";
import mammoth from "mammoth";
import PDFParser from "pdf2json";

export const runtime = "nodejs";

function normalizeText(s: string) {
  return (
    (s || "")
      .replace(/\r\n/g, "\n")
      .replace(/[ \t]{2,}/g, " ")
      // 把常见分隔符变成更像换行（给前端 bullet 更好用）
      .replace(/\s*\|\s*/g, " | ")
      .split("\n")
      .map((line) => line.trim())
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

function safeDecodeURIComponent(x: string) {
  try {
    return decodeURIComponent(x);
  } catch {
    return x; // 防止 URI malformed
  }
}

function parsePdfToText(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();

    pdfParser.on("pdfParser_dataError", (err: any) => {
      reject(err?.parserError || err);
    });

    pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
      try {
        const pages = pdfData?.Pages || [];
        const out: string[] = [];

        for (const page of pages) {
          // pdf2json: page.Texts[].R[].T 是 URI encoded text
          for (const t of page.Texts || []) {
            for (const r of t.R || []) {
              const raw = String(r?.T ?? "");
              const decoded = safeDecodeURIComponent(raw);
              if (decoded) out.push(decoded);
            }
          }
          out.push("\n");
        }

        resolve(out.join(" "));
      } catch (e) {
        reject(e);
      }
    });

    pdfParser.parseBuffer(buffer);
  });
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const name = file.name.toLowerCase();

    if (name.endsWith(".pdf")) {
      const text = await parsePdfToText(buffer);
      return NextResponse.json({ text: normalizeText(text) });
    }

    if (name.endsWith(".docx")) {
      const result = await mammoth.extractRawText({ buffer });
      return NextResponse.json({ text: normalizeText(result.value || "") });
    }

    if (name.endsWith(".txt")) {
      return NextResponse.json({ text: normalizeText(buffer.toString("utf-8")) });
    }

    return NextResponse.json(
      { error: "Unsupported file type (PDF/DOCX/TXT only)" },
      { status: 400 }
    );
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message || "Extract failed" }, { status: 500 });
  }
}
