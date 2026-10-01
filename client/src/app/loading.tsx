export default function Loading() {
  return (
    <div className="space-y-6" aria-label="Loading">
      <div className="h-8 w-72 animate-pulse rounded bg-surface-2" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-surface-2" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-xl bg-surface-2" />
    </div>
  );
}
