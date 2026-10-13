"use client";
import { useState } from "react";
import { QuickFixesResponse } from "@/lib/types/api";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Wrench } from "lucide-react";

export default function Quickfixes({
  quickfixes,
  isLoading,
  error,
  onPageChange,
}: {
  quickfixes?: QuickFixesResponse;
  isLoading?: boolean;
  error?: { message?: string };
  onPageChange?: (page: number) => void;
}) {
  const [search, setSearch] = useState("");
  const fixes = (quickfixes?.quickfixes ?? []).filter((f) =>
    `${f.title} ${f.description}`.toLowerCase().includes(search.toLowerCase()),
  );
  const pages = quickfixes
    ? Math.max(1, Math.ceil(quickfixes.total / quickfixes.limit))
    : 1;
  return (
    <section className="panel overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b p-6">
        <div>
          <h2 className="font-medium">Suggested next steps</h2>
          <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
            AI suggestions from incident logs. Review each suggestion against
            your service before making changes.
          </p>
        </div>
        <Input
          className="sm:max-w-xs"
          aria-label="Search suggestions on this page"
          placeholder="Search this page…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {error ? (
        <p role="alert" className="p-6 text-sm text-destructive">
          Could not load suggestions. {error.message}
        </p>
      ) : isLoading ? (
        <p role="status" className="empty-state">
          Loading suggestions…
        </p>
      ) : !fixes.length ? (
        <div className="empty-state">
          <Wrench className="mx-auto mb-3 size-6" />
          <p>
            {search
              ? "No suggestions match your search."
              : "No suggestions available yet."}
          </p>
          <p className="mt-2 text-xs">
            {search
              ? "Try another term or browse another page."
              : "Suggestions appear after an incident is analyzed."}
          </p>
        </div>
      ) : (
        <div className="divide-y">
          {fixes.map((f) => (
            <details key={f.id} className="group p-6">
              <summary className="cursor-pointer text-sm font-medium">
                {f.title}
                <span className="mt-2 block text-xs font-normal text-muted-foreground">
                  Incident #{f.downtime_id} ·{" "}
                  {new Date(f.created_at).toLocaleString()}
                </span>
              </summary>
              <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-muted-foreground">
                {f.description}
              </p>
            </details>
          ))}
        </div>
      )}
      {quickfixes && pages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t p-5 text-xs text-muted-foreground">
          <span>
            Page {quickfixes.page} of {pages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={quickfixes.page <= 1}
              onClick={() => onPageChange?.(quickfixes.page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={quickfixes.page >= pages}
              onClick={() => onPageChange?.(quickfixes.page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
