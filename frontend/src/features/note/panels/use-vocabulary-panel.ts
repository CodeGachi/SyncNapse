/**
 * 단어장 패널 훅
 * 로컬 스토리지 기반 단어 저장 및 관리
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { createLogger } from "@/lib/utils/logger";

const log = createLogger("VocabularyPanel");

const STORAGE_KEY = "syncnapse_vocabulary";

export interface VocabularyWord {
  id: string;
  word: string;
  definition: string;
  tags: string[];
  noteId: string;
  noteName?: string;
  pageNumber?: number; // 단어가 나온 페이지 번호
  createdAt: Date;
  updatedAt: Date;
}

interface UseVocabularyPanelProps {
  noteId?: string | null;
  noteName?: string;
}

// 로컬 스토리지에서 단어 목록 불러오기
function loadVocabulary(): VocabularyWord[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return parsed.map((item: VocabularyWord) => ({
      ...item,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
    }));
  } catch (error) {
    log.error("Failed to load vocabulary:", error);
    return [];
  }
}

// 로컬 스토리지에 단어 목록 저장
function saveVocabulary(words: VocabularyWord[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
  } catch (error) {
    log.error("Failed to save vocabulary:", error);
  }
}

export function useVocabularyPanel({ noteId, noteName }: UseVocabularyPanelProps) {
  const [allWords, setAllWords] = useState<VocabularyWord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showCurrentNoteOnly, setShowCurrentNoteOnly] = useState(false);
  const [editingWord, setEditingWord] = useState<VocabularyWord | null>(null);

  // 초기 로딩
  useEffect(() => {
    setAllWords(loadVocabulary());
  }, []);

  // 단어 목록이 변경될 때마다 저장
  useEffect(() => {
    if (allWords.length > 0) {
      saveVocabulary(allWords);
    }
  }, [allWords]);

  // 모든 태그 추출
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    allWords.forEach((word) => {
      word.tags.forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [allWords]);

  // 필터링된 단어 목록
  const filteredWords = useMemo(() => {
    let result = allWords;

    // 현재 노트만 보기
    if (showCurrentNoteOnly && noteId) {
      result = result.filter((word) => word.noteId === noteId);
    }

    // 태그 필터
    if (selectedTag) {
      result = result.filter((word) => word.tags.includes(selectedTag));
    }

    // 검색어 필터
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (word) =>
          word.word.toLowerCase().includes(query) ||
          word.definition.toLowerCase().includes(query) ||
          word.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // 최신순 정렬
    return result.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [allWords, showCurrentNoteOnly, noteId, selectedTag, searchQuery]);

  // 단어 추가
  const addWord = useCallback(
    (word: string, definition: string, tags: string[] = [], pageNumber?: number) => {
      if (!word.trim() || !definition.trim()) return;
      if (!noteId) {
        log.error("Note ID is required to add vocabulary");
        return;
      }

      const newWord: VocabularyWord = {
        id: `vocab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        word: word.trim(),
        definition: definition.trim(),
        tags: tags.map((t) => t.trim()).filter(Boolean),
        noteId,
        noteName,
        pageNumber,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      setAllWords((prev) => [newWord, ...prev]);
      log.info("Word added:", newWord.word);
    },
    [noteId, noteName]
  );

  // 단어 수정
  const updateWord = useCallback(
    (id: string, updates: Partial<Pick<VocabularyWord, "word" | "definition" | "tags" | "pageNumber">>) => {
      setAllWords((prev) =>
        prev.map((word) =>
          word.id === id
            ? {
                ...word,
                ...updates,
                updatedAt: new Date(),
              }
            : word
        )
      );
      setEditingWord(null);
    },
    []
  );

  // 단어 삭제
  const deleteWord = useCallback((id: string) => {
    setAllWords((prev) => {
      const newWords = prev.filter((word) => word.id !== id);
      // 삭제 후 남은 단어가 없으면 로컬스토리지도 초기화
      if (newWords.length === 0) {
        localStorage.removeItem(STORAGE_KEY);
      }
      return newWords;
    });
  }, []);

  // 전체 삭제 (현재 노트 또는 전체)
  const clearWords = useCallback(
    (currentNoteOnly: boolean = false) => {
      if (currentNoteOnly && noteId) {
        setAllWords((prev) => {
          const newWords = prev.filter((word) => word.noteId !== noteId);
          if (newWords.length === 0) {
            localStorage.removeItem(STORAGE_KEY);
          }
          return newWords;
        });
      } else {
        setAllWords([]);
        localStorage.removeItem(STORAGE_KEY);
      }
    },
    [noteId]
  );

  // 마크다운으로 내보내기
  const exportToMarkdown = useCallback(() => {
    const wordsToExport = showCurrentNoteOnly ? filteredWords : allWords;

    if (wordsToExport.length === 0) {
      return;
    }

    // 태그별로 그룹화
    const byTag: Record<string, VocabularyWord[]> = { "태그 없음": [] };

    wordsToExport.forEach((word) => {
      if (word.tags.length === 0) {
        byTag["태그 없음"].push(word);
      } else {
        word.tags.forEach((tag) => {
          if (!byTag[tag]) byTag[tag] = [];
          byTag[tag].push(word);
        });
      }
    });

    // 마크다운 생성
    let markdown = `# 단어장\n\n`;
    markdown += `> 총 ${wordsToExport.length}개 단어\n\n`;

    Object.entries(byTag).forEach(([tag, words]) => {
      if (words.length === 0) return;
      markdown += `## ${tag}\n\n`;
      words.forEach((word) => {
        markdown += `### ${word.word}`;
        if (word.pageNumber) {
          markdown += ` (p.${word.pageNumber})`;
        }
        markdown += `\n${word.definition}\n\n`;
      });
    });

    // 파일 다운로드
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vocabulary-${new Date().toISOString().split("T")[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [allWords, filteredWords, showCurrentNoteOnly]);

  // 현재 노트의 단어 수
  const currentNoteWordCount = useMemo(() => {
    if (!noteId) return 0;
    return allWords.filter((word) => word.noteId === noteId).length;
  }, [allWords, noteId]);

  return {
    // 상태
    allWords,
    filteredWords,
    allTags,
    searchQuery,
    setSearchQuery,
    selectedTag,
    setSelectedTag,
    showCurrentNoteOnly,
    setShowCurrentNoteOnly,
    editingWord,
    setEditingWord,
    currentNoteWordCount,

    // 액션
    addWord,
    updateWord,
    deleteWord,
    clearWords,
    exportToMarkdown,
  };
}
