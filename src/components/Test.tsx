import { useState } from "react";
import type { QuizQuestion } from "@/lib/api";

export function Test({ quiz, onNext }: { quiz: QuizQuestion[]; onNext: () => void }) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [done, setDone] = useState(false);

  if (!quiz?.length) {
    return (
      <div className="stage-enter max-w-2xl">
        <h2 className="text-3xl">Test</h2>
        <p className="mt-4 text-sm text-muted-foreground">
          The model didn't return any questions for this source.
        </p>
      </div>
    );
  }

  const q = quiz[index]!;
  const picked = answers[index];
  const answered = picked !== undefined;
  const score = Object.entries(answers).filter(
    ([i, a]) => quiz[Number(i)]?.answer_index === a,
  ).length;

  if (done) {
    return (
      <div className="stage-enter max-w-3xl">
        <p className="label-eyebrow">Stage three · complete</p>
        <h2 className="mt-3 text-3xl md:text-4xl">
          {score} of {quiz.length} correct
        </h2>
        <ul className="mt-10 space-y-8">
          {quiz.map((item, i) => {
            const ok = answers[i] === item.answer_index;
            return (
              <li key={i} className="border-b border-rule pb-8 last:border-0">
                <p className="font-display text-xl">{item.question}</p>
                <p className={`mt-2 text-sm ${ok ? "text-success" : "text-destructive"}`}>
                  {ok ? "Correct" : `Answer: ${item.options[item.answer_index]}`}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.feedback}</p>
              </li>
            );
          })}
        </ul>
        <div className="mt-10 flex flex-wrap gap-6">
          <button
            onClick={() => {
              setAnswers({});
              setIndex(0);
              setDone(false);
            }}
            className="border-b border-rule pb-1 text-sm text-muted-foreground hover:text-foreground"
          >
            Retake the quiz
          </button>
          <button
            onClick={onNext}
            className="inline-flex items-center gap-3 border-b border-accent pb-1 text-sm hover:opacity-70"
          >
            Next: ask the source <span aria-hidden>→</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="stage-enter max-w-2xl">
      <p className="label-eyebrow">Stage three</p>
      <div className="mt-3 flex items-baseline justify-between gap-6">
        <h2 className="text-3xl md:text-4xl">Test</h2>
        <span className="font-mono text-xs text-muted-foreground">
          {index + 1} / {quiz.length}
        </span>
      </div>
      <div className="mt-4 h-px w-full bg-rule">
        <div
          className="h-px bg-accent transition-all"
          style={{ width: `${((index + (answered ? 1 : 0)) / quiz.length) * 100}%` }}
        />
      </div>

      <h3 className="mt-10 font-display text-2xl leading-snug md:text-[1.75rem]">{q.question}</h3>

      <div role="radiogroup" aria-label="Answer options" className="mt-8 space-y-3">
        {q.options.map((opt, i) => {
          const isPicked = picked === i;
          const isCorrect = i === q.answer_index;
          const tone =
            !answered
              ? "border-border hover:border-accent"
              : isCorrect
                ? "border-success bg-success-soft"
                : isPicked
                  ? "border-destructive bg-destructive-soft"
                  : "border-border opacity-55";
          return (
            <button
              key={i}
              role="radio"
              aria-checked={isPicked}
              disabled={answered}
              onClick={() => setAnswers((a) => ({ ...a, [index]: i }))}
              className={`flex w-full items-baseline gap-4 border px-5 py-4 text-left text-base transition-colors ${tone}`}
            >
              <span className="font-mono text-xs text-muted-foreground">
                {String.fromCharCode(65 + i)}
              </span>
              <span>{opt}</span>
            </button>
          );
        })}
      </div>

      {answered ? (
        <div className="stage-enter mt-8 border-l-2 border-accent pl-5">
          <p className="label-eyebrow">
            {picked === q.answer_index ? "Correct" : "Not quite"}
          </p>
          <p className="mt-2 leading-relaxed">{q.feedback}</p>
        </div>
      ) : null}

      <div className="mt-10 flex items-center justify-between">
        <button
          disabled={index === 0}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-35"
        >
          ← Previous
        </button>
        <button
          disabled={!answered}
          onClick={() => (index === quiz.length - 1 ? setDone(true) : setIndex((i) => i + 1))}
          className="inline-flex items-center gap-3 bg-accent px-6 py-3 text-sm text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-35"
        >
          {index === quiz.length - 1 ? "See results" : "Next question"}
          <span aria-hidden>→</span>
        </button>
      </div>
    </div>
  );
}
