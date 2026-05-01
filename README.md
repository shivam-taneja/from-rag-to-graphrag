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

## Case Study: Plain RAG vs Graph RAG

To demonstrate the difference, we asked both systems the same complex analytical question:
**"Find actors who have appeared in more than 3 movies together."**

### Plain RAG (Vector Search)

Plain RAG fails this task because it relies on retrieving the most "similar" text chunks. Since no single chunk contains a list of all actor collaborations, the system only sees a fragmented view.

**Answer:**

> "Based on the provided context, the actors who have appeared in more than 3 movies together are none in the provided context."

**Context Retrieved:**

- _Once Upon a Time in Hollywood_ (Leo, Brad, Margot)
- _Catch Me If You Can_ (Leo, Tom Hanks)
- _The Departed_ (Leo, Matt Damon)

**Why it failed:** It only retrieved 3 chunks. It has no way to "count" or "link" actors across the entire database of 105 movies.

---

### Graph RAG (Knowledge Graph)

Graph RAG excels here because it converts the natural language question into a **Cypher query**. This allows it to traverse the entire network of relationships and perform global aggregations.

**Answer:**

> "I found several pairs of actors who have worked together in more than 3 movies. For example:
>
> 1. **Matt Damon and Ben Affleck**: 4 movies (_Good Will Hunting_, _The Last Duel_, _Air_, _Dogma_)
> 2. **Cillian Murphy and Tom Hardy**: 4 movies (_Inception_, _The Dark Knight Rises_, _Dunkirk_, _Peaky Blinders_)"

**Cypher Query Generated:**

```cypher
MATCH (a1:Actor)-[:ACTED_IN]->(m:Movie)<-[:ACTED_IN]-(a2:Actor)
WHERE id(a1) < id(a2)
WITH a1, a2, count(m) as sharedMovies
WHERE sharedMovies > 3
RETURN a1.name, a2.name, sharedMovies
```

**Why it won:** It didn't look for "similar text." It looked for **structural patterns**. It traversed every `:ACTED_IN` relationship in the database to find the exact answer, regardless of where the data was physically stored.

---

## Technical Comparison

| Feature                | Plain RAG (Vector)  | Graph RAG (Neo4j)      |
| :--------------------- | :------------------ | :--------------------- |
| **Search Method**      | Semantic Similarity | Structural Traversal   |
| **Data View**          | Localized (Chunks)  | Global (Network)       |
| **Complex Joins**      | Poor (Hallucinates) | Excellent (Precise)    |
| **Analytical Queries** | Low Accuracy        | High Accuracy          |
| **Best For**           | Fact Retrieval      | Relationship Discovery |

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
