import Link from "next/link";
import { GAMES } from "@/games/meta";
import { CardArt } from "@/home/CardArt";
import { HomePrompt } from "@/home/HomePrompt";

export default function Home() {
  return (
    <main className="home">
      <header className="home-top">
        <span className="mark">GROOP</span>
        <span className="top-tag">Mockup · scripted AI, real games</span>
      </header>

      <section className="home-hero">
        <h1>What do you want to make?</h1>
        <p className="home-sub">Describe a game. Play it. Ask for changes. Play again.</p>
        <HomePrompt />
      </section>

      <section className="home-cards" aria-label="Starter games">
        {GAMES.map((g) => {
          const body = (
            <>
              <CardArt id={g.id} />
              <div className="card-body">
                <div className="card-row">
                  <span className="card-name">{g.name}</span>
                  <span className="card-genre">{g.genre}</span>
                </div>
                <p className="card-prompt">“{g.prompt}”</p>
                {!g.ready && <span className="pill pill-soon">Coming next phase</span>}
              </div>
            </>
          );
          return g.ready ? (
            <Link key={g.id} href={`/studio/${g.id}`} className="card">
              {body}
            </Link>
          ) : (
            <div key={g.id} className="card is-disabled" aria-disabled="true">
              {body}
            </div>
          );
        })}
      </section>
    </main>
  );
}
