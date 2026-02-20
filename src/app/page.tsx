import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <h1 className="text-4xl font-bold mb-6">
        AI Resume Match
      </h1>

      <p className="text-gray-600 mb-8 text-center max-w-xl">
        Upload your resume. Paste a job description.
        Get instant match score and improvement suggestions powered by AI.
      </p>

      <Link
        href="/analyze"
        className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition"
      >
        Get Started
      </Link>
    </main>
  );
}
