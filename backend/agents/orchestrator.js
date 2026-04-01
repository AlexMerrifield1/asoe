import { scrapeWebsite } from './webScraper.js';
import { enrichWithSalesforceData } from './salesforceEnricher.js';
import { analyzeCompanyData } from './researcher.js';
import { validateFacts } from './factChecker.js';
import { generateEmail } from './generators/emailGenerator.js';
import { generateLoomScript } from './generators/loomGenerator.js';
import { generateSlideContent } from './generators/slideGenerator.js';
import { generateFollowUp } from './generators/followupGenerator.js';
import { generateEngagement } from './generators/engagementGenerator.js';

/**
 * Calculate data-driven confidence adjustment based on intelligence brief completeness
 * Returns a modifier: -2, -1, 0, +1, or +2 to adjust AI confidence
 */
function calculateDataQualityModifier(intelligenceBrief, salesforceData) {
  let score = 0;
  let maxScore = 0;

  // Intelligence Brief scoring (max 8 points)
  if (intelligenceBrief) {
    // Company summary (3 points)
    maxScore += 3;
    if (intelligenceBrief.companySummary) {
      score += 3;
    }

    // Business model (2 points)
    maxScore += 2;
    if (intelligenceBrief.businessModel) {
      score += 2;
    }

    // Services/Products (3 points)
    maxScore += 3;
    if (intelligenceBrief.servicesProducts && intelligenceBrief.servicesProducts.length > 0) {
      score += intelligenceBrief.servicesProducts.length >= 2 ? 3 : 1;
    }
  }

  // Salesforce data (2 points)
  maxScore += 2;
  if (salesforceData) {
    score += 2;
  }

  // Calculate percentage and convert to modifier
  const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;

  if (percentage >= 80) return 2;      // Excellent data: upgrade by 2 levels
  if (percentage >= 60) return 1;      // Good data: upgrade by 1 level
  if (percentage >= 40) return 0;      // Okay data: no change
  if (percentage >= 20) return -1;     // Poor data: downgrade by 1 level
  return -2;                           // Very poor data: downgrade by 2 levels
}

/**
 * Adjust confidence level based on data quality
 */
function adjustConfidenceLevel(aiConfidence, modifier) {
  const levels = ['VERY_LOW', 'LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'];
  let currentIndex = levels.indexOf(aiConfidence.toUpperCase());

  // If AI confidence not recognized, default to MEDIUM
  if (currentIndex === -1) currentIndex = 2;

  // Apply modifier
  let newIndex = currentIndex + modifier;

  // Clamp to valid range
  newIndex = Math.max(0, Math.min(levels.length - 1, newIndex));

  return levels[newIndex];
}

/**
 * Main Orchestrator
 * Coordinates the entire AI agent pipeline
 */
