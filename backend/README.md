# AstroCoach

AstroCoach is an AI-powered Vedic astrology consultation backend. It combines
Google Gemini with astrology tools exposed through the Model Context Protocol
(MCP), allowing users to ask natural-language questions and receive answers
grounded in calculated horoscope data.

The project is currently an early-stage backend proof of concept. It provides a
working chat API and tool-calling agent, while conversation persistence,
authentication, and the frontend are still under development.

## Features

- Natural-language Vedic astrology consultations
- LLM-powered function calling
- Remote MCP integration for horoscope and astrology calculations
- Dynamic discovery and mapping of available MCP tools
- Relevant-tool selection to reduce prompt size and latency
- A one-tool-per-request guard to prevent runaway agent loops
- Token-usage and execution-time logging
- PostgreSQL data model for users, conversations, messages, memories, and tool
  execution history
- Optional OpenAI service adapter for future provider support

## How it works

```text
Client
  │
  │  POST /chat
  ▼
Express API
  │
  ▼
ChatService
  ├── selects relevant astrology tools
  ├── asks Gemini to answer or choose a tool
  ├── executes the selected tool through MCP
  └── asks Gemini to explain the result
  │
  ▼
Natural-language response
```

At startup, AstroCoach connects to the configured astrology MCP service and
discovers its available tools. For each chat request, it sends Gemini only the
most relevant tool definitions. If Gemini chooses a tool, AstroCoach executes
it and returns the result to Gemini for a final user-friendly explanation.

## Technology stack

- Node.js and TypeScript
- Express 5
- Google Gen AI SDK
- Model Context Protocol SDK
- OpenAI SDK
- Prisma schema with PostgreSQL
- `tsx` for local development

## Project structure

```text
backend/
├── prisma/
│   ├── migrations/          # Database migrations
│   └── schema.prisma        # Application data model
├── src/
│   ├── config/              # Configuration modules
│   ├── llm/
│   │   ├── GeminiService.ts # Gemini integration
│   │   ├── OpenAIService.ts # Optional OpenAI adapter
│   │   └── ToolMapper.ts    # MCP-to-LLM tool mapping and selection
│   ├── mcp/
│   │   └── MCPService.ts    # MCP connection and tool execution
│   ├── prompts/
│   │   └── astrology.system.ts
│   ├── services/
│   │   └── ChatService.ts   # Agent orchestration loop
│   ├── types/               # Shared TypeScript types
│   └── server.ts            # Express application entry point
├── .env                     # Local secrets; never commit this file
├── package.json
└── tsconfig.json
```

## Prerequisites

- Node.js 20 or newer
- npm
- A Google Gemini API key
- Access to the configured astrology MCP service
- PostgreSQL if you plan to develop the persistence layer

## Local setup

Clone the repository and enter the backend directory:

```bash
git clone https://github.com/ravibabu/astrocoach.git
cd astrocoach
```

Install dependencies:

```bash
npm install
```

Create a local `.env` file:

```env
PORT=3000
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3.5-flash
OPENAI_KEY=your_openai_api_key
DATABASE_URL=postgresql://user:password@localhost:5432/astrocoach
```

Only `GEMINI_API_KEY` is required for the current chat implementation.
`GEMINI_MODEL` is optional and defaults to `gemini-3.5-flash`. The OpenAI and
database variables support code that is present but not yet connected to the
main request flow.

Never commit `.env` or real credentials. If a credential has previously been
committed, remove it from Git and rotate it immediately.

## Running the server

Start the development server:

```bash
npm run dev
```

The API listens on `http://localhost:3000` unless `PORT` is overridden.
Startup requires a successful connection to the remote MCP service.

## API

### Service information

```http
GET /
```

Returns a short message confirming that the backend is running.

### Health check

```http
GET /health
```

Example response:

```json
{
  "status": "UP",
  "timestamp": "2026-07-25T10:00:00.000Z",
  "version": "1.0.0"
}
```

### Chat

```http
POST /chat
Content-Type: application/json
```

Request:

```json
{
  "message": "Create my horoscope for 24 March 2000 at 7:15 PM in Chapra, Bihar."
}
```

Example with `curl`:

```bash
curl --request POST http://localhost:3000/chat \
  --header "Content-Type: application/json" \
  --data '{
    "message": "Create my horoscope for 24 March 2000 at 7:15 PM in Chapra, Bihar."
  }'
```

Successful response:

```json
{
  "answer": "Your horoscope indicates..."
}
```

If `message` is missing, the API returns HTTP `400`. Model or MCP failures
currently return HTTP `500`.

## Data model

The Prisma schema defines the intended persistence model:

- `User` — identity and account details
- `Conversation` — consultation sessions
- `Message` — user and assistant messages
- `ToolExecution` — MCP calls, arguments, results, and timing
- `Memory` — durable user facts with optional confidence scores

These models and the initial migration exist, but the chat API does not yet
write to the database.

## Current limitations

- Chat requests do not retain conversation history.
- Authentication and authorization are not implemented.
- Database persistence is not connected to the API.
- The MCP endpoint is currently configured in source code.
- The server has no retry or graceful-degradation strategy when MCP is
  unavailable.
- Request validation, rate limiting, CORS policy, and production-safe error
  handling still need to be added.
- Automated tests, linting, production build scripts, and deployment
  configuration are not yet included.
- The OpenAI adapter is experimental and is not used by `ChatService`.

## Roadmap

- Add persistent conversations and user memory
- Add structured request validation and safer error responses
- Make the MCP endpoint and model provider configurable
- Add authentication and API rate limiting
- Add retries, timeouts, and graceful shutdown
- Add unit and integration tests
- Add production build and deployment workflows
- Build a user-facing consultation interface

## Contributing

Contributions and issue reports are welcome. For substantial changes, open an
issue first to describe the problem and proposed approach. Keep secrets out of
commits, add tests where practical, and verify TypeScript before submitting a
pull request:

```bash
npx tsc --noEmit
```
