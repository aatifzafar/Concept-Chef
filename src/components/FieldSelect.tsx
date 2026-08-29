import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

export function FieldSelect({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const move = (dir: 1 | -1) => {
    const i = options.indexOf(value);
    const next = options[Math.min(options.length - 1, Math.max(0, i + dir))];
    if (next) onChange(next);
  };

  return (
    <div ref={wrapRef} className="relative">
      <span
        id={`${id}-label`}
        className={`label-util block transition-colors ${open ? "text-accent" : "text-muted-foreground"}`}
      >
        {label}
      </span>
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${id}-label`}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            open ? move(1) : setOpen(true);
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            move(-1);
          }
          if (e.key === "Escape") setOpen(false);
        }}
        className="draw-rule mt-3 flex w-full items-baseline justify-between gap-3 border-b border-input pb-2 text-left text-sm transition-colors hover:border-accent"
      >
        <span>{value}</span>
        <motion.span
          aria-hidden
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-xs text-muted-foreground"
        >
          ▾
        </motion.span>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.ul
            role="listbox"
            aria-labelledby={`${id}-label`}
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: -4 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-0 top-full z-30 mt-2 w-full origin-top border border-rule bg-paper py-1 shadow-[0_12px_28px_-24px_rgba(0,0,0,0.6)]"
          >
            {options.map((opt) => (
              <li key={opt}>
                <button
                  type="button"
                  role="option"
                  aria-selected={opt === value}
                  onClick={() => {
                    onChange(opt);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm transition-colors hover:bg-secondary ${
                    opt === value ? "text-accent" : ""
                  }`}
                >
                  {opt}
                  {opt === value ? <span aria-hidden className="font-mono text-[10px]">●</span> : null}
                </button>
              </li>
            ))}
          </motion.ul>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
