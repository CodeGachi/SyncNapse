import { Module } from '@nestjs/common';
import { SessionsController } from './sessions.controller';
import { NotesController } from './notes.controller';
import { MaterialsController } from './materials.controller';
import { AudiosController } from './audios.controller';
import { SessionsService } from './sessions.service';

@Module({
  controllers: [SessionsController, NotesController, MaterialsController, AudiosController],
  providers: [SessionsService],
})
export class SessionsModule {}
