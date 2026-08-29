# Concept Weaver

You are redesigning the FRONTEND ONLY of an existing working application called Concept Chef. 

Before changing anything, inspect this repository thoroughly: 

https://github.com/aatifzafar/AICTC-1M1B

This is a Flask app with ONE backend file (app.py) and ONE template (templates/index.html, 

currently vanilla HTML/CSS/JS + Mermaid.js). Do not assume a different architecture.

======================================================

STRICT PRESERVATION RULES — DO NOT BREAK THESE

======================================================

- Do NOT modify, remove, or rewrite backend logic in app.py.

- Do NOT change the existing routes or their contracts:

  - GET /  → renders the main page

  - POST /generate → multipart form fields: source_type ("youtube"|"pdf"), url, file, style, q_count, difficulty

      returns: { status, data: { summary[], analogy_title, analogy_content, mind_map (Mermaid "graph TD" string), 

                 quiz: [{question, options[], answer_index, feedback}] }, video_id, session_id }

  - POST /chat → JSON body { session_id, message } → returns { reply } 

      (reply text may contain timestamp citations in the literal format "[120]" meaning seconds — 

       render these as clickable/highlighted citation chips, do not alter how they're generated)

  - GET /export?session_id=... → downloads a Markdown file (raw extracted content, not curated notes)

- Do NOT invent new backend fields, new API routes, fake analytics, fake user accounts, fake saved 

  history, or a fake "concepts" array. The ONLY concept-level data available is the Mermaid mind_map 

  string and the analogy_title/analogy_content pair — if you want a "concept" visual treatment, derive 

  it from parsing/displaying the existing mind_map nodes, never fabricate new content.

- Do NOT add persistence/database/auth. Session state is intentionally in-memory and ephemeral — 

  design around that reality (e.g. warn before refresh loses the session) rather than pretending 

  otherwise.

- Do NOT introduce a new frontend framework/build system unless Lovable's own stack requires it — 

  keep the dependency footprint minimal. Keep Mermaid.js for the mind map; do not replace it with a 

  different diagramming library.

- Do NOT overdesign. No purple gradients, no glassmorphism, no neon glow, no giant hero sections, 

  no "make everything a rounded card" pattern, no generic AI-dashboard look, no decorative animation.

======================================================

PRODUCT STORY TO DESIGN AROUND

======================================================

Concept Chef takes one piece of educational content (YouTube video or PDF) and turns it into a 

four-stage learning workspace:

  UNDERSTAND (summary + analogy) → EXPLORE (mind map) → TEST (quiz) → ASK (source-grounded chat)

A future fifth stage, IMPROVE → RETEST (weak-concept-driven revision), may be added later without 

backend changes right now — leave clear structural room for it in the navigation, but do not build it.

The interface must make the user feel: "I gave it one piece of content and it built me a complete 

learning workspace" — this is a journey, not four disconnected AI features bolted together.

======================================================

VISUAL DIRECTION

======================================================

Aesthetic: editorial / research-lab notebook, not a SaaS AI dashboard. Premium, academic, quietly 

confident, slightly experimental — never cutesy, never a cooking/restaurant theme despite the name.

- Typography: a strong serif or high-contrast display face for headings paired with a clean, highly 

  legible sans for body text. Type does the hierarchy work — don't rely on card borders and shadows 

  to separate content.

- Color: one deliberate accent color used sparingly (state indicators, active nav, CTAs) against a 

  restrained neutral base (warm off-white or deep ink, your choice) — no rainbow gradients, no neon.

- Spacing: generous, intentional whitespace; content should breathe, not sit in dense boxes.

- Cards: use sparingly and only where content is genuinely discrete (a single quiz question, a single 

  chat citation) — do not wrap every UI element in a rounded card with a shadow.

- Motion: only for functional state transitions (stage switching, quiz answer reveal, node selection 

  in the mind map) — never decorative or delay-adding animation.

- Density: readable and calm, not a cramped dashboard.

- Accessibility: sufficient contrast, visible focus states, keyboard-navigable stage rail and quiz.

======================================================

INFORMATION ARCHITECTURE

======================================================

Source → Learning Workspace → Understand → Explore → Test → Ask

1. LANDING / SOURCE INPUT

   - Above the fold: a single clear headline stating the value ("Turn a video or document into a 

     complete learning workspace") and ONE primary input — a toggle between "Paste YouTube link" and 

     "Upload PDF," plus persona (style) and difficulty/question-count controls, visually secondary to 

     the source input itself.

   - Primary CTA: "Build my learning workspace" (or similar) — not "Submit" or "Generate."

   - Below or beside: a compact, honest preview of what happens next (four small labeled stages: 

     Understand, Explore, Test, Ask) so the value is obvious in the first 5 seconds.

2. PROCESSING STATE (while /generate is in flight)

   - Show a visible, honest pipeline (e.g. "Reading source → Structuring concepts → Preparing your 

     workspace") rather than a generic spinner. This should feel like real work happening, not a 

     black box. Keep copy accurate to what's actually happening (transcript/PDF extraction, then 

     Gemini structuring).

3. LEARNING WORKSPACE SHELL

   - A persistent stage rail/nav (Understand · Explore · Test · Ask, with a visually reserved-but-

     disabled "Improve" slot for the future) that stays visible at all times so the user always knows 

     where they are in the journey and can jump between completed stages freely.

   - Always show the active source (video thumbnail/title or PDF filename) so context is never lost.

   - Export action should be clearly available but not competing with the primary journey.

4. UNDERSTAND

   - Present summary bullets and the analogy (analogy_title + analogy_content) as a paired, 

     typographically distinct reading experience — the analogy should feel like a "here's the human 

     way to think about this" moment, not just another bullet block.

5. EXPLORE

   - The Mermaid mind_map is the centerpiece — implement real zoom/pan/reset controls around it 

     (Mermaid output stays as-is; you're building better chrome around it, not replacing the diagram 

     engine).

   - Optionally surface node labels as a light supplementary list purely as a navigational aid into 

     the diagram — never as separately generated content.

6. TEST

   - One question at a time, generous spacing, clear option selection, immediate right/wrong feedback 

     using the backend's `feedback` field per question.

   - End-of-quiz view: score + a simple pass through of per-question feedback already returned by the 

     backend. Do not invent streaks, badges, or analytics not present in the data.

7. ASK

   - Chat interface clearly scoped to "this source" (repeat the source context visibly so groundedness 

     is obvious). Render `[123]`-style citations as clickable chips (linking to that YouTube timestamp 

     when video_id is present); for PDFs, style citations as a distinct but still literal marker since 

     no timestamp exists — do not fabricate PDF page citations the backend doesn't return.

8. EMPTY / LOADING / ERROR STATES

   - Distinct, calm states for: no transcript available, PDF text extraction failure, Gemini API 

     error, chat session expired (session_id not found — in-memory cache is ephemeral, this WILL 

     happen on server restart, so word the message accordingly rather than as a generic bug).

9. RESPONSIVE

   - Mobile: stage rail collapses to a bottom tab bar or a top segmented control; mind map remains 

     pannable/zoomable full-width; quiz and chat become single-column, thumb-friendly.

======================================================

DEMO OPTIMIZATION

======================================================

The whole flow must read clearly in a 2–3 minute live demo: paste a source → watch it process → see 

Understand → see Explore (mind map) → take a few quiz questions → ask the chatbot one question and see 

a timestamp citation land. Make each transition between stages feel like an obvious "next step," not a 

menu the evaluator has to figure out.

======================================================

WHAT TO DO IF SOMETHING ISN'T SUPPORTED

======================================================

If a design idea would require a backend/data change that doesn't exist today (e.g. saved history, 

per-concept mastery tracking, PDF page citations), design the UI to work beautifully within what 

/generate, /chat, and /export ACTUALLY return — do not mock up functionality that doesn't exist yet.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/46f4da39-c4ae-4582-bdd0-45ce98450cf4).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
