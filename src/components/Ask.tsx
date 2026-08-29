import { useEffect, useRef, useState } from "react";
import { formatTimestamp, sendChat } from "@/lib/api";

type Msg = { role: "user" | "tutor"; text: string };

function CitationChip({ seconds, videoId }: { seconds: number; videoId: string | null }) {
  const label = formatTimestamp(seconds);
  if (videoId) {
    return (
      <a
        href={`https://www.youtube.com/watch?v=${videoId}&t=${seconds}s`}
        target="_blank"
        rel="noreferrer"
        className="mx-0.5 inline-flex items-baseline gap-1 border border-accent/50 bg-accent-soft px-1.5 py-0.5 font-mono text-[11px] text-accent transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        ▶ {label}
      </a>
    );
  }
  return (
    <span className="mx-0.5 inline-block border border-rule px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
      [{seconds}]
    </span>
  );
}

function cleanLatex(math: string): string {
  return math
    .replace(/\\mathbf\{([^}]+)\}/g, "$1")
    .replace(/\\mathit\{([^}]+)\}/g, "$1")
    .replace(/\\mathrm\{([^}]+)\}/g, "$1")
    .replace(/\\text\{([^}]+)\}/g, "$1")
    .replace(/\\quad/g, "   ")
    .replace(/\\qquad/g, "      ")
    .replace(/\\rightarrow|\\to/g, "→")
    .replace(/\\leftarrow/g, "←")
    .replace(/\\times/g, "×")
    .replace(/\\pm/g, "±")
    .replace(/\\approx/g, "≈")
    .replace(/\\ne|\\neq/g, "≠")
    .replace(/\\le|\\leq/g, "≤")
    .replace(/\\ge|\\geq/g, "≥")
    .replace(/\\cdot/g, "·")
    .replace(/\\/g, "")
    .trim();
}

