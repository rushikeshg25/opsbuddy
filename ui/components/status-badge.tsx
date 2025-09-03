export function StatusBadge({
  status,
}: {
  status: "up" | "down" | "degraded";
}) {
  const getStatusConfig = (status: "up" | "down" | "degraded") => {
    switch (status) {
      case "up":
        return { color: "bg-green-500", label: "Operational" };
      case "degraded":
        return { color: "bg-yellow-500", label: "Degraded" };
      case "down":
        return { color: "bg-red-500", label: "Down" };
      default:
        return { color: "bg-gray-500", label: "Unknown" };
    }
  };

  const { color, label } = getStatusConfig(status);

  return (
    <span className="inline-flex items-center gap-2 text-sm">
      <span className={`h-2 w-2 rounded-full ${color}`} aria-hidden="true" />
      <span className="sr-only">Status:</span>
      {label}
    </span>
  );
}
