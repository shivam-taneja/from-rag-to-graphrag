# From RAG to Graph RAG

This project provides a hands-on comparison between **Plain Retrieval-Augmented Generation (RAG)** and **Graph RAG**. Using a dataset of **105 movies** with complex relationships, it demonstrates how shifting from vector-only search to relationship-aware retrieval (Knowledge Graphs) can solve complex, multi-hop reasoning problems.

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

This will install dependencies, run Prisma migrations, and seed both databases. The movie data is managed separately in `prisma/data.ts`.

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
| **Global Analytical**      | "Find actors who have appeared in more than 3 movies together."                             | Graph RAG |
| **Multi-hop Reasoning**    | "Recommend movies featuring Leonardo DiCaprio directed by someone who also directs sci-fi." | Graph RAG |
| **Relationship Discovery** | "Which actors have worked with Christopher Nolan multiple times?"                           | Graph RAG |

---

## The Difference

### Plain RAG (Vector-Based)

Retrieves context based on textual similarity.

- **Pros**: Great for broad semantic matching and answering direct questions.
- **Cons**: Struggles with complex relationships and connecting the dots across multiple entities. In a "Find actors in 3+ movies" query, it only sees a few random chunks and can't perform global counting.

### Graph RAG (Relationship-Based)

Retrieves context by traversing entity connections in a Knowledge Graph.

- **Pros**: Excels at multi-hop reasoning, finding hidden patterns, and structured data retrieval.
- **Cons**: Requires defined schema and graph modeling.

---

## How it Works

### Plain RAG Workflow

1. **Query Embedding**: The user query is converted into a high-dimensional vector using the Xenova/all-MiniLM-L6-v2 model.
2. **Vector Retrieval**: Postgres (via pgvector) performs a cosine similarity search to find the top 3 most relevant text chunks from the database.
3. **LLM Generation**: The retrieved text chunks are passed as context to Groq (Llama 3.1 8B), which generates a natural language answer based strictly on that context.

### Graph RAG Workflow

1. **Cypher Generation**: The user query is sent to Groq (Llama 3.1 8B) along with the graph schema. The LLM translates the natural language query into a Neo4j Cypher query.
2. **Graph Traversal**: The Cypher query is executed against Neo4j to retrieve structured data about entities (Movies, Actors, Directors) and their relationships.
3. **LLM Synthesis**: The resulting graph data is serialized to JSON and provided to the LLM. The LLM then synthesizes this structured information into a human-readable response.

---

## Folder Structure

```text
.
├── prisma/
│   ├── data.ts           # Centralized movie dataset
│   ├── schema/           # Postgres models for pgvector
│   └── seed.ts           # Seeding logic (Imports from data.ts)
├── src/
│   ├── app.controller.ts # API endpoints and Swagger examples
│   ├── app.service.ts    # AI logic (Vector Search vs. Cypher Queries)
│   ├── main.ts           # Swagger & App Bootstrap
│   └── prisma.service.ts # DB connections
├── docker-compose.yml    # Database infrastructure
└── package.json          # Scripts & Dependencies
```
