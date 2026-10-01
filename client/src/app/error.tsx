"use client";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg rounded-xl border border-line bg-surface p-6 text-center">
      <h1 className="text-lg font-semibold text-ink">Couldn&apos;t load data</h1>
      <p className="mt-2 text-sm text-ink-2">
        {error.message || "Something went wrong."} Make sure the API server is running (<code>npm run dev</code> in{" "}
        <code>server/</code>) and the database is reachable.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded-lg bg-accent px-4 py-1.5 text-sm font-medium text-accent-ink hover:opacity-90"
      >
        Try again
      </button>
    </div>
  );
}
