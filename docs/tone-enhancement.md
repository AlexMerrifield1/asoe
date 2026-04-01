# Plan: Per-Workflow Tone Controls

## Context
Tone is currently hardcoded into the prompt templates as narrative instruction (e.g., "Late Night FM DJ Voice", "calm, authoritative, empathetic"). Users have no way to adjust tone at input time — every generation uses the same baked-in style regardless of the prospect, relationship stage, or rep preference. Adding an optional tone selector per workflow lets reps layer a tone preference on top of the existing framework when they want to, while changing nothing when they don't.

---

## Design Decision: Optional Pill Selector, No Defaults

Four tone pills appear on every workflow form. **Nothing is pre-selected.** Tone only modifies output when the rep explicitly picks one. If no tone is selected, `{{toneDirective}}` resolves to an empty string and the prompts behave exactly as today.

### The Four Presets

| Key | Label | Prose Directive (injected into prompt) |
|-----|-------|---------------------------------------|
| `consultative` | Consultative | "Lead with empathy and curiosity. Prioritize understanding their situation before asserting value. Use questions over statements. Soften assertions with 'It seems like...' and 'It looks like...'" |
| `direct` | Direct | "Cut to the point. Shorter sentences. Lead with business impact in the first line. Fewer pleasantries. Strong, specific assertions. Do not bury the point." |
| `executive` | Executive | "Peer-to-peer, C-suite language. Business outcomes over features or process. Strategic framing. Treat them as an equal making a business decision, not a prospect to be closed." |
| `warm` | Warm & Collegial | "Relationship-first. Human and personal. Reference shared history, progress, or wins. Feel like a trusted peer checking in, not a vendor selling." |

Pills act as a toggle: clicking a selected pill deselects it (returns to no tone override). No auto-selection logic.

---

## Files to Change

### 1. `backend/agents/toneDirectives.js` — NEW shared utility
Exports a map of tone key → prose directive, plus a helper:
```js
export const TONE_DIRECTIVES = { consultative: "...", direct: "...", executive: "...", warm: "..." };
export function getToneDirective(tone) {
  if (!tone) return ''; // No selection = no override
  return TONE_DIRECTIVES[tone] || '';
}
```

### 2. `backend/prompts/email.md`
Add after the opening tone line (line 3):
```
{{toneDirective}}
```
When tone is selected, this expands to e.g. `**Tone Override:** Cut to the point...`. When empty, it renders as nothing.

### 3. `backend/prompts/loom.md`
Same addition near the top tone guidance section.

### 4. `backend/prompts/followup.md`
Same addition near the "Tone target" section.

### 5. `backend/prompts/engagement.md`
Same addition near the FF/EB tone sections.

### 6. `backend/agents/generators/emailGenerator.js`
- Import `getToneDirective` from `../toneDirectives.js`
- Add to the existing replace chain (lines ~60–65):
  `.replace('{{toneDirective}}', getToneDirective(formData.tone))`

### 7. `backend/agents/generators/loomGenerator.js`
Same pattern.

### 8. `backend/agents/generators/followupGenerator.js`
Same pattern.

### 9. `backend/agents/generators/engagementGenerator.js`
Same pattern.

### 10. `frontend/src/api/client.ts`
Add `tone?: string` to the `FormData` interface.

### 11. `frontend/src/App.tsx`
Add a "Tone" pill row to each workflow form (above the Generate button area). Four pills: Consultative, Direct, Executive, Warm & Collegial. Selecting an active pill deselects it (toggle behavior). Uses existing `updateFormField('tone', value)` pattern. On tab switch, tone resets to undefined (no selection carries over between workflows).

The pill row uses the same visual styling already used for buttons/selectors in the form (border, rounded, hover states).

---

## Implementation Order

1. `toneDirectives.js` (shared utility, no dependencies)
2. All 4 prompt templates (add `{{toneDirective}}` variable)
3. All 4 generators (import + inject)
4. `client.ts` (add field)
5. `App.tsx` (UI — pills + reset on tab change)

Steps 1–4: verify with backend restart. Step 5: verify with Vite restart.

---

## Verification

1. Restart backend, start frontend
2. On Net New, leave tone unselected → generate → output unchanged from today
3. Select "Direct" → generate same company → email leads harder and faster
4. Select "Direct" again → it deselects → generate → back to baseline
5. Switch tabs → confirm tone selection is cleared
6. Test "Executive" on Engagement EB → confirm C-suite framing in output
