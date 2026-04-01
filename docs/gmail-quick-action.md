# Gmail Quick Action — Compose Button for Email Draft

## Overview

Add an "Open in Gmail" button next to the existing Copy button in the Email Draft output section. Clicking it opens Gmail's web composer pre-populated with the subject line, email body, and optionally the recipient's email address — no API connection required.

Gmail supports a compose URL scheme that pre-fills fields via URL-encoded query parameters:

```
https://mail.google.com/mail/?view=cm&fs=1&to=EMAIL&su=SUBJECT&body=BODY
```

---

## Implementation Plan

### 1. Add `recipientEmail` to the FormData type
**File:** `frontend/src/api/client.ts`

Add an optional field to the `FormData` interface:
```ts
recipientEmail?: string;  // Optional — used to pre-fill Gmail "To" field
```

### 2. Add "Recipient Email" input to workflow forms
**File:** `frontend/src/App.tsx`

Add a simple optional email input to each workflow section that outputs an email draft:
- Net New Prospecting (~line 550, near `prospectName`)
- Closed Lost Re-Engagement (~line 701, near champion name)
- Expansion (~line 768, near `contactName`)
- Follow-up (~line 828, near `prospectName`)

Label: `"Recipient Email"` with `placeholder="prospect@company.com"` and `type="email"`. Field is optional — no validation needed beyond browser-native email format hint. Bind to `formData.recipientEmail` via the existing `handleInputChange` pattern.

### 3. Add `openInGmail()` helper function
**File:** `frontend/src/App.tsx`

Add a helper near the other clipboard functions (~line 238):

```ts
const openInGmail = (subject: string, body: string, to?: string) => {
  const params = new URLSearchParams();
  if (to) params.set('to', to);
  params.set('su', subject);
  params.set('body', body);
  params.set('view', 'cm');
  params.set('fs', '1');
  window.open(`https://mail.google.com/mail/?${params.toString()}`, '_blank');
};
```

Using `URLSearchParams` handles encoding cleanly. Note: Gmail's `body` param has no hard limit but very long emails (>2000 chars) may get silently truncated in the URL — acceptable tradeoff vs. requiring API auth.

### 4. Add "Open in Gmail" button to Email Draft section
**File:** `frontend/src/App.tsx`

In the Email Draft header (`flex items-center justify-between`, ~line 1395), add a second button next to the existing Copy button:

```tsx
<button
  onClick={() => openInGmail(
    results.email!.subject,
    results.email!.body,
    formData.recipientEmail
  )}
  className="flex items-center gap-2 px-3 py-1.5 text-sm text-green-600 hover:text-green-700 hover:bg-green-50 rounded-md transition-colors"
>
  <ExternalLink className="h-4 w-4" />
  <span>Open in Gmail</span>
</button>
```

`ExternalLink` is available from lucide-react — add to imports if not already present.

### 5. Add "Open in Gmail" button to Follow-up Email Draft section
**File:** `frontend/src/App.tsx`

Same pattern for the follow-up email section (~line 1270), using `results.followUpOutput.emailDraft.subject` and `.body`.

---

## Files to Modify
- `frontend/src/api/client.ts` — add `recipientEmail` to FormData interface
- `frontend/src/App.tsx` — add input fields, helper function, and Gmail buttons

## Files NOT Modified
- No backend changes needed — `recipientEmail` is purely frontend and never needs to be sent to the API

---

## Verification
1. Start frontend: `cd frontend && npm run dev`
2. Fill out a Net New form — optionally enter a recipient email
3. Generate output
4. Click "Open in Gmail" — new tab should open with subject and body pre-filled, To address if entered
5. Test the follow-up email section button as well
6. Test without a recipient email — button should still work, To field left blank in Gmail
