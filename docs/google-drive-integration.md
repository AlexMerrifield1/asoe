# Google Drive + Google Slides Integration Plan

> **Status**: Planned — waiting on Google Cloud API setup
> **Scope**: All slide-generating workflows (Net New, Closed Lost, Expansion)
> **Branch**: `apollo-integration` (or new branch when ready)

## Problem

When running net new prospecting (or closed lost / expansion), the rep currently:
1. Copies generated slide content from the ASOE UI
2. Manually creates a Google Drive folder in "Loom Videos"
3. Duplicates the correct industry template slide deck
4. Pastes the Slide 3 content into the deck
5. Renames everything appropriately

This is repetitive and time-consuming for every prospect.

## Solution

Automate the entire process: auto-create a client folder in "Loom Videos", copy the right industry template into it, inject the generated Slide 3 content directly via Google Slides API, and return clickable links in the ASOE UI.

## Google Drive Folder Structure

```
Loom Videos (1BsxfmARvbvpVCLFHSdijM-d79PWgq8vv)
├── AAA Templates for Loom Videos by Industry (1dFiqvqygZfANkfkFjEzmMRD_xXx2TAU4)
│   ├── Professional Services - Strategic Roadmap
│   ├── High Tech & SaaS - Strategic Roadmap
│   ├── Financial Services - Strategic Roadmap
│   └── Consumer Goods - Strategic Roadmap
├── [Client A] /
│   └── Client A - Strategic Roadmap  (auto-created)
├── [Client B] /
│   └── Client B - Strategic Roadmap  (auto-created)
└── ...
```

---

## Pre-requisites (Manual Setup)

### 1. Google Cloud Project
- Create (or reuse) a GCP project
- Enable **Google Drive API** and **Google Slides API**

### 2. Service Account
- Create a service account under IAM & Admin > Service Accounts
- Generate a JSON key file
- Share both Drive folders with the service account email (`asoe-bot@project-id.iam.gserviceaccount.com`) as **Editor**

### 3. Placeholder Tokens in Templates
Add these placeholder tokens to **Slide 3** of each of the 4 existing templates:

| Placeholder | Where it goes |
|---|---|
| `{{slideTitle}}` | Main title text box |
| `{{problemDescription}}` | Problem description area |
| `{{bullet1}}` | First reality bullet |
| `{{bullet2}}` | Second reality bullet |
| `{{bullet3}}` | Third reality bullet |
| `{{shiftFrom}}` | "From" text in shift section |
| `{{shiftTo}}` | "To" text in shift section |
| `{{shiftOneLiner}}` | One-liner below the shift |
| `{{speakerNotes}}` | Speaker notes for Slide 3 |

