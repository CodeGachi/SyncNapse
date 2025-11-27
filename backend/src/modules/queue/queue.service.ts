import { Injectable, Logger } from '@nestjs/common';
import { AudioProcessor } from './processors/audio.processor';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    private readonly audioProcessor: AudioProcessor,
  ) {}

  async addAudioJob(name: string, data: any) {
    this.logger.log(`Adding audio job: ${name}`);
    // Execute asynchronously without waiting (Simulate background job)
    this.audioProcessor.process(name, data).catch(err => {
      this.logger.error(`Job ${name} failed`, err);
    });
    return { id: Date.now().toString(), name, data }; // Mock job info
  }

  async addTranscriptionJob(sessionId: string, audioUrl: string) {
    this.logger.log(`Adding transcription job for session: ${sessionId}`);
    const data = {
      sessionId,
      audioUrl,
      timestamp: Date.now(),
    };
    // Execute asynchronously without waiting
    this.audioProcessor.process('transcribe', data).catch(err => {
      this.logger.error(`Transcription job failed for session ${sessionId}`, err);
    });
    
    return { id: Date.now().toString(), name: 'transcribe', data };
  }
}

