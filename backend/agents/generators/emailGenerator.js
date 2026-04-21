import '../../config.js';
import Anthropic from '@anthropic-ai/sdk';
import { getToneDirective } from '../toneDirectives.js';
import { getOutputRules, sanitizeOutput } from '../outputRules.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

/**
 * Build workflow-specific context string for email generation
 */
function buildSpecificContext(workflowType, industry, formData) {
  let context = '';
  switch (workflowType) {
    case 'netnew':
      context = `Target company for new business. Industry: ${industry}. ${formData.businessChallenge || ''}`;
      break;
    case 'closedlost':
      context = `Closed Lost opportunity. Loss reason: ${formData.lossReason || 'Unknown'}. Loss date: ${formData.lossDate || 'Unknown'}. New context: ${formData.newContext || 'Unknown'}`;
      break;
    case 'expansion':
      context = `Existing client expansion. Current project: ${formData.previousProject || 'Unknown'}. New trigger: ${formData.newTrigger || 'Unknown'}. Health score: ${formData.healthScore || 'Unknown'}`;
      break;
    default:
      break;
  }
  if (formData.additionalContext) {
    context += `\n\nAdditional Context (use this to personalize): ${formData.additionalContext}`;
  }
  return context;
}

/**
 * Email Generator Agent
 * Generates personalized sales outreach emails using "Accusation Audit" framework
 */