function formatMarkdownText(raw: string): React.ReactNode[] {
  const tokens = raw.split(/(`[^`]+?`|\*\*[^*]+?\*\*|\*[^*]+?\*|\$[^\$]+?\$)/g);
  return tokens.map((token, idx) => {
    if (token.startsWith("`") && token.endsWith("`") && token.length > 2) {
      return (
        <code key={idx} className="mx-0.5 rounded border border-rule bg-secondary px-1.5 py-0.5 font-mono text-xs">
          {token.slice(1, -1)}
        </code>
      );
    }
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
    if (token.startsWith("$") && token.endsWith("$") && token.length > 2) {
      const clean = cleanLatex(token.slice(1, -1));
      return (
        <span key={idx} className="mx-0.5 font-mono font-medium text-foreground">
          {clean}
        </span>
      );
    }
    return <span key={idx}>{token}</span>;
  });
}

function Reply({ text, videoId }: { text: string; videoId: string | null }) {
  const normalized = text
    .replace(/\s+\*\s+(\*\*|[A-Za-z0-9])/g, "\n* $1")
    .replace(/\r\n/g, "\n");

  const lines = normalized.split(/\n+/).filter((l) => l.trim().length > 0);

  return (
    <div className="space-y-3 leading-[1.75]">
      {lines.map((line, lineIdx) => {
        const trimmed = line.trim();

        // Horizontal divider
        if (/^---+$/.test(trimmed) || /^___+$/.test(trimmed)) {
          return <hr key={lineIdx} className="my-3 border-rule" />;
        }

        // Display math block: $$...$$
        if (trimmed.startsWith("$$") && trimmed.endsWith("$$") && trimmed.length > 4) {
          const math = cleanLatex(trimmed.slice(2, -2));
          return (
            <div
              key={lineIdx}
              className="my-2 inline-block rounded border border-rule bg-secondary px-4 py-2 font-mono text-sm tracking-wider text-foreground"
            >
              {math}
            </div>
          );
        }

        // Heading: ### or ## or #
        const headingMatch = /^(#{1,4})\s+(.+)$/.exec(trimmed);
        if (headingMatch) {
          const level = headingMatch[1]!.length;
          const hContent = headingMatch[2]!;
          const hParts = hContent.split(/(`?\[\d{1,6}(?:[-–—]\d{1,6})?\]`?)/g);
          return (
            <h4
              key={lineIdx}
              className={`font-display font-medium text-foreground ${
                level <= 2 ? "mt-4 text-xl" : "mt-3 text-lg"
              }`}
            >
              {hParts.map((p, i) => {
                const m = /^`?\[(\d{1,6})(?:[-–—]\d{1,6})?\]`?$/.exec(p);
                if (m) {
                  return <CitationChip key={i} seconds={Number(m[1])} videoId={videoId} />;
                }
                return <span key={i}>{formatMarkdownText(p)}</span>;
              })}
            </h4>
          );
        }

        // Bullet item
        const isBullet = /^[*•-]\s+/.test(trimmed);
        const cleanLine = isBullet ? trimmed.replace(/^[*•-]\s+/, "") : trimmed;
        const parts = cleanLine.split(/(`?\[\d{1,6}(?:[-–—]\d{1,6})?\]`?)/g);

        const content = parts.map((p, i) => {
          const m = /^`?\[(\d{1,6})(?:[-–—]\d{1,6})?\]`?$/.exec(p);
          if (m) {
            return <CitationChip key={i} seconds={Number(m[1])} videoId={videoId} />;
          }
          return <span key={i}>{formatMarkdownText(p)}</span>;
        });

        if (isBullet) {
          return (
            <div key={lineIdx} className="flex items-start gap-3 pl-1">
              <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              <div className="flex-1 text-base">{content}</div>
            </div>
          );
        }

        return (
          <p key={lineIdx} className="text-base">
            {content}
          </p>
        );
      })}
    </div>
  );
}


export function Ask({
  sessionId,
  videoId,
  sourceLabel,
  onSessionExpired,
}: {
  sessionId: string;
  videoId: string | null;
  sourceLabel: string;
  onSessionExpired: () => void;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, busy]);

  const ask = async (question: string) => {
    const q = question.trim();
    if (!q || busy) return;
    setMessages((m) => [...m, { role: "user", text: q }]);
    setInput("");
    setBusy(true);
    setError(null);
    try {
      const reply = await sendChat(sessionId, q);
      if (reply.trim().toLowerCase().startsWith("session expired")) {
        onSessionExpired();
        return;
      }
      setMessages((m) => [...m, { role: "tutor", text: reply }]);
    } catch {
      setError("The tutor couldn't answer that one. Try asking again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stage-enter flex max-w-3xl flex-col">
      <p className="label-eyebrow">Stage four</p>
      <h2 className="mt-3 text-3xl md:text-4xl">Ask</h2>
      <p className="mt-3 text-sm text-muted-foreground">
        Answers come only from{" "}
        <span className="text-foreground">{sourceLabel}</span>
        {videoId ? " — citations jump to that moment in the video." : " — nothing outside this document."}
      </p>

      <div className="mt-10 space-y-8">
        {messages.length === 0 ? (
          <div className="border-l-2 border-rule pl-5">
            <p className="text-sm text-muted-foreground">Try asking:</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                "What is the main argument here?",
                "Explain the hardest part again, simply.",
                "Where is this covered in the source?",
              ].map((s) => (
                <button
                  key={s}
                  onClick={() => ask(s)}
                  className="border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-accent hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="ml-auto max-w-[85%] bg-secondary px-5 py-3 text-base">
              {m.text}
            </div>
          ) : (
            <div key={i} className="max-w-[95%] border-l-2 border-accent pl-5">
              <p className="label-eyebrow mb-2">Tutor</p>
              <Reply text={m.text} videoId={videoId} />
            </div>
          ),
        )}

        {busy ? (
          <p className="label-eyebrow animate-pulse">Reading the source…</p>
        ) : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void ask(input);
        }}
        className="sticky bottom-16 mt-10 flex items-end gap-4 border-t border-rule bg-background pt-4 md:bottom-0"
      >
        <label htmlFor="chat-input" className="sr-only">
          Ask about this source
        </label>
        <input
          id="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about this source…"
          className="flex-1 bg-transparent py-2 text-base outline-none placeholder:text-muted-foreground/70"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="bg-accent px-5 py-2.5 text-sm text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-35"
        >
          Ask
        </button>
      </form>
    </div>
  );
}
