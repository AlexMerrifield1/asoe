# ASOE Critical Review: Agent Pipeline, Prompts & Generation Quality

**Review Date:** February 6, 2026
**Scope:** Full audit of agent pipeline, prompt templates, hallucination vectors, personalization depth, email structure enforcement, and orchestration logic

---

## Executive Summary

ASOE has a solid foundation—the multi-agent pipeline architecture, the Chris Voss framework integration, and the confidence scoring system are genuine differentiators. But there are meaningful gaps that will cause the tool to produce content that feels "AI-generated" rather than human-written, allow hallucinations to slip through undetected, and occasionally produce emails that are too long or structurally wrong for the intended use case.

This review identifies **23 specific issues** across 6 categories, ranked by impact.

---

## 1. HALLUCINATION RISK POINTS (Critical)

### 1.1 Research Agent Temperature is Too High (0.7) ✅ COMPLETED
**File:** `backend/agents/researcher.js` line 37
**Risk:** The research agent uses `temperature: 0.7`, which encourages creative variation in what should be an analytical, fact-based task. This is the single largest hallucination vector in the pipeline.

**The problem:** At 0.7, Claude will "fill in gaps" with plausible-sounding but fabricated company details, industry statistics, and pain points. When the web scraper returns thin data (which happens frequently—many corporate sites block scrapers or have minimal public content), the research agent will compensate by generating fictional specifics.

**Fix:** Drop temperature to 0.3–0.4 for the research agent. Reserve higher temperatures for the content generators where creative variation is desirable.

### 1.2 No Scraper Failure Signal Propagated to Downstream Agents ⬜
**File:** `backend/agents/orchestrator.js` lines 68–82
**Risk:** When the web scraper fails or returns minimal data, the orchestrator creates an empty profile object and continues the pipeline silently. Downstream agents (researcher, fact-checker, generators) have no explicit signal that the data they're working with is thin.

**The problem:** The research agent receives a companyProfile with empty strings and empty arrays. It doesn't know this means "scraping failed" vs. "the company just doesn't have much online." It will generate insights anyway, pulling from its training data rather than actual scraped content. The fact-checker then validates these insights against... the same empty profile, creating a circular validation loop.

**Fix:** Add a `dataQuality` flag to the company profile (e.g., `scrapingStatus: 'full' | 'partial' | 'failed'`). Inject this context into the research prompt so the agent knows to be conservative. The fact-checker should automatically downgrade confidence when scraping status is 'failed'.

### 1.3 JSON Extraction Regex is Greedy and Fragile ⬜
**File:** Every agent file—`researcher.js`, `factChecker.js`, `emailGenerator.js`, `loomGenerator.js`, `slideGenerator.js`
**Pattern:** `responseText.match(/\{[\s\S]*\}/)`

**The problem:** This regex grabs everything between the FIRST `{` and the LAST `}` in the response. If Claude returns any prose before/after the JSON (which it frequently does, especially at higher temperatures), you might capture malformed JSON or miss nested objects. Worse, if the JSON itself contains string values with `{` or `}` characters, the match can break.

**Fix:** Use a more robust extraction: look for JSON code fences first (```json...```), then fall back to bracket matching with depth tracking. Better yet, use Claude's `response_format` parameter or a structured output approach.

### 1.4 Fact-Checker Validates AI Output Against AI Output ⬜
**File:** `backend/agents/factChecker.js`, `backend/prompts/fact-check.md`
**Risk:** The fact-checker receives `researchFindings` (AI-generated) and validates them against `companyProfile` (partially AI-generated from scraper interpretation) and `formData` (user-provided). The only truly grounded data is `formData`.

**The problem:** If the research agent hallucinates that "Company X recently announced a $50M Series C," the fact-checker has no external source to verify this against. It will check whether this claim appears in the scraped website data—and if it doesn't, it should flag it LOW. But the prompt doesn't explicitly instruct the fact-checker to treat "claim not found in scraped data" as LOW confidence. Instead, it may rate it MEDIUM ("reasonably inferred").

**Fix:** Add explicit instructions to the fact-check prompt: "Any claim that cannot be directly traced to the scraped company profile or user-provided form data MUST be rated LOW or VERY_LOW. Do not assign MEDIUM to claims based solely on industry plausibility."