export async function generateEmail(validatedFacts, workflowType, formData) {
  const includeLoom = formData.includeLoom !== false;
  console.log(`📧 Generating email for workflow: ${workflowType} (loom: ${includeLoom ? 'yes' : 'no'})`);

  try {
    // Load email prompt template -- use no-loom variant when Loom is disabled
    const promptFile = includeLoom ? 'email.md' : 'email-no-loom.md';
    const promptPath = path.join(__dirname, '../../prompts', promptFile);
    let promptTemplate = await fs.readFile(promptPath, 'utf-8');

    // Extract context from validated facts and form data
    const companyName = validatedFacts.originalResearch?.companyName || formData.companyName || formData.targetCompany;
    const contactName = formData.champion || formData.contactName || formData.prospectName || 'there';
    const industry = validatedFacts.originalResearch?.industry || formData.industry || 'your industry';

    // Build specific context based on workflow type
    const specificContext = buildSpecificContext(workflowType, industry, formData);

    // For the Loom template, inject the dynamic CTA section
    if (includeLoom) {
      const ctaSection = `### 2. Loom CTA (IMMEDIATELY after the hook, PRIMARY CTA)
- The Loom video is the primary CTA. It should be visible without scrolling on mobile
- One sentence teasing the specific insight or audit the video contains
- The Loom link on its own line for maximum visibility
- Example: "I made a 90-second audit breaking down exactly where this is costing you."
- "[LINK TO LOOM VIDEO: Company Name: Specific Topic]"`;
      promptTemplate = promptTemplate.replace('{{ctaSection}}', ctaSection);
    }

    // Replace template variables
    promptTemplate = promptTemplate
      .replace('{{toneDirective}}', getToneDirective(formData.tone))
      .replace('{{outputRules}}', getOutputRules())
      .replace('{{validatedFacts}}', JSON.stringify(validatedFacts, null, 2))
      .replace('{{workflowType}}', workflowType)
      .replace('{{companyName}}', companyName)
      .replace('{{contactName}}', contactName)
      .replace('{{specificContext}}', specificContext);

    // Call Claude API
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      temperature: 0.65, // Balanced: creative but controlled
      messages: [
        {
          role: 'user',
          content: promptTemplate
        }
      ]
    });

    // Extract JSON from response
    const responseText = message.content[0].text;

    // Try to find JSON in the response
    let emailContent;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      emailContent = JSON.parse(jsonMatch[0]);
    } else {
      emailContent = JSON.parse(responseText);
    }

    // Sanitize output (strip em dashes and double hyphens)
    for (const key of ['subject', 'subjectAlt', 'body', 'loomTitle', 'confidenceNotes', 'tone']) {
      if (emailContent[key]) {
        emailContent[key] = sanitizeOutput(emailContent[key]);
      }
    }

    // Contact block definitions
    const CONTACT_BLOCKS = {
      minimal: `\nMobile: (801) 874-5175`,
      quick: `\nMobile: (801) 874-5175\nQuick call: https://calendly.com/alex-solvd/new-meeting (15 min)`,
      full: `\nMobile: (801) 874-5175\nQuick call: https://calendly.com/alex-solvd/new-meeting (15 min)\nDeeper dive: https://calendly.com/alex-solvd/30min (25 min)`
    };

    // Strip any AI-generated contact block if present (safety measure)
    let bodyText = emailContent.body || '';
    const contactPatterns = [
      /\n*Mobile:.*$/s,  // Everything from "Mobile:" to end
      /\n*Quick call:.*$/s,
      /\n*Deeper dive:.*$/s
    ];
    for (const pattern of contactPatterns) {
      bodyText = bodyText.replace(pattern, '');
    }
    bodyText = bodyText.trim();

    // Ensure email ends with "Best," before we add contact block
    if (!bodyText.match(/Best,?\s*$/i)) {
      // If no sign-off, add one
      bodyText = bodyText + '\n\nBest,';
    }

    // Word count validation - target is 40-80 words (body only, excluding signature)
    const REVIEW_THRESHOLD = 90;
    const wordCount = bodyText.split(/\s+/).filter(word => word.length > 0).length;

    console.log(`📝 Email word count: ${wordCount} (target: 40-80, review if >${REVIEW_THRESHOLD})`);

    // Condense if over the threshold -- elite first-touch emails average under 80 words
    if (wordCount > REVIEW_THRESHOLD) {
      console.log(`⚠️ Email may be too long (${wordCount} words), tightening to under 80 words...`);

      const loomPreserveNote = includeLoom
        ? `2. The Loom video link and its placement (must stay early in the email)`
        : `2. The direct CTA (meeting ask or provocative question, do NOT add any Loom or video reference)`;

      const condenseMessage = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        temperature: 0.4,
        messages: [
          {
            role: 'user',
            content: `Tighten this email to under 80 words (body only, excluding "Best,"). Every sentence must be 8-10 words max. Split any longer sentence into two.

CRITICAL - These elements MUST be preserved:
1. The power label (Strategy Void, Complexity Wall, Silent Adoption Issues, etc.) - this is the core insight
${loomPreserveNote}
3. The closing CTA (no-oriented question OR "Would you have a couple minutes to chat about this over the next few days?")
4. Any specific company details or personalization
5. The sign-off "Best,"

Remove:
- Redundant phrases and unnecessary qualifiers
- Filler sentences that don't add value
- Repeated ideas
- Any sentence over 10 words (split it instead)

Current email (${wordCount} words):
${bodyText}

Return ONLY the email body text, nothing else.`
          }
        ]
      });

      const reviewedBody = condenseMessage.content[0].text.trim();
      const reviewedWordCount = reviewedBody.split(/\s+/).filter(word => word.length > 0).length;

      // Only use reviewed version if it actually reduced length meaningfully
      if (reviewedWordCount < wordCount - 10) {
        console.log(`✅ Tightened from ${wordCount} to ${reviewedWordCount} words`);
        bodyText = reviewedBody;
        emailContent.wasReviewed = true;
        emailContent.originalWordCount = wordCount;
      } else {
        console.log(`✅ Email reviewed - no significant changes needed`);
      }
    }

    // Determine contact style and append appropriate block
    const contactStyle = emailContent.contactStyle || 'full';
    const contactBlock = CONTACT_BLOCKS[contactStyle] || CONTACT_BLOCKS.full;

    // Store body without contact for reference, add contact block for final body
    emailContent.bodyWithoutContact = bodyText;
    emailContent.body = bodyText + '\n' + contactBlock;
    emailContent.contactStyle = contactStyle;

    console.log(`✅ Email generated: "${emailContent.subject}" (contact style: ${contactStyle})`);

    return emailContent;

  } catch (error) {
    console.error(`❌ Error in email generator:`, error.message);

    // Return fallback email on error (contact block added programmatically)
    const companyName = formData.companyName || formData.targetCompany || 'your company';
    const fallbackBody = `Hi,\n\nI wanted to reach out about ${companyName}'s Salesforce needs.\n\nWe've helped companies in your industry solve similar challenges through our Expertise-as-a-Service (EaaSe) model.\n\nWould it be worth a brief conversation to explore if this could work for you?\n\nBest,`;

    return {
      subject: `Following up on ${companyName}`,
      subjectAlt: `The Salesforce conversation`,
      body: fallbackBody + `\n\nMobile: (801) 874-5175\nQuick call: https://calendly.com/alex-solvd/new-meeting (15 min)\nDeeper dive: https://calendly.com/alex-solvd/30min (25 min)`,
      bodyWithoutContact: fallbackBody,
      loomTitle: `${companyName}: EaaSe Overview`,
      contactStyle: 'full',
      confidenceNotes: 'Fallback email due to generation error',
      tone: 'Professional, direct',
      error: error.message
    };
  }
}
