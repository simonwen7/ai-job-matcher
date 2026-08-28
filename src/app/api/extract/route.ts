import { NextResponse } from "next/server";
import mammoth from "mammoth";
import PDFParser from "pdf2json";
import { normalizeExtractedText } from "@/lib/extract-text";
import { validateUpload } from "@/lib/upload";

export const runtime = "nodejs";

function safeDecodeURIComponent(x: string) {
  try {
    return decodeURIComponent(x);
  } catch {
    return x;
  }
}

function parsePdfToText(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();

    // pdf2json ships loose callback types; keep handlers permissive here.
    pdfParser.on("pdfParser_dataError", (err: unknown) => {
      const parserError =
        typeof err === "object" && err !== null && "parserError" in err
          ? (err as { parserError?: unknown }).parserError
          : undefined;
      reject(parserError || err);
    });

    pdfParser.on("pdfParser_dataReady", (pdfData: { Pages?: Array<{ Texts?: Array<{ R?: Array<{ T?: string }> }> }> }) => {
      try {
        const pages = pdfData?.Pages || [];
        const out: string[] = [];

        for (const page of pages) {
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
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    const uploadCheck = validateUpload(file.name, file.size);
    if (!uploadCheck.ok) {
      return NextResponse.json({ error: uploadCheck.message }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const name = file.name.toLowerCase();

    if (name.endsWith(".pdf")) {
      try {
        const text = await parsePdfToText(buffer);
        if (!text.trim()) {
          return NextResponse.json(
            { error: "No text could be extracted from this PDF. Try pasting your resume as text." },
            { status: 400 }
          );
        }
        return NextResponse.json({ text: normalizeExtractedText(text) });
      } catch {
        return NextResponse.json(
          { error: "Could not read this PDF. Try a different file or paste your resume as text." },
          { status: 400 }
        );
      }
    }

    if (name.endsWith(".docx")) {
      try {
        const result = await mammoth.extractRawText({ buffer });
        const text = result.value || "";
        if (!text.trim()) {
          return NextResponse.json(
            { error: "No text could be extracted from this DOCX file. Try pasting your resume as text." },
            { status: 400 }
          );
        }
        return NextResponse.json({ text: normalizeExtractedText(text) });
      } catch {
        return NextResponse.json(
          { error: "Could not read this DOCX file. Try a different file or paste your resume as text." },
          { status: 400 }
        );
      }
    }

    if (name.endsWith(".txt")) {
      const text = buffer.toString("utf-8");
      if (!text.trim()) {
        return NextResponse.json({ error: "File is empty. Please choose a different file." }, { status: 400 });
      }
      return NextResponse.json({ text: normalizeExtractedText(text) });
    }

    return NextResponse.json(
      { error: "Unsupported file type. Please upload a PDF, DOCX, or TXT file." },
      { status: 400 }
    );
  } catch {
    return NextResponse.json(
      { error: "Could not extract text from this file. Try a different file or paste your resume as text." },
      { status: 500 }
    );
  }
}
