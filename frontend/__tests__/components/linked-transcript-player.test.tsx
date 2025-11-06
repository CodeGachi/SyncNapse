import { render, screen, fireEvent } from '@testing-library/react';
import { LinkedTranscriptPlayer } from '@/components/transcription/linked-transcript-player';
import { describe, it, expect, vi, beforeEach } from 'vitest';

beforeEach(() => {
  window.HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve());
  window.HTMLMediaElement.prototype.pause = vi.fn();
  window.HTMLMediaElement.prototype.load = vi.fn();
});

describe('LinkedTranscriptPlayer', () => {
  const mockAudioUrl = 'data:audio/webm;base64,test';

  const mockTranscripts = [
    {
      id: 'seg1',
      text: 'Hello world',
      startTime: 0,
      endTime: 2,
      isPartial: false,
      language: 'ko',
    },
    {
      id: 'seg2',
      text: 'This is a test',
      startTime: 2,
      endTime: 5,
      confidence: 0.95,
      isPartial: false,
      language: 'ko',
    },
  ];

  it('renders audio player and transcripts', () => {
    render(
      <LinkedTranscriptPlayer
        audioUrl={mockAudioUrl}
        transcripts={mockTranscripts}
      />,
    );

    expect(screen.getByText('Hello world')).toBeInTheDocument();
    expect(screen.getByText('This is a test')).toBeInTheDocument();
  });

  it('displays empty state when no transcripts', () => {
    render(
      <LinkedTranscriptPlayer
        audioUrl={mockAudioUrl}
        transcripts={[]}
      />,
    );

    expect(screen.getByText('자막이 없습니다.')).toBeInTheDocument();
  });

  it('plays/pauses audio on button click', () => {
    render(
      <LinkedTranscriptPlayer
        audioUrl={mockAudioUrl}
        transcripts={mockTranscripts}
      />,
    );

    const playButton = screen.getByRole('button', { name: /play|pause/i });
    fireEvent.click(playButton);

    expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalled();
  });

  it('renders transcript segments as clickable buttons', () => {
    render(
      <LinkedTranscriptPlayer
        audioUrl={mockAudioUrl}
        transcripts={mockTranscripts}
      />,
    );

    // Check if transcripts are rendered as buttons
    const firstTranscript = screen.getByText('Hello world').closest('button');
    expect(firstTranscript).toBeInTheDocument();
  });

  it('shows low confidence warning when confidence < 0.8', () => {
    const lowConfidenceTranscripts = [
      {
        id: 'seg1',
        text: 'Uncertain text',
        startTime: 0,
        endTime: 2,
        confidence: 0.5,
        isPartial: false,
        language: 'ko',
      },
    ];

    render(
      <LinkedTranscriptPlayer
        audioUrl={mockAudioUrl}
        transcripts={lowConfidenceTranscripts}
      />,
    );

    expect(screen.getByText(/낮은 신뢰도/)).toBeInTheDocument();
  });
});
