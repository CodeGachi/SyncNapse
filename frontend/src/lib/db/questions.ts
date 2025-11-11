/**
 * Q&A 질문 관리 함수 (IndexedDB)
 */

import { initDB } from "./index";
import type { DBQuestion } from "./index";

export type { DBQuestion };

/**
 * 특정 노트의 모든 질문 가져오기
 */
export async function getQuestionsByNote(noteId: string): Promise<DBQuestion[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["questions"], "readonly");
    const store = transaction.objectStore("questions");
    const index = store.index("noteId");
    const request = index.getAll(noteId);

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(new Error("질문 목록을 가져올 수 없습니다."));
    };
  });
}

/**
 * 질문 생성
 */
export async function createQuestion(
  noteId: string,
  content: string,
  authorId: string,
  authorName: string
): Promise<DBQuestion> {
  const db = await initDB();

  const question: DBQuestion = {
    id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    noteId,
    content,
    authorId,
    authorName,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    answers: [],
    upvotes: [],
    isPinned: false,
    isSharedToAll: false,
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["questions"], "readwrite");
    const store = transaction.objectStore("questions");
    const request = store.add(question);

    request.onsuccess = () => {
      resolve(question);
    };

    request.onerror = () => {
      reject(
        new Error(
          `질문 생성 실패: ${request.error?.message || "Unknown error"}`
        )
      );
    };
  });
}

/**
 * 질문 수정
 */
export async function updateQuestion(
  questionId: string,
  updates: Partial<Omit<DBQuestion, "id" | "noteId" | "createdAt">>
): Promise<void> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["questions"], "readwrite");
    const store = transaction.objectStore("questions");
    const getRequest = store.get(questionId);

    getRequest.onsuccess = () => {
      const question = getRequest.result;
      if (!question) {
        reject(new Error("질문을 찾을 수 없습니다."));
        return;
      }

      const updatedQuestion = {
        ...question,
        ...updates,
        updatedAt: Date.now(),
      };

      const updateRequest = store.put(updatedQuestion);

      updateRequest.onsuccess = () => {
        resolve();
      };

      updateRequest.onerror = () => {
        reject(new Error("질문 수정 실패"));
      };
    };

    getRequest.onerror = () => {
      reject(new Error("질문 조회 실패"));
    };
  });
}

/**
 * 질문 삭제
 */
export async function deleteQuestion(questionId: string): Promise<void> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["questions"], "readwrite");
    const store = transaction.objectStore("questions");
    const request = store.delete(questionId);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error("질문 삭제 실패"));
    };
  });
}

/**
 * 질문 추천/추천 취소
 */
export async function toggleQuestionUpvote(
  questionId: string,
  userId: string
): Promise<void> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["questions"], "readwrite");
    const store = transaction.objectStore("questions");
    const getRequest = store.get(questionId);

    getRequest.onsuccess = () => {
      const question = getRequest.result;
      if (!question) {
        reject(new Error("질문을 찾을 수 없습니다."));
        return;
      }

      const upvoteIndex = question.upvotes.indexOf(userId);
      if (upvoteIndex === -1) {
        // 추천
        question.upvotes.push(userId);
      } else {
        // 추천 취소
        question.upvotes.splice(upvoteIndex, 1);
      }

      question.updatedAt = Date.now();

      const updateRequest = store.put(question);

      updateRequest.onsuccess = () => {
        resolve();
      };

      updateRequest.onerror = () => {
        reject(new Error("추천 처리 실패"));
      };
    };

    getRequest.onerror = () => {
      reject(new Error("질문 조회 실패"));
    };
  });
}

/**
 * 질문 핀 고정/해제
 */
export async function toggleQuestionPin(questionId: string): Promise<void> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["questions"], "readwrite");
    const store = transaction.objectStore("questions");
    const getRequest = store.get(questionId);

    getRequest.onsuccess = () => {
      const question = getRequest.result;
      if (!question) {
        reject(new Error("질문을 찾을 수 없습니다."));
        return;
      }

      question.isPinned = !question.isPinned;
      question.updatedAt = Date.now();

      const updateRequest = store.put(question);

      updateRequest.onsuccess = () => {
        resolve();
      };

      updateRequest.onerror = () => {
        reject(new Error("핀 고정 처리 실패"));
      };
    };

    getRequest.onerror = () => {
      reject(new Error("질문 조회 실패"));
    };
  });
}

