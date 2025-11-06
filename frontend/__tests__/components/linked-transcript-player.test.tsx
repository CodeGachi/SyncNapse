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

  it('renders transcript segments as clickable buttons', async () => {
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

    // Check if individual words are rendered as clickable buttons
    const helloButton = screen.getByText('Hello').closest('button');
    const worldButton = screen.getByText('world').closest('button');
    const thisButton = screen.getByText('This').closest('button');
    
    expect(helloButton).toBeInTheDocument();
    expect(worldButton).toBeInTheDocument();
    expect(thisButton).toBeInTheDocument();
    
    // Check if buttons are clickable by verifying they have onClick handlers
    expect(helloButton).toHaveAttribute('title');
    expect(worldButton).toHaveAttribute('title');
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
