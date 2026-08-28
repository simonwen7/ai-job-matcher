import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center 
                     bg-white text-gray-900
                     dark:bg-neutral-950 dark:text-white">

      <h1 className="text-5xl font-extrabold mb-6 tracking-tight">
        AI Resume Match
      </h1>

      <p className="text-gray-600 dark:text-neutral-300 mb-10 text-center max-w-xl text-lg leading-relaxed">
        Upload your resume. Paste a job description.
        Get structured alignment feedback on strengths, gaps, and possible improvements.
      </p>

      <Link
        href="/analyze"
        className="bg-black text-white px-8 py-4 rounded-2xl text-lg font-semibold
                   hover:bg-gray-800 transition
                   dark:bg-white dark:text-black dark:hover:bg-neutral-200"
      >
        Get Started
      </Link>

    </main>
  );
}
