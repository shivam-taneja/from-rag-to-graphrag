# from-rag-to-graphrag

This repository demonstrates the practical differences between plain Retrieval Augmented Generation (RAG) and Graph RAG using a movie dataset.

## Folder Structure

```text
.
├── prisma/
│   ├── schema/           # Prisma models for Postgres
│   └── seed.ts           # Seeding logic for Postgres and Neo4j
├── src/
│   ├── app.controller.ts # API endpoints for RAG queries
│   ├── app.module.ts     # Main application module
│   ├── app.service.ts    # AI logic (Groq, Cypher, Vector Search)
│   ├── main.ts           # App bootstrap and Swagger setup
│   └── prisma.service.ts # Database connection management
├── docker-compose.yml    # Postgres and Neo4j infrastructure
└── package.json          # Dependencies and scripts
```

## Tech Stack

- **Framework**: NestJS (Node.js)
- **Database**: Postgres (pgvector) and Neo4j (Graph)
- **ORM**: Prisma
- **AI SDK**: Vercel AI SDK with Groq
- **Model**: Llama 3.1 8B Instant
- **Embeddings**: Xenova Transformers (Local)

## API Endpoints

Access the interactive Swagger documentation at `http://localhost:3000/api` once the server is running.

- **GET /rag/plain**: Semantic search using Postgres pgvector.
- **GET /rag/graph**: Relationship-based retrieval using Neo4j Cypher.

## Quickstart

1. **Clone and Setup**

   ```bash
   git clone https://github.com/shivam-taneja/from-rag-to-graphrag.git
   cd from-rag-to-graphrag
   cp .env.example .env
   ```

2. **Start Infrastructure**

   ```bash
   pnpm run infra:setup
   ```

3. **Install and Seed**

   ```bash
   pnpm install
   pnpm run db:setup
   pnpm run db:seed
   ```

4. **Run Application**
   ```bash
   pnpm run dev
   ```

## Why it Matters

Plain RAG retrieves information based on textual similarity. This is effective for direct matches but struggles with multi-hop reasoning.

Graph RAG retrieves information based on entity relationships. It can answer complex questions like "recommend movies featuring Leonardo DiCaprio directed by someone who also directs sci-fi films" by traversing explicitly defined connections in the graph.
