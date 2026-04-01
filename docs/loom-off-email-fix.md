# Plan: Fix Loom-Off Email Generation

## Context
The previous implementation added a `{{ctaSection}}` variable to `email.md` and conditionally builds it in `emailGenerator.js` — this works correctly at the variable level. However, the email body still contains Loom placeholders when Loom is off because multiple other places in `email.md` hardcode Loom instructions, and Claude pattern-matches on those instead of the ctaSection override. The `{{ctaSection}}` change alone is insufficient.

---

## Root Cause: Four Conflicting Loom References in email.md

| Line | Content | Problem |
|------|---------|---------|
| 95 | `[LINK TO LOOM VIDEO: Convergint: Beyond Ticket Taking]` in example email | Example teaches Claude the Loom format regardless of ctaSection |
| 115 | `[LINK TO LOOM VIDEO: Acme: What Comes After Go-Live]` in example email | Same — second example reinforces the pattern |
| 147 | Output format: "Full email body with [LOOM LINK PLACEHOLDER]" | Output instruction contradicts no-Loom ctaSection |
| 148 | `"loomTitle": "Specific title for the Loom video..."` in required JSON | Tells Claude loomTitle is a required field even when Loom is off |
| 165 | Guideline: "Video Link EARLY: Loom link must appear within the first 3-4 lines" | Absolute instruction that overrides ctaSection |

Plus in `emailGenerator.js` lines ~150–155: a condensing instruction that says "preserve the Loom video link and its placement" — sent to Claude unconditionally even when `includeLoom=false`.

---

## Fix: Two Separate Prompt Templates

**Recommended approach:** Create a dedicated `backend/prompts/email-no-loom.md` — a clean copy of `email.md` with all Loom references stripped and replaced with direct-CTA equivalents. The generator loads one or the other based on `formData.includeLoom`.

This is preferable to adding more `{{variables}}` throughout the prompt because:
- No risk of missing a conflicting line
- Each template is self-contained and easy to audit
- Prompts remain readable without conditional logic embedded in them

---

## Files to Change

### 1. `backend/prompts/email-no-loom.md` — NEW FILE
Copy `email.md` and make these changes:
- **Remove** the `{{ctaSection}}` variable entirely — replace it with the hardcoded direct CTA instruction:
  ```
  ### 2. Primary CTA (IMMEDIATELY after the hook — PRIMARY CTA)
  - A direct, confident meeting request or a provocative open question — no video reference whatsoever
  - One sentence. On its own line.
  - Examples: "Worth 15 minutes to see if this is relevant for Q2?" or "Is this on your radar right now?"
  - Do NOT mention a Loom video, recording, or any video content of any kind
  ```
- **Line 165:** Remove the "Video Link EARLY" guideline entirely
- **Lines 95, 115:** Update both example emails — replace `[LINK TO LOOM VIDEO: ...]` with a direct CTA line (e.g., `"Worth 15 minutes to see if this changes anything?"`)
- **Line 147:** Update output format body description to remove `[LOOM LINK PLACEHOLDER]` reference
- **Line 148:** Remove `loomTitle` from the required JSON output fields — replace with `"loomTitle": null`

### 2. `backend/prompts/email.md`
- Keep `{{ctaSection}}` as-is (already working for Loom-on case)
- No other changes needed — this file handles the Loom-on path

### 3. `backend/agents/generators/emailGenerator.js`
- Replace single prompt path with conditional:
  ```js
  const promptFile = formData.includeLoom !== false ? 'email.md' : 'email-no-loom.md';
  const promptPath = path.join(__dirname, `../../prompts/${promptFile}`);
  ```
- For the `email-no-loom.md` path, the `{{ctaSection}}` replace is a no-op (variable doesn't appear in that template)
- Fix the condensing logic (~lines 150–155): wrap the "preserve the Loom video link" instruction in a conditional so it's only included when `formData.includeLoom !== false`

---

## Implementation Order

1. Create `email-no-loom.md` (copy + strip all Loom references)
2. Update `emailGenerator.js` — conditional template loading + fix condensing logic

No other files need changes — orchestrator, frontend, and client.ts are already correct.

---

## Verification

1. Toggle Loom **on** → generate Net New → email body contains `[LINK TO LOOM VIDEO: ...]`, loomScript section visible
2. Toggle Loom **off** → generate same company → email body has direct meeting CTA, no video language, no Loom section in results
3. Toggle Loom **off** → check raw email JSON — `loomTitle` should be null or absent
