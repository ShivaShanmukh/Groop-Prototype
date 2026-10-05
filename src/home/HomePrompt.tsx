"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { GAMES, matchPrompt } from "@/games/meta";

/** Home prompt bar. Free text routes to the closest starter game. */
export function HomePrompt() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [note, setNote] = useState("");

  const submit = (): void => {
    const value = text.trim();
    if (!value) return;
    const game = matchPrompt(value);
    if (!game) {
      setNote("In this mockup, pick one of the starter games below, or describe one of them.");
    } else if (!game.ready) {
      setNote(`${game.name} arrives in the next phase. Try one of the other starters for now.`);
    } else {
      router.push(`/studio/${game.id}?prompt=${encodeURIComponent(value)}`);
    }
  };

  return (
    <form
      className="home-prompt"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <textarea
        value={text}
        rows={2}
        placeholder={GAMES[1]?.prompt}
        onChange={(e) => {
          setText(e.target.value);
          setNote("");
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
      />
      <button type="submit" className="btn btn-accent" disabled={!text.trim()}>
        Make it
      </button>
      {note && <p className="home-note">{note}</p>}
    </form>
  );
}