### 1.5 Mock Salesforce Data Presented as Real ✅ COMPLETED
**File:** `backend/agents/salesforceEnricher.js`
**Risk:** The mock data includes randomly generated dollar amounts (`Math.floor(Math.random() * 100000) + 50000`), fabricated engagement histories, and fake opportunity IDs. This data flows into the research agent and fact-checker as if it were real CRM data.

**The problem:** The research agent uses these fictional dollar amounts and engagement dates as "facts" to build its analysis. The email generator then references them. The mock data has `dataSource: 'mock'` but there's nothing in the downstream prompts telling agents to treat mock data differently.

**Fix:** When salesforceData.dataSource === 'mock', inject a clear disclaimer into the research and fact-check prompts: "IMPORTANT: Salesforce data is MOCK/SIMULATED. Do not reference specific dollar amounts, dates, or engagement details from this data in generated content. Use only the user-provided form data as ground truth."

---

## 2. PERSONALIZATION DEPTH (Major)

### 2.1 Web Scraper Extracts Structure But Not Voice ⬜
**File:** `backend/agents/webScraper.js`
**Risk:** The scraper extracts headings, meta descriptions, tech stack, and structured data—but not the company's actual language, tone, or messaging.

**The problem:** Personalization requires mirroring the prospect's vocabulary and concerns. The scraper grabs "what the company does" but not "how they talk about it." A SaaS company's landing page says "We empower teams to ship faster"—that phrase should appear in the outreach. Currently, bodyText is truncated to 1000 characters and headings to 100 characters, which often strips the most useful messaging.

**Fix:** Extract key value propositions and marketing copy separately. Look for `<h1>`, hero sections, and the first paragraph of the main content area. Store these as `companyMessaging` or `valuePropositions` in the profile, limited to 3–5 entries.

### 2.2 No Prospect-Level Personalization ⬜
**File:** All generators
**Risk:** The tool personalizes to the company but not to the individual. `contactName` is used only in the greeting ("Hi Cody"). There's no title-based messaging, no role-specific pain point selection, no seniority-appropriate tone adjustment.

**The problem:** An email to a VP of Ops should read differently than one to a CTO. The Loom script should reference their domain (ops, tech, marketing). The form collects `championTitle` for closed-lost but doesn't pass it through to the generators for tone/content adjustment.

**Fix:** Pass `championTitle`/role into the generator prompts. Add prompt instructions: "If the contact is technical (CTO, VP Engineering), lean into architecture and tech debt. If operational (VP Ops, Director of Ops), lean into efficiency and process. If executive (C-suite), lean into ROI and strategic risk."

### 2.3 Intelligence Brief Not Used by Generators ⬜
**File:** `backend/agents/orchestrator.js` lines 104–118
**Risk:** The web scraper builds a rich `intelligenceBrief` with mission statement, milestones, executives, and news. But this object is NOT passed to the content generators—it only appears in the final metadata output.

**The problem:** The generators receive `validatedFacts` (from research + fact-check), which is a derivative of the original scrape data filtered through two AI interpretations. The raw intelligence brief—which contains the most grounded, factual information—never reaches the email, Loom, or slide generators directly.

**Fix:** Include `intelligenceBrief` in the payload passed to each generator. Add prompt instructions: "Reference specific details from the Intelligence Brief (executive names, recent news, milestones) to demonstrate genuine research. These are verified facts from the company's own website."

### 2.4 "Accusation Audit" Framework Applied Generically ⬜
**File:** `backend/prompts/email.md`
**Risk:** The prompt provides excellent examples for Closed Lost workflows but weak guidance for Net New and Expansion.

**The problem:** The two example emails are both Closed Lost scenarios. For Net New, the prompt says "Challenge a false business assumption" but doesn't provide a concrete example email. For Expansion, there's no example at all. Claude will default to the Closed Lost pattern even when the workflow is different, producing emails that "validate past decisions" when there's no past decision to validate.

**Fix:** Add one strong example email for each workflow type. The Net New example should demonstrate the "assumption challenge" pattern without the "you made the right call" language. The Expansion example should demonstrate the "trusted insider" pattern.

