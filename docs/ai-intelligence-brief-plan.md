# Plan: AI-Powered Company Intelligence Brief

## Context
The current Company Intelligence Brief uses fragile regex/DOM parsing to extract mission statements, milestones, and news — producing noisy, unreliable results. The web scraper already fetches About/homepage text; we just need to stop trying to parse it mechanically and instead pass it to Claude for a focused, synthesized extraction. The output should be three actionable pieces: what they do, how they make money, and what they offer — nothing more.

---

## New Intelligence Brief Shape

**Remove:** `missionStatement`, `keyMilestones`, `recentNews`, `executiveTeam`
**Add:** `companySummary`, `businessModel`, `servicesProducts[]`
**Keep:** `industry`, `pagesScraped`

---

## Files to Change

1. `backend/agents/webScraper.js` — core logic changes
2. `backend/agents/orchestrator.js` — update data quality scoring + follow-up context builder
3. `backend/agents/generators/followupGenerator.js` — update field references (lines 38–48)
4. `backend/routes/scrapePreview.js` — update response fields (lines 51–52)
5. `frontend/src/api/client.ts` — update `IntelligenceBrief` and `ScrapePreviewResponse` types
6. `frontend/src/App.tsx` — replace rendering sections + copy button serialization

---

## Step-by-Step Changes

### 1. `webScraper.js`

**Add new function** `extractCompanyIntelligence(combinedText)` (async, before `scrapeWebsite`):
- Truncates combined about + homepage text to 3000 chars
- Calls `claude-haiku-4-5-20251001`, temp 0.1, max_tokens 600
- Prompt asks for exactly 3 fields in JSON:
  - `companySummary` — 1-2 sentences: what the company does
  - `businessModel` — 1 sentence: how they make money
  - `servicesProducts` — array of 2–5 short noun phrases (specific services/products)
- Uses same `/{[\s\S]*}/` JSON extraction pattern as rest of codebase
- Returns `{ companySummary: null, businessModel: null, servicesProducts: [] }` on any failure

**In `scrapeWebsite()`:**
- After about page text is collected, call `extractCompanyIntelligence(aboutText + ' ' + allText)`
- Update `intelligenceBrief` object to use new fields
- For industry detection (which previously referenced `mission`): replace with `companyIntelligence.companySummary` or the meta description
- Remove the **news page fetch** (step 6) — only existed to feed `extractRecentNews()`
- Remove the **team page fetch** (step 7) — only existed to feed `extractExecutiveTeam()`
- Update both the success and error-fallback `intelligenceBrief` objects

**Delete these functions entirely:**
- `extractMission()`
- `extractMilestones()`
- `extractRecentNews()`
- `extractExecutiveTeam()`
- `normalizeWhitespace()` (only used by `extractMission`)

**Net effect:** 2 fewer HTTP requests per scrape, ~150 lines removed.

### 2. `orchestrator.js`

Update `calculateDataQualityModifier()` — replace scoring based on removed fields:
```
companySummary present → 3 pts
businessModel present  → 2 pts
servicesProducts ≥2    → 3 pts  (1 if only 1 item)
salesforceData         → 2 pts
Max = 10 (same range as before)
```

Update the follow-up `companyContext` builder to use new field names:
```js
companySummary: companyProfile.intelligenceBrief?.companySummary || null,
businessModel:  companyProfile.intelligenceBrief?.businessModel  || null,
servicesProducts: companyProfile.intelligenceBrief?.servicesProducts || []
```

### 3. `followupGenerator.js` (lines 38–48)

Replace old field references in the `companyContext` string builder:
```js
// Remove:
companyContext.missionStatement → "About: ..."
companyContext.recentNews       → "Recent News: ..."
companyContext.executiveTeam    → "Key Executives: ..."

// Add:
companyContext.companySummary   → "About: ..."
companyContext.businessModel    → "Business Model: ..."
companyContext.servicesProducts → "Services/Products: ..."
```

### 4. `scrapePreview.js` (lines 51–52)

Update `res.json()`:
```js
// Remove:
missionStatement: companyProfile.intelligenceBrief?.missionStatement || null,
executiveTeam: companyProfile.intelligenceBrief?.executiveTeam || [],

// Add:
companySummary: companyProfile.intelligenceBrief?.companySummary || null,
```

### 5. `frontend/src/api/client.ts`

```typescript
// IntelligenceBrief:
export interface IntelligenceBrief {
  companySummary: string | null;
  businessModel: string | null;
  servicesProducts: string[];
  industry?: string;
  pagesScraped: { homepage: boolean; about: boolean; news: boolean; team: boolean; products: boolean; };
}

// ScrapePreviewResponse: remove missionStatement + executiveTeam, add companySummary
```

### 6. `frontend/src/App.tsx`

**Copy button (lines 1168–1173):** Replace with:
```ts
(brief.companySummary ? `What They Do:\n${clean(brief.companySummary)}\n\n` : '') +
(brief.businessModel ? `Business Model: ${clean(brief.businessModel)}\n\n` : '') +
(brief.servicesProducts?.length > 0 ? `Services/Products:\n${brief.servicesProducts.map(s => `- ${clean(s)}`).join('\n')}\n\n` : '') +
(brief.industry ? `Industry: ${clean(brief.industry)}\n\n` : '') +
```

**Render sections (lines 1194–1266):** Remove Mission Statement, Key Milestones, Recent News, Key Executives blocks. Replace with:
- **What They Do** — `companySummary` with `Target` icon
- **Business Model** — `businessModel` with `Building2` icon
- **Services / Products** — `servicesProducts[]` as indigo pills (same style as existing milestone year badges)

Keep the Industry block (lines 1205–1213) and Data Sources block (lines 1268–1276) exactly as-is.

---

## Implementation Order

1. `webScraper.js` (all changes together — self-contained)
2. `orchestrator.js`
3. `followupGenerator.js`
4. `scrapePreview.js`
5. `client.ts`
6. `App.tsx`

Steps 1–4 can be verified by restarting the backend alone. Steps 5–6 only need a Vite dev server restart.

---

## Verification

1. Start backend: `cd backend && npm start`
2. Start frontend: `cd frontend && npm run dev`
3. Run a Net New generate against a real company URL
4. Check backend console: should see `🤖 Extracting company intelligence via Claude...` log line
5. Confirm intelligence brief shows "What They Do", "Business Model", "Services / Products" sections with real content
6. Confirm no TypeScript errors in frontend (`client.ts` type changes)
7. Test the Copy button — verify the copied text has the new field structure
8. Test Magic Link scrape preview — company name and industry still auto-fill correctly
9. Test Follow-up workflow — context should still include about/services context in generated output
