import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

/**
 * Desktop-only cursor companion: shows a small labelled pill when hovering
 * elements that declare data-cursor="Paste" / "Upload" / etc.
 */
export function CursorPill() {
  const reduced = useReducedMotion();
  const [label, setLabel] = useState<string | null>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (reduced) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const onMove = (e: MouseEvent) => {
      setPos({ x: e.clientX, y: e.clientY });
      const el = (e.target as Element | null)?.closest?.("[data-cursor]");
      setLabel(el ? (el as HTMLElement).dataset["cursor"] ?? null : null);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [reduced]);

  if (reduced) return null;

  return (
    <AnimatePresence>
      {label ? (
        <motion.div
          key="cursor-pill"
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.7 }}
          transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
          style={{ left: pos.x, top: pos.y }}
          className="pointer-events-none fixed z-[60] -translate-y-1/2 translate-x-4 bg-accent px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-accent-foreground"
        >
          {label}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
