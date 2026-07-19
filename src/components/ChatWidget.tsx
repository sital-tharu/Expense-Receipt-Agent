"use client";

import { useEffect, useRef, useState } from "react";
import { getStoredOwnerKey } from "@/lib/owner-key";

interface Message {
  role: "user" | "agent";
  text: string;
}

const EXAMPLE_QUESTIONS = [
  "How much did I spend on food this week?",
  "What subscriptions am I paying for?",
  "What was my biggest expense this month?",
  "Any unusual spending lately?",
];

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // keep the newest message in view
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, busy]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    setInput("");
    setBusy(true);
    setMessages((m) => [...m, { role: "user", text: q }]);
    try {
      // the owner's questions are exempt from the public demo's daily cap
      const key = getStoredOwnerKey();
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(key ? { "x-owner-key": key } : {}),
        },
        body: JSON.stringify({ question: q }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        setMessages((m) => [
          ...m,
          { role: "agent", text: data?.error ?? "Something went wrong — try again." },
        ]);
        return;
      }
      // stream the answer into a bubble as Gemini generates it. The
      // append-vs-replace decision must come from the state itself: React
      // runs updaters lazily, so outside flags are stale by the time they run.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        const text = acc;
        setMessages((m) => {
          const last = m[m.length - 1];
          const rest = last?.role === "agent" ? m.slice(0, -1) : m;
          return [...rest, { role: "agent", text }];
        });
      }
      if (!acc.trim()) {
        setMessages((m) => [
          ...m,
          { role: "agent", text: "The agent went quiet — please try again." },
        ]);
      }
    } catch {
      setMessages((m) => [
        ...m,
        { role: "agent", text: "Couldn't reach the agent — try again." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label="Ask about your spending"
        title="Ask about your spending"
        className="fixed bottom-5 right-5 z-40 flex h-13 w-13 items-center justify-center rounded-full bg-emerald-600 text-2xl text-white shadow-lg hover:bg-emerald-500"
      >
        💬
      </button>
    );
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex max-h-[80dvh] flex-col rounded-t-2xl border border-gray-200 bg-white shadow-2xl sm:inset-x-auto sm:bottom-6 sm:right-5 sm:w-96 sm:rounded-2xl dark:border-gray-700 dark:bg-gray-950">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
        <div>
          <h2 className="text-sm font-semibold">Ask about your spending</h2>
          <p className="text-[11px] text-gray-500">
            Answers come straight from the receipts on this dashboard
          </p>
        </div>
        <button
          onClick={() => setOpen(false)}
          aria-label="Close chat"
          className="rounded px-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
        >
          ✕
        </button>
      </div>

      <div ref={scrollRef} className="min-h-40 flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <div>
            <p className="text-xs text-gray-500">Try one of these:</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {EXAMPLE_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => ask(q)}
                  className="rounded-full border border-emerald-600/40 px-2.5 py-1 text-left text-xs text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-8 rounded-xl rounded-br-sm bg-emerald-600 px-3 py-2 text-[13px] text-white"
                : "mr-8 rounded-xl rounded-bl-sm bg-gray-100 px-3 py-2 text-[13px] dark:bg-gray-800"
            }
          >
            {m.text}
          </div>
        ))}
        {busy && messages[messages.length - 1]?.role === "user" && (
          <p className="mr-8 animate-pulse rounded-xl rounded-bl-sm bg-gray-100 px-3 py-2 text-[13px] text-gray-500 dark:bg-gray-800">
            Reading your receipts…
          </p>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void ask(input);
        }}
        className="flex gap-2 border-t border-gray-100 p-3 dark:border-gray-800"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything about this spending…"
          maxLength={300}
          className="min-w-0 flex-1 rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-gray-700"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="rounded-md bg-emerald-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
