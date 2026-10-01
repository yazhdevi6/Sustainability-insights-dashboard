import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg rounded-xl border border-line bg-surface p-6 text-center">
      <h1 className="text-lg font-semibold text-ink">Not found</h1>
      <p className="mt-2 text-sm text-ink-2">That supplier or page doesn&apos;t exist.</p>
      <Link href="/" className="mt-4 inline-block text-sm font-medium text-accent hover:underline">
        Back to dashboard
      </Link>
    </div>
  );
}
