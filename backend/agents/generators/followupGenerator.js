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
 * Follow-up Sequence Generator
 * Generates follow-up emails, phone scripts, or LinkedIn messages
 * @param {Object} formData - Form data from the frontend
 * @param {Object|null} companyContext - Optional company context from website scraping
 */
export async function generateFollowUp(formData, companyContext = null) {
  console.log(`📞 Generating ${formData.outputType || 'email'} follow-up (Touchpoint #${formData.touchpointNumber || '2'})`);

  try {
    // Load follow-up prompt template
    const promptPath = path.join(__dirname, '../../prompts/followup.md');
    let promptTemplate = await fs.readFile(promptPath, 'utf-8');

    // Build company context string if available
    let companyContextStr = 'None provided';
    if (companyContext) {
      const contextParts = [];
      if (companyContext.companyName) {
        contextParts.push(`Company Name: ${companyContext.companyName}`);
      }
      if (companyContext.industry) {
        contextParts.push(`Industry: ${companyContext.industry}`);
      }
      if (companyContext.companySummary) {
        contextParts.push(`About: ${companyContext.companySummary}`);
      }
      if (companyContext.businessModel) {
        contextParts.push(`Business Model: ${companyContext.businessModel}`);
      }
      if (companyContext.servicesProducts?.length > 0) {
        contextParts.push(`Services/Products: ${companyContext.servicesProducts.join(', ')}`);
      }
      if (contextParts.length > 0) {
        companyContextStr = contextParts.join('\n');
      }
    }

    // Replace template variables
    promptTemplate = promptTemplate
      .replace('{{toneDirective}}', getToneDirective(formData.tone))
      .replace('{{outputRules}}', getOutputRules())
      .replace('{{lastTouchpointType}}', formData.lastTouchpointType || 'email')
      .replace('{{lastTouchpointContext}}', formData.lastTouchpointContext || 'N/A')
      .replace('{{prospectName}}', formData.prospectName || 'there')
      .replace('{{touchpointNumber}}', formData.touchpointNumber || '2')
      .replace('{{additionalContext}}', formData.additionalContext || 'None provided')
      .replace('{{companyContext}}', companyContextStr)
      .replace('{{outputType}}', formData.outputType || 'email');

    // Call Claude API
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      temperature: 0.7,
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
    let followUpOutput;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      followUpOutput = JSON.parse(jsonMatch[0]);
    } else {
      followUpOutput = JSON.parse(responseText);
    }

    // For 2nd touch email, remove subject entirely (it's always a reply)
    if (followUpOutput.emailDraft && String(formData.touchpointNumber) === '2') {
      delete followUpOutput.emailDraft.subject;
      delete followUpOutput.emailDraft.subjectNote;
    }

    // Sanitize output (strip em dashes and double hyphens)
    if (followUpOutput.emailDraft) {
      for (const key of ['subject', 'subjectNote', 'body']) {
        if (followUpOutput.emailDraft[key]) {
          followUpOutput.emailDraft[key] = sanitizeOutput(followUpOutput.emailDraft[key]);
        }
      }
    }
    if (followUpOutput.phoneScript) {
      for (const key of ['opening', 'closing']) {
        if (followUpOutput.phoneScript[key]) {
          followUpOutput.phoneScript[key] = sanitizeOutput(followUpOutput.phoneScript[key]);
        }
      }
      if (followUpOutput.phoneScript.mainPoints) {
        followUpOutput.phoneScript.mainPoints = followUpOutput.phoneScript.mainPoints.map(p => sanitizeOutput(p));
      }
    }
    if (followUpOutput.linkedInMessage?.message) {
      followUpOutput.linkedInMessage.message = sanitizeOutput(followUpOutput.linkedInMessage.message);
    }

    // For email output, strip any AI-generated contact info and append programmatically
    if (followUpOutput.emailDraft?.body) {
      const CONTACT_BLOCKS = {
        minimal: `\nMobile: (801) 874-5175`,
        quick: `\nMobile: (801) 874-5175\nQuick call: https://calendly.com/alex-solvd/new-meeting (15 min)`,
        full: `\nMobile: (801) 874-5175\nQuick call: https://calendly.com/alex-solvd/new-meeting (15 min)\nDeeper dive: https://calendly.com/alex-solvd/30min (25 min)`
      };

      let bodyText = followUpOutput.emailDraft.body;
      const contactPatterns = [
        /\n*Mobile:.*$/s,
        /\n*Quick call:.*$/s,
        /\n*Deeper dive:.*$/s
      ];
      for (const pattern of contactPatterns) {
        bodyText = bodyText.replace(pattern, '');
      }
      bodyText = bodyText.trim();

      if (!bodyText.match(/Best,?\s*$/i)) {
        bodyText = bodyText + '\n\nBest,';
      }

      const contactStyle = followUpOutput.emailDraft.contactStyle || 'quick';
      const contactBlock = CONTACT_BLOCKS[contactStyle] || CONTACT_BLOCKS.quick;

      followUpOutput.emailDraft.bodyWithoutContact = bodyText;
      followUpOutput.emailDraft.body = bodyText + '\n' + contactBlock;
      followUpOutput.emailDraft.contactStyle = contactStyle;
    }

    console.log(`✅ Follow-up ${formData.outputType || 'email'} generated successfully`);

    return followUpOutput;

  } catch (error) {
    console.error(`❌ Error generating follow-up:`, error.message);

    // Return fallback based on output type
    const outputType = formData.outputType || 'email';

    if (outputType === 'email') {
      const fallbackBody = `Hi ${formData.prospectName || 'there'},\nI wanted to follow up on my previous message. Have you had a chance to think about it?\n\nBest,`;
      return {
        outputType: 'email',
        emailDraft: {
          subject: `Following up on our conversation`,
          bodyWithoutContact: fallbackBody,
          body: fallbackBody + `\nMobile: (801) 874-5175\nQuick call: https://calendly.com/alex-solvd/new-meeting (15 min)`,
          contactStyle: 'quick'
        }
      };
    } else if (outputType === 'phone') {
      return {
        outputType: 'phone',
        phoneScript: {
          opening: `Hi ${formData.prospectName || 'there'}, this is Alex from SOLVD. I know I'm interrupting - do you have 90 seconds?`,
          mainPoints: [
            'I reached out about helping with your Salesforce challenges',
            'I wanted to see if you had any questions about our approach',
            'I know timing is everything - just wanted to check if now makes sense'
          ],
          closing: 'Does this make sense as something worth exploring?',
          duration: '2-3 minutes'
        }
      };
    } else {
      return {
        outputType: 'linkedin',
        linkedInMessage: {
          message: `Hi ${formData.prospectName || 'there'}, following up on my message about SOLVD. Still interested in discussing Salesforce support?`,
          characterCount: 120
        }
      };
    }
  }
}
