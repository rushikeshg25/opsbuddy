'use client';

import { useEffect, useRef, useState } from 'react';
import { useAgent } from '@/lib/hooks/use-agent';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

export function AgentChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const { messages, status, isStreaming, error, send } = useAgent();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, status]);

  const submit = () => {
    const text = input;
    setInput('');
    void send(text);
  };

  if (!open) {
    return (
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 shadow-lg"
      >
        Ask OpsBuddy
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 flex h-[32rem] w-[24rem] flex-col shadow-xl">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 py-3">
        <CardTitle className="text-base">Ask OpsBuddy</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setOpen(false)}
          aria-label="Close chat"
        >
          ✕
        </Button>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3 overflow-hidden p-4 pt-0">
        <div
          ref={scrollRef}
          className="flex-1 space-y-3 overflow-y-auto text-sm"
        >
          {messages.length === 0 && (
            <p className="text-muted-foreground">
              Ask about your services — e.g. &quot;why did my API go down last
              night?&quot; or &quot;show error trends this week&quot;.
            </p>
          )}

          {messages.map((m, i) => (
            <div
              key={i}
              className={
                m.role === 'user' ? 'flex justify-end' : 'flex justify-start'
              }
            >
              <div
                className={
                  m.role === 'user'
                    ? 'rounded-lg bg-primary px-3 py-2 text-primary-foreground'
                    : 'rounded-lg bg-muted px-3 py-2 whitespace-pre-wrap'
                }
              >
                {m.content || (isStreaming && i === messages.length - 1 ? '…' : '')}
              </div>
            </div>
          ))}

          {status && (
            <p className="text-xs text-muted-foreground italic">{status}</p>
          )}
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Ask a question…"
            rows={1}
            className="max-h-24 min-h-9 resize-none"
            disabled={isStreaming}
          />
          <Button onClick={submit} disabled={isStreaming || !input.trim()}>
            Send
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