---

## 3. EMAIL LENGTH & STRUCTURE CONTROLS (Major)

### 3.1 No Programmatic Word Count Enforcement ✅ COMPLETED
**File:** `backend/agents/generators/emailGenerator.js`
**Risk:** The prompt says "TARGET: 150-200 words" but there's no code that validates the output length. Claude regularly exceeds targets by 50–100%, especially at temperature 0.8.

**The problem:** The email generator uses `temperature: 0.8`—the highest in the pipeline. Higher temperature means more verbose output. Combined with the rich context in `validatedFacts` (which can be quite long), Claude will write 250–350 word emails. Prospects scan emails in 8 seconds. Every word past 200 makes the email less likely to be read.

**Fix:** Add a post-generation validation step in `emailGenerator.js`. Count words in the body. If over 220 words, either (a) make a second API call asking Claude to trim it to 180 words, or (b) implement a hard trim that takes the first ~200 words and appends the CTA. Also consider dropping temperature to 0.6–0.7.

### 3.2 Loom Link Placement is Not Enforced ✅ COMPLETED
**File:** `backend/prompts/email.md`
**Risk:** The prompt structure puts the Loom link in the "Video CTA" section which comes AFTER the "Hook with Insight" and "Value Prop with Pivot" sections. This means the Loom link lands roughly 60–70% of the way through the email.

**The problem:** You specifically need the Loom link near the top so prospects see it immediately upon opening. The current prompt architecture buries it below the problem diagnosis and value prop. In mobile email clients (where most B2B emails are read first), the Loom link is often below the fold.

**Fix:** Restructure the email prompt to place the Loom link immediately after the first 2–3 sentence hook. The pattern should be:
1. Hook (2-3 sentences acknowledging context + labeling the problem)
2. Loom link with one-line tease ("I made a 90-second video breaking this down")
3. Brief value prop pivot (2-3 sentences)
4. No-Oriented question
5. Contact block

### 3.3 No Subject Line Length Validation ⬜
**File:** `backend/agents/generators/emailGenerator.js`
**Risk:** The prompt says "8-12 words max" for subject lines but there's no enforcement. Long subject lines get truncated in email clients, especially mobile.

**Fix:** Add validation: if subject exceeds 60 characters (approximately 10-12 words), truncate or flag for revision.

### 3.4 Contact Block Format Not Locked ✅ COMPLETED
**File:** `backend/prompts/email.md`
**Risk:** The contact block (Mobile, Calendly links) is defined in the prompt examples but not in a locked format. Claude sometimes reformats it, adds extra text, or omits links.

**Fix:** Move the contact block out of the AI-generated content entirely. Append it programmatically in `emailGenerator.js` after receiving the AI output. This guarantees consistent formatting every time.

---

## 4. PIPELINE LOGIC & DATA FLOW (Moderate)

### 4.1 Parallel Generation Creates Inconsistency ⬜
**File:** `backend/agents/orchestrator.js` lines 100–104
**Risk:** Email, Loom, and Slide generators run in `Promise.all()` with no shared context between them. Each generator independently interprets `validatedFacts`.

**The problem:** The email might label the problem as "Strategy Void" while the Loom script calls it "Complexity Wall" and the slide says "Engagement Wall." There's no mechanism to ensure consistent framing language across the three assets. The prompt for email says "video and email must have UNIQUE content" but there's no coordination mechanism to prevent overlap OR ensure complementarity.

**Fix:** Add a "framing pass" before parallel generation. A quick, low-cost API call that decides: (a) the specific label/framework to use, (b) what content goes in email vs. video vs. slide, and (c) key talking points for each asset. Pass this framing document to all three generators.

### 4.2 Error Fallbacks Produce Usable-Looking Bad Content ⬜
**File:** All generator files
**Risk:** Every generator has a catch block that returns a plausible-looking fallback. For example, the email fallback returns a generic email with subject, body, and tone. The Loom fallback returns a 4-phase script.

**The problem:** These fallbacks are generic and not personalized—but they look real in the UI. A user might not notice the output is a fallback and send it. There's no visible indicator in the returned data that says "this is a fallback, not generated content."

