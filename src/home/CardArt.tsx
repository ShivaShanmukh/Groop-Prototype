/** Simple vector previews for the starter cards. */
export function CardArt({ id }: { id: string }) {
  return (
    <svg className="card-art" viewBox="0 0 160 90" aria-hidden="true">
      <rect width="160" height="90" fill="#121315" />
      {id === "sky-hopper" && (
        <>
          <rect x="14" y="62" width="40" height="8" rx="4" fill="#2a2b30" />
          <rect x="70" y="46" width="34" height="8" rx="4" fill="#2a2b30" />
          <rect x="116" y="30" width="32" height="8" rx="4" fill="#2a2b30" />
          <circle cx="32" cy="54" r="6" fill="#E8833A" />
          <path d="M87 34l2.5 5 5.5.8-4 3.9 1 5.5-5-2.6-5 2.6 1-5.5-4-3.9 5.5-.8z" fill="#ffce54" />
        </>
      )}
      {id === "night-watch" && (
        <>
          <path d="M96 40 L150 20 L150 62 Z" fill="rgba(232,131,58,0.22)" />
          <rect x="60" y="14" width="8" height="46" fill="#2a2b30" />
          <circle cx="96" cy="40" r="5" fill="#c9cad3" />
          <circle cx="30" cy="66" r="5" fill="#f2efe9" stroke="#E8833A" strokeWidth="2" />
          <circle cx="138" cy="72" r="4" fill="#ffce54" />
          <rect x="8" y="12" width="6" height="20" fill="#7a2e2e" />
        </>
      )}
      {id === "brick-storm" && (
        <>
          {[0, 1, 2].map((r) =>
            [0, 1, 2, 3, 4, 5].map((c) => (
              <rect
                key={`${r}-${c}`}
                x={14 + c * 22}
                y={12 + r * 10}
                width="19"
                height="7"
                rx="1.5"
                fill={["#ff4fd8", "#4fd8ff", "#E8833A"][r]}
                opacity={(r + c) % 4 === 0 ? 0.25 : 0.9}
              />
            )),
          )}
          <circle cx="92" cy="58" r="3.5" fill="#f2efe9" />
          <rect x="64" y="76" width="34" height="5" rx="2.5" fill="#f2efe9" />
        </>
      )}
      {id === "vault-run" && (
        <>
          <path d="M20 78 L60 30 L120 30 L148 78 Z" fill="#1d1e22" stroke="#2f3036" />
          <rect x="72" y="40" width="10" height="22" fill="#2a2b30" />
          <path d="M108 44 L88 70 L128 70 Z" fill="rgba(232,131,58,0.25)" />
          <circle cx="108" cy="42" r="4" fill="#c9cad3" />
          <circle cx="48" cy="68" r="4.5" fill="#E8833A" />
        </>
      )}
    </svg>
  );
}
