"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { readStored } from "@/lib/client-storage";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BarChart3,
  BookOpenCheck,
  BrainCircuit,
  Check,
  CheckCircle2,
  Clock3,
  Gauge,
  History,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Target,
  XCircle
} from "lucide-react";
import {
  examTopics,
  isCorrectAnswer,
  questionBank,
  questionTypeLabels,
  type ExamDifficulty,
  type ExamQuestion,
  type QuestionType
} from "@/lib/exam-data";

type Phase = "setup" | "running" | "results";
type ExamMode = "practice" | "exam";
type Confidence = 1 | 2 | 3;
type SessionLength = 5 | 10 | 15 | "all";

type AnswerState = {
  selected: number[];
  confidence: Confidence | null;
  locked: boolean;
};

type SavedAttempt = {
  id: string;
  completedAt: string;
  percent: number;
  correct: number;
  total: number;
  mode: ExamMode;
  topics: string[];
  elapsedSeconds: number;
};

const historyKey = "codefyhub-devops-guide:exam-history:v1";
const historySchema = z.array(z.object({
  id: z.string(), completedAt: z.string(), percent: z.number().min(0).max(100), correct: z.number().int().nonnegative(),
  total: z.number().int().positive(), mode: z.enum(["practice", "exam"]), topics: z.array(z.string()).max(20), elapsedSeconds: z.number().int().nonnegative()
})).max(10);
const allTypes = Object.keys(questionTypeLabels) as QuestionType[];

