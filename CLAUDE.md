# ASOE — Automated Sales Outreach Engine

## What This Is

ASOE is SOLVD's AI-powered sales outreach engine. The goal is a **fully automated pipeline** that connects our disparate systems (Salesforce, Apollo, n8n, and others) to generate personalized, human-feeling outreach material at scale. This is an iterative build — every session should move us closer to a system where a sales rep can trigger a workflow and receive ready-to-send assets with minimal manual intervention.

The key constraint: **automation with a human touch**. Every generated asset (email, Loom script, slide content) must read like it was written by a person who did real research, not by an AI filling in templates. The Chris Voss "Never Split the Difference" framework (accusation audits, no-oriented questions, labeling) is baked into the outreach methodology.

## Current State

### What's Real
- **Multi-agent AI pipeline**: Orchestrator coordinates web scraping → research → fact-checking → parallel content generation (email, Loom script, slide deck content)
- **5 workflow types**: Net New Prospecting, Closed Lost Re-Engagement, Client Expansion, Follow-up Sequences, Client Engagement (FF/EB)
- **Web scraping**: Real multi-page scraping with Cheerio (homepage, about, news, team pages)
- **Industry research**: Fetches real articles from verified sources (TechCrunch, industry blogs, etc.)
- **Fact-checking agent**: Validates AI-generated claims with confidence scoring
- **Data quality scoring**: Adjusts confidence based on data completeness

### What's Mocked / Not Yet Connected
- **Salesforce**: `salesforceEnricher.js` returns mock data. jsforce is installed but not wired up. Real CRM integration is pending.
- **Apollo**: Branch `apollo-integration` exists but has no implementation. Intended for contact/account enrichment.
- **n8n**: Prep work done (branch `n8n-implementation` merged), but no actual webhook/workflow connections yet. Will serve as the orchestration layer connecting external systems.
- **Loom**: Generates scripts only — no Loom API integration for actual video creation.
- **Calendly**: Links are appended to emails as text — no API integration.

## Architecture

```
Frontend (React/TypeScript/Vite/Tailwind) → POST /api/generate →
  Backend (Node.js/Express) →
    Orchestrator →
      Web Scraper (Axios/Cheerio)
      Salesforce Enricher (MOCK)
      Research Agent (Claude)
      Fact-Checker (Claude)
      Content Generators in parallel (Claude):
        - Email
        - Loom Script
        - Slide Content
        - Follow-up
        - Engagement
```

Single API endpoint: `POST /api/generate` with `workflowType` discriminator.

## Key Files

- `backend/agents/orchestrator.js` — Pipeline coordinator, routes workflows
- `backend/agents/webScraper.js` — Multi-page company website extraction
- `backend/agents/researcher.js` — Strategic analysis via Claude (temp 0.3)
- `backend/agents/factChecker.js` — Claim validation with confidence levels
- `backend/agents/salesforceEnricher.js` — CRM data (currently mock)
- `backend/agents/industryResearcher.js` — Live article fetching for engagement workflows
- `backend/agents/generators/` — Email, Loom, Slide, Follow-up, Engagement generators
- `backend/prompts/` — Markdown prompt templates (edit these to adjust tone/framework/structure)
- `frontend/src/App.tsx` — Main React UI
- `frontend/src/api/client.ts` — API client and TypeScript types
- `docs/ASOE_Critical_Review.md` — Full audit with 23 identified issues and priority ordering

## Known Issues & Technical Debt

See `docs/ASOE_Critical_Review.md` for the full list. Key unresolved items:
- Scraper failure status not propagated to downstream agents (silent empty data)
- Fact-checker validates AI output against AI output (circular validation)
- Greedy JSON regex (`{[\s\S]*}`) used across all agents — fragile
- Intelligence brief not passed to generators (most grounded data gets dropped)
- Parallel generators produce inconsistent framing (no shared context)
- Error fallbacks produce real-looking but generic content with no warning indicator
- No rate limiting or cost tracking on API calls

## Working Conventions

- **Backend**: Node.js with ES modules (`import`/`export`), Express
- **Frontend**: React + TypeScript, Vite bundler, Tailwind CSS
- **AI**: Anthropic SDK, Claude Sonnet 4 (`claude-sonnet-4-20250514`). Temperature varies by agent purpose — low for analytical (0.3), higher for creative generation (0.6–0.8)
- **Prompts**: Stored as Markdown in `backend/prompts/`. Variable substitution happens in the generator/agent code before passing to Claude
- **Config**: Environment variables via `backend/.env` (not committed). See `backend/.env.example`

## The Vision

This tool is not done. Each iteration should push toward:
1. **Real integrations** — Replace mocks with live Salesforce, Apollo, and n8n connections
2. **Tighter quality controls** — Fix hallucination vectors, enforce output constraints programmatically
3. **Deeper personalization** — Role-based tone, company voice mirroring, context carryforward between touchpoints
4. **End-to-end automation** — n8n orchestrating the full flow: trigger from CRM → generate assets → human review checkpoint → deliver via appropriate channel
5. **Human-in-the-loop, not human-in-the-weeds** — The rep reviews and approves; they don't write from scratch
