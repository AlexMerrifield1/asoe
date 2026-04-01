import '../config.js';
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
 * Research Agent
 * Analyzes company data and identifies insights for sales outreach
 */
export async function analyzeCompanyData(companyProfile, salesforceData, workflowType, formData) {
  console.log(`🔬 Analyzing company data for workflow: ${workflowType}`);

  try {
    // Load research prompt template
    const promptPath = path.join(__dirname, '../prompts/research.md');
    let promptTemplate = await fs.readFile(promptPath, 'utf-8');

    // Check if Salesforce data is mock
    const isMockData = salesforceData?.dataSource === 'mock';
    let salesforceDataString = 'N/A';

    if (salesforceData) {
      if (isMockData) {
        salesforceDataString = `⚠️ MOCK DATA WARNING: The following Salesforce data is SIMULATED for demo purposes. Do NOT reference specific dollar amounts, dates, engagement history details, or opportunity IDs from this data in your analysis. Treat ONLY the user-provided formData as ground truth. Use this mock data only to understand the general structure of the relationship.

${JSON.stringify(salesforceData, null, 2)}`;
      } else {
        salesforceDataString = JSON.stringify(salesforceData, null, 2);
      }
    }

    // Replace template variables
    promptTemplate = promptTemplate
      .replace('{{companyProfile}}', JSON.stringify(companyProfile, null, 2))
      .replace('{{salesforceData}}', salesforceDataString)
      .replace('{{workflowType}}', workflowType)
      .replace('{{formData}}', JSON.stringify(formData, null, 2));

    // Call Claude API
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      temperature: 0.3,
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
    let researchFindings;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      researchFindings = JSON.parse(jsonMatch[0]);
    } else {
      // Fallback: try to parse the entire response
      researchFindings = JSON.parse(responseText);
    }

    console.log(`✅ Research analysis complete for ${researchFindings.companyName || 'company'}`);

    return researchFindings;

  } catch (error) {
    console.error(`❌ Error in research agent:`, error.message);

    // Return minimal findings on error
    return {
      companyName: formData.companyName || formData.targetCompany || 'Unknown',
      industry: formData.industry || 'Unknown',
      keyInsights: ['Analysis failed - using fallback data'],
      painPoints: ['Unable to analyze pain points'],
      solvdAlignment: {
        framework: 'Complexity Wall',
        reasoning: 'Fallback reasoning',
        hook: 'Generic outreach'
      },
      workflowSpecific: {},
      talkingPoints: ['Fallback talking point'],
      confidenceLevel: 'LOW',
      dataGaps: ['AI analysis failed'],
      error: error.message
    };
  }
}
