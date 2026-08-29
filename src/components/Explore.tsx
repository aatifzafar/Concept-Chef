import { useCallback, useEffect, useRef, useState } from "react";
import { parseMindMapNodes } from "@/lib/api";

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 5;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export function Explore({ mindMap, onNext }: { mindMap: string; onNext: () => void }) {
  const holderRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [failed, setFailed] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [highlight, setHighlight] = useState<string | null>(null);
  const stateRef = useRef({ zoom, offset });
  stateRef.current = { zoom, offset };

  const nodes = parseMindMapNodes(mindMap ?? "");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "base",
          securityLevel: "loose",
          fontFamily: "IBM Plex Sans, sans-serif",
          themeVariables: {
            background: "transparent",
            primaryColor: "#f6f1e7",
            primaryTextColor: "#2c2721",
            primaryBorderColor: "#b9ada0",
            lineColor: "#9c9086",
            fontSize: "14px",
          },
        });
        const { svg: out } = await mermaid.render(
          `mindmap-${Math.random().toString(36).slice(2)}`,
          mindMap,
        );
        if (!cancelled) setSvg(out);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mindMap]);

  const reset = useCallback(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  const zoomAt = useCallback((factor: number, px: number, py: number) => {
    const { zoom: z, offset: o } = stateRef.current;
    const next = clamp(z * factor, MIN_ZOOM, MAX_ZOOM);
    const k = next / z;
    setZoom(next);
    setOffset({ x: px - (px - o.x) * k, y: py - (py - o.y) * k });
  }, []);

  const wheelRef = useRef((e: WheelEvent) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
    zoomAt(Math.exp(-dy * 0.0015), e.clientX - rect.left, e.clientY - rect.top);
  });
  wheelRef.current = (e: WheelEvent) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
    zoomAt(Math.exp(-dy * 0.0015), e.clientX - rect.left, e.clientY - rect.top);
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      wheelRef.current(e);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const dragRef = useRef<{ id: number; x: number; y: number } | null>(null);

  const zoomButton = (factor: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    zoomAt(factor, rect.width / 2, rect.height / 2);
  };

  // Highlight a node inside the rendered SVG by label text.
  useEffect(() => {
    const root = holderRef.current;
    if (!root) return;
    root.querySelectorAll("[data-cc-hit]").forEach((n) => {
      (n as SVGElement).removeAttribute("data-cc-hit");
      (n as SVGElement).style.filter = "";
    });
    if (!highlight) return;
    root.querySelectorAll("g.node").forEach((g) => {
      if ((g.textContent ?? "").trim() === highlight) {
        g.setAttribute("data-cc-hit", "true");
        (g as unknown as SVGElement).style.filter =
          "drop-shadow(0 0 0 var(--color-accent)) drop-shadow(0 0 6px var(--color-accent))";
      }
    });
  }, [highlight, svg]);

  return (
    <div className="stage-enter">
      <p className="label-eyebrow">Stage two</p>
      <h2 className="mt-3 text-3xl md:text-4xl">Explore</h2>
      <p className="mt-3 max-w-xl text-sm text-muted-foreground">
        The concept map generated from your source. Scroll or pinch to zoom, drag to pan.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_14rem]">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <button
              onClick={() => zoomButton(1 / 1.25)}
              aria-label="Zoom out"
              className="h-8 w-8 border border-input text-sm hover:border-accent"
            >
              −
            </button>
            <button
              onClick={() => zoomButton(1.25)}
              aria-label="Zoom in"
              className="h-8 w-8 border border-input text-sm hover:border-accent"
            >
              +
            </button>
            <button
              onClick={reset}
              className="h-8 border border-input px-3 text-xs hover:border-accent"
            >
              Reset
            </button>
            <span className="ml-2 font-mono text-[11px] text-muted-foreground">
              {Math.round(zoom * 100)}%
            </span>
          </div>

          <div
            ref={containerRef}
            className="relative h-[26rem] touch-none overflow-hidden border border-rule bg-paper md:h-[34rem]"
            style={{ cursor: dragRef.current ? "grabbing" : "grab" }}
            onPointerDown={(e) => {
              dragRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
              (e.target as Element).setPointerCapture?.(e.pointerId);
            }}
            onPointerMove={(e) => {
              const d = dragRef.current;
              if (!d || d.id !== e.pointerId) return;
              const dx = e.clientX - d.x;
              const dy = e.clientY - d.y;
              dragRef.current = { id: d.id, x: e.clientX, y: e.clientY };
              setOffset((o) => ({ x: o.x + dx, y: o.y + dy }));
            }}
            onPointerUp={() => {
              dragRef.current = null;
            }}
            onPointerLeave={() => {
              dragRef.current = null;
            }}
          >
            {failed ? (
              <div className="flex h-full items-center justify-center px-8 text-center">
                <p className="max-w-sm text-sm text-muted-foreground">
                  The model returned a diagram this renderer can't parse. The rest of the workspace
                  is unaffected — the node list beside this panel still shows the concepts.
                </p>
              </div>
            ) : (
              <div
                ref={holderRef}
                className="absolute left-0 top-0 origin-top-left p-6"
                style={{
                  transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                }}
                dangerouslySetInnerHTML={{ __html: svg }}
              />
            )}
          </div>
        </div>

        <aside className="lg:border-l lg:border-rule lg:pl-6">
          <p className="label-eyebrow">Nodes in this map</p>
          <ul className="mt-4 space-y-1">
            {nodes.map((n) => (
              <li key={n}>
                <button
                  onClick={() => setHighlight((h) => (h === n ? null : n))}
                  className={`w-full py-1 text-left text-sm transition-colors ${
                    highlight === n ? "text-accent" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {n}
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
            Labels read straight from the diagram — selecting one highlights it in the map.
          </p>
        </aside>
      </div>

      <button
        onClick={onNext}
        className="mt-12 inline-flex items-center gap-3 border-b border-accent pb-1 text-sm transition-opacity hover:opacity-70"
      >
        Next: test yourself <span aria-hidden>→</span>
      </button>
    </div>
  );
}