function shuffle<T>(items: T[]) {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function scoreLabel(percent: number) {
  if (percent >= 90) return { label: "Expert signal", note: "You can explain tradeoffs and make reliable operational decisions.", tone: "excellent" };
  if (percent >= 75) return { label: "Operationally ready", note: "Strong working knowledge with a few areas worth reinforcing.", tone: "good" };
  if (percent >= 60) return { label: "Developing", note: "The foundations are visible; review the weak domains before production work.", tone: "developing" };
  return { label: "Foundation gap", note: "Use the recommendations below, then retake a focused practice session.", tone: "needs-work" };
}

function typeDescription(type: QuestionType) {
  if (type === "single") return "One best answer";
  if (type === "multiple") return "Every correct option required";
  if (type === "boolean") return "Validate the statement";
  return "Choose the safest operational response";
}

export function ExamEngine() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [selectedTopics, setSelectedTopics] = useState<string[]>(examTopics.map((topic) => topic.slug));
  const [selectedTypes, setSelectedTypes] = useState<QuestionType[]>(allTypes);
  const [difficulty, setDifficulty] = useState<ExamDifficulty | "all">("all");
  const [sessionLength, setSessionLength] = useState<SessionLength>(10);
  const [mode, setMode] = useState<ExamMode>("practice");
  const [sessionQuestions, setSessionQuestions] = useState<ExamQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [finalElapsedSeconds, setFinalElapsedSeconds] = useState(0);
  const [history, setHistory] = useState<SavedAttempt[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setHistory(readStored(historyKey, historySchema, []));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (phase !== "running") return;
    const timer = window.setInterval(() => setElapsedSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [phase]);

  const availableQuestions = useMemo(() => questionBank.filter((question) =>
    selectedTopics.includes(question.topic)
    && selectedTypes.includes(question.type)
    && (difficulty === "all" || question.difficulty === difficulty)
  ), [difficulty, selectedTopics, selectedTypes]);

  const currentQuestion = sessionQuestions[currentIndex];
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] ?? { selected: [], confidence: null, locked: false } : null;
  const answeredCount = sessionQuestions.filter((question) => (answers[question.id]?.selected.length ?? 0) > 0).length;

  const result = useMemo(() => {
    const graded = sessionQuestions.map((question) => ({
      question,
      answer: answers[question.id] ?? { selected: [], confidence: null, locked: false },
      correct: isCorrectAnswer(question, answers[question.id]?.selected ?? [])
    }));
    const correct = graded.filter((item) => item.correct).length;
    const percent = sessionQuestions.length ? Math.round((correct / sessionQuestions.length) * 100) : 0;
    const topicScores = examTopics
      .map((topic) => {
        const items = graded.filter((item) => item.question.topic === topic.slug);
        const topicCorrect = items.filter((item) => item.correct).length;
        return { ...topic, total: items.length, correct: topicCorrect, percent: items.length ? Math.round((topicCorrect / items.length) * 100) : 0 };
      })
      .filter((topic) => topic.total > 0)
      .sort((a, b) => a.percent - b.percent);
    const confidentMisses = graded.filter((item) => !item.correct && item.answer.confidence === 3).length;
    return { graded, correct, percent, topicScores, confidentMisses, rating: scoreLabel(percent) };
  }, [answers, sessionQuestions]);

  function toggleTopic(slug: string) {
    setSelectedTopics((current) => current.includes(slug) ? current.filter((topic) => topic !== slug) : [...current, slug]);
  }

  function toggleType(type: QuestionType) {
    setSelectedTypes((current) => current.includes(type) ? current.filter((item) => item !== type) : [...current, type]);
  }

  function startSession() {
    const requestedCount = sessionLength === "all" ? availableQuestions.length : sessionLength;
    const questions = shuffle(availableQuestions).slice(0, Math.min(requestedCount, availableQuestions.length));
    setSessionQuestions(questions);
    setAnswers({});
    setCurrentIndex(0);
    setElapsedSeconds(0);
    setFinalElapsedSeconds(0);
    setPhase("running");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function selectOption(optionIndex: number) {
    if (!currentQuestion || currentAnswer?.locked) return;
    const allowsMultiple = currentQuestion.type === "multiple";
    setAnswers((current) => {
      const previous = current[currentQuestion.id] ?? { selected: [], confidence: null, locked: false };
      const selected = allowsMultiple
        ? previous.selected.includes(optionIndex)
          ? previous.selected.filter((index) => index !== optionIndex)
          : [...previous.selected, optionIndex]
        : [optionIndex];
      return { ...current, [currentQuestion.id]: { ...previous, selected } };
    });
  }

  function setConfidence(confidence: Confidence) {
    if (!currentQuestion || currentAnswer?.locked) return;
    setAnswers((current) => ({
      ...current,
      [currentQuestion.id]: {
        ...(current[currentQuestion.id] ?? { selected: [], locked: false }),
        confidence
      }
    }));
  }

  function finishSession() {
    const completedAt = new Date().toISOString();
    const correct = sessionQuestions.filter((question) => isCorrectAnswer(question, answers[question.id]?.selected ?? [])).length;
    const percent = Math.round((correct / sessionQuestions.length) * 100);
    const attempt: SavedAttempt = {
      id: completedAt,
      completedAt,
      percent,
      correct,
      total: sessionQuestions.length,
      mode,
      topics: [...new Set(sessionQuestions.map((question) => question.topic))],
      elapsedSeconds
    };
    const nextHistory = [attempt, ...history].slice(0, 10);
    setHistory(nextHistory);
    localStorage.setItem(historyKey, JSON.stringify(nextHistory));
    setFinalElapsedSeconds(elapsedSeconds);
    setPhase("results");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function submitCurrent() {
    if (!currentQuestion || !currentAnswer?.selected.length || !currentAnswer.confidence) return;
    if (mode === "practice" && !currentAnswer.locked) {
      setAnswers((current) => ({
        ...current,
        [currentQuestion.id]: { ...current[currentQuestion.id], locked: true }
      }));
      return;
    }
    if (currentIndex === sessionQuestions.length - 1) finishSession();
    else setCurrentIndex((index) => index + 1);
  }

  function resetToSetup() {
    setPhase("setup");
    setSessionQuestions([]);
    setAnswers({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (phase === "setup") {
    const bestScore = history.length ? Math.max(...history.map((attempt) => attempt.percent)) : null;
    return (
      <div className="exam-page shell">
        <section className="exam-hero">
          <div>
            <div className="eyebrow">Knowledge assessment studio</div>
            <h1>Turn what you read into <span>operational judgment.</span></h1>
            <p>Build a focused DevOps assessment across any guide domain. Every session measures knowledge, decision quality, and confidence—not memorization alone.</p>
          </div>
          <div className="exam-hero-card" aria-label="Exam library summary">
            <div><strong>{questionBank.length}</strong><span>curated questions</span></div>
            <div><strong>{examTopics.length}</strong><span>skill domains</span></div>
            <div><strong>{allTypes.length}</strong><span>question formats</span></div>
          </div>
        </section>

        {history.length > 0 && (
          <section className="exam-history-strip" aria-label="Your recent assessment performance">
            <div className="history-icon"><History size={20} /></div>
            <div><span>Last assessment</span><strong>{history[0].percent}% · {history[0].correct}/{history[0].total} correct</strong></div>
            <div><span>Personal best</span><strong>{bestScore}%</strong></div>
            <div><span>Sessions completed</span><strong>{history.length}</strong></div>
          </section>
        )}

        <section className="exam-builder" aria-labelledby="build-assessment-title">
          <div className="exam-builder-heading">
            <div><span className="step-number">01</span><div><h2 id="build-assessment-title">Choose your learning domains</h2><p>Select one area for deep practice or combine several for a broader readiness check.</p></div></div>
            <div className="selection-actions">
              <button type="button" onClick={() => setSelectedTopics(examTopics.map((topic) => topic.slug))}>Select all</button>
              <button type="button" onClick={() => setSelectedTopics([])}>Clear</button>
            </div>
          </div>
          <div className="topic-selector">
            {examTopics.map((topic, index) => {
              const selected = selectedTopics.includes(topic.slug);
              const count = questionBank.filter((question) => question.topic === topic.slug).length;
              return (
                <button
                  type="button"
                  className={`topic-select-card${selected ? " selected" : ""}`}
                  aria-pressed={selected}
                  onClick={() => toggleTopic(topic.slug)}
                  key={topic.slug}
                >
                  <span className="topic-card-index">{String(index + 1).padStart(2, "0")}</span>
                  <span className="topic-card-check">{selected ? <Check size={15} /> : null}</span>
                  <strong>{topic.title}</strong>
                  <small>{topic.description}</small>
                  <span className="topic-count">{count} questions</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="exam-builder exam-options" aria-labelledby="configure-assessment-title">
          <div className="exam-builder-heading">
            <div><span className="step-number">02</span><div><h2 id="configure-assessment-title">Configure the session</h2><p>Shape the assessment around your current learning goal.</p></div></div>
          </div>
          <div className="exam-config-grid">
            <fieldset className="exam-control-group">
              <legend>Learning mode</legend>
              <div className="mode-options">
                <button type="button" className={mode === "practice" ? "active" : ""} onClick={() => setMode("practice")}>
                  <Sparkles size={19} /><span><strong>Practice</strong><small>Immediate feedback and explanations</small></span>
                </button>
                <button type="button" className={mode === "exam" ? "active" : ""} onClick={() => setMode("exam")}>
                  <ShieldCheck size={19} /><span><strong>Exam</strong><small>Results and explanations at the end</small></span>
                </button>
              </div>
            </fieldset>

            <fieldset className="exam-control-group">
              <legend>Difficulty</legend>
              <div className="segmented-control">
                {(["all", "foundation", "intermediate", "advanced"] as const).map((level) => (
                  <button type="button" className={difficulty === level ? "active" : ""} onClick={() => setDifficulty(level)} key={level}>{level === "all" ? "Mixed" : level}</button>
                ))}
              </div>
            </fieldset>

            <fieldset className="exam-control-group">
              <legend>Question formats</legend>
              <div className="type-options">
                {allTypes.map((type) => (
                  <button type="button" aria-pressed={selectedTypes.includes(type)} className={selectedTypes.includes(type) ? "active" : ""} onClick={() => toggleType(type)} key={type}>
                    <span>{selectedTypes.includes(type) ? <Check size={13} /> : null}</span>{questionTypeLabels[type]}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="exam-control-group">
              <legend>Session length</legend>
              <div className="segmented-control length-control">
                {([5, 10, 15, "all"] as const).map((length) => (
                  <button type="button" className={sessionLength === length ? "active" : ""} onClick={() => setSessionLength(length)} key={length}>{length === "all" ? "All" : length}</button>
                ))}
              </div>
            </fieldset>
          </div>
          <div className="exam-launch-bar">
            <div>
              <BrainCircuit size={24} />
              <span><strong>{availableQuestions.length} questions available</strong><small>{selectedTopics.length} domains · {difficulty === "all" ? "mixed difficulty" : difficulty} · {mode} mode</small></span>
            </div>
            <button type="button" className="button button-primary exam-start-button" disabled={!availableQuestions.length} onClick={startSession}>
              Start assessment <ArrowRight size={17} />
            </button>
          </div>
          {!availableQuestions.length && <p className="exam-empty-warning">Choose at least one domain and question format that match the selected difficulty.</p>}
        </section>
      </div>
    );
  }

  if (phase === "running" && currentQuestion && currentAnswer) {
    const isCorrect = isCorrectAnswer(currentQuestion, currentAnswer.selected);
    const feedbackVisible = mode === "practice" && currentAnswer.locked;
    return (
      <div className="exam-session shell">
        <header className="session-topbar">
          <button type="button" className="session-exit" onClick={resetToSetup}><ArrowLeft size={16} /> Exit session</button>
          <div className="session-stat"><Clock3 size={15} /> {formatDuration(elapsedSeconds)}</div>
          <div className="session-stat">Answered {answeredCount}/{sessionQuestions.length}</div>
        </header>

        <div className="session-progress" aria-label={`Question ${currentIndex + 1} of ${sessionQuestions.length}`}>
          <div style={{ width: `${((currentIndex + 1) / sessionQuestions.length) * 100}%` }} />
        </div>

        <div className="exam-session-grid">
          <aside className="question-map" aria-label="Question navigation">
            <span className="question-map-title">Assessment map</span>
            <div>
              {sessionQuestions.map((question, index) => (
                <button
                  type="button"
                  className={`${index === currentIndex ? "current" : ""}${answers[question.id]?.selected.length ? " answered" : ""}`}
                  aria-label={`Question ${index + 1}${answers[question.id]?.selected.length ? ", answered" : ""}`}
                  onClick={() => setCurrentIndex(index)}
                  key={question.id}
                >{index + 1}</button>
              ))}
            </div>
            <div className="map-legend"><span><i className="legend-current" />Current</span><span><i className="legend-answered" />Answered</span></div>
          </aside>

          <section className="question-stage">
            <div className="question-meta">
              <span>Question {currentIndex + 1} of {sessionQuestions.length}</span>
              <span>{questionTypeLabels[currentQuestion.type]}</span>
              <span>{currentQuestion.difficulty}</span>
            </div>
            <div className="question-domain">{examTopics.find((topic) => topic.slug === currentQuestion.topic)?.title}</div>
            {currentQuestion.context && <div className="question-context"><Target size={18} /><span>{currentQuestion.context}</span></div>}
            <h1>{currentQuestion.prompt}</h1>
            <p className="question-instruction">{typeDescription(currentQuestion.type)}</p>

            <fieldset className="answer-options" disabled={currentAnswer.locked}>
              <legend className="sr-only">Answer options</legend>
              {currentQuestion.options.map((option, index) => {
                const selected = currentAnswer.selected.includes(index);
                const correctOption = currentQuestion.correct.includes(index);
                const stateClass = feedbackVisible ? correctOption ? " correct" : selected ? " incorrect" : "" : "";
                return (
                  <label className={`answer-option${selected ? " selected" : ""}${stateClass}`} key={option}>
                    <input
                      type={currentQuestion.type === "multiple" ? "checkbox" : "radio"}
                      name={`question-${currentQuestion.id}`}
                      checked={selected}
                      onChange={() => selectOption(index)}
                    />
                    <span className="answer-marker">{String.fromCharCode(65 + index)}</span>
                    <span>{option}</span>
                    {feedbackVisible && correctOption && <CheckCircle2 className="answer-state-icon" size={20} />}
                    {feedbackVisible && selected && !correctOption && <XCircle className="answer-state-icon" size={20} />}
                  </label>
                );
              })}
            </fieldset>

            {feedbackVisible && (
              <div className={`answer-feedback ${isCorrect ? "correct" : "incorrect"}`} role="status">
                <div>{isCorrect ? <CheckCircle2 size={22} /> : <XCircle size={22} />}<strong>{isCorrect ? "Correct decision" : "Review this decision"}</strong></div>
                <p>{currentQuestion.explanation}</p>
                <span>Learning objective · {currentQuestion.objective}</span>
              </div>
            )}

            {!feedbackVisible && (
              <fieldset className="confidence-control">
                <legend>How confident are you?</legend>
                <p>Confidence helps identify knowledge gaps hidden behind lucky guesses.</p>
                <div>
                  {([[1, "Guessing"], [2, "Fairly sure"], [3, "Certain"]] as const).map(([value, label]) => (
                    <button type="button" className={currentAnswer.confidence === value ? "active" : ""} onClick={() => setConfidence(value)} key={value}>{label}</button>
                  ))}
                </div>
              </fieldset>
            )}

            <footer className="question-actions">
              <button type="button" className="button" disabled={currentIndex === 0} onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))}><ArrowLeft size={16} /> Previous</button>
              <button type="button" className="button button-primary" disabled={!currentAnswer.selected.length || (!currentAnswer.confidence && !currentAnswer.locked)} onClick={submitCurrent}>
                {mode === "practice" && !currentAnswer.locked ? "Check answer" : currentIndex === sessionQuestions.length - 1 ? "Finish assessment" : "Next question"} <ArrowRight size={16} />
              </button>
            </footer>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="exam-results shell">
      <section className={`result-hero ${result.rating.tone}`}>
        <div className="result-score" style={{ "--score": `${result.percent * 3.6}deg` } as React.CSSProperties}>
          <div><strong>{result.percent}%</strong><span>{result.correct}/{sessionQuestions.length} correct</span></div>
        </div>
        <div className="result-summary">
          <div className="eyebrow">Assessment complete</div>
          <h1>{result.rating.label}</h1>
          <p>{result.rating.note}</p>
          <div className="result-meta"><span><Clock3 size={15} /> {formatDuration(finalElapsedSeconds)}</span><span><Gauge size={15} /> {mode} mode</span><span><Target size={15} /> {result.topicScores.length} domains</span></div>
        </div>
        <div className="result-actions">
          <button type="button" className="button button-primary" onClick={startSession}><RotateCcw size={16} /> Retake mix</button>
          <button type="button" className="button" onClick={resetToSetup}>Build another exam</button>
        </div>
      </section>

      <section className="result-insights">
        <article><Award size={21} /><span><strong>{result.correct}</strong><small>decisions correct</small></span></article>
        <article><BrainCircuit size={21} /><span><strong>{result.confidentMisses}</strong><small>confident knowledge gaps</small></span></article>
        <article><BarChart3 size={21} /><span><strong>{result.topicScores.filter((topic) => topic.percent >= 75).length}</strong><small>domains at 75%+</small></span></article>
      </section>

      <section className="result-section">
        <div className="result-section-heading"><div><span>01</span><div><h2>Skill profile</h2><p>Use the weakest domain to choose your next focused learning session.</p></div></div></div>
        <div className="domain-results">
          {result.topicScores.map((topic) => (
            <article key={topic.slug}>
              <div><strong>{topic.title}</strong><span>{topic.correct}/{topic.total} correct</span></div>
              <div className="domain-score-bar"><div style={{ width: `${topic.percent}%` }} /></div>
              <div><b>{topic.percent}%</b><Link href={`/guides/${topic.slug}`}>Review guide <ArrowRight size={13} /></Link></div>
            </article>
          ))}
        </div>
      </section>

      {result.confidentMisses > 0 && (
        <aside className="confidence-alert">
          <BrainCircuit size={24} />
          <div><strong>Confidence calibration</strong><p>You marked {result.confidentMisses} incorrect {result.confidentMisses === 1 ? "answer" : "answers"} as “Certain.” Prioritize these items—the gap is more operationally important than an uncertain miss.</p></div>
        </aside>
      )}

      <section className="result-section">
        <div className="result-section-heading"><div><span>02</span><div><h2>Answer review</h2><p>Study the reasoning, not only the correct option.</p></div></div></div>
        <div className="answer-review-list">
          {result.graded.map(({ question, answer, correct }, index) => (
            <details className={correct ? "review-correct" : "review-incorrect"} key={question.id} open={!correct}>
              <summary>
                <span>{correct ? <CheckCircle2 size={19} /> : <XCircle size={19} />}</span>
                <div><small>Question {index + 1} · {questionTypeLabels[question.type]}</small><strong>{question.prompt}</strong></div>
                <span className="review-score">{correct ? "Correct" : "Review"}</span>
              </summary>
              <div className="review-body">
                <div><span>Your answer</span><p>{answer.selected.length ? answer.selected.map((option) => question.options[option]).join(" · ") : "No answer"}</p></div>
                {!correct && <div><span>Correct answer</span><p>{question.correct.map((option) => question.options[option]).join(" · ")}</p></div>}
                <div className="review-explanation"><BookOpenCheck size={18} /><p>{question.explanation}</p></div>
                <Link href={question.guideHref}>Study this domain <ArrowRight size={14} /></Link>
              </div>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
