export default function Loading() {
  return (
    <main
      className="page-shell"
      aria-busy="true"
      aria-label="Loading workspace"
    >
      <p role="status" className="eyebrow mb-6">
        Loading your workspace…
      </p>
      <div className="h-10 w-56 rounded-lg bg-muted" />
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="panel h-40" />
        ))}
      </div>
    </main>
  );
}