**Fix:** Add `isError: true` and `errorMessage: '...'` to all fallback returns. The frontend should display a prominent warning when error content is returned rather than rendering it as normal output.

### 4.3 Confidence Level Adjustment Can Over-Inflate ⬜
**File:** `backend/agents/orchestrator.js` lines 14–58
**Risk:** The `calculateDataQualityModifier` can return +2, which upgrades the confidence by two levels. A MEDIUM confidence from the fact-checker can become VERY_HIGH if the scraper found good data.

**The problem:** Data quality and claim accuracy are different dimensions. Having rich scraper data doesn't mean the AI's inferences from that data are accurate. A company might have a beautiful website with tons of content, but the AI might still misinterpret what it means.

**Fix:** Cap the positive modifier at +1. Rich data should increase confidence by one level at most. The data quality modifier should have asymmetric weight: poor data should penalize more than rich data should reward.

### 4.4 No Rate Limiting or Cost Tracking ⬜
**File:** `backend/routes/generate.js`
**Risk:** Each generation makes 5+ API calls to Claude (research, fact-check, email, loom, slide). There's no rate limiting, no cost estimation, and no circuit breaker if Anthropic's API is having issues.

**Fix:** Add basic rate limiting (e.g., max 10 generations per minute), cost estimation logging per generation, and a timeout/retry strategy for individual agent calls.

---

## 5. PROMPT ENGINEERING ISSUES (Moderate)

### 5.1 Research Prompt Doesn't Constrain Scope Based on Available Data ⬜
**File:** `backend/prompts/research.md`
**Risk:** The research prompt instructs Claude to "Be Specific: Reference actual company details, not generic statements" but doesn't account for scenarios where there ARE no specific details available.

**The problem:** When the scraper returns thin data, the research agent faces conflicting instructions: "be specific" but with no data to be specific about. It resolves this conflict by fabricating specifics—inventing details that sound real.

**Fix:** Add a conditional instruction: "If company data is limited (empty or minimal fields in companyProfile), acknowledge gaps explicitly. Generate insights based ONLY on the user-provided context in formData. Do not invent company-specific details. Rate your confidence as LOW when working from limited data."

### 5.2 Loom Script Word Count Not Calibrated ⬜
**File:** `backend/prompts/loom.md`
**Risk:** The prompt says "~2.5 words per second (225 words total for 90 seconds)" but the examples clock in at 250+ words. The pacing guideline contradicts the examples.

**Fix:** Calibrate the examples to the stated word count. 225 words for 90 seconds is already on the high end of natural speaking pace. Consider lowering to 200 words to account for pauses, emphasis, and slide transitions.

### 5.3 Slide Prompt Allows >3 Bullets Despite Explicit Rule ⬜
**File:** `backend/prompts/slide.md`
**Risk:** The prompt says "EXACTLY 3 bullet points" and "NOT 4, absolutely no more than 3" but there's no post-generation validation.

**Fix:** Add validation in `slideGenerator.js`: if `reality.bullets.length > 3`, trim to 3. If < 3, flag for review.

### 5.4 Email Generator Gets Full validatedFacts JSON Dump ⬜
**File:** `backend/agents/generators/emailGenerator.js` line 42
**Risk:** The entire `validatedFacts` object (which includes the full `originalResearch` findings) gets stringified and injected into the prompt. This can be thousands of tokens.

**The problem:** Claude performs worse with extremely long prompts when it needs to produce short, focused output. The signal-to-noise ratio drops. The generator should receive a curated subset: high-confidence claims, the chosen framework, and key talking points—not the entire research and validation chain.

**Fix:** Before calling the email generator, extract only: (a) `safeToUse.highConfidence` and `safeToUse.veryHighConfidence` claims, (b) `originalResearch.solvdAlignment`, (c) `originalResearch.workflowSpecific`, and (d) key talking points. Pass this trimmed payload instead of the full object.

---

## 6. CONTENT QUALITY & HUMAN FEEL (Moderate)

### 6.1 No Output Deduplication Across Email + Loom ⬜
**File:** `backend/prompts/email.md`, `backend/prompts/loom.md`
**Risk:** The email prompt says "Email and video must have UNIQUE content" but both generators receive the same validatedFacts and have no mechanism to coordinate.

