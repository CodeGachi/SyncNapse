import { PostprocessService } from './postprocess.service';
import { execFile } from 'node:child_process';

// Mock child_process
jest.mock('node:child_process', () => ({
  execFile: jest.fn(),
}));

// Mock util.promisify
// Since the service uses promisify(execFile), and promisify wraps the function to return a promise
// we need to ensure that when the service calls the promisified function, it behaves as expected.
// The easiest way is to mock execFile to invoke the callback, which promisify will then turn into a resolved/rejected promise.
// OR we can mock promisify itself if we want to return a specific mock function. 
// However, jest.mock('node:util') is tricky.
// Better approach: standard promisify wrapping of a mock.
// If we mock execFile to call its callback, the real promisify will work fine.

describe('PostprocessService', () => {
  let service: PostprocessService;
  const mockExecFile = execFile as unknown as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PostprocessService();
    
    // Default mock implementation for execFile: call the callback with success
    mockExecFile.mockImplementation((file, args, options, callback) => {
      // Handle variadic arguments for execFile: (file, args?, options?, callback?)
      let cb = callback;
      if (!cb && typeof options === 'function') {
        cb = options;
      }
      if (!cb && typeof args === 'function') {
        cb = args;
      }
      
      if (cb) {
        // Default success response
        cb(null, { stdout: '123.456\n', stderr: '' });
      }
      return {} as any; // Return child process object stub
    });
  });

  describe('getIndexingTarget', () => {
    it('should return enabled target for PDF mime type', () => {
      const target = service.getIndexingTarget('application/pdf');

      expect(target).toEqual({
        enabled: true,
        kind: 'pdf',
      });
    });

    it('should return enabled target for text mime type', () => {
      const target = service.getIndexingTarget('text/plain');

      expect(target).toEqual({
        enabled: true,
        kind: 'text',
      });
    });

    it('should return enabled target for audio/mpeg', () => {
      const target = service.getIndexingTarget('audio/mpeg');

      expect(target).toEqual({
        enabled: true,
        kind: 'audio',
      });
    });

    it('should return enabled target for audio/wav', () => {
      const target = service.getIndexingTarget('audio/wav');

      expect(target).toEqual({
        enabled: true,
        kind: 'audio',
      });
    });

    it('should return disabled target for unknown mime type', () => {
      const target = service.getIndexingTarget('application/octet-stream');

      expect(target).toEqual({
        enabled: false,
        kind: 'other',
      });
    });

    it('should return disabled target for undefined mime', () => {
      const target = service.getIndexingTarget(undefined);

      expect(target).toEqual({
        enabled: false,
        kind: 'other',
      });
    });
  });

  describe('convertIfNeeded', () => {
    it('should return original path for stub implementation', async () => {
      const inputPath = '/var/uploads/test.pdf';
      const mime = 'application/pdf';

      const result = await service.convertIfNeeded(inputPath, mime);

      expect(result).toEqual({
        convertedPath: inputPath,
        format: mime,
      });
    });

    it('should handle undefined mime type', async () => {
      const inputPath = '/var/uploads/unknown.bin';

      const result = await service.convertIfNeeded(inputPath);

      expect(result.convertedPath).toBe(inputPath);
      expect(result.format).toBeUndefined();
    });
  });

  describe('indexIfEnabled', () => {
    it('should return indexed true for enabled targets', async () => {
      const target = { enabled: true, kind: 'pdf' as const };

      const result = await service.indexIfEnabled('/path/to/file.pdf', target);

      expect(result).toEqual({ indexed: true });
    });

    it('should return indexed false for disabled targets', async () => {
      const target = { enabled: false, kind: 'other' as const };

      const result = await service.indexIfEnabled('/path/to/file.bin', target);

      expect(result).toEqual({ indexed: false });
    });
  });

  describe('isAudio', () => {
    it('should return true for audio/mpeg', () => {
      expect(service.isAudio('audio/mpeg')).toBe(true);
    });

    it('should return true for audio/wav', () => {
      expect(service.isAudio('audio/wav')).toBe(true);
    });

    it('should return true for any audio/* mime type', () => {
      expect(service.isAudio('audio/ogg')).toBe(true);
      expect(service.isAudio('audio/flac')).toBe(true);
    });

    it('should return false for non-audio mime types', () => {
      expect(service.isAudio('video/mp4')).toBe(false);
      expect(service.isAudio('application/pdf')).toBe(false);
      expect(service.isAudio('text/plain')).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(service.isAudio(undefined)).toBe(false);
    });
  });

  describe('normalizeAudio', () => {
    it('should return original path for stub implementation', async () => {
      const inputPath = '/var/uploads/audio.mp3';

      const result = await service.normalizeAudio(inputPath);

      expect(result).toEqual({ normalizedPath: inputPath });
    });
  });

  describe('probeAudioDurationSec', () => {
    it('should return duration in seconds when ffprobe succeeds', async () => {
      // Mock success already set in beforeEach
      
      const duration = await service.probeAudioDurationSec('/path/to/audio.mp3');

      expect(duration).toBe(123.456);
      expect(mockExecFile).toHaveBeenCalledWith(
        'ffprobe',
        expect.arrayContaining(['-show_entries', 'format=duration']),
        expect.any(Object),
        expect.any(Function)
      );
    });

    it('should return undefined when ffprobe output is invalid', async () => {
      // Mock invalid output
      mockExecFile.mockImplementation((file, args, opts, cb) => {
        const callback = typeof opts === 'function' ? opts : cb;
        callback(null, { stdout: 'invalid-number', stderr: '' });
        return {} as any;
      });

      const duration = await service.probeAudioDurationSec('/path/to/audio.mp3');

      expect(duration).toBeUndefined();
    });

    it('should return undefined when ffprobe fails', async () => {
      // Mock ffprobe failure
      mockExecFile.mockImplementation((file, args, opts, cb) => {
        const callback = typeof opts === 'function' ? opts : cb;
        callback(new Error('ffprobe not found'), { stdout: '', stderr: '' });
        return {} as any;
      });

      const duration = await service.probeAudioDurationSec('/path/to/audio.mp3');

      expect(duration).toBeUndefined();
    });

    it('should handle empty output', async () => {
      // Mock empty output
      mockExecFile.mockImplementation((file, args, opts, cb) => {
        const callback = typeof opts === 'function' ? opts : cb;
        callback(null, { stdout: '', stderr: '' });
        return {} as any;
      });

      const duration = await service.probeAudioDurationSec('/path/to/audio.mp3');

      expect(duration).toBeUndefined();
    });

    it('should handle float values correctly', async () => {
      // Mock float output
      mockExecFile.mockImplementation((file, args, opts, cb) => {
        const callback = typeof opts === 'function' ? opts : cb;
        callback(null, { stdout: '45.67890', stderr: '' });
        return {} as any;
      });

      const duration = await service.probeAudioDurationSec('/path/to/audio.wav');

      expect(duration).toBe(45.6789);
    });
  });
});
