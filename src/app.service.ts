import {
  Injectable,
  InternalServerErrorException,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { pipeline } from '@xenova/transformers';
import { generateText } from 'ai';
import { createGroq } from '@ai-sdk/groq';
import neo4j, { Driver, isInt } from 'neo4j-driver';

@Injectable()
export class AppService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AppService.name);

  private embedderPromise: Promise<any>;
  private neo4jDriver: Driver;
  private groq: ReturnType<typeof createGroq>;

  constructor(private prisma: PrismaService) {
    this.neo4jDriver = neo4j.driver(
      process.env.NEO4J_URI!,
      neo4j.auth.basic(process.env.NEO4J_USER!, process.env.NEO4J_PASSWORD!),
    );
    this.groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
  }

  // Pre-load the model when the NestJS server starts
  async onModuleInit() {
    this.logger.log('Loading Xenova embedding model...');
    this.embedderPromise = pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2',
    );
    await this.embedderPromise;
    this.logger.log('Embedding model successfully loaded into memory.');
  }

  async onModuleDestroy() {
    this.logger.log('Closing Neo4j Driver...');
    await this.neo4jDriver.close();
  }

  private async embed(text: string): Promise<number[]> {
    const embedder = await this.embedderPromise;
    const output = await embedder(text, {
      pooling: 'mean',
      normalize: true,
    });
    return Array.from(output.data);
  }

  async plainRag(query: string) {
    try {
      const queryEmbedding = await this.embed(query);

      const chunks = await this.prisma.$queryRaw<Array<{ content: string }>>`
        SELECT content
        FROM "MovieChunk"
        ORDER BY embedding <-> ${JSON.stringify(queryEmbedding)}::vector
        LIMIT 3
      `;

      const context = chunks.map((c) => c.content).join('\n');

      const { text } = await generateText({
        model: this.groq('llama-3.1-8b-instant'),
        system: `You are a helpful movie assistant. Answer the user's question using ONLY the provided context. Context: ${context}`,
        prompt: query,
      });

      return { answer: text, context: chunks };
    } catch (error) {
      this.logger.error('Error in Plain RAG execution', error);
      throw new InternalServerErrorException('Error in Plain RAG');
    }
  }

  async graphRag(query: string) {
    const session = this.neo4jDriver.session();
    try {
      const cypherPrompt = `
      You are a Neo4j Cypher expert. Convert the user's natural language question into a Cypher query.
      
      Graph Schema:
      Nodes: 
      - Movie {title: String, year: Integer, genre: String, plot: String}
      - Director {name: String}
      - Genre {name: String}
      - Actor {name: String}
      
      Relationships:
      - (Director)-[:DIRECTED]->(Movie)
      - (Movie)-[:IN_GENRE]->(Genre)
      - (Actor)-[:ACTED_IN]->(Movie)

      CRITICAL RULES:
      1. NEVER use 'GROUP BY'. Cypher performs implicit grouping. For example, use 'WITH actor, count(*) as count' or 'RETURN actor, count(*)'.
      2. Use 'WITH' to chain aggregations or filters (e.g., 'WITH a, count(m) as cnt WHERE cnt > 3').
      3. Return clear, distinct results.
      4. ALWAYS RETURN AGGREGATE VALUES: If you use aggregate functions (like count(*)), you MUST explicitly RETURN them so the count is passed back to the user context.
      5. Return ONLY the raw Cypher query string. No markdown, no explanation.

      Question: ${query}
      `;

      const { text: cypherQueryRaw } = await generateText({
        model: this.groq('llama-3.1-8b-instant'),
        prompt: cypherPrompt,
      });

      const cypherQuery = cypherQueryRaw
        .replace(/\`\`\`cypher/g, '')
        .replace(/\`\`\`/g, '')
        .trim();

      let graphData: any[] = [];
      try {
        const result = await session.run(cypherQuery);
        graphData = result.records.map((record) => {
          const obj: Record<string, any> = {};
          record.keys.forEach((key: string) => {
            let val = record.get(key);
            if (isInt(val)) {
              val = val.toNumber();
            }
            obj[key] = val;
          });
          return obj;
        });
      } catch (e) {
        this.logger.error('Cypher query execution failed:', cypherQuery, e);
        graphData = [{ error: 'Could not retrieve data from graph.' }];
      }

      const context = JSON.stringify(graphData);

      const { text } = await generateText({
        model: this.groq('llama-3.1-8b-instant'),
        system: `You are a helpful movie assistant. Answer the user's question based on the provided Graph DB context. Make the answer natural and human-readable. Context: ${context}`,
        prompt: query,
      });

      return { answer: text, context: graphData, cypherQuery };
    } catch (error) {
      this.logger.error('Error in Graph RAG', error);
      throw new InternalServerErrorException('Error in Graph RAG');
    } finally {
      await session.close();
    }
  }
}
