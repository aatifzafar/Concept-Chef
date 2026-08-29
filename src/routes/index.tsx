import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  downloadExport,
  exportUrl,
  generateWorkspace,
  humanizeError,
  type GenerateResponse,
} from "@/lib/api";
import { SourceForm, type SourceSettings } from "@/components/SourceForm";
import { Processing } from "@/components/Processing";
import { StageRail, type StageId } from "@/components/StageRail";
import { Understand } from "@/components/Understand";
import { Explore } from "@/components/Explore";
import { Test } from "@/components/Test";
import { Ask } from "@/components/Ask";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Concept Chef — Turn a video or PDF into a learning workspace" },
      {
        name: "description",
        content:
          "Concept Chef turns one YouTube video or PDF into a four-stage learning workspace: summary and analogy, concept mind map, quiz, and source-grounded chat.",
      },
      { property: "og:title", content: "Concept Chef — one source, a whole learning workspace" },
      {
        property: "og:description",
        content:
          "Understand, Explore, Test and Ask — a study workspace built from a single video or document.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ConceptChef,
});

type Phase = "input" | "processing" | "workspace";

type StoredWorkspace = {
  result: GenerateResponse;
  sourceType: "youtube" | "pdf";
  sourceLabel: string;
  stage: StageId;
};

const STORAGE_KEY = "concept_chef_active_workspace";

function ConceptChef() {
  const [phase, setPhase] = useState<Phase>("input");
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [settings, setSettings] = useState<SourceSettings | null>(null);
  const [sourceLabel, setSourceLabel] = useState<string>("Active source");
  const [stage, setStage] = useState<StageId>("understand");
  const [error, setError] = useState<{ title: string; detail: string } | null>(null);
  const [expired, setExpired] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Restore workspace from sessionStorage on initial load
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const stored: StoredWorkspace = JSON.parse(raw);
        if (stored?.result?.session_id) {
          setResult(stored.result);
          setSourceLabel(stored.sourceLabel || "Active source");
          setStage(stored.stage || "understand");
          setPhase("workspace");
        }
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  const handleStageChange = (nextStage: StageId) => {
    setStage(nextStage);
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const stored: StoredWorkspace = JSON.parse(raw);
        stored.stage = nextStage;
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
      }
    } catch {
      // Ignore storage errors
    }
  };

  const start = async (s: SourceSettings) => {
    setSettings(s);
    const label =
      s.sourceType === "pdf"
        ? (s.file?.name ?? "Uploaded PDF")
        : (s.url || "YouTube source");
    setSourceLabel(label);
    setError(null);
    setPhase("processing");
    try {
      const res = await generateWorkspace({
        sourceType: s.sourceType,
        url: s.url,
        file: s.file,
        style: s.style,
        qCount: s.qCount,
        difficulty: s.difficulty,
      });
      setResult(res);
      setStage("understand");
      setPhase("workspace");

      try {
        const stored: StoredWorkspace = {
          result: res,
          sourceType: s.sourceType,
          sourceLabel: label,
          stage: "understand",
        };
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
      } catch {
        // Ignore storage errors
      }
    } catch (e) {
      setError(humanizeError(e instanceof Error ? e.message : String(e)));
      setPhase("input");
    }
  };

  const handleExport = async () => {
    if (!result?.session_id || exporting) return;
    setExporting(true);
    try {
      await downloadExport(result.session_id);
    } catch (err) {
      console.error("Export download failed:", err);
    } finally {
      setExporting(false);
    }
  };

  if (phase === "input") return <SourceForm onSubmit={start} error={error} />;
  if (phase === "processing" || !result)
    return <Processing sourceLabel={sourceLabel} />;

  const data = result.data;

  return (
    <div className="min-h-screen">
      <header className="border-b border-rule">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-5">
          <div className="flex min-w-0 items-center gap-4">
            {result.video_id ? (
              <img
                src={`https://img.youtube.com/vi/${result.video_id}/default.jpg`}
                alt=""
                className="h-10 w-16 shrink-0 object-cover"
              />
            ) : (
              <span className="label-eyebrow shrink-0 border border-rule px-2 py-1">PDF</span>
            )}
            <div className="min-w-0">
              <p className="label-eyebrow">Active source</p>
              <p className="truncate text-sm">{sourceLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:opacity-50"
            >
              {exporting ? "Downloading..." : "Export source notes"}
            </button>
            <button
              onClick={() => {
                setResult(null);
                setPhase("input");
                setExpired(false);
                try {
                  sessionStorage.removeItem(STORAGE_KEY);
                } catch {
                  // Ignore
                }
              }}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              New source
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-12 px-6 pb-28 pt-10 md:grid-cols-[13rem_minmax(0,1fr)] md:pb-16">
        <div className="md:sticky md:top-10 md:self-start">
          <StageRail active={stage} onChange={handleStageChange} />
        </div>

        <main>
          {expired ? (
            <div className="mb-10 border-l-2 border-accent bg-accent-soft/50 px-5 py-4">
              <p className="font-display text-lg">This workspace's session has ended</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Sessions are held in the server's memory and are cleared when it restarts, so chat
                can no longer reach your source. The stages above still show what was generated —
                rebuild the workspace to ask questions again.
              </p>
            </div>
          ) : null}

          {stage === "understand" ? (
            <Understand
              summary={data.summary}
              analogyTitle={data.analogy_title}
              analogyContent={data.analogy_content}
              onNext={() => setStage("explore")}
            />
          ) : null}
          {stage === "explore" ? (
            <Explore mindMap={data.mind_map} onNext={() => setStage("test")} />
          ) : null}
          {stage === "test" ? <Test quiz={data.quiz} onNext={() => setStage("ask")} /> : null}
          {stage === "ask" ? (
            <Ask
              sessionId={result.session_id}
              videoId={result.video_id}
              sourceLabel={sourceLabel}
              onSessionExpired={() => setExpired(true)}
            />
          ) : null}
        </main>
      </div>
    </div>
  );
}