### 4. Environment Variables
Add to `backend/.env`:
```
GOOGLE_DRIVE_ENABLED=true
GOOGLE_CLIENT_EMAIL=asoe-bot@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

---

## Implementation Plan

### Step 1: Install dependency

```bash
cd backend && npm install googleapis
```

### Step 2: Create `backend/integrations/googleDriveAgent.js`

New file — all Google Drive/Slides API logic. Core functions:

**`getAuthClient()`**
Authenticates via service account using `GOOGLE_CLIENT_EMAIL` + `GOOGLE_PRIVATE_KEY` env vars. Scopes: `drive` and `presentations`.

**`createClientFolder(drive, companyName)`**
Creates a folder named `{companyName}` inside the Loom Videos folder. Checks for existing folder first to avoid duplicates. Returns `{ id, url }`.

**`findAndCopyTemplate(drive, industry, companyName, targetFolderId)`**
Lists files in the AAA Templates folder. Matches industry to template using this mapping:

| Form Industry Value | Template Match | Fallback |
|---|---|---|
| `SaaS/High Tech` | "SaaS" or "High Tech" | — |
| `Financial Services` | "Financial" | — |
| `Consumer Goods` | "Consumer" | — |
| `Professional Services` | "Professional" | — |
| `Manufacturing` | — | Professional Services template |
| `Healthcare` | — | Professional Services template |
| `E-commerce` | — | Consumer Goods template |
| `Restaurant Tech` | — | Consumer Goods template |
| `Unknown` | — | First template found |

Copies the matched template, renamed to `{companyName} - Strategic Roadmap`. Returns `{ id, url }`.

**`injectSlideContent(slides, deckId, slideContent)`**
Uses Google Slides `presentations.batchUpdate` with `replaceAllText` requests for each placeholder token. Maps the generated `slideContent` fields:

```
slideContent.slideTitle       → {{slideTitle}}
slideContent.problem.headline → {{problemDescription}}
slideContent.reality.bullets[0] → {{bullet1}}
slideContent.reality.bullets[1] → {{bullet2}}
slideContent.reality.bullets[2] → {{bullet3}}
slideContent.shift.from       → {{shiftFrom}}
slideContent.shift.to         → {{shiftTo}}
slideContent.shift.oneLiner   → {{shiftOneLiner}}
slideContent.speakerNotes     → {{speakerNotes}}
```

**`createClientDeckInDrive(companyName, industry, slideContent)`** *(exported)*
Main function called by the orchestrator. Orchestrates: auth → create folder → copy template → inject content. Returns:
```js
{
  success: boolean,
  folderUrl: string | null,
  slideDeckUrl: string | null,
  error: string | null
}
```
If credentials are missing or `GOOGLE_DRIVE_ENABLED !== 'true'`, returns `{ success: false, error: 'not configured' }` immediately without throwing.

### Step 3: Update `backend/config.js`

Add `googleDrive` config block:
```js
export const config = {
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  googleDrive: {
    enabled: process.env.GOOGLE_DRIVE_ENABLED === 'true',
    clientEmail: process.env.GOOGLE_CLIENT_EMAIL,
    privateKey: process.env.GOOGLE_PRIVATE_KEY,
  },
};
```

Log a startup warning if `GOOGLE_DRIVE_ENABLED=true` but credentials are missing.

### Step 4: Update `backend/agents/orchestrator.js`

- Import `createClientDeckInDrive` from `../integrations/googleDriveAgent.js`
- Insert new **Step 6: Google Drive Operations** between content generation (Step 5) and packaging (Step 6 → Step 7)
- Runs for all workflows that reach the main pipeline (`netnew`, `closedlost`, `expansion`)
- Wrapped in try/catch — **failures are non-blocking** (log warning, pipeline continues)
- 30-second timeout via `Promise.race` to prevent hanging
- Add `googleDrive` field to the return object
- Update step numbering from `[1/6]...[6/6]` to `[1/7]...[7/7]`

### Step 5: Update `frontend/src/api/client.ts`

Add TypeScript interface:
```ts
export interface GoogleDriveResult {
  success: boolean;
  folderUrl: string | null;
  slideDeckUrl: string | null;
  error: string | null;
}
```

Add `googleDrive?: GoogleDriveResult` to the `GenerateResponse` interface.

### Step 6: Update `frontend/src/App.tsx`

**Imports**: Add `FolderOpen`, `ExternalLink` to lucide-react imports.

**Progress steps**: Update `FULL_WORKFLOW_STEPS` to 7 steps:
```ts
{ id: 6, name: 'Creating Google Drive assets', status: 'pending' },
{ id: 7, name: 'Finalizing assets', status: 'pending' },
```

**Results UI**: Add a "Google Drive Assets" card between the Slide 3 Content section and Client Engagement Output:
- Shown when `results.googleDrive?.success === true`
- Two clickable links styled as action buttons:
  - "Open Client Folder" → `results.googleDrive.folderUrl`
  - "Open Slide Deck" → `results.googleDrive.slideDeckUrl`
- Both open in new tab
- Styled consistent with existing glass-card design
- If Google Drive failed, show subtle gray warning text (non-intrusive, doesn't block workflow)

**Workflow instructions**: Update netnew, closedlost, and expansion `outputs` arrays to mention the Google Drive folder + deck as an output.

---

## Files Changed Summary

| File | Type | Description |
|---|---|---|
| `backend/integrations/googleDriveAgent.js` | New | All Google Drive/Slides API logic |
| `backend/config.js` | Modified | Add `googleDrive` config block |
| `backend/agents/orchestrator.js` | Modified | Add Step 6, update numbering, add to return |
| `frontend/src/api/client.ts` | Modified | Add `GoogleDriveResult` interface |
| `frontend/src/App.tsx` | Modified | Progress step, Drive links card, workflow instructions |

---

## Error Handling

| Scenario | Behavior |
|---|---|
| No credentials configured | Skip silently, return `googleDrive: null` |
| Google API failure | Log warning, return `{ success: false, error }` — content still returned as text |
| No template match for industry | Return error in result, slide content still available as copy-paste |
| Slide injection fails | Return deck URL anyway (user gets template copy without customization) |
| Duplicate company folder | Reuse existing folder with same name |
| Operation takes >30s | Timeout, return error, content still available |

---

## Testing Checklist

- [ ] Service account created and credentials in `.env`
- [ ] Both Drive folders shared with service account email
- [ ] Placeholder tokens added to at least one template deck
- [ ] `npm install googleapis` in backend
- [ ] Run net new prospecting → verify folder created in Loom Videos
- [ ] Verify template copied and renamed to `{Company} - Strategic Roadmap`
- [ ] Verify Slide 3 placeholders replaced with generated content
- [ ] Verify UI shows clickable folder + deck links
- [ ] Test with `GOOGLE_DRIVE_ENABLED=false` → verify content generates normally without Drive links
- [ ] Test with industry that has no direct template match → verify fallback works
- [ ] Test with duplicate company name → verify folder reuse
- [ ] Test closed lost and expansion workflows → verify Drive integration works for those too
