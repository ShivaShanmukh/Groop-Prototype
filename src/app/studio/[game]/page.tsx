import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { findGame, GAMES } from "@/games/meta";
import { Studio } from "@/studio/Studio";

export function generateStaticParams(): { game: string }[] {
  return GAMES.map((g) => ({ game: g.id }));
}

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const meta = findGame((await params).game);
  return { title: meta ? `${meta.name} · GROOP studio` : "GROOP studio" };
}

interface Props {
  params: Promise<{ game: string }>;
  searchParams: Promise<{ prompt?: string | string[] }>;
}

export default async function StudioPage({ params, searchParams }: Props) {
  const { game } = await params;
  const meta = findGame(game);
  if (!meta) notFound();

  if (!meta.ready) {
    return (
      <main className="home">
        <section className="home-hero">
          <h1>{meta.name} is coming next phase</h1>
          <p className="home-sub">Try Night Watch for now.</p>
          <Link className="btn btn-accent" href="/studio/night-watch">
            Open Night Watch
          </Link>
        </section>
      </main>
    );
  }

  const raw = (await searchParams).prompt;
  const typed = (Array.isArray(raw) ? raw[0] : raw)?.trim().slice(0, 300);
  return <Studio key={`${meta.id}:${typed ?? ""}`} meta={meta} prompt={typed || meta.prompt} />;
}
