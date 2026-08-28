# AI Resume Match

A focused AI product that compares a resume with a pasted job description and returns structured feedback on alignment, strengths, possible skill gaps, and actionable next steps.

**[Live Demo](https://ai-job-matcher-11.vercel.app/)**

Next.js · TypeScript · OpenAI · Tailwind CSS · Vercel

---

## What it does

1. Upload or paste a resume
2. Paste a job description
3. Run alignment analysis
4. Review structured results:
   - **Match Score** — directional resume–job alignment estimate
   - **Summary**
   - **Strengths**
   - **Missing Skills**
   - **Suggestions**

**Resume input**

- Upload: PDF, DOCX, or TXT
- Or paste resume text directly

The comparison is always **resume + pasted job description**. It does not fetch job postings from URLs, look up company profiles, or connect to an ATS.

---

## Why this project

Job seekers often have a specific posting they care about but may struggle to quickly understand:

- what their resume already communicates well
- what requirements appear missing
- what experience should be emphasized
- what they could improve before applying

AI Resume Match turns that comparison into a structured decision-support experience rather than a free-form chatbot conversation.

The project focuses on:

- resume ingestion (PDF, DOCX, TXT)
- structured AI output in a fixed results layout
- actionable UX for reviewing strengths, gaps, and next steps
- end-to-end product delivery from upload to feedback

It is not a proprietary matching engine, company-intelligence system, or hiring predictor.

---

## How the analysis works

```
Browser
  → Next.js application
  → resume text extraction (when a file is uploaded)
  → POST /api/analyze
  → OpenAI gpt-4o-mini (one call per analysis)
  → normalized structured result
  → results UI
```

**Resume extraction**

| Format | Library |
|--------|---------|
| PDF    | pdf2json |
| DOCX   | mammoth |
| TXT    | UTF-8 text |

**AI analysis**

- Provider: OpenAI
- Model: `gpt-4o-mini`
- One model call per analysis
- Requested structured output: `score`, `summary`, `strengths`, `missingSkills`, `suggestions`

There are no embeddings, vector database, RAG pipeline, company-intelligence layer, or persistent database.

---

## Responsible output

The application instructs the model to:

- not recommend fabricating skills, tools, responsibilities, education, certifications, projects, or work experience
- classify unsupported job requirements as gaps
- suggest learning, real projects, courses, work experience, or emphasizing adjacent verified experience instead

The **Match Score** is AI-generated resume–job alignment guidance. It is **not**:

- an ATS score
- hiring probability
- recruiter approval
- interview probability

---

## Privacy and data handling

- Resume and job-description text are sent to **OpenAI** for analysis.
- The application does **not** persist resume text, job descriptions, or analysis history.
- Uploaded files are processed for text extraction and are not saved by the application.
- No user accounts or analysis database are implemented.

---

## Tech stack

| Technology | Role |
|------------|------|
| Next.js 16 | App framework, API routes, deployment target |
| React 19 | UI |
| TypeScript | Application typing |
| Tailwind CSS 4 | Styling |
| OpenAI SDK | LLM integration |
| gpt-4o-mini | Resume–JD alignment analysis |
| pdf2json | PDF text extraction |
| mammoth | DOCX text extraction |
| Vitest | Unit-focused automated tests |
| Vercel | Hosting |

---

## Testing

The project includes **24 unit-focused automated tests** covering:

- analysis-result normalization and score clamping
- malformed model-response handling
- analyze input validation (including character limits)
- anti-fabrication prompt requirements
- supported upload validation and 4 MB file-size limit
- safe user-facing error mapping

```bash
npm run test
npm run lint
npm run build
```

---

## Local development

**Prerequisites:** Node.js, npm, and an OpenAI API key.

```bash
git clone https://github.com/simonwen7/ai-job-matcher.git
cd ai-job-matcher
npm install
```

Create `.env.local` in the project root:

```
OPENAI_API_KEY=your_key_here
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Usage limits

| Input | Limit |
|-------|-------|
| Uploaded files | PDF, DOCX, TXT — max **4 MB** |
| Resume text | max **20,000** characters |
| Job description | max **12,000** characters |

Oversized input is rejected with a clear error message.

---

## Limitations

- Compares resume text against a **pasted job description only** (no job URL import or company lookup)
- Match score is LLM-generated and non-deterministic
- No resume rewriting, export, or saved analysis history
- PDF extraction uses text-layer parsing only (scanned/image PDFs may not work well)
- Anti-fabrication rules are prompt-based and not programmatically enforced on model output