/**
 * 질문 공유 설정 토글
 */
export async function toggleQuestionShare(questionId: string): Promise<void> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["questions"], "readwrite");
    const store = transaction.objectStore("questions");
    const getRequest = store.get(questionId);

    getRequest.onsuccess = () => {
      const question = getRequest.result;
      if (!question) {
        reject(new Error("질문을 찾을 수 없습니다."));
        return;
      }

      question.isSharedToAll = !question.isSharedToAll;
      question.updatedAt = Date.now();

      const updateRequest = store.put(question);

      updateRequest.onsuccess = () => {
        resolve();
      };

      updateRequest.onerror = () => {
        reject(new Error("공유 설정 처리 실패"));
      };
    };

    getRequest.onerror = () => {
      reject(new Error("질문 조회 실패"));
    };
  });
}

/**
 * 질문에 답변 추가
 */
export async function addAnswerToQuestion(
  questionId: string,
  content: string,
  authorId: string,
  authorName: string
): Promise<{ id: string; content: string; authorId: string; authorName: string; createdAt: number; isBest: boolean }> {
  const db = await initDB();

  const answer = {
    id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    content,
    authorId,
    authorName,
    createdAt: Date.now(),
    isBest: false,
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["questions"], "readwrite");
    const store = transaction.objectStore("questions");
    const getRequest = store.get(questionId);

    getRequest.onsuccess = () => {
      const question = getRequest.result;
      if (!question) {
        reject(new Error("질문을 찾을 수 없습니다."));
        return;
      }

      question.answers.push(answer);
      question.updatedAt = Date.now();

      const updateRequest = store.put(question);

      updateRequest.onsuccess = () => {
        resolve(answer);
      };

      updateRequest.onerror = () => {
        reject(new Error("답변 추가 실패"));
      };
    };

    getRequest.onerror = () => {
      reject(new Error("질문 조회 실패"));
    };
  });
}

/**
 * 질문에서 답변 삭제
 */
export async function deleteAnswerFromQuestion(
  questionId: string,
  answerId: string
): Promise<void> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["questions"], "readwrite");
    const store = transaction.objectStore("questions");
    const getRequest = store.get(questionId);

    getRequest.onsuccess = () => {
      const question = getRequest.result;
      if (!question) {
        reject(new Error("질문을 찾을 수 없습니다."));
        return;
      }

      const answerIndex = question.answers.findIndex(
        (a: any) => a.id === answerId
      );
      if (answerIndex === -1) {
        reject(new Error("답변을 찾을 수 없습니다."));
        return;
      }

      question.answers.splice(answerIndex, 1);
      question.updatedAt = Date.now();

      const updateRequest = store.put(question);

      updateRequest.onsuccess = () => {
        resolve();
      };

      updateRequest.onerror = () => {
        reject(new Error("답변 삭제 실패"));
      };
    };

    getRequest.onerror = () => {
      reject(new Error("질문 조회 실패"));
    };
  });
}

/**
 * 답변을 베스트 답변으로 표시 (하나만 가능)
 */
export async function markAnswerAsBest(
  questionId: string,
  answerId: string
): Promise<void> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["questions"], "readwrite");
    const store = transaction.objectStore("questions");
    const getRequest = store.get(questionId);

    getRequest.onsuccess = () => {
      const question = getRequest.result;
      if (!question) {
        reject(new Error("질문을 찾을 수 없습니다."));
        return;
      }

      // 모든 답변의 isBest를 false로 설정
      question.answers.forEach((answer: any) => {
        answer.isBest = false;
      });

      // 선택한 답변만 isBest를 true로 설정
      const targetAnswer = question.answers.find((a: any) => a.id === answerId);
      if (!targetAnswer) {
        reject(new Error("답변을 찾을 수 없습니다."));
        return;
      }

      targetAnswer.isBest = true;
      question.updatedAt = Date.now();

      const updateRequest = store.put(question);

      updateRequest.onsuccess = () => {
        resolve();
      };

      updateRequest.onerror = () => {
        reject(new Error("베스트 답변 설정 실패"));
      };
    };

    getRequest.onerror = () => {
      reject(new Error("질문 조회 실패"));
    };
  });
}
