import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('sessions/audios')
@Controller('sessions/audios')
export class AudiosController {
  @Get()
  list() {
    // Skeleton endpoint; not implemented yet
    throw new HttpException('Not implemented', HttpStatus.NOT_IMPLEMENTED);
  }
}
