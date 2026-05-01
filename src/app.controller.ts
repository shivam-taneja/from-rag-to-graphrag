import { Controller, Get, Query } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiQuery, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('rag')
@Controller('rag')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('plain')
  @ApiOperation({ summary: 'Perform a plain RAG query' })
  @ApiQuery({ name: 'query', required: true, description: 'The search query' })
  async plainRag(@Query('query') query: string) {
    return this.appService.plainRag(query);
  }

  @Get('graph')
  @ApiOperation({ summary: 'Perform a Graph RAG query' })
  @ApiQuery({ name: 'query', required: true, description: 'The search query' })
  async graphRag(@Query('query') query: string) {
    return this.appService.graphRag(query);
  }
}