**The problem:** Both generators will naturally gravitate toward the strongest talking point. The email will diagnose the "Strategy Void" and the Loom will... also diagnose the "Strategy Void." The prospect watches the video expecting new information and gets a repeat.

**Fix:** As mentioned in 4.1, implement a framing pass. Alternatively, generate the email first, then pass the email body as additional context to the Loom generator with instructions: "The email already covers [X]. Your video should focus on [Y] and [Z] instead."

### 6.2 No Tone Variance Between Workflows ⬜
**File:** All generator prompts
**Risk:** The "Late Night FM DJ Voice" tone instruction is applied uniformly across all three workflows.

**The problem:** A Net New cold email to someone who has never heard of SOLVD should sound different from a re-engagement to a former champion. The former needs more authority and proof; the latter needs warmth and humility. The Expansion email to an existing happy client needs collegial confidence. Currently, all three sound like the same person in the same mood.

**Fix:** Add workflow-specific tone modifiers: Net New = "Authoritative, pattern-disruptive, slightly provocative." Closed Lost = "Humble, validating, curious." Expansion = "Warm, collegial, forward-looking."

### 6.3 Follow-up Generator Bypasses the Full Pipeline ⬜
**File:** `backend/agents/orchestrator.js` lines 70–85
**Risk:** The follow-up workflow skips web scraping, Salesforce enrichment, research, and fact-checking entirely. It goes straight to content generation.

**The problem:** Follow-up emails need context to feel personalized. Without research, the follow-up generator can only work with whatever the user typed into the form—often just a name and "last touchpoint." The output will be generic.

**Fix:** At minimum, carry forward the results from the initial generation (if the same prospect was generated before). Better: add a lightweight research step that at least references the original generation context.

---

## Priority Implementation Order

Based on impact and effort, here's the recommended order for fixing these issues:

### Immediate (Fix Now)
1. ✅ **1.1** Research agent temperature: 0.7 → 0.3
2. ✅ **3.2** Restructure email prompt to place Loom link after first 2-3 sentences
3. ✅ **1.5** Add mock data disclaimer to downstream prompts
4. ✅ **3.1** Add word count validation + enforcement to email generator (also lowered temp to 0.65)
5. ✅ **3.4** Move contact block to programmatic append (with dynamic contactStyle: quick/full/minimal)

### Short-Term (Next Sprint)
6. **1.2** Add scraping status flag propagated to all agents
7. **1.4** Tighten fact-checker instructions for unverifiable claims
8. **2.3** Pass intelligence brief directly to generators
9. **4.1** Add framing pass before parallel generation
10. **5.4** Trim validatedFacts payload for generators
11. **4.2** Add error indicators to fallback content

### Medium-Term (Next Release)
12. **2.1** Extract company voice/messaging from scraper
13. **2.2** Add role-based personalization to generators
14. **2.4** Add example emails for all workflow types
15. **6.2** Add workflow-specific tone modifiers
16. **5.1** Add data-scarcity instructions to research prompt
17. **1.3** Replace greedy JSON regex with robust parser
18. **4.3** Cap confidence upgrade modifier at +1

### Lower Priority
19. **5.2** Calibrate Loom script word counts
20. **5.3** Add slide bullet count validation
21. **3.3** Add subject line length validation
22. **4.4** Add rate limiting and cost tracking
23. **6.3** Add context carryforward for follow-ups

---

## Summary of Temperature Settings (Current vs. Recommended)

| Agent | Original | Current | Recommended | Status |
|-------|----------|---------|-------------|--------|
| Research | 0.7 | **0.3** | 0.3 | ✅ Done |
| Fact-Check | 0.3 | 0.3 | 0.2 | ⬜ |
| Email Generator | 0.8 | **0.65** | 0.65 | ✅ Done |
| Loom Generator | 0.8 | 0.8 | 0.7 | ⬜ |
| Slide Generator | 0.7 | 0.7 | 0.5 | ⬜ |
| Follow-up Generator | 0.7 | 0.7 | 0.6 | ⬜ |
| Engagement Generator | 0.7 | 0.7 | 0.6 | ⬜ |

---

*Review prepared for SOLVD ASOE development. Ready to implement changes upon approval.*
