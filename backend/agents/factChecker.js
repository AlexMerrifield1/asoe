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
 * Fact-Check Agent
 * Validates research findings and assigns confidence scores
 */
/**
 * Industry Insights Fact-Check Agent
 * Validates industry insights for accuracy before use in Fulfillment & Follow-up
 * Returns insights with confidence scores and flags for questionable claims
 */
export async function validateIndustryInsights(insights, industry) {
  console.log(`✓ Fact-checking ${insights.length} industry insights for ${industry || 'general'}`);

  if (!insights || insights.length === 0) {
    console.log(`⏭️  No insights to validate`);
    return [];
  }

  try {
    const validationPrompt = `You are a fact-checking agent for industry research insights. Your job is to validate claims and statistics in the following insights for accuracy and plausibility.

## Industry Context
Industry: ${industry || 'General Business'}

## Insights to Validate
${JSON.stringify(insights, null, 2)}

## Validation Criteria
For each insight, evaluate:
1. **Statistical Claims**: Are percentages, dollar amounts, and growth figures plausible and consistent with known industry data?
2. **Trend Accuracy**: Are the described trends consistent with current market conditions?
3. **Source Credibility**: Is the source reputable for this type of information?
4. **Recency**: Are the claims likely still relevant (not outdated)?
5. **Specificity**: Are claims specific enough to be verifiable, or vague enough to be questionable?

## Confidence Levels
- **HIGH**: Claim aligns with well-known industry facts, source is authoritative, statistics are plausible
- **MEDIUM**: Claim is reasonable but unverifiable, or source quality is uncertain
- **LOW**: Claim seems exaggerated, outdated, or from questionable source
- **FLAGGED**: Claim contains red flags (unrealistic statistics, contradicts known facts)

## Output Format
Return a JSON object:
{
  "validatedInsights": [
    {
      "originalInsight": { /* original insight object */ },
      "confidence": "HIGH|MEDIUM|LOW|FLAGGED",
      "validationNotes": "Brief explanation of confidence assessment",
      "adjustedBullets": ["Revised bullet 1 if needed", "Revised bullet 2"],
      "flaggedClaims": ["Any specific claims that should be removed or verified"],
      "recommendedAction": "USE_AS_IS|REVISE|MANUAL_REVIEW|DISCARD"
    }
  ],
  "overallAssessment": {
    "totalInsights": 4,
    "highConfidence": 2,
    "mediumConfidence": 1,
    "lowConfidence": 1,
    "flagged": 0
  },
  "recommendations": ["Any overall recommendations for the user"]
}

Validate the insights now and return ONLY the JSON object.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      temperature: 0.2, // Very low temperature for fact-checking accuracy
      messages: [
        {
          role: 'user',
          content: validationPrompt
        }
      ]
    });

    const responseText = message.content[0].text;
    let validationResult;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      validationResult = JSON.parse(jsonMatch[0]);
    } else {
      validationResult = JSON.parse(responseText);
    }

    console.log(`✅ Industry insight validation complete:`);
    console.log(`   - High confidence: ${validationResult.overallAssessment?.highConfidence || 0}`);
    console.log(`   - Medium confidence: ${validationResult.overallAssessment?.mediumConfidence || 0}`);
    console.log(`   - Low confidence: ${validationResult.overallAssessment?.lowConfidence || 0}`);
    console.log(`   - Flagged: ${validationResult.overallAssessment?.flagged || 0}`);

    // Return validated insights with confidence metadata
    return validationResult.validatedInsights.map(vi => ({
      ...vi.originalInsight,
      factCheckConfidence: vi.confidence,
      factCheckNotes: vi.validationNotes,
      adjustedBullets: vi.adjustedBullets,
      flaggedClaims: vi.flaggedClaims,
      recommendedAction: vi.recommendedAction
    }));

  } catch (error) {
    console.error(`❌ Error in industry insight fact-check:`, error.message);

    // Return original insights with warning flag on error
    return insights.map(insight => ({
      ...insight,
      factCheckConfidence: 'UNVERIFIED',
      factCheckNotes: 'Fact-checking unavailable - manual review recommended',
      recommendedAction: 'MANUAL_REVIEW'
    }));
  }
}

export async function validateFacts(researchFindings, companyProfile, salesforceData, formData) {
  console.log(`✓ Fact-checking research findings`);

  try {
    // Load fact-check prompt template
    const promptPath = path.join(__dirname, '../prompts/fact-check.md');
    let promptTemplate = await fs.readFile(promptPath, 'utf-8');

    // Check if Salesforce data is mock
    const isMockData = salesforceData?.dataSource === 'mock';
    let salesforceDataString = 'N/A';

    if (salesforceData) {
      if (isMockData) {
        salesforceDataString = `⚠️ MOCK DATA WARNING: The following Salesforce data is SIMULATED. Any claims referencing specific dollar amounts, dates, engagement history, or opportunity details from this data should be rated LOW or VERY_LOW confidence. Only user-provided formData should be considered ground truth.

${JSON.stringify(salesforceData, null, 2)}`;
      } else {
        salesforceDataString = JSON.stringify(salesforceData, null, 2);
      }
    }

    // Replace template variables
    promptTemplate = promptTemplate
      .replace('{{researchFindings}}', JSON.stringify(researchFindings, null, 2))
      .replace('{{companyProfile}}', JSON.stringify(companyProfile, null, 2))
      .replace('{{salesforceData}}', salesforceDataString)
      .replace('{{formData}}', JSON.stringify(formData, null, 2));

    // Call Claude API
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      temperature: 0.3, // Lower temperature for fact-checking
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
    let validatedFacts;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      validatedFacts = JSON.parse(jsonMatch[0]);
    } else {
      validatedFacts = JSON.parse(responseText);
    }

    // Add original research findings to validated facts
    validatedFacts.originalResearch = researchFindings;

    console.log(`✅ Fact-checking complete. Confidence: ${validatedFacts.overallConfidence}`);

    return validatedFacts;

  } catch (error) {
    console.error(`❌ Error in fact-check agent:`, error.message);

    // Return pass-through on error (mark everything as medium confidence)
    return {
      validatedClaims: [
        {
          original: 'Analysis completed with limited validation',
          validated: 'Analysis completed with limited validation',
          confidence: 'MEDIUM',
          source: 'Fallback due to fact-check error',
          flagged: true,
          flagReason: 'Fact-checking agent encountered an error'
        }
      ],
      overallConfidence: 'MEDIUM',
      recommendations: ['Manual review recommended due to fact-check error'],
      safeToUse: {
        veryHighConfidence: [],
        highConfidence: [],
        mediumConfidence: researchFindings.talkingPoints || [],
        lowConfidence: [],
        veryLowConfidence: []
      },
      originalResearch: researchFindings,
      error: error.message
    };
  }
}
