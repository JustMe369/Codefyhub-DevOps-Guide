import { describe, expect, it } from "vitest";
import { examTopics, isCorrectAnswer, questionBank } from "./exam-data";

describe("exam question bank", () => {
  it("covers every guide domain with multiple questions", () => {
    for (const topic of examTopics) {
      expect(questionBank.filter((question) => question.topic === topic.slug).length).toBeGreaterThanOrEqual(3);
    }
  });

  it("uses unique question identifiers and valid answer indexes", () => {
    expect(new Set(questionBank.map((question) => question.id)).size).toBe(questionBank.length);
    for (const question of questionBank) {
      expect(question.correct.length).toBeGreaterThan(0);
      expect(question.correct.every((index) => index >= 0 && index < question.options.length)).toBe(true);
    }
  });

  it("grades exact matches and rejects partial multiple-select answers", () => {
    const question = questionBank.find((item) => item.type === "multiple");
    expect(question).toBeDefined();
    expect(isCorrectAnswer(question!, [...question!.correct].reverse())).toBe(true);
    expect(isCorrectAnswer(question!, question!.correct.slice(0, 1))).toBe(false);
  });
});
