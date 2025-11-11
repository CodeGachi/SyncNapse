'use client';

import { useEffect, useRef, useState } from 'react';

interface TranscriptionSegment {
  id: string;
  text: string;
  startTime: number;
  confidence?: number;
  isPartial: boolean;
}

export interface YouTubeStyleSubtitleProps {
  segments: TranscriptionSegment[];
  currentTime?: number;
  maxVisibleSegments?: number;
  className?: string;
}

export function YouTubeStyleSubtitle({
  segments,
  currentTime = 0,
  maxVisibleSegments = 3,
  className = '',
}: YouTubeStyleSubtitleProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleSegments, setVisibleSegments] = useState<TranscriptionSegment[]>([]);

  useEffect(() => {
    if (segments.length === 0) return;

    const latestSegments = segments.slice(-maxVisibleSegments);
    setVisibleSegments(latestSegments);

    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [segments, maxVisibleSegments]);

  const latestConfirmedSegment = segments
    .filter((s) => !s.isPartial)
    .slice(-1)[0];

  const latestPartialSegment = segments
    .filter((s) => s.isPartial)
    .slice(-1)[0];

  return (
    <div
      className={`relative w-full bg-black bg-opacity-80 text-white ${className}`}
      ref={containerRef}
    >
      <div className="p-4 space-y-2">
        {visibleSegments
          .filter((s) => !s.isPartial)
          .map((segment, index) => {
            const opacity = 0.5 + (index / visibleSegments.length) * 0.5;
            
            return (
              <div
                key={segment.id}
                className="text-center transition-opacity duration-300"
                style={{ opacity }}
                translate="yes"
              >
                <p className="text-lg md:text-xl font-medium leading-relaxed">
                  {segment.text}
                </p>
              </div>
            );
          })}

        {latestPartialSegment && (
          <div className="text-center animate-pulse">
            <p
              className="text-lg md:text-xl font-medium leading-relaxed text-gray-300"
              translate="yes"
            >
              {latestPartialSegment.text}
              <span className="inline-block w-1 h-5 ml-1 bg-white animate-blink" />
            </p>
          </div>
        )}

        {segments.length === 0 && (
          <div className="text-center text-gray-400 py-8">
            <p className="text-lg">자막이 여기에 표시됩니다...</p>
            <p className="text-sm mt-2">녹음을 시작하세요</p>
          </div>
        )}
      </div>

      <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-black to-transparent pointer-events-none" />
    </div>
  );
}

if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes blink {
      0%, 50% { opacity: 1; }
      51%, 100% { opacity: 0; }
    }
    .animate-blink {
      animation: blink 1s infinite;
    }
  `;
  document.head.appendChild(style);
}
