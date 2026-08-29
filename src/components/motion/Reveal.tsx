import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * True once the display fonts are fully loaded, so entrance animations never
 * run against a partially-loaded variable font (which renders warped glyphs).
 */
export function useDisplayFontReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    const done = () => {
      if (alive) setReady(true);
    };
    if (typeof document === "undefined" || !document.fonts) {
      done();
      return;
    }
    // Load whichever display family the active theme resolves to, then wait
    // for the full set, so we never animate a partially-loaded variable font.
    const stack =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--font-serif-display")
        .trim() || "serif";
    Promise.all([
      document.fonts.load(`600 3.4rem ${stack}`),
      document.fonts.load(`italic 600 3.4rem ${stack}`),
    ])
      .catch(() => undefined)
      .then(() => document.fonts.ready)
      .then(done, done);
    return () => {
      alive = false;
    };
  }, []);
  return ready;
}

/** Masked line that clips upward into place, only once fonts are loaded. */
export function LineReveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const fontReady = useDisplayFontReady();
  const show = fontReady || reduced;
  return (
    <span className={`block overflow-hidden pb-[0.08em] ${className ?? ""}`}>
      <motion.span
        className="block"
        initial={reduced ? { opacity: 0 } : { y: "108%" }}
        animate={show ? (reduced ? { opacity: 1 } : { y: 0 }) : (reduced ? { opacity: 0 } : { y: "108%" })}
        transition={{ duration: reduced ? 0.15 : 0.55, ease: EASE, delay: reduced ? 0 : delay }}
      >
        {children}
      </motion.span>
    </span>
  );
}

/** Fade + rise on mount. */
export function Rise({
  children,
  delay = 0,
  className,
  y = 12,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  y?: number;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduced ? { opacity: 0 } : { opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0.15 : 0.4, ease: EASE, delay: reduced ? 0 : delay }}
    >
      {children}
    </motion.div>
  );
}

/** Fade + rise once the element scrolls into view. */
export function ScrollReveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10% 0px -10% 0px" }}
      transition={{ duration: reduced ? 0.15 : 0.45, ease: EASE, delay: reduced ? 0 : delay }}
    >
      {children}
    </motion.div>
  );
}

/** Accent rule that draws itself in when it enters the viewport. */
export function DrawRule({ delay = 0, className }: { delay?: number; className?: string }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={`h-px w-full origin-left bg-accent ${className ?? ""}`}
      initial={reduced ? { opacity: 0 } : { scaleX: 0 }}
      whileInView={reduced ? { opacity: 1 } : { scaleX: 1 }}
      viewport={{ once: true }}
      transition={{ duration: reduced ? 0.15 : 0.5, ease: EASE, delay }}
    />
  );
}
