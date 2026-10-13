"use client";
import { useMemo, useState } from "react";
import { LogsResponse } from "@/lib/types/api";
import { parseLog } from "@/lib/log-format";
import { Search, Terminal } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

export default function LogsPanel({
  logs,
  isLoading,
  error,
  formatTimestamp,
  onPageChange,
}: {
  logs?: LogsResponse;
  isLoading?: boolean;
  error?: { message?: string };
  formatTimestamp: (s: string) => string;
  onPageChange?: (page: number) => void;
}) {
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState("");
  const parsed = useMemo(
    () =>
      (logs?.logs ?? []).map((log) => ({ ...log, ...parseLog(log.log_data) })),
    [logs?.logs],
  );
  const visible = useMemo(
    () =>
      parsed.filter(
        (log) =>
          (!level || log.level === level) &&
          log.message.toLowerCase().includes(search.toLowerCase()),
      ),
    [parsed, level, search],
  );
  const pages = logs ? Math.max(1, Math.ceil(logs.total / logs.limit)) : 1;
  return (
    <section className="panel overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b p-5">
        <div>
          <h2 className="font-medium">Log explorer</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Search and level filters apply to this page of logs.
          </p>
        </div>
        <span className="eyebrow">Refreshes every 30 seconds</span>
      </div>
      <div className="flex flex-wrap gap-3 border-b p-5">
        <div className="relative min-w-40 flex-1">
          <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
          <Input
            className="pl-9"
            aria-label="Search log messages"
            placeholder="Search messages…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="rounded-lg border bg-background px-3 text-sm"
          aria-label="Log level"
          value={level}
          onChange={(e) => setLevel(e.target.value)}
        >
          <option value="">All levels</option>
          {["info", "warn", "error", "debug", "fatal"].map((l) => (
            <option key={l} value={l}>
              {l.toUpperCase()}
            </option>
          ))}
        </select>
        <Button
          variant="ghost"
          onClick={() => {
            setSearch("");
            setLevel("");
          }}
        >
          Reset
        </Button>
      </div>
      {error ? (
        <div role="alert" className="p-6 text-sm text-destructive">
          Could not load logs. {error.message}
        </div>
      ) : isLoading ? (
        <div className="empty-state" role="status">
          Loading logs…
        </div>
      ) : !visible.length ? (
        <div className="empty-state">
          <Terminal className="mx-auto mb-3 size-6" />
          <p>
            {parsed.length
              ? "No logs match these filters."
              : "No logs received yet."}
          </p>
          <p className="mt-2 text-xs">
            {parsed.length
              ? "Change the filters or browse another page."
              : "Connect your service from SDK setup to start collecting logs."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-xs">
            <caption className="sr-only">Service logs, newest first</caption>
            <thead className="border-b bg-muted/40 text-muted-foreground">
              <tr>
                <th scope="col" className="w-48 px-5 py-3 font-medium">
                  Timestamp
                </th>
                <th scope="col" className="w-24 px-3 py-3 font-medium">
                  Level
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Message
                </th>
              </tr>
            </thead>
            <tbody className="divide-y font-mono">
              {visible.map((log) => (
                <tr
                  key={`${log.id}-${log.Timestamp}`}
                  className="hover:bg-muted/30"
                >
                  <td className="whitespace-nowrap px-5 py-4 text-muted-foreground">
                    {formatTimestamp(log.Timestamp)}
                  </td>
                  <td className="px-3 py-4">
                    <span
                      className={`rounded px-2 py-1 text-[10px] font-semibold uppercase ${log.level === "error" || log.level === "fatal" ? "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200" : log.level === "warn" ? "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200" : "bg-muted text-muted-foreground"}`}
                    >
                      {log.level}
                    </span>
                  </td>
                  <td className="max-w-xl whitespace-pre-wrap break-words px-5 py-4 leading-6">
                    {log.message}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {logs && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-4 text-xs text-muted-foreground">
          <span aria-live="polite">
            {visible.length} shown · {logs.total} total logs
          </span>
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant="outline"
              disabled={logs.page <= 1}
              onClick={() => onPageChange?.(logs.page - 1)}
            >
              Previous
            </Button>
            <span>
              {logs.page} / {pages}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={logs.page >= pages}
              onClick={() => onPageChange?.(logs.page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
