import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { LineReveal } from "@/components/motion/Reveal";

/** Honest pipeline copy matching what the backend actually does. */
const STEPS = [
  { label: "Reading the source", note: "Fetching the transcript or extracting PDF text" },
  { label: "Structuring concepts", note: "Gemini writes the summary, analogy and mind map" },
  { label: "Preparing your workspace", note: "Laying out the quiz and grounding the chat" },
];

const EASE = [0.22, 1, 0.36, 1] as const;

function TypeOn({ text, active }: { text: string; active: boolean }) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(active && !reduced ? 0 : text.length);

  useEffect(() => {
    if (!active || reduced) {
      setShown(text.length);
      return;
    }
    setShown(0);
    let i = 0;
    const id = setInterval(() => {
      i += 2;
      setShown(Math.min(i, text.length));
      if (i >= text.length) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [active, reduced, text]);

  return (
    <span>
      {text.slice(0, shown)}
      <span className="invisible">{text.slice(shown)}</span>
    </span>
  );
}

export function Processing({ sourceLabel }: { sourceLabel: string }) {
  const [step, setStep] = useState(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    // Advances optimistically; the final step stays active until /generate resolves.
    const t1 = setTimeout(() => setStep(1), 3500);
    const t2 = setTimeout(() => setStep(2), 12000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <motion.div
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center px-6 py-20"
    >
      <p className="label-eyebrow">Building workspace</p>
      <h1 className="mt-4 text-3xl md:text-4xl">
        <LineReveal delay={0.05}>{sourceLabel}</LineReveal>
      </h1>

      {/* Progress reflects the real async pipeline: it never completes until /generate resolves. */}
      <div className="mt-10 h-px w-full bg-rule">
        <motion.div
          className="h-px origin-left bg-accent"
          initial={{ scaleX: 0.04 }}
          animate={{ scaleX: [0.04, 0.34, 0.68][step] ?? 0.68 }}
          transition={{ duration: reduced ? 0 : 0.5, ease: EASE }}
          style={{ width: "100%" }}
        />
      </div>

      <ol className="mt-12 space-y-8">
        {STEPS.map((s, i) => {
          const state = i < step ? "done" : i === step ? "active" : "pending";
          return (
            <motion.li
              key={s.label}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
              animate={{ opacity: state === "pending" ? 0.45 : 1, y: 0 }}
              transition={{ duration: 0.35, ease: EASE, delay: reduced ? 0 : 0.15 + i * 0.1 }}
              className="flex gap-5"
            >
              <span
                aria-hidden
                className={`mt-2 h-2 w-2 shrink-0 rounded-full ${
                  state === "done"
                    ? "bg-success"
                    : state === "active"
                      ? "animate-pulse bg-accent"
                      : "bg-rule"
                }`}
              />
              <span>
                <span className="block font-display text-xl">
                  {state === "active" ? <TypeOn text={s.label} active /> : s.label}
                </span>
                <span className="mt-1 block text-sm text-muted-foreground">{s.note}</span>
              </span>
            </motion.li>
          );
        })}
      </ol>

      <p className="mt-14 border-t border-rule pt-5 text-xs text-muted-foreground">
        Long sources take longer — the transcript is truncated before it reaches the model.
      </p>
    </motion.div>
  );
}
