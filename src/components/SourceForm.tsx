import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRef, useState } from "react";
import { DrawRule, LineReveal, Rise, ScrollReveal } from "@/components/motion/Reveal";
import { FieldSelect } from "@/components/FieldSelect";

export type SourceSettings = {
  sourceType: "youtube" | "pdf";
  url: string;
  file: File | null;
  style: string;
  qCount: number;
  difficulty: string;
};

const PERSONAS = [
  "Explain like I'm 5",
  "Marvel Universe",
  "Hardcore Gamer",
  "Gen-Z Slang",
  "Corporate Speak",
];
const DIFFICULTIES = ["Mix", "Easy", "Medium", "Hard"];

const STAGES = [
  { name: "Understand", note: "Summary + a human analogy" },
  { name: "Explore", note: "A mind map of the concepts" },
  { name: "Test", note: "A quiz written from the source" },
  { name: "Ask", note: "Chat grounded in the source" },
];

const EASE = [0.22, 1, 0.36, 1] as const;

export function SourceForm({
  onSubmit,
  error,
}: {
  onSubmit: (s: SourceSettings) => void;
  error?: { title: string; detail: string } | null;
}) {
  const [sourceType, setSourceType] = useState<"youtube" | "pdf">("youtube");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [style, setStyle] = useState(PERSONAS[0]!);
  const [qCount, setQCount] = useState(5);
  const [difficulty, setDifficulty] = useState("Mix");
  const [urlFocused, setUrlFocused] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const reduced = useReducedMotion();

  const ready = sourceType === "youtube" ? url.trim().length > 0 : Boolean(file);

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-16 md:py-24">
      <Rise delay={0} y={6}>
        <p className="label-eyebrow">Concept Chef</p>
      </Rise>

      <h1 className="mt-6 max-w-4xl text-[2.1rem] leading-[1.05] md:text-[3.4rem]">
        <LineReveal delay={0.06}>Turn a video or document into</LineReveal>
        <LineReveal delay={0.16}>
          a <em className="italic">complete</em> learning workspace.
        </LineReveal>
      </h1>

      <Rise delay={0.34}>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground">
          One source in. Four stages out — read it, map it, test yourself on it, then question it
          directly.
        </p>
      </Rise>

      <div className="mt-14 grid gap-14 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <Rise delay={0.42}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!ready) return;
              onSubmit({ sourceType, url: url.trim(), file, style, qCount, difficulty });
            }}
          >
            <div
              role="radiogroup"
              aria-label="Source type"
              className="inline-flex border-b border-rule"
            >
              {(["youtube", "pdf"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={sourceType === t}
                  onClick={() => setSourceType(t)}
                  data-cursor={t === "youtube" ? "Paste" : "Upload"}
                  className={`relative -mb-px px-1 pb-3 pt-3 text-sm transition-colors first:mr-8 ${
                    sourceType === t
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t === "youtube" ? "Paste YouTube link" : "Upload PDF"}
                  {sourceType === t ? (
                    <motion.span
                      layoutId="tab-underline"
                      className="absolute inset-x-0 -bottom-px h-0.5 bg-accent"
                      transition={
                        reduced
                          ? { duration: 0 }
                          : { type: "spring", stiffness: 520, damping: 34, mass: 0.7 }
                      }
                    />
                  ) : null}
                </button>
              ))}
            </div>

            <div className="mt-8">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={sourceType}
                  initial={reduced ? { opacity: 0 } : { opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={reduced ? { opacity: 0 } : { opacity: 0, x: -10 }}
                  transition={{ duration: 0.22, ease: EASE }}
                >
                  {sourceType === "youtube" ? (
                    <div>
                      <label
                        htmlFor="yt-url"
                        className={`label-util transition-colors ${
                          urlFocused ? "text-accent" : "text-muted-foreground"
                        }`}
                      >
                        Video URL
                      </label>
                      <div className="draw-rule mt-3 border-b border-input">
                        <input
                          id="yt-url"
                          type="url"
                          value={url}
                          onChange={(e) => setUrl(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !url.trim()) {
                              e.preventDefault();
                            }
                          }}
                          onFocus={() => setUrlFocused(true)}
                          onBlur={() => setUrlFocused(false)}
                          placeholder="https://www.youtube.com/watch?v=..."
                          data-cursor="Paste"
                          className="w-full bg-transparent pb-3 font-display text-2xl outline-none placeholder:text-muted-foreground/50 md:text-3xl"
                        />
                        <span
                          aria-hidden
                          className="draw-rule-line"
                          style={{ transform: `scaleX(${urlFocused ? 1 : 0})` }}
                        />
                      </div>
                      <p className="mt-3 text-sm text-muted-foreground">
                        The video needs captions — the transcript is what everything is built from.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <span className="label-util text-muted-foreground">Document</span>
                      <input
                        ref={fileRef}
                        id="pdf-file"
                        type="file"
                        accept="application/pdf"
                        className="sr-only"
                        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                      />
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        data-cursor="Upload"
                        className="group mt-3 flex w-full items-baseline justify-between border-b border-input pb-3 text-left font-display text-2xl transition-colors hover:border-accent md:text-3xl"
                      >
                        <span className={file ? "" : "text-muted-foreground/50"}>
                          {file ? file.name : "Choose a PDF…"}
                        </span>
                        <span className="label-util shrink-0 text-muted-foreground transition-colors group-hover:text-accent">
                          Browse
                        </span>
                      </button>
                      <p className="mt-3 text-sm text-muted-foreground">
                        Text-based PDFs only, up to 16 MB. Scans have no extractable text.
                      </p>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            <fieldset className="mt-12 grid gap-8 sm:grid-cols-3">
              <legend className="label-eyebrow mb-4">Tuning</legend>
              <FieldSelect
                id="style"
                label="Explanation persona"
                value={style}
                options={PERSONAS}
                onChange={setStyle}
              />
              <div>
                <label htmlFor="qcount" className="label-util block text-muted-foreground">
                  Quiz questions
                </label>
                <input
                  id="qcount"
                  type="number"
                  min={1}
                  max={100}
                  value={qCount}
                  onChange={(e) => setQCount(Number(e.target.value))}
                  className="mt-3 w-full border-b border-input bg-transparent pb-2 font-mono text-sm outline-none transition-colors focus:border-accent"
                />
              </div>
              <FieldSelect
                id="difficulty"
                label="Difficulty"
                value={difficulty}
                options={DIFFICULTIES}
                onChange={setDifficulty}
              />
            </fieldset>

            <div className="mt-12 max-w-md">
              <DrawRule className="mb-8 opacity-70" />
              <motion.button
                type="submit"
                disabled={!ready}
                whileHover={reduced || !ready ? {} : { scale: 1.01 }}
                whileTap={reduced || !ready ? {} : { scale: 0.97 }}
                transition={{ type: "spring", stiffness: 480, damping: 22 }}
                className="group inline-flex items-center gap-3 border border-accent bg-accent px-7 py-4 text-sm font-medium text-accent-foreground transition-colors hover:bg-transparent hover:text-accent disabled:cursor-not-allowed disabled:border-transparent disabled:bg-muted disabled:text-muted-foreground"
              >
                Build my learning workspace
                <span
                  aria-hidden
                  className="inline-block transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:translate-x-1.5"
                >
                  →
                </span>
              </motion.button>
            </div>

            <AnimatePresence>
              {error ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25, ease: EASE }}
                  className="mt-8 border-l-2 border-destructive bg-destructive-soft/60 px-5 py-4"
                >
                  <p className="font-display text-lg">{error.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{error.detail}</p>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </form>
        </Rise>

        <aside className="lg:border-l lg:border-rule lg:pl-10">
          <Rise delay={0.4}>
            <p className="label-eyebrow">What you get</p>
          </Rise>
          <ol className="mt-5 space-y-6">
            {STAGES.map((s, i) => (
              <motion.li
                key={s.name}
                initial={reduced ? { opacity: 0 } : { opacity: 0, x: 14 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  duration: 0.4,
                  ease: EASE,
                  delay: reduced ? 0 : 0.5 + i * 0.08,
                }}
                className="group flex gap-4"
              >
                <span className="font-mono text-[11px] tracking-[0.18em] text-accent">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="transition-transform duration-200 group-hover:translate-x-1">
                  <span className="block font-display text-xl leading-tight">{s.name}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">{s.note}</span>
                </span>
              </motion.li>
            ))}
          </ol>
          <ScrollReveal delay={0.05}>
            <p className="mt-8 border-t border-rule pt-5 text-xs leading-relaxed text-muted-foreground">
              Workspaces live in memory only. Refreshing the page — or a server restart — ends the
              session, so export before you leave.
            </p>
          </ScrollReveal>
        </aside>
      </div>
    </div>
  );
}
