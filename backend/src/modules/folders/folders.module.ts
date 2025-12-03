import { Module, forwardRef } from '@nestjs/common';
import { FoldersController } from './folders.controller';
import { FoldersService } from './folders.service';
import { DbModule } from '../db/db.module';
import { StorageModule } from '../storage/storage.module';
import { NotesModule } from '../notes/notes.module';

@Module({
  imports: [DbModule, StorageModule, forwardRef(() => NotesModule)],
  controllers: [FoldersController],
  providers: [FoldersService],
  exports: [FoldersService],
})
export class FoldersModule {}

