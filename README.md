# ASOE: Automated Sales Outreach Engine

AI-powered sales asset generation using Claude, with real-time company intelligence and personalized outreach content.

## Quick Start

### Prerequisites
- Node.js v18+
- Anthropic API Key ([get one here](https://console.anthropic.com/))

### Setup

```bash
# 1. Configure environment
cp backend/.env.example backend/.env
# Add your ANTHROPIC_API_KEY to backend/.env

# 2. Install dependencies
cd backend && npm install
cd ../frontend && npm install

# 3. Start servers (in separate terminals)
cd backend && npm start      # Runs on http://localhost:3001
cd frontend && npm run dev   # Runs on http://localhost:3000
```

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | Yes | — | Your Anthropic API key |
| `PORT` | No | `3001` | Backend server port |
| `NODE_ENV` | No | `development` | Environment mode |

---

## Workflows

### 1. Net New Prospecting
Generates outreach for new prospects by challenging business assumptions.

**Inputs:** Target company, website, industry, business challenge

**Pipeline:**
```
Web Scraper → Research Agent → Fact-Check → Content Generators (parallel)
```

**Outputs:** Email, Loom script, Slide 3 content, Intelligence brief

---

### 2. Closed Lost Re-Engagement
Re-engages lost opportunities using "Black Swan" triggers.

**Inputs:** Company, opportunity name, champion, loss reason, new context

**Pipeline:**
```
Salesforce Enrichment + Web Scraper → Research → Fact-Check → Content Generators
```

**Outputs:** Email, Loom script, Slide content, Intelligence brief

---

### 3. Client Expansion
Leverages existing relationships for new opportunities.

**Inputs:** Client name, champion, previous project, health score, expansion trigger

**Pipeline:**
```
Salesforce Enrichment → Research → Content Generators
```

**Outputs:** Email, Loom script, Slide content, Intelligence brief

---

### 4. Follow-up Sequence
Creates the next touchpoint in an outreach sequence. Lightweight workflow - no web scraping.

**Inputs:** Prospect name, last touchpoint context, touchpoint number (2-5), output type

**Pipeline:**
```
Direct Claude generation (single call)
```

**Outputs:** One of: Email draft, Phone script, or LinkedIn message

---

### 5. Client Engagement (FF/EB)
Prepares for Fulfillment & Follow-up or Executive Brief meetings.

**Inputs:** Engagement type, client name, project phase, recent wins, concerns, channel

**Pipeline:**
```
Industry Research → Claude Generation
```

**Outputs:** Outreach message, Meeting agenda, Industry insights

---

## Project Structure

```
ASOE/
├── backend/
│   ├── server.js              # Express server (port 3001)
│   ├── config.js              # Environment configuration
│   ├── .env.example           # Environment variable template
│   ├── routes/
│   │   ├── generate.js        # POST /api/generate endpoint
│   │   └── scrapePreview.js   # POST /api/scrape-preview endpoint
│   ├── agents/
│   │   ├── orchestrator.js    # Pipeline coordinator
│   │   ├── webScraper.js      # Company website extraction
│   │   ├── researcher.js      # Strategic analysis (Claude)
│   │   ├── factChecker.js     # Claim validation (Claude)
│   │   ├── salesforceEnricher.js  # CRM data (mock)
│   │   ├── industryResearcher.js  # Live industry insights
│   │   └── generators/
│   │       ├── emailGenerator.js
│   │       ├── loomGenerator.js
│   │       ├── slideGenerator.js
│   │       └── followupGenerator.js
│   └── prompts/               # Claude prompt templates
│       ├── email.md
│       ├── loom.md
│       ├── slide.md
│       ├── research.md
│       ├── fact-check.md
│       ├── followup.md
│       └── engagement.md
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx            # Main React component
│   │   ├── api/client.ts      # API client & types
│   │   └── main.tsx           # Entry point
│   ├── vite.config.ts
│   └── tailwind.config.js
│
├── docs/                      # Reference documentation
│   ├── QUICKSTART.md          # 3-minute demo setup
│   ├── ASOE_Critical_Review.md # Technical audit & roadmap
│   └── google-drive-integration.md
│
└── README.md
```

---

## API

### `POST /api/generate`

Single endpoint for all workflow types.

```typescript
{
  workflowType: 'netnew' | 'closedlost' | 'expansion' | 'followup' | 'engagement',
  formData: { /* workflow-specific fields */ }
}
```

### `POST /api/scrape-preview`

Quick scrape to extract company name and industry from a URL (used by the Magic Link feature).

### `GET /api/health`

Health check endpoint.

---

## Technology

| Layer | Stack |
|-------|-------|
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| Backend | Node.js, Express |
| AI | Claude Sonnet 4 (Anthropic SDK) |
| Scraping | Axios, Cheerio |

---

## Customization

### Modify Prompts
Edit Markdown files in `backend/prompts/` to adjust tone, frameworks, or output structure.

### Add Workflows
1. Add workflow type to `frontend/src/api/client.ts`
2. Create form section in `frontend/src/App.tsx`
3. Add orchestrator logic in `backend/agents/orchestrator.js`
4. Create prompt template in `backend/prompts/`

---

## Troubleshooting

**Port in use:**
```bash
lsof -i :3001  # or :3000
kill -9 <PID>
```

**API key error:** Ensure `ANTHROPIC_API_KEY` is set in `backend/.env`

**Web scraping fails:** Some sites block scrapers. The system continues with minimal data.

---

## Further Reading

- [Quick Start Demo](docs/QUICKSTART.md) — 3-minute setup with test workflows
- [Technical Audit & Roadmap](docs/ASOE_Critical_Review.md) — 23 identified issues with priority ordering
- [Google Drive Integration](docs/google-drive-integration.md) — Planned Google Slides automation

## License

MIT - Built by SOLVD
