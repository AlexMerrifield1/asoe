import '../../config.js';
import Anthropic from '@anthropic-ai/sdk';
import { getToneDirective } from '../toneDirectives.js';
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
 * Loom Script Generator Agent
 * Generates 90-second timestamped video scripts with camera/screen-share cues
 */
export async function generateLoomScript(validatedFacts, workflowType, formData) {
  console.log(`🎥 Generating Loom script for workflow: ${workflowType}`);

  try {
    // Load loom prompt template
    const promptPath = path.join(__dirname, '../../prompts/loom.md');
    let promptTemplate = await fs.readFile(promptPath, 'utf-8');

    // Extract context from validated facts and form data
    const companyName = validatedFacts.originalResearch?.companyName || formData.companyName || formData.targetCompany;
    const contactName = formData.champion || formData.contactName || 'there';
    const industry = validatedFacts.originalResearch?.industry || formData.industry || 'your industry';

    // Build specific context based on workflow type
    let specificContext = '';
    if (workflowType === 'netnew') {
      specificContext = `New prospect in ${industry}. Looking to challenge assumption: ${formData.businessChallenge || 'standard consulting model'}`;
    } else if (workflowType === 'closedlost') {
      specificContext = `Re-engaging closed lost deal. Original loss: ${formData.lossReason || 'Price'}. New context: ${formData.newContext || 'company evolution'}`;
    } else if (workflowType === 'expansion') {
      specificContext = `Expanding existing relationship. Current: ${formData.previousProject || 'EaaSe support'}. New opportunity: ${formData.newTrigger || 'additional services'}`;
    }
    if (formData.additionalContext) {
      specificContext += `\n\nAdditional Context (use this to personalize): ${formData.additionalContext}`;
    }

    // Replace template variables
    promptTemplate = promptTemplate
      .replace('{{toneDirective}}', getToneDirective(formData.tone))
      .replace('{{validatedFacts}}', JSON.stringify(validatedFacts, null, 2))
      .replace('{{workflowType}}', workflowType)
      .replace('{{companyName}}', companyName)
      .replace('{{contactName}}', contactName)
      .replace('{{industry}}', industry)
      .replace('{{specificContext}}', specificContext);

    // Call Claude API
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      temperature: 0.8,
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
    let loomScript;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      loomScript = JSON.parse(jsonMatch[0]);
    } else {
      loomScript = JSON.parse(responseText);
    }

    console.log(`✅ Loom script generated: "${loomScript.title}"`);

    return loomScript;

  } catch (error) {
    console.error(`❌ Error in loom generator:`, error.message);

    // Return fallback script on error
    const companyName = formData.companyName || formData.targetCompany || 'your company';
    const contactName = formData.champion || formData.contactName || 'there';

    return {
      title: `${companyName}: EaaSe Overview`,
      totalDuration: '90 seconds',
      script: {
        phase1: {
          timestamp: '0:00 - 0:25',
          visual: 'Camera ON, Face only',
          content: `Hi ${contactName}. I wanted to reach out about ${companyName}. We've been helping companies solve similar Salesforce challenges through our Expertise-as-a-Service model.`
        },
        phase2: {
          timestamp: '0:25 - 0:50',
          visual: 'Screen Share: Slide 3 - The Complexity Wall',
          content: `Most companies hit what we call the Complexity Wall about 18 months after implementation. The system works, but it's not evolving with your business needs.`
        },
        phase3: {
          timestamp: '0:50 - 1:15',
          visual: 'Screen Share: Slide 6 - Expertise-as-a-Service',
          content: `That's why we created EaaSe. It's a subscription model that gives you strategic architecture and hands-on execution for one flat monthly fee.`
        },
        phase4: {
          timestamp: '1:15 - 1:30',
          visual: 'Camera ON, Face only',
          content: `Would it be worth a conversation to see if this model works for your situation? Reply to the email if you're open to it.`
        }
      },
      keyMessages: [
        'Acknowledge their current situation',
        'Explain the EaaSe model',
        'Low-pressure ask'
      ],
      slideCustomization: 'Customize Slide 3 to their specific industry pain points',
      error: error.message
    };
  }
}
