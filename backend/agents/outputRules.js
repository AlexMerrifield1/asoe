/**
 * Output Rules: shared formatting constraints for all content generators
 *
 * Injected into prompt templates via the {{outputRules}} variable.
 * These are hard rules that apply to every piece of generated text
 * (emails, phone scripts, LinkedIn messages, Loom scripts, slide content).
 *
 * Also exports a sanitize function for programmatic enforcement.
 */

const OUTPUT_RULES = `**OUTPUT FORMATTING RULES (mandatory | no exceptions):**
- NEVER use an em dash (the long dash character). Not once. Not anywhere.
- NEVER use two hyphens in a row ("--"). Not as a substitute for an em dash, not for any reason.
- When you need to add a parenthetical, aside, or break in a sentence: rewrite the sentence using a comma, a period (split into two sentences), or parentheses instead.
- These rules apply to subject lines, email bodies, phone scripts, LinkedIn messages, Loom scripts, slide content, and any other generated text.
`;

/**
 * Returns the output rules string for injection into a prompt template.
 * @returns {string}
 */
export function getOutputRules() {
  return OUTPUT_RULES;
}

/**
 * Programmatic safety net: strips em dashes and double hyphens from text.
 * Replaces with a comma + space where contextually safe.
 * @param {string} text
 * @returns {string}
 */
export function sanitizeOutput(text) {
  if (!text) return text;
  return text
    .replace(/\s*\u2014\s*/g, ', ')   // em dash -> comma
    .replace(/\s*--\s*/g, ', ')        // double hyphen -> comma
    .replace(/,\s*,/g, ',')           // clean up double commas
    .replace(/,\s*\./g, '.')           // clean up comma before period
    .replace(/\.\s*,/g, '.');          // clean up period before comma
}
