import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  Bot,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { apiRequest, errorMessage } from '../lib/api';
import { cn } from '../lib/cn';
import type { AssistantResponse, AssistantSource } from '../lib/types';

type ChatMessage = {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  source?: AssistantSource;
};

const WELCOME_MESSAGE =
  "Hello! I'm your CPC Event Registration Assistant. I can help you explore upcoming events, understand registration procedures, and answer questions about the system. What would you like to know?";

const SUGGESTIONS = [
  'What events are upcoming?',
  'How do I register for an event?',
  'How do I cancel my registration?',
  'How does EventHub protect my account?',
];

const INITIAL_MESSAGES: ChatMessage[] = [
  { id: 1, role: 'assistant', content: WELCOME_MESSAGE },
];

function sourceLabel(source?: AssistantSource): string | null {
  if (!source) return null;
  if (source === 'ai') return 'AI model';
  if (source === 'guardrail') return 'Scope guard';
  return 'EventHub knowledge base';
}

export function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nextId = useRef(2);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const handleOpen = () => setOpen(true);
    window.addEventListener('eventhub:assistant-open', handleOpen);
    return () => {
      window.removeEventListener('eventhub:assistant-open', handleOpen);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 120);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, sending, open]);

  const resetChat = () => {
    setMessages(INITIAL_MESSAGES);
    setInput('');
    setError(null);
    setSending(false);
    inputRef.current?.focus();
  };

  const sendMessage = async (raw: string) => {
    const text = raw.trim();
    if (!text || sending) return;
    if (text.length > 1000) {
      setError('Please keep your question under 1,000 characters.');
      return;
    }

    const userMessage: ChatMessage = {
      id: nextId.current++,
      role: 'user',
      content: text,
    };
    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setInput('');
    setError(null);
    setSending(true);

    const history = nextMessages
      .slice(1)
      .slice(-8)
      .map((message) => ({
        role: message.role,
        content: message.content,
      }));

    try {
      const response = await apiRequest<AssistantResponse>(
        '/assistant/chat',
        {
          method: 'POST',
          body: JSON.stringify({ message: text, history }),
        },
      );

      setMessages((current) => [
        ...current,
        {
          id: nextId.current++,
          role: 'assistant',
          content: response.reply,
          source: response.source,
        },
      ]);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendMessage(input);
  };

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-40 flex h-14 items-center gap-2.5 rounded-full bg-brand-950 px-5 text-sm font-bold text-white shadow-xl shadow-brand-950/25 ring-1 ring-white/10 transition hover:-translate-y-0.5 hover:bg-brand-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          aria-label="Open AI Assistance"
        >
          <Sparkles className="h-5 w-5 text-gold-300" />
          <span className="hidden sm:inline">AI Assistance</span>
        </button>
      )}

      {open && (
        <section
          className="animate-pop fixed inset-x-3 bottom-3 top-16 z-50 flex min-h-0 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/20 sm:inset-x-auto sm:inset-y-auto sm:bottom-6 sm:right-6 sm:top-auto sm:h-[min(36rem,calc(100dvh-3rem))] sm:w-[25rem]"
          aria-label="EventHub AI Assistance"
        >
          <header className="relative overflow-hidden bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800 px-4 py-3.5 text-white">
            <div className="bg-dots pointer-events-none absolute inset-0 opacity-25" />
            <div className="relative flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-400 text-brand-950 shadow-inner">
                <Bot className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm font-bold">AI Assistance</p>
                <p className="flex items-center gap-1.5 text-[11px] font-medium text-brand-100/75">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  CPC events and registration only
                </p>
              </div>
              <button
                type="button"
                onClick={resetChat}
                className="rounded-lg p-2 text-brand-100/70 transition hover:bg-white/10 hover:text-white"
                aria-label="Start a new chat"
                title="New chat"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-brand-100/70 transition hover:bg-white/10 hover:text-white"
                aria-label="Close AI Assistance"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </header>

          <div
            ref={scrollRef}
            className="flex-1 space-y-4 overflow-y-auto bg-slate-50 px-4 py-4"
            aria-live="polite"
          >
            {messages.map((message) => {
              const label = sourceLabel(message.source);
              return (
                <div
                  key={message.id}
                  className={cn(
                    'flex items-end gap-2',
                    message.role === 'user' ? 'justify-end' : 'justify-start',
                  )}
                >
                  {message.role === 'assistant' && (
                    <span className="mb-5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
                      <Bot className="h-3.5 w-3.5" />
                    </span>
                  )}
                  <div
                    className={cn(
                      'max-w-[85%] whitespace-pre-line break-words rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm',
                      message.role === 'user'
                        ? 'rounded-br-md bg-brand-600 text-white'
                        : 'rounded-bl-md border border-slate-200/80 bg-white text-slate-700',
                    )}
                  >
                    {message.content}
                    {message.role === 'assistant' && label && (
                      <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        {label}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}

            {messages.length === 1 && (
              <div className="space-y-2 pl-9">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  Suggested questions
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => void sendMessage(suggestion)}
                      disabled={sending}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-left text-xs font-medium text-slate-600 shadow-sm transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 disabled:opacity-60"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {sending && (
              <div className="flex items-end gap-2">
                <span className="mb-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
                  <Bot className="h-3.5 w-3.5" />
                </span>
                <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
                  {[0, 150, 300].map((delay) => (
                    <span
                      key={delay}
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400"
                      style={{ animationDelay: `${delay}ms` }}
                    />
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p className="flex-1">{error}</p>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="rounded p-0.5 text-rose-400 transition hover:text-rose-600"
                  aria-label="Dismiss error"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          <form
            onSubmit={handleSubmit}
            className="border-t border-slate-200 bg-white p-3"
          >
            <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1.5 focus-within:border-brand-300 focus-within:ring-2 focus-within:ring-brand-100">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void sendMessage(input);
                  }
                }}
                rows={1}
                maxLength={1000}
                placeholder="Ask about CPC events or registration…"
                className="max-h-28 min-h-9 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-slate-800 outline-none placeholder:text-slate-400"
                aria-label="Message the EventHub assistant"
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-1.5 flex items-center justify-between px-1">
              <p className="flex items-center gap-1 text-[10px] font-medium text-slate-400">
                <ShieldCheck className="h-3 w-3" />
                Read-only · cannot change registrations
              </p>
              {input.length > 900 && (
                <span className="text-[10px] font-semibold text-slate-400">
                  {input.length}/1000
                </span>
              )}
            </div>
          </form>
        </section>
      )}
    </>
  );
}
