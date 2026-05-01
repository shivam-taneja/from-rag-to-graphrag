import { Controller, Get, Query } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiQuery, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('rag')
@Controller('rag')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('plain')
  @ApiOperation({
    summary: 'Perform a plain RAG query',
    description:
      'Uses vector similarity search (pgvector) to find relevant movie context. Best for semantic searches.\n\n' +
      '**Trial Queries:**\n' +
      '- "What movies are about space exploration?"\n' +
      '- "Suggest some drama movies from the 90s."\n' +
      '- "Who is the director of Interstellar?"',
  })
  @ApiQuery({
    name: 'query',
    required: true,
    description: 'The search query',
    example: 'What movies are about space exploration?',
  })
  async plainRag(@Query('query') query: string) {
    return this.appService.plainRag(query);
  }

  @Get('graph')
  @ApiOperation({
    summary: 'Perform a Graph RAG query',
    description:
      'Uses graph traversal (Neo4j Cypher) to retrieve context. Best for multi-hop reasoning and relationship discovery.\n\n' +
      '**Trial Queries:**\n' +
      '- "Which actors have worked with Christopher Nolan?"\n' +
      '- "Recommend movies featuring Leonardo DiCaprio directed by someone who also directs sci-fi."\n' +
      '- "Find actors who have appeared in more than 3 movies together."',
  })
  @ApiQuery({
    name: 'query',
    required: true,
    description: 'The search query',
    example: 'Which actors have worked with Christopher Nolan?',
  })
  async graphRag(@Query('query') query: string) {
    return this.appService.graphRag(query);
  }
}
