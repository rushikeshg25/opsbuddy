export function StatusBadge({ status }: { status: "up" | "down" }) {
  const color = status === "up" ? "bg-green-500" : "bg-destructive"
  const label = status === "up" ? "Up" : "Down"
  return (
    <span className="inline-flex items-center gap-2 text-sm">
      <span className={`h-2 w-2 rounded-full ${color}`} aria-hidden="true" />
      <span className="sr-only">Status:</span>
      {label}
    </span>
  )
}
