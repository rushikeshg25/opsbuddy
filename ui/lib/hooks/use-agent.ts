'use client';

import { useCallback, useState } from 'react';

const AGENT_API_URL =
  process.env.NEXT_PUBLIC_AGENT_API_URL || 'http://localhost:8081';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface SSEFrame {
  event: string;
  data: string;
}

function parseFrame(frame: string): SSEFrame {
  let event = 'message';
  const dataLines: string[] = [];
  for (const line of frame.split('\n')) {
    if (line.startsWith('event:')) {
      event = line.slice(6).trim();
    } else if (line.startsWith('data:')) {
      // Strip exactly one leading space added by the SSE encoder.
      dataLines.push(line.slice(5).replace(/^ /, ''));
    }
  }
  return { event, data: dataLines.join('\n') };
}

export function useAgent() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const appendToAssistant = useCallback((chunk: string) => {
    setMessages((prev) => {
      const next = [...prev];
      const last = next[next.length - 1];
      next[next.length - 1] = { role: 'assistant', content: last.content + chunk };
      return next;
    });
  }, []);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

      setError(null);
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      setMessages((prev) => [
        ...prev,
        { role: 'user', content: trimmed },
        { role: 'assistant', content: '' },
      ]);
      setIsStreaming(true);
      setStatus('Thinking…');

      try {
        const res = await fetch(`${AGENT_API_URL}/api/agent/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ message: trimmed, history }),
        });

        if (!res.ok || !res.body) {
          throw new Error(
            res.status === 401
              ? 'Your session expired. Please sign in again.'
              : 'The agent could not process your request.'
          );
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const frames = buffer.split('\n\n');
          buffer = frames.pop() || '';
          for (const frame of frames) {
            if (!frame.trim()) continue;
            const { event, data } = parseFrame(frame);
            if (event === 'status') {
              setStatus(data);
            } else if (event === 'answer') {
              setStatus('');
              appendToAssistant(data);
            } else if (event === 'error') {
              setError(data);
            } else if (event === 'done') {
              setStatus('');
            }
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong.');
      } finally {
        setIsStreaming(false);
        setStatus('');
      }
    },
    [messages, isStreaming, appendToAssistant]
  );

  return { messages, status, isStreaming, error, send };
}
