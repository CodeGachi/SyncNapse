/**
 * 단어장 패널 컴포넌트
 * 강의 자료 핵심 단어 저장 및 태그 관리
 */

"use client";

import { useState } from "react";
import {
  BookOpen,
  Plus,
  Search,
  Tag,
  Trash2,
  Download,
  Edit3,
  Check,
  Filter,
  ChevronDown,
  FileText,
} from "lucide-react";
import { Panel } from "./panel";
import { useVocabularyPanel, type VocabularyWord } from "@/features/note/panels/use-vocabulary-panel";

interface VocabularyPanelProps {
  isOpen: boolean;
  onClose?: () => void;
  noteId?: string | null;
  noteName?: string;
}

// 단어 카드 컴포넌트
function WordCard({
  word,
  onEdit,
  onDelete,
  isEditing,
  onSave,
  onCancel,
}: {
  word: VocabularyWord;
  onEdit: () => void;
  onDelete: () => void;
  isEditing: boolean;
  onSave: (updates: { word: string; definition: string; tags: string[]; pageNumber?: number }) => void;
  onCancel: () => void;
}) {
  const [editWord, setEditWord] = useState(word.word);
  const [editDefinition, setEditDefinition] = useState(word.definition);
  const [editTags, setEditTags] = useState(word.tags.join(", "));
  const [editPage, setEditPage] = useState(word.pageNumber?.toString() || "");

  if (isEditing) {
    return (
      <div className="p-3 bg-background-elevated border border-brand/30 rounded-xl space-y-2 animate-in fade-in duration-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={editWord}
            onChange={(e) => setEditWord(e.target.value)}
            className="flex-1 bg-background-surface text-foreground text-sm px-3 py-2 rounded-lg border border-border focus:border-brand/50 focus:outline-none"
            placeholder="단어"
            autoFocus
          />
          <input
            type="number"
            value={editPage}
            onChange={(e) => setEditPage(e.target.value)}
            className="w-16 bg-background-surface text-foreground text-sm px-2 py-2 rounded-lg border border-border focus:border-brand/50 focus:outline-none text-center"
            placeholder="p."
            min={1}
          />
        </div>
        <textarea
          value={editDefinition}
          onChange={(e) => setEditDefinition(e.target.value)}
          className="w-full bg-background-surface text-foreground text-sm px-3 py-2 rounded-lg border border-border focus:border-brand/50 focus:outline-none resize-none"
          placeholder="정의"
          rows={2}
        />
        <input
          type="text"
          value={editTags}
          onChange={(e) => setEditTags(e.target.value)}
          className="w-full bg-background-surface text-foreground-secondary text-xs px-3 py-2 rounded-lg border border-border focus:border-brand/50 focus:outline-none"
          placeholder="태그 (쉼표로 구분)"
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-foreground-tertiary hover:text-foreground text-xs rounded-lg hover:bg-background-overlay transition-colors"
          >
            취소
          </button>
          <button
            onClick={() =>
              onSave({
                word: editWord,
                definition: editDefinition,
                tags: editTags
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean),
                pageNumber: editPage ? parseInt(editPage, 10) : undefined,
              })
            }
            className="px-3 py-1.5 bg-brand text-black text-xs rounded-lg hover:bg-brand/90 transition-colors flex items-center gap-1"
          >
            <Check size={12} />
            저장
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group p-3 bg-background-elevated border border-border hover:border-brand/30 rounded-xl transition-all duration-200 animate-in fade-in slide-in-from-bottom-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-foreground truncate">{word.word}</h4>
            {word.pageNumber && (
              <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-500/10 text-blue-500 text-[10px] rounded-md flex-shrink-0">
                <FileText size={10} />
                p.{word.pageNumber}
              </span>
            )}
          </div>
          <p className="text-xs text-foreground-secondary mt-1 line-clamp-2">{word.definition}</p>
          {word.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {word.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 bg-brand/10 text-brand text-[10px] rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            className="p-1.5 text-foreground-tertiary hover:text-foreground hover:bg-background-overlay rounded-md transition-colors"
            title="수정"
          >
            <Edit3 size={12} />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-foreground-tertiary hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
            title="삭제"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
      {word.noteName && (
        <p className="text-[10px] text-foreground-tertiary mt-2 truncate">
          {word.noteName}
        </p>
      )}
    </div>
  );
}

// 단어 추가 폼 컴포넌트
function AddWordForm({
  onAdd,
  onCancel,
}: {
  onAdd: (word: string, definition: string, tags: string[], pageNumber?: number) => void;
  onCancel: () => void;
}) {
  const [word, setWord] = useState("");
  const [definition, setDefinition] = useState("");
  const [tags, setTags] = useState("");
  const [pageNumber, setPageNumber] = useState("");

  const handleSubmit = () => {
    if (!word.trim() || !definition.trim()) return;
    onAdd(
      word,
      definition,
      tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      pageNumber ? parseInt(pageNumber, 10) : undefined
    );
    setWord("");
    setDefinition("");
    setTags("");
    setPageNumber("");
  };

  return (
    <div className="p-3 bg-background-surface border border-brand/30 rounded-xl space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex gap-2">
        <input
          type="text"
          value={word}
          onChange={(e) => setWord(e.target.value)}
          className="flex-1 bg-background-elevated text-foreground text-sm px-3 py-2 rounded-lg border border-border focus:border-brand/50 focus:outline-none"
          placeholder="단어를 입력하세요"
          autoFocus
        />
        <input
          type="number"
          value={pageNumber}
          onChange={(e) => setPageNumber(e.target.value)}
          className="w-16 bg-background-elevated text-foreground text-sm px-2 py-2 rounded-lg border border-border focus:border-brand/50 focus:outline-none text-center"
          placeholder="p."
          min={1}
        />
      </div>
      <textarea
        value={definition}
        onChange={(e) => setDefinition(e.target.value)}
        className="w-full bg-background-elevated text-foreground text-sm px-3 py-2 rounded-lg border border-border focus:border-brand/50 focus:outline-none resize-none"
        placeholder="정의를 입력하세요"
        rows={2}
      />
      <input
        type="text"
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        className="w-full bg-background-elevated text-foreground-secondary text-xs px-3 py-2 rounded-lg border border-border focus:border-brand/50 focus:outline-none"
        placeholder="태그 (쉼표로 구분, 예: 중요, 1장)"
      />
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-foreground-tertiary hover:text-foreground text-xs rounded-lg hover:bg-background-overlay transition-colors"
        >
          취소
        </button>
        <button
          onClick={handleSubmit}
          disabled={!word.trim() || !definition.trim()}
          className="px-3 py-1.5 bg-brand text-black text-xs rounded-lg hover:bg-brand/90 transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={12} />
          추가
        </button>
      </div>
    </div>
  );
}

export function VocabularyPanel({ isOpen, onClose, noteId, noteName }: VocabularyPanelProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [showTagFilter, setShowTagFilter] = useState(false);

  const {
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
    addWord,
    updateWord,
    deleteWord,
    clearWords,
    exportToMarkdown,
  } = useVocabularyPanel({ noteId, noteName });

  const handleAddWord = (word: string, definition: string, tags: string[], pageNumber?: number) => {
    addWord(word, definition, tags, pageNumber);
    setIsAdding(false);
  };

  return (
    <Panel isOpen={isOpen} borderColor="gray" title="단어장" onClose={onClose}>
      <div className="flex flex-col h-full">
        {/* 헤더 - 검색 및 필터 */}
        <div className="px-4 py-3 border-b border-border bg-background-elevated flex-shrink-0 space-y-3">
          {/* 검색창 */}
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-tertiary"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="단어 검색..."
              className="w-full bg-background-surface text-foreground text-sm pl-9 pr-3 py-2 rounded-lg border border-border focus:border-brand/50 focus:outline-none"
            />
          </div>

          {/* 필터 옵션 */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowCurrentNoteOnly(!showCurrentNoteOnly)}
              className={`px-2.5 py-1.5 text-[10px] rounded-lg border transition-all flex items-center gap-1 ${
                showCurrentNoteOnly
                  ? "bg-brand/10 border-brand/30 text-brand"
                  : "bg-background-overlay border-border text-foreground-secondary hover:border-brand/30"
              }`}
            >
              <Filter size={10} />
              현재 노트만
              {showCurrentNoteOnly && ` (${currentNoteWordCount})`}
            </button>

            <div className="relative">
              <button
                onClick={() => setShowTagFilter(!showTagFilter)}
                className={`px-2.5 py-1.5 text-[10px] rounded-lg border transition-all flex items-center gap-1 ${
                  selectedTag
                    ? "bg-brand/10 border-brand/30 text-brand"
                    : "bg-background-overlay border-border text-foreground-secondary hover:border-brand/30"
                }`}
              >
                <Tag size={10} />
                {selectedTag || "태그 필터"}
                <ChevronDown size={10} />
              </button>

              {showTagFilter && (
                <div className="absolute top-full left-0 mt-1 w-40 bg-background-elevated border border-border rounded-lg shadow-lg z-10 py-1 animate-in fade-in slide-in-from-top-2 duration-200">
                  <button
                    onClick={() => {
                      setSelectedTag(null);
                      setShowTagFilter(false);
                    }}
                    className={`w-full px-3 py-1.5 text-left text-xs hover:bg-background-overlay transition-colors ${
                      !selectedTag ? "text-brand" : "text-foreground-secondary"
                    }`}
                  >
                    전체
                  </button>
                  {allTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => {
                        setSelectedTag(tag);
                        setShowTagFilter(false);
                      }}
                      className={`w-full px-3 py-1.5 text-left text-xs hover:bg-background-overlay transition-colors ${
                        selectedTag === tag ? "text-brand" : "text-foreground-secondary"
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                  {allTags.length === 0 && (
                    <p className="px-3 py-1.5 text-xs text-foreground-tertiary">태그 없음</p>
                  )}
                </div>
              )}
            </div>

            <div className="flex-1" />

            <button
              onClick={exportToMarkdown}
              disabled={filteredWords.length === 0}
              className="p-1.5 text-foreground-tertiary hover:text-foreground hover:bg-background-overlay rounded-md transition-colors disabled:opacity-50"
              title="마크다운으로 내보내기"
            >
              <Download size={14} />
            </button>
          </div>
        </div>

        {/* 단어 목록 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-background-surface">
          {/* 단어 추가 폼 */}
          {isAdding && (
            <AddWordForm onAdd={handleAddWord} onCancel={() => setIsAdding(false)} />
          )}

          {/* 빈 상태 */}
          {filteredWords.length === 0 && !isAdding && (
            <div className="flex flex-col items-center justify-center h-full text-foreground-tertiary space-y-3 opacity-60">
              <div className="w-12 h-12 bg-background-elevated rounded-full flex items-center justify-center">
                <BookOpen size={24} className="text-foreground-tertiary" />
              </div>
              <p className="text-xs font-medium">
                {searchQuery || selectedTag ? "검색 결과가 없습니다" : "저장된 단어가 없습니다"}
              </p>
              {!searchQuery && !selectedTag && (
                <button
                  onClick={() => setIsAdding(true)}
                  className="px-3 py-1.5 bg-brand text-black text-xs rounded-lg hover:bg-brand/90 transition-colors flex items-center gap-1"
                >
                  <Plus size={12} />
                  단어 추가하기
                </button>
              )}
            </div>
          )}

          {/* 단어 카드 목록 */}
          {filteredWords.map((word) => (
            <WordCard
              key={word.id}
              word={word}
              isEditing={editingWord?.id === word.id}
              onEdit={() => setEditingWord(word)}
              onDelete={() => deleteWord(word.id)}
              onSave={(updates) => updateWord(word.id, updates)}
              onCancel={() => setEditingWord(null)}
            />
          ))}
        </div>

        {/* 하단 액션 바 */}
        <div className="p-3 border-t border-border bg-background-elevated flex items-center justify-between">
          <span className="text-[10px] text-foreground-tertiary">
            {filteredWords.length}개 단어
          </span>
          <div className="flex items-center gap-2">
            {filteredWords.length > 0 && (
              <button
                onClick={() => clearWords(showCurrentNoteOnly)}
                className="px-2.5 py-1.5 text-red-500 hover:bg-red-500/10 text-[10px] rounded-lg transition-colors flex items-center gap-1"
              >
                <Trash2 size={10} />
                {showCurrentNoteOnly ? "현재 노트 삭제" : "전체 삭제"}
              </button>
            )}
            <button
              onClick={() => setIsAdding(true)}
              disabled={isAdding}
              className="px-3 py-1.5 bg-brand text-black text-xs rounded-lg hover:bg-brand/90 transition-colors flex items-center gap-1 disabled:opacity-50"
            >
              <Plus size={12} />
              추가
            </button>
          </div>
        </div>
      </div>
    </Panel>
  );
}
