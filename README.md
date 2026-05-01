# From RAG to Graph RAG

This project provides a hands-on comparison between **Plain Retrieval-Augmented Generation (RAG)** and **Graph RAG**. Using a movie dataset, it demonstrates how shifting from vector-only search to relationship-aware retrieval (Knowledge Graphs) can solve complex, multi-hop reasoning problems.

---

## Quickstart

Follow these steps to get the project running locally.

### 1. Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [pnpm](https://pnpm.io/) (Recommended)
- [Docker](https://www.docker.com/) (For Postgres and Neo4j)
- A [Groq API Key](https://console.groq.com/)

### 2. Setup Environment

```bash
git clone https://github.com/shivam-taneja/from-rag-to-graphrag.git
cd from-rag-to-graphrag
cp .env.example .env
```

_Note: Update `GROQ_API_KEY` in your `.env` file._

### 3. Spin up Infrastructure

Start the Postgres (with pgvector) and Neo4j containers:

```bash
pnpm run infra:setup
```

### 4. Install & Seed Data

This will install dependencies, run Prisma migrations, and seed both databases with movie data and embeddings.

```bash
pnpm install
pnpm run db:setup
pnpm run db:seed
```

### 5. Run the App

```bash
pnpm run dev
```

The server will start at http://localhost:3000.

---

## Tech Stack

- **Core**: [NestJS](https://nestjs.com/)
- **Vector Search**: [Postgres](https://www.postgresql.org/) + [pgvector](https://github.com/pgvector/pgvector)
- **Knowledge Graph**: [Neo4j](https://neo4j.com/)
- **ORM**: [Prisma](https://www.prisma.io/)
- **AI Engine**: [Vercel AI SDK](https://sdk.vercel.ai/) with [Groq](https://groq.com/) (Llama 3.1 8B)
- **Embeddings**: Local processing via Xenova/Transformers.js

---

## How to Test (API & Swagger)

Access the interactive documentation at:
**[http://localhost:3000/api](http://localhost:3000/api)**

### Sample Queries to Try

| Goal                       | Query                                                                                       | Best Mode |
| -------------------------- | ------------------------------------------------------------------------------------------- | --------- |
| **Semantic Search**        | "Suggest some space exploration movies."                                                    | Plain RAG |
| **Simple Retrieval**       | "Who directed Inception?"                                                                   | Plain RAG |
| **Multi-hop Reasoning**    | "Recommend movies featuring Leonardo DiCaprio directed by someone who also directs sci-fi." | Graph RAG |
| **Relationship Discovery** | "Which actors have worked with Christopher Nolan multiple times?"                           | Graph RAG |

---

## The Difference

### Plain RAG (Vector-Based)

Retrieves context based on **textual similarity**.

- **Pros**: Great for broad semantic matching and answering direct questions.
- **Cons**: Struggles with complex relationships and "connecting the dots" across multiple entities.

### Graph RAG (Relationship-Based)

Retrieves context by **traversing entity connections** in a Knowledge Graph.

- **Pros**: Excels at multi-hop reasoning, finding hidden patterns, and structured data retrieval.
- **Cons**: Requires defined schema and graph modeling.

---

## Folder Structure

```text
.
├── prisma/
│   ├── schema/           # Postgres models for pgvector
│   └── seed.ts           # Seeding logic for Postgres and Neo4j
├── src/
│   ├── app.controller.ts # API endpoints
│   ├── app.service.ts    # AI logic (Vector Search vs. Cypher Queries)
│   ├── main.ts           # Swagger & App Bootstrap
│   └── prisma.service.ts # DB connections
├── docker-compose.yml    # Database infrastructure
└── package.json          # Scripts & Dependencies
```
