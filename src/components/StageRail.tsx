export type StageId = "understand" | "explore" | "test" | "ask";

export const STAGES: { id: StageId; label: string; caption: string }[] = [
  { id: "understand", label: "Understand", caption: "Summary + analogy" },
  { id: "explore", label: "Explore", caption: "Mind map" },
  { id: "test", label: "Test", caption: "Quiz" },
  { id: "ask", label: "Ask", caption: "Grounded chat" },
];

export function StageRail({
  active,
  onChange,
}: {
  active: StageId;
  onChange: (s: StageId) => void;
}) {
  const handleKey = (e: React.KeyboardEvent) => {
    const idx = STAGES.findIndex((s) => s.id === active);
    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      e.preventDefault();
      onChange(STAGES[Math.min(idx + 1, STAGES.length - 1)]!.id);
    }
    if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      e.preventDefault();
      onChange(STAGES[Math.max(idx - 1, 0)]!.id);
    }
  };

  return (
    <>
      {/* Desktop rail */}
      <nav
        aria-label="Learning stages"
        onKeyDown={handleKey}
        className="hidden md:block"
        role="tablist"
      >
        <p className="label-eyebrow">Journey</p>
        <ol className="mt-5 space-y-1">
          {STAGES.map((s, i) => {
            const isActive = s.id === active;
            return (
              <li key={s.id}>
                <button
                  role="tab"
                  aria-selected={isActive}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => onChange(s.id)}
                  className={`group flex w-full items-baseline gap-3 border-l-2 py-2 pl-4 text-left transition-all duration-200 hover:translate-x-1 ${
                    isActive ? "border-accent" : "border-transparent hover:border-rule"
                  }`}
                >
                  <span className={`font-mono text-[11px] tracking-[0.18em] ${isActive ? "text-accent" : "text-muted-foreground"}`}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span>
                    <span
                      className={`block font-display text-lg leading-tight ${
                        isActive ? "" : "text-muted-foreground group-hover:text-foreground"
                      }`}
                    >
                      {s.label}
                    </span>

                    <span className="text-xs text-muted-foreground">{s.caption}</span>
                  </span>
                </button>
              </li>
            );
          })}
          <li aria-disabled className="flex items-baseline gap-3 border-l-2 border-transparent py-2 pl-4 opacity-45">
            <span className="font-mono text-[11px] text-muted-foreground">05</span>
            <span>
              <span className="block font-display text-lg leading-tight text-muted-foreground">
                Improve
              </span>
              <span className="text-xs text-muted-foreground">Retest weak concepts — soon</span>
            </span>
          </li>
        </ol>
      </nav>

      {/* Mobile bottom bar */}
      <nav
        aria-label="Learning stages"
        className="fixed inset-x-0 bottom-0 z-20 flex border-t border-rule bg-paper md:hidden"
      >
        {STAGES.map((s) => (
          <button
            key={s.id}
            onClick={() => onChange(s.id)}
            aria-current={s.id === active}
            className={`flex-1 border-t-2 px-1 py-3 text-xs transition-colors ${
              s.id === active ? "border-accent text-foreground" : "border-transparent text-muted-foreground"
            }`}
          >
            {s.label}
          </button>
        ))}
        <span className="flex-1 border-t-2 border-transparent px-1 py-3 text-center text-xs text-muted-foreground opacity-40">
          Improve
        </span>
      </nav>
    </>
  );
}
