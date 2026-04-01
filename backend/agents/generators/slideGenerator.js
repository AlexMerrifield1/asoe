import '../../config.js';
import Anthropic from '@anthropic-ai/sdk';
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
 * Slide Content Generator Agent
 * Generates customized "Complexity Wall" Slide 3 content
 */
export async function generateSlideContent(validatedFacts, workflowType, formData) {
  console.log(`📊 Generating slide content for workflow: ${workflowType}`);

  try {
    // Load slide prompt template
    const promptPath = path.join(__dirname, '../../prompts/slide.md');
    let promptTemplate = await fs.readFile(promptPath, 'utf-8');

    // Extract context from validated facts and form data
    const companyName = validatedFacts.originalResearch?.companyName || formData.companyName || formData.targetCompany;
    const industry = validatedFacts.originalResearch?.industry || formData.industry || 'Technology';
    const painPoints = validatedFacts.originalResearch?.painPoints || ['Generic pain points'];

    // Build context string
    let context = '';
    if (workflowType === 'netnew') {
      context = `New prospect. Challenge: ${formData.businessChallenge || 'traditional consulting assumptions'}`;
    } else if (workflowType === 'closedlost') {
      context = `Closed Lost re-engagement. Original loss: ${formData.lossReason}. New context: ${formData.newContext}`;
    } else if (workflowType === 'expansion') {
      context = `Client expansion. Current: ${formData.previousProject}. New trigger: ${formData.newTrigger}`;
    }
    if (formData.additionalContext) {
      context += `\n\nAdditional Context (use this to personalize): ${formData.additionalContext}`;
    }

    // Replace template variables
    promptTemplate = promptTemplate
      .replace('{{validatedFacts}}', JSON.stringify(validatedFacts, null, 2))
      .replace('{{workflowType}}', workflowType)
      .replace('{{companyName}}', companyName)
      .replace('{{industry}}', industry)
      .replace('{{painPoints}}', JSON.stringify(painPoints, null, 2))
      .replace('{{context}}', context);

    // Call Claude API
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
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
    let slideContent;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      slideContent = JSON.parse(jsonMatch[0]);
    } else {
      slideContent = JSON.parse(responseText);
    }

    console.log(`✅ Slide content generated: "${slideContent.slideTitle}"`);

    return slideContent;

  } catch (error) {
    console.error(`❌ Error in slide generator:`, error.message);

    // Return fallback slide on error
    const industry = formData.industry || 'Business';
    const year = new Date().getFullYear();

    return {
      slideTitle: `The ${year} ${industry} Complexity Wall`,
      problem: {
        sectionHeader: 'The Problem',
        headline: `Your systems haven't kept pace with your business. You're stuck between expensive consultants and an overwhelmed internal team with no clear path forward.`
      },
      reality: {
        sectionHeader: 'The Reality',
        bullets: [
          'Growing companies often outpace their tech infrastructure, creating a gap between business needs and system capabilities',
          'Data typically becomes fragmented across multiple tools while support remains reactive rather than strategic',
          'The choice often comes down to expensive consultants billing by the hour or overwhelmed internal teams trying to DIY'
        ]
      },
      shift: {
        sectionHeader: 'The 2026 Shift',
        from: 'Reactive Support',
        to: 'Strategic Partnership',
        visualConcept: 'Silos vs. Flow - showing disconnected systems becoming integrated',
        oneLiner: 'From Break-Fix to Build-Forward'
      },
      speakerNotes: 'Reference specific company details when presenting. Pause after each bullet to let it sink in.',
      designNotes: 'Use dark background with white text. Visual should show transformation from chaos to order.',
      error: error.message
    };
  }
}
