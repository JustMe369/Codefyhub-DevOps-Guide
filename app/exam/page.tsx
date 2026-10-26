import type { Metadata } from "next";
import { ExamEngine } from "@/components/exam-engine";

export const metadata: Metadata = {
  title: "DevOps knowledge assessment",
  description: "Build a personalized DevOps exam, measure confidence, and receive targeted learning recommendations."
};

export default function ExamPage() {
  return <ExamEngine />;
}
