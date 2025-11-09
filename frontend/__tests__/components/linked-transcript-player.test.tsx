import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LinkedTranscriptPlayer } from '@/components/transcription/linked-transcript-player';
import { describe, it, expect, vi, beforeEach } from 'vitest';

beforeEach(() => {
  // Mock HTMLMediaElement methods
  const mockPlay = vi.fn(() => Promise.resolve());
  const mockPause = vi.fn();
  const mockLoad = vi.fn();
  
  window.HTMLMediaElement.prototype.play = mockPlay;
  window.HTMLMediaElement.prototype.pause = mockPause;
  window.HTMLMediaElement.prototype.load = mockLoad;
  
  // Mock readyState to simulate audio being ready
  Object.defineProperty(window.HTMLMediaElement.prototype, 'readyState', {
    get: () => 4, // HAVE_ENOUGH_DATA
    configurable: true,
  });
  
  // Mock duration
  Object.defineProperty(window.HTMLMediaElement.prototype, 'duration', {
    get: () => 10,
    configurable: true,
  });
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
      words: [
        { word: 'Hello', startTime: 0, confidence: 1.0, wordIndex: 0 },
        { word: 'world', startTime: 0.5, confidence: 1.0, wordIndex: 1 },
      ],
    },
    {
      id: 'seg2',
      text: 'This is a test',
      startTime: 2,
      endTime: 5,
      confidence: 0.95,
      isPartial: false,
      language: 'ko',
      words: [
        { word: 'This', startTime: 2.0, confidence: 0.95, wordIndex: 0 },
        { word: 'is', startTime: 2.5, confidence: 0.95, wordIndex: 1 },
        { word: 'a', startTime: 3.0, confidence: 0.95, wordIndex: 2 },
        { word: 'test', startTime: 3.5, confidence: 0.95, wordIndex: 3 },
      ],
    },
  ];

  it('renders audio player and transcripts', async () => {
    render(
      <LinkedTranscriptPlayer
        audioUrl={mockAudioUrl}
        transcripts={mockTranscripts}
      />,
    );

    // Wait for the component to finish loading
    await waitFor(() => {
      expect(screen.queryByText('자막이 없습니다.')).not.toBeInTheDocument();
    });

    // Check if individual words from transcripts are rendered as buttons
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('world')).toBeInTheDocument();
    expect(screen.getByText('This')).toBeInTheDocument();
    expect(screen.getByText('is')).toBeInTheDocument();
    expect(screen.getByText('a')).toBeInTheDocument();
    expect(screen.getByText('test')).toBeInTheDocument();
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

  it('plays/pauses audio on button click', async () => {
    const { container } = render(
      <LinkedTranscriptPlayer
        audioUrl={mockAudioUrl}
        transcripts={mockTranscripts}
      />,
    );

    const audio = container.querySelector('audio') as HTMLAudioElement;
    
    // Simulate audio being ready by triggering loadeddata event
    fireEvent.loadedData(audio);
    fireEvent.canPlay(audio);
    
    await waitFor(() => {
      const playButton = screen.getByRole('button', { name: /play|pause/i });
      expect(playButton).not.toBeDisabled();
    });

    const playButton = screen.getByRole('button', { name: /play|pause/i });
    fireEvent.click(playButton);

    expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalled();
  });

  it('renders transcript segments as clickable buttons with words', async () => {
    render(
      <LinkedTranscriptPlayer
        audioUrl={mockAudioUrl}
        transcripts={mockTranscripts}
      />,
    );

    // Wait for the component to finish loading
    await waitFor(() => {
      expect(screen.queryByText('자막이 없습니다.')).not.toBeInTheDocument();
    });

    // Check if individual words are rendered as clickable spans
    const helloSpan = screen.getByText('Hello');
    const worldSpan = screen.getByText('world');
    const thisSpan = screen.getByText('This');
    
    expect(helloSpan).toBeInTheDocument();
    expect(worldSpan).toBeInTheDocument();
    expect(thisSpan).toBeInTheDocument();
    
    // Words should have title attributes with timestamp info
    expect(helloSpan).toHaveAttribute('title');
    expect(worldSpan).toHaveAttribute('title');
    expect(thisSpan).toHaveAttribute('title');
    
    // Words should be clickable (have cursor-pointer class)
    expect(helloSpan).toHaveClass('cursor-pointer');
    expect(worldSpan).toHaveClass('cursor-pointer');
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
        words: [
          { word: 'Uncertain', startTime: 0, confidence: 0.5, wordIndex: 0 },
          { word: 'text', startTime: 0.5, confidence: 0.5, wordIndex: 1 },
        ],
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
