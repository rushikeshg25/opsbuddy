'use client';
import { LogsResponse } from '@/lib/types/api';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';

function LogsPanel({
  logs,
  isLoading,
  error,
  formatTimestamp,
}: {
  logs?: LogsResponse;
  isLoading?: boolean;
  error?: any;
  formatTimestamp: (timestamp: string | undefined | null) => string;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState('');

  // Parse log data from the API response
  const parsedLogs =
    logs?.logs?.map((log) => {
      // Debug: log the raw log data to see what we're getting
      console.log('Raw log data:', log);
      try {
        const parsed = JSON.parse(log.log_data);
        return {
          id: log.id,
          ts: log.Timestamp || new Date().toISOString(), // Fallback to current time if timestamp is missing
          level: parsed.level || 'info',
          message: parsed.message || log.log_data,
          fields: parsed,
          rawFields: JSON.stringify(parsed, null, 2),
        };
      } catch {
        return {
          id: log.id,
          ts: log.Timestamp || new Date().toISOString(), // Fallback to current time if timestamp is missing
          level: 'info',
          message: log.log_data,
          fields: {},
          rawFields: '{}',
        };
      }
    }) || [];

  // Filter logs based on search and level
  const filteredLogs = parsedLogs.filter((log) => {
    const matchesSearch =
      !searchTerm ||
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.rawFields.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesLevel = !levelFilter || log.level === levelFilter;

    return matchesSearch && matchesLevel;
  });

  const displayLogs = filteredLogs.length > 0 ? filteredLogs : [];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Logs</CardTitle>
      </CardHeader>
      <CardContent className="px-4 py-2">
        {error && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
            <p className="text-sm text-red-600 dark:text-red-400">
              Failed to load logs: {error.message || 'Unknown error'}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex w-full items-center gap-2 sm:max-w-md">
            <Input
              placeholder="Search logs (messages)"
              aria-label="Search logs"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select
              className="rounded-md border bg-background px-2 py-1.5 text-sm"
              aria-label="Level"
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
            >
              <option value="">All</option>
              <option value="error">Error</option>
              <option value="warn">Warn</option>
              <option value="info">Info</option>
              <option value="debug">Debug</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              type="button"
              onClick={() => {
                setSearchTerm('');
                setLevelFilter('');
              }}
            >
              Clear Filters
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="mt-4 text-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Loading logs...
            </p>
          </div>
        ) : displayLogs.length === 0 ? (
          <div className="mt-4 text-center py-8">
            <p className="text-gray-600 dark:text-gray-400">
              {parsedLogs.length === 0
                ? 'No logs available'
                : 'No logs match your filters'}
            </p>
          </div>
        ) : (
          <>
            <div className="mt-4 overflow-x-auto rounded-lg border">
              <table className="w-full text-left text-sm table-fixed">
                <thead className="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="w-48 px-4 py-3 text-left font-medium">
                      Time
                    </th>
                    <th className="w-24 px-4 py-3 text-left font-medium">
                      Level
                    </th>
                    <th className="px-4 py-3 text-left font-medium">Message</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {displayLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 text-xs font-mono whitespace-nowrap">
                        {formatTimestamp(log.ts)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            log.level === 'error'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                              : log.level === 'warn'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                              : log.level === 'debug'
                              ? 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                          }`}
                        >
                          {log.level}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm break-words">
                        {log.message}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
export default LogsPanel;
