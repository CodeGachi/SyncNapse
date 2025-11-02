/**
 * Question Types
 * Question (Q&A) related type
 */

/**
 * Question type
 */
export interface Question {
  id: string;
  content: string;
  author: string;
  timestamp: string;
  status: "pending" | "answered";
  answer?: string;
  answeredAt?: string;
}
