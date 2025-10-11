import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('sessions/materials')
@Controller('sessions/materials')
export class MaterialsController {
  @Get()
  list() {
    // Skeleton endpoint; not implemented yet
    throw new HttpException('Not implemented', HttpStatus.NOT_IMPLEMENTED);
  }
}
