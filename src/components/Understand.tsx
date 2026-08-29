function formatMarkdownText(raw: string): React.ReactNode[] {
  if (!raw) return [];
  const tokens = raw.split(/(\*\*[^*]+?\*\*|\*[^*]+?\*)/g);
  return tokens.map((token, idx) => {
    if (token.startsWith("**") && token.endsWith("**") && token.length > 4) {
      return (
        <strong key={idx} className="font-semibold text-foreground">
          {token.slice(2, -2)}
        </strong>
      );
    }
    if (token.startsWith("*") && token.endsWith("*") && token.length > 2) {
      return (
        <em key={idx} className="italic text-foreground">
          {token.slice(1, -1)}
        </em>
      );
    }
    return <span key={idx}>{token}</span>;
  });
}

export function Understand({
  summary,
  analogyTitle,
  analogyContent,
  onNext,
}: {
  summary: string[];
  analogyTitle: string;
  analogyContent: string;
  onNext: () => void;
}) {
  return (
    <div className="stage-enter max-w-3xl">
      <p className="label-eyebrow">Stage one</p>
      <h2 className="mt-3 text-3xl md:text-4xl">Understand</h2>

      <ul className="mt-10 space-y-6">
        {(summary ?? []).map((line, i) => (
          <li key={i} className="flex gap-5 border-b border-rule pb-6 last:border-0">
            <span className="mt-1 font-mono text-[11px] text-accent">
              {String(i + 1).padStart(2, "0")}
            </span>
            <p className="text-lg leading-relaxed">{formatMarkdownText(line)}</p>
          </li>
        ))}
      </ul>

      <section className="mt-14 border-l-2 border-accent pl-6 md:pl-8">
        <p className="label-eyebrow">The human way to think about it</p>
        <h3 className="mt-3 text-2xl md:text-3xl">{analogyTitle}</h3>
        <div className="mt-4 space-y-3 font-display text-xl leading-[1.65] text-foreground/90 md:text-[1.4rem]">
          {analogyContent
            .split(/\n+/)
            .filter((p) => p.trim().length > 0)
            .map((p, idx) => (
              <p key={idx}>{formatMarkdownText(p)}</p>
            ))}
        </div>
      </section>

      <button
        onClick={onNext}
        className="mt-14 inline-flex items-center gap-3 border-b border-accent pb-1 text-sm text-foreground transition-opacity hover:opacity-70"
      >
        Next: explore the concept map <span aria-hidden>→</span>
      </button>
    </div>
  );
}