export async function generateOutreachAssets(formData, workflowType) {
  const startTime = Date.now();
  console.log(`\n🚀 Starting outreach asset generation pipeline`);
  console.log(`⚙️  Workflow: ${workflowType}`);

  try {
    // Special handling for follow-up sequence workflow
    if (workflowType === 'followup') {
      console.log(`\n📞 Follow-up Sequence Workflow`);

      // Optionally scrape website if provided for context enrichment
      let companyContext = null;
      if (formData.followUpWebsite) {
        console.log(`   🕷️  Scraping website for context: ${formData.followUpWebsite}`);
        try {
          const companyProfile = await scrapeWebsite(formData.followUpWebsite);
          if (!companyProfile.error) {
            companyContext = {
              companyName: (companyProfile.title || '')
                .replace(/\s*[|—–-]\s*.*/g, '')
                .replace(/\s*(Home|Homepage|Welcome|Official Site)$/i, '')
                .trim() || 'Unknown Company',
              industry: companyProfile.intelligenceBrief?.industry || null,
              companySummary: companyProfile.intelligenceBrief?.companySummary || null,
              businessModel: companyProfile.intelligenceBrief?.businessModel || null,
              servicesProducts: companyProfile.intelligenceBrief?.servicesProducts || []
            };
            console.log(`   ✅ Company context enriched: ${companyContext.companyName}`);
          } else {
            console.log(`   ⚠️  Website scraping failed, proceeding without context`);
          }
        } catch (err) {
          console.log(`   ⚠️  Website scraping error: ${err.message}`);
        }
      }

      const followUpOutput = await generateFollowUp(formData, companyContext);

      const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`\n✅ Follow-up generated in ${elapsedTime}s\n`);

      return {
        success: true,
        generatedAt: new Date().toISOString(),
        processingTime: `${elapsedTime}s`,
        workflowType,
        companyName: formData.prospectName || 'Prospect',
        followUpOutput
      };
    }

    // Special handling for client engagement workflow
    if (workflowType === 'engagement') {
      const engagementLabel = formData.engagementType === 'eb' ? 'Executive Brief' : 'Fulfillment & Follow-up';
      console.log(`\n🤝 Client Engagement Workflow (${engagementLabel}) - Skipping standard pipeline`);

      const engagementOutput = await generateEngagement(formData);

      const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`\n✅ Engagement content generated in ${elapsedTime}s\n`);

      return {
        success: true,
        generatedAt: new Date().toISOString(),
        processingTime: `${elapsedTime}s`,
        workflowType,
        companyName: formData.clientName || 'Client',
        engagementOutput
      };
    }

    // Step 1: Scrape company website (if provided)
    let companyProfile = null;
    if (formData.website || formData.companyWebsite) {
      const websiteUrl = formData.website || formData.companyWebsite;
      console.log(`\n[1/6] 🕷️  Web Scraper Agent`);
      companyProfile = await scrapeWebsite(websiteUrl);
    } else {
      console.log(`\n[1/6] ⏭️  Skipping web scraper (no website provided)`);
      companyProfile = {
        url: null,
        title: '',
        description: '',
        mainHeadings: [],
        keywords: [],
        techStack: [],
        bodyText: '',
        industryKeywords: [],
        scrapedAt: new Date().toISOString()
      };
    }

    // Step 2: Enrich with Salesforce data (if applicable)
    console.log(`\n[2/6] 🔍 Salesforce Enrichment Agent`);
    const companyName = formData.companyName || formData.targetCompany || 'Unknown Company';
    let salesforceData = null;

    if (workflowType === 'closedlost' || workflowType === 'expansion') {
      salesforceData = await enrichWithSalesforceData(companyName, workflowType, formData);
    } else {
      console.log(`ℹ️  Skipping Salesforce enrichment for workflow: ${workflowType}`);
    }

    // Step 3: Research & Analysis
    console.log(`\n[3/6] 🔬 Research Agent`);
    const researchFindings = await analyzeCompanyData(
      companyProfile,
      salesforceData,
      workflowType,
      formData
    );

    // Step 4: Fact-Check & Validation
    console.log(`\n[4/6] ✓ Fact-Check Agent`);
    const validatedFacts = await validateFacts(
      researchFindings,
      companyProfile,
      salesforceData,
      formData
    );

    // Step 5: Generate Content (in parallel)
    const includeLoom = formData.includeLoom !== false; // default true
    console.log(`\n[5/6] 📝 Content Generation (Parallel)`);
    console.log(`  - Email Generator`);
    if (includeLoom) {
      console.log(`  - Loom Script Generator`);
      console.log(`  - Slide Content Generator`);
    } else {
      console.log(`  - Loom & Slide skipped (includeLoom=false)`);
    }

    const [email, loomScript, slideContent] = await Promise.all([
      generateEmail(validatedFacts, workflowType, formData),
      includeLoom ? generateLoomScript(validatedFacts, workflowType, formData) : Promise.resolve(null),
      includeLoom ? generateSlideContent(validatedFacts, workflowType, formData) : Promise.resolve(null)
    ]);

    // Step 6: Package Results
    console.log(`\n[6/6] 📦 Packaging Results`);

    // Calculate data quality modifier and adjust confidence
    const dataQualityModifier = calculateDataQualityModifier(
      companyProfile.intelligenceBrief,
      salesforceData
    );
    const adjustedConfidence = adjustConfidenceLevel(
      validatedFacts.overallConfidence,
      dataQualityModifier
    );

    console.log(`📊 Data Quality Modifier: ${dataQualityModifier > 0 ? '+' : ''}${dataQualityModifier}`);
    console.log(`📊 AI Confidence: ${validatedFacts.overallConfidence} → Adjusted: ${adjustedConfidence}`);

    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✅ Pipeline complete in ${elapsedTime}s\n`);

    return {
      success: true,
      generatedAt: new Date().toISOString(),
      processingTime: `${elapsedTime}s`,
      workflowType,
      companyName,

      // Generated Assets
      email: {
        subject: email.subject,
        subjectAlt: email.subjectAlt,
        body: email.body,
        loomTitle: email.loomTitle,
        tone: email.tone
      },

      loomScript: loomScript ? {
        title: loomScript.title,
        totalDuration: loomScript.totalDuration,
        script: loomScript.script,
        keyMessages: loomScript.keyMessages
      } : null,

      slideContent: slideContent ? {
        slideTitle: slideContent.slideTitle,
        problem: slideContent.problem,
        reality: slideContent.reality,
        shift: slideContent.shift,
        speakerNotes: slideContent.speakerNotes
      } : null,

      // Company Intelligence Brief (from web scraper)
      intelligenceBrief: companyProfile.intelligenceBrief || null,

      // Metadata (for transparency)
      metadata: {
        confidenceLevel: adjustedConfidence,
        aiConfidence: validatedFacts.overallConfidence,
        dataQualityModifier,
        dataQuality: {
          websiteScraped: !!companyProfile.url,
          salesforceData: !!salesforceData,
          researchInsights: researchFindings.keyInsights?.length || 0
        },
        recommendations: validatedFacts.recommendations || [],
        veryHighConfidenceClaims: validatedFacts.safeToUse?.veryHighConfidence?.length || 0,
        highConfidenceClaims: validatedFacts.safeToUse?.highConfidence?.length || 0,
        mediumConfidenceClaims: validatedFacts.safeToUse?.mediumConfidence?.length || 0,
        lowConfidenceClaims: validatedFacts.safeToUse?.lowConfidence?.length || 0,
        veryLowConfidenceClaims: validatedFacts.safeToUse?.veryLowConfidence?.length || 0
      }
    };

  } catch (error) {
    console.error(`\n❌ Pipeline Error:`, error);

    // Return error response
    return {
      success: false,
      error: error.message,
      generatedAt: new Date().toISOString(),
      workflowType,
      companyName: formData.companyName || formData.targetCompany || 'Unknown',
      email: {
        subject: 'Error generating content',
        body: 'An error occurred during content generation. Please try again.',
        tone: 'Error'
      },
      loomScript: {
        title: 'Error',
        script: { phase1: { content: 'Error generating script' } }
      },
      slideContent: {
        slideTitle: 'Error',
        reality: { bullets: ['Error generating slide content'] }
      }
    };
  }
}
