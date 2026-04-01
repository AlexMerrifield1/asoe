/**
 * Tone Directives — shared utility for all content generators
 *
 * Each key maps to a prose directive injected into prompt templates
 * via the {{toneDirective}} variable. The default tone (professional_curious)
 * is pre-selected in the UI and represents the baseline style already baked
 * into the prompts — it reinforces rather than overrides.
 */

export const TONE_DIRECTIVES = {
  professional_curious: 'Calm, authoritative, and genuinely curious. Use the Late Night FM DJ approach — confident but never aggressive. Lead with labels and questions over blunt assertions. Feel like a trusted expert who has done their research, not a vendor pitching.',
  consultative: 'Lead with empathy and curiosity. Prioritize understanding their situation before asserting value. Use questions over statements. Soften assertions with "It seems like..." and "It looks like..."',
  direct: 'Cut to the point. Shorter sentences. Lead with business impact in the first line. Fewer pleasantries. Strong, specific assertions. Do not bury the point.',
  executive: 'Peer-to-peer, C-suite language. Business outcomes over features or process. Strategic framing. Treat them as an equal making a business decision, not a prospect to be closed.',
  warm: 'Relationship-first. Human and personal. Reference shared history, progress, or wins. Feel like a trusted peer checking in, not a vendor selling.'
};

/**
 * Returns the formatted tone directive string for injection into a prompt.
 * Returns empty string if no recognized tone is provided.
 *
 * @param {string} tone - The tone key from formData.tone
 * @returns {string} Formatted directive or empty string
 */
export function getToneDirective(tone) {
  const directive = TONE_DIRECTIVES[tone];
  if (!directive) return '';
  return `**Tone Directive:** ${directive}\n`;
}
