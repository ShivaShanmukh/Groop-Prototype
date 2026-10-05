"use client";

import { useEffect, useRef, useState } from "react";
import type { ScriptedRequest } from "@/games/types";
import { ChangeCard } from "./ChangeCard";
import type { Message } from "./types";

interface Props {
  messages: Message[];
  requests: ScriptedRequest[];
  disabled: boolean;
  onSend: (text: string) => void;
  onApply: (id: number) => void;
  onDiscard: (id: number) => void;
}

/** Left panel: chat history, suggestion chips and the composer. */
export function Conversation({ messages, requests, disabled, onSend, onApply, onDiscard }: Props) {
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const send = (text: string): void => {
    if (disabled || !text.trim()) return;
    onSend(text);
    setDraft("");
  };

  return (
    <div className="chat">
      <div className="chat-list" ref={listRef}>
        {messages.map((m) => {
          if (m.role === "run") {
            return (
              <ChangeCard key={m.id} run={m.run} onApply={() => onApply(m.id)} onDiscard={() => onDiscard(m.id)} />
            );
          }
          return (
            <div key={m.id} className={`msg msg-${m.role}`}>
              {m.role === "groop" && <span className="msg-who">GROOP</span>}
              <p>{m.text}</p>
            </div>
          );
        })}
      </div>

      <div className="chips" aria-label="Suggestions">
        {requests.map((r) => (
          <button key={r.id} type="button" className="chip" disabled={disabled} onClick={() => send(r.text)}>
            {r.text}
          </button>
        ))}
      </div>

      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
      >
        <textarea
          value={draft}
          rows={2}
          placeholder="Ask for a change…"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(draft);
            }
          }}
        />
        <button type="submit" className="btn btn-accent" disabled={disabled || !draft.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
