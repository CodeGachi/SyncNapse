import { Module, forwardRef } from '@nestjs/common';
import { NotesController } from './notes.controller';
import { ShortUrlController } from './short-url.controller';
import { NotesService } from './notes.service';
import { DbModule } from '../db/db.module';
import { StorageModule } from '../storage/storage.module';
import { FoldersModule } from '../folders/folders.module';

@Module({
  imports: [DbModule, StorageModule, forwardRef(() => FoldersModule)],
  controllers: [NotesController, ShortUrlController],
  providers: [NotesService],
  exports: [NotesService],
})
export class NotesModule {}
