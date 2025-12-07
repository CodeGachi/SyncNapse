import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { SearchQueryDto } from './dto/search-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';

@ApiTags('search')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('all')
  @ApiOperation({ summary: 'Search across notes, files, and transcriptions' })
  async searchAll(
    @CurrentUser('id') userId: string,
    @Query() query: SearchQueryDto,
  ) {
    return this.searchService.searchAll(userId, query);
  }
}

