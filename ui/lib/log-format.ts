// Accept structured logs and the SDK's plain-text [LEVEL] format.
export function parseLog(raw: string): { level: string; message: string } {
  try {
    const value: unknown = JSON.parse(raw);
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const fields = value as Record<string, unknown>;
      return { level: typeof fields.level === 'string' ? fields.level.toLowerCase() : 'info', message: typeof fields.message === 'string' ? fields.message : raw };
    }
  } catch { /* Plain text is a supported format. */ }
  const match = raw.match(/^\[(INFO|WARN|ERROR|DEBUG|FATAL)\]\s*([\s\S]*)$/i);
  return { level: match ? match[1].toLowerCase() : 'info', message: match ? match[2] : raw };
}
