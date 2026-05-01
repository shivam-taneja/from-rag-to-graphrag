import { PrismaPg } from '@prisma/adapter-pg';
import { pipeline } from '@xenova/transformers';
import neo4j from 'neo4j-driver';
import * as dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from './generated/prisma/client';

const pool = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter: pool });

const driver = neo4j.driver(
  process.env.NEO4J_URI!,
  neo4j.auth.basic(process.env.NEO4J_USER!, process.env.NEO4J_PASSWORD!),
);

const MOVIES = [
  {
    title: 'Inception',
    director: 'Christopher Nolan',
    genre: 'Sci-Fi',
    year: 2010,
    actors: ['Leonardo DiCaprio', 'Joseph Gordon-Levitt', 'Elliot Page'],
    plot: 'A thief steals corporate secrets through dream-sharing technology and is given the task of planting an idea into a CEOs mind.',
  },
  {
    title: 'The Dark Knight',
    director: 'Christopher Nolan',
    genre: 'Action',
    year: 2008,
    actors: ['Christian Bale', 'Heath Ledger', 'Aaron Eckhart'],
    plot: 'Batman sets out to dismantle remaining criminal organizations that plague Gotham, but a criminal mastermind known as the Joker emerges.',
  },
  {
    title: 'Interstellar',
    director: 'Christopher Nolan',
    genre: 'Sci-Fi',
    year: 2014,
    actors: ['Matthew McConaughey', 'Anne Hathaway', 'Jessica Chastain'],
    plot: 'A team of explorers travel through a wormhole in space to ensure humanitys survival as Earth faces environmental collapse.',
  },
  {
    title: 'The Revenant',
    director: 'Alejandro González Iñárritu',
    genre: 'Adventure',
    year: 2015,
    actors: ['Leonardo DiCaprio', 'Tom Hardy', 'Will Poulter'],
    plot: 'A frontiersman fights for survival after being mauled by a bear and left for dead by members of his own hunting team.',
  },
  {
    title: 'The Wolf of Wall Street',
    director: 'Martin Scorsese',
    genre: 'Drama',
    year: 2013,
    actors: ['Leonardo DiCaprio', 'Jonah Hill', 'Margot Robbie'],
    plot: 'The rise and fall of Jordan Belfort, a wealthy stockbroker living a life of excess before his inevitable crash with the law.',
  },
  {
    title: 'Mad Max: Fury Road',
    director: 'George Miller',
    genre: 'Action',
    year: 2015,
    actors: ['Tom Hardy', 'Charlize Theron', 'Nicholas Hoult'],
    plot: 'In a post-apocalyptic wasteland, Max and Furiosa flee from warlord Immortan Joe across a brutal desert landscape.',
  },
  {
    title: 'Arrival',
    director: 'Denis Villeneuve',
    genre: 'Sci-Fi',
    year: 2016,
    actors: ['Amy Adams', 'Jeremy Renner', 'Forest Whitaker'],
    plot: 'A linguist works with the military to communicate with alien lifeforms after twelve mysterious spacecraft appear around the world.',
  },
  {
    title: 'Blade Runner 2049',
    director: 'Denis Villeneuve',
    genre: 'Sci-Fi',
    year: 2017,
    actors: ['Ryan Gosling', 'Harrison Ford', 'Ana de Armas'],
    plot: 'A young Blade Runner discovers a buried secret that could plunge society into chaos, leading him to track down former Blade Runner Rick Deckard.',
  },
];

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
