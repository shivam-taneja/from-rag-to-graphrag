import { PrismaPg } from '@prisma/adapter-pg';
import { pipeline } from '@xenova/transformers';
import neo4j from 'neo4j-driver';
import * as dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from './generated/prisma/client';
import { MOVIES } from './data';

const pool = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter: pool });

const driver = neo4j.driver(
  process.env.NEO4J_URI!,
  neo4j.auth.basic(process.env.NEO4J_USER!, process.env.NEO4J_PASSWORD!),
);

let embedder: any;

async function embed(text: string): Promise<number[]> {
  if (!embedder) {
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }

  const output = await embedder(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

async function seedPostgres() {
  console.log('seeding pgvector with local models...');

  await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS vector`;
  await prisma.movieChunk.deleteMany();
  await prisma.movie.deleteMany();

  for (const m of MOVIES) {
    const movie = await prisma.movie.create({ data: m });

    const content = `${m.title} (${m.year}) by ${m.director}. Genre: ${m.genre}. Cast: ${m.actors.join(', ')}. ${m.plot}`;

    const embedding = await embed(content);

    await prisma.$executeRaw`
      INSERT INTO "MovieChunk" (id, "movieId", content, embedding)
      VALUES (gen_random_uuid(), ${movie.id}, ${content}, ${JSON.stringify(embedding)}::vector)
    `;

    console.log(`Seeded Postgres: ${movie.id} | ${m.title}`);
  }
}

async function seedNeo4j() {
  console.log('seeding neo4j...');

  const session = driver.session();
  try {
    // Clear out existing nodes and relationships
    await session.run('MATCH (n) DETACH DELETE n');

    for (const m of MOVIES) {
      // Create Movie Node
      await session.run(
        `CREATE (m:Movie {title: $title, year: $year, genre: $genre, plot: $plot})`,
        { title: m.title, year: m.year, genre: m.genre, plot: m.plot },
      );

      // Create/Merge Director Node and Relationship
      await session.run(
        `MERGE (d:Director {name: $director})
         WITH d MATCH (m:Movie {title: $title})
         MERGE (d)-[:DIRECTED]->(m)`,
        { director: m.director, title: m.title },
      );

      // Create/Merge Genre Node and Relationship
      await session.run(
        `MERGE (g:Genre {name: $genre})
         WITH g MATCH (m:Movie {title: $title})
         MERGE (m)-[:IN_GENRE]->(g)`,
        { genre: m.genre, title: m.title },
      );

      // Create/Merge Actor Nodes and Relationships
      for (const actor of m.actors) {
        await session.run(
          `MERGE (a:Actor {name: $actor})
           WITH a MATCH (m:Movie {title: $title})
           MERGE (a)-[:ACTED_IN]->(m)`,
          { actor, title: m.title },
        );
      }

      console.log(`Seeded Neo4j: ${m.title}`);
    }
  } finally {
    await session.close();
  }
}

async function main() {
  console.log(`Start seeding ...`);
  await seedPostgres();
  await seedNeo4j();
  console.log(`Seeding finished.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await driver.close();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    await driver.close();
    process.exit(1);
  });
