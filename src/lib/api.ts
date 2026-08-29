/**
 * Thin client for the existing Concept Chef Flask backend.
 * Contracts are unchanged: POST /generate (multipart), POST /chat (JSON),
 * GET /export?session_id=...
 *
 * Set VITE_API_BASE when the Flask server runs on a different origin
 * (e.g. http://localhost:5000). Empty string = same origin.
 */
export const API_BASE: string =
  ((import.meta.env["VITE_API_BASE_URL"] || import.meta.env["VITE_API_BASE"]) as string | undefined)?.replace(/\/$/, "") ?? "http://localhost:5000";

export type QuizQuestion = {
  question: string;
  options: string[];
  answer_index: number;
  feedback: string;
};

export type GenerateData = {
  summary: string[];
  analogy_title: string;
  analogy_content: string;
  mind_map: string;
  quiz: QuizQuestion[];
};

export type GenerateResponse = {
  status: string;
  data: GenerateData;
  video_id: string | null;
  session_id: string;
};

export type GenerateInput = {
  sourceType: "youtube" | "pdf";
  url?: string;
  file?: File | null;
  style: string;
  qCount: number;
  difficulty: string;
};

/** Turns raw backend error strings into calm, accurate copy. */
export function humanizeError(message: string): { title: string; detail: string } {
  const m = (message || "").toLowerCase();
  if (m.includes("transcript")) {
    return {
      title: "No transcript available",
      detail:
        "YouTube didn't return captions for this video, so there's nothing to read. Try a video with captions enabled, or upload a PDF instead.",
    };
  }
  if (m.includes("pdf") || m.includes("extract text")) {
    return {
      title: "Couldn't read this PDF",
      detail:
        "The file has no extractable text — it's likely a scan or image-only export. A text-based PDF will work.",
    };
  }
  if (m.includes("video id") || m.includes("youtube url")) {
    return {
      title: "That link doesn't look like a YouTube video",
      detail: "Paste a full watch URL or a youtu.be short link.",
    };
  }
  if (
    m.includes("gemini") ||
    m.includes("api key") ||
    m.includes("quota") ||
    m.includes("model") ||
    m.includes("authentication") ||
    m.includes("credential") ||
    m.includes("401") ||
    m.includes("429")
  ) {
    return {
      title: "Gemini API Key or Quota Error",
      detail:
        "The Gemini API rejected the request. Please verify that a valid Gemini API key (starting with AIzaSy...) is configured in app.py and has active quota.",
    };
  }
  return { title: "Something stopped the build", detail: message || "Unknown error." };
}

export async function generateWorkspace(input: GenerateInput): Promise<GenerateResponse> {
  const form = new FormData();
  form.append("source_type", input.sourceType);
  if (input.sourceType === "youtube") form.append("url", input.url ?? "");
  if (input.sourceType === "pdf" && input.file) form.append("file", input.file);
  form.append("style", input.style);
  form.append("q_count", String(input.qCount));
  form.append("difficulty", input.difficulty);

  const res = await fetch(`${API_BASE}/generate`, { method: "POST", body: form });
  const json = (await res.json().catch(() => null)) as
    | (GenerateResponse & { message?: string })
    | null;

  if (!res.ok || !json || json.status !== "success") {
    throw new Error(json?.message ?? `Request failed (${res.status})`);
  }
  return json;
}

export async function sendChat(sessionId: string, message: string): Promise<string> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, message }),
  });
  const json = (await res.json().catch(() => null)) as { reply?: string } | null;
  if (!json?.reply) throw new Error("No reply from the tutor.");
  return json.reply;
}

export function exportUrl(sessionId: string): string {
  return `${API_BASE}/export?session_id=${encodeURIComponent(sessionId)}`;
}

export async function downloadExport(sessionId: string): Promise<void> {
  const res = await fetch(exportUrl(sessionId));
  if (!res.ok) {
    throw new Error(`Export failed (${res.status})`);
  }
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `concept_chef_notes_${sessionId.slice(0, 8)}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

/** Parses Mermaid "graph TD" node labels — navigational aid only, no new content. */
export function parseMindMapNodes(mermaid: string): string[] {
  const labels = new Set<string>();
  const re = /(?:\[|\(|\{|>)([^\]\)\}]{1,80}?)(?:\]|\)|\}|\])/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(mermaid)) !== null) {
    const label = match[1]?.replace(/^["']|["']$/g, "").trim();
    if (label && !/^graph\s/i.test(label)) labels.add(label);
  }
  return Array.from(labels);
}

export function formatTimestamp(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return `${h > 0 ? `${h}:` : ""}${mm}:${String(sec).padStart(2, "0")}`;
}
