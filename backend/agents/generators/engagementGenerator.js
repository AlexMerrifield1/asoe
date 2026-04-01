import '../../config.js';
import Anthropic from '@anthropic-ai/sdk';
import { getToneDirective } from '../toneDirectives.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { researchIndustryInsights, verifyInsightUrls } from '../industryResearcher.js';
import { validateIndustryInsights } from '../factChecker.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Flag to enable/disable live research (set to true to fetch real articles)
const ENABLE_LIVE_RESEARCH = true;

/**
 * Common typo corrections map
 */
const TYPO_CORRECTIONS = {
  'cirtical': 'critical',
  'critcal': 'critical',
  'critica': 'critical',
  'determin': 'determine',
  'determie': 'determine',
  'deterine': 'determine',
  'teh': 'the',
  'hte': 'the',
  'adn': 'and',
  'nad': 'and',
  'taht': 'that',
  'wiht': 'with',
  'wtih': 'with',
  'thier': 'their',
  'recieve': 'receive',
  'recieved': 'received',
  'occured': 'occurred',
  'occurence': 'occurrence',
  'seperate': 'separate',
  'definately': 'definitely',
  'accomodate': 'accommodate',
  'occassion': 'occasion',
  'untill': 'until',
  'begining': 'beginning',
  'beleive': 'believe',
  'existance': 'existence',
  'occuring': 'occurring',
  'refering': 'referring',
  'sucessful': 'successful',
  'succesful': 'successful',
  'neccessary': 'necessary',
  'necesary': 'necessary',
  'realy': 'really',
  'basicly': 'basically',
  'definetly': 'definitely',
  'probaly': 'probably',
  'reasearch': 'research',
  'anaylsis': 'analysis',
  'implmentation': 'implementation',
  'implemenation': 'implementation',
  'developement': 'development',
  'enviroment': 'environment',
  'managment': 'management',
  'maintainence': 'maintenance',
  'acheive': 'achieve',
  'acheivement': 'achievement',
  'reccommend': 'recommend',
  'recomend': 'recommend',
  'accross': 'across',
  'adress': 'address',
  'aproximate': 'approximate',
  'calender': 'calendar',
  'collegue': 'colleague',
  'comittee': 'committee',
  'concensus': 'consensus',
  'consistant': 'consistent',
  'explaination': 'explanation',
  'goverment': 'government',
  'independant': 'independent',
  'liason': 'liaison',
  'millenium': 'millennium',
  'noticable': 'noticeable',
  'parliment': 'parliament',
  'perseverance': 'perseverance',
  'priviledge': 'privilege',
  'publically': 'publicly',
  'relevent': 'relevant',
  'religous': 'religious',
  'responsability': 'responsibility',
  'rythm': 'rhythm',
  'sieze': 'seize',
  'supercede': 'supersede',
  'threshhold': 'threshold',
  'tommorow': 'tomorrow',
  'truely': 'truly',
  'twelth': 'twelfth',
  'tyrany': 'tyranny',
  'vaccuum': 'vacuum',
  'wierd': 'weird'
};

/**
 * Clean up text by fixing common typos and formatting issues
 */
function cleanupText(text) {
  if (!text) return text;

  let cleaned = text;

  // Fix typos (case-insensitive)
  for (const [typo, correction] of Object.entries(TYPO_CORRECTIONS)) {
    const regex = new RegExp(`\\b${typo}\\b`, 'gi');
    cleaned = cleaned.replace(regex, (match) => {
      // Preserve original capitalization
      if (match[0] === match[0].toUpperCase()) {
        return correction.charAt(0).toUpperCase() + correction.slice(1);
      }
      return correction;
    });
  }

  // Fix multiple spaces
  cleaned = cleaned.replace(/\s+/g, ' ');

  // Fix missing space after periods
  cleaned = cleaned.replace(/\.([A-Z])/g, '. $1');

  return cleaned.trim();
}

/**
 * Extract key topics/products from text for personalization
 * Returns notable items that can be referenced in emails
 */
function extractKeyContext(recentWins, upcomingConcerns) {
  const context = {
    products: [],
    achievements: [],
    metrics: [],
    topics: []
  };

  const combinedText = `${recentWins || ''} ${upcomingConcerns || ''}`.toLowerCase();

  // Look for product/feature names (capitalized words, tech terms)
  const productPatterns = [
    /\b(v0|v1|v2|v3)\b/gi,
    /\b[A-Z][a-z]+(?:force|cloud|hub|flow|agent|bot)\b/g,
    /\b(?:salesforce|slack|vercel|nextjs|react|aws|azure|gcp)\b/gi
  ];

  for (const pattern of productPatterns) {
    const matches = `${recentWins || ''} ${upcomingConcerns || ''}`.match(pattern);
    if (matches) {
      context.products.push(...matches.map(m => m.trim()));
    }
  }

  // Look for metrics/numbers
  const metricMatches = combinedText.match(/\d+[k+%]?\+?\s*(?:accounts?|users?|hours?|percent|%)/gi);
  if (metricMatches) {
    context.metrics.push(...metricMatches);
  }

  // Look for achievement keywords
  const achievementKeywords = ['launched', 'completed', 'deployed', 'implemented', 'reduced', 'improved', 'automated', 'streamlined', 'cleanup', 'deduplication', 'documentation'];
  for (const keyword of achievementKeywords) {
    if (combinedText.includes(keyword)) {
      context.achievements.push(keyword);
    }
  }

  // Remove duplicates
  context.products = [...new Set(context.products)];
  context.metrics = [...new Set(context.metrics)];
  context.achievements = [...new Set(context.achievements)];

  return context;
}

/**
 * Fetch industry insights formatted for slide deck insertion
 * Returns 3-4 insights with headlines, bullet points, source URLs, and insight types
 *
 * When ENABLE_LIVE_RESEARCH is true, attempts to fetch real articles with verified URLs.
 * Falls back to template insights if live research fails or returns insufficient results.
 */
async function fetchIndustryInsights(industry, websiteUrl) {
  console.log(`  📰 Fetching industry insights for: ${industry || 'general'}`);

  // Try live research first if enabled
  if (ENABLE_LIVE_RESEARCH) {
    try {
      console.log(`  🔬 Live research enabled - searching for real articles...`);
      const liveInsights = await researchIndustryInsights(industry, websiteUrl);

      if (liveInsights && liveInsights.length > 0) {
        // Verify all URLs one more time
        console.log(`  🔍 Verifying ${liveInsights.length} insight URLs...`);
        const verifiedInsights = await verifyInsightUrls(liveInsights);

        // Filter to only include verified insights
        const validInsights = verifiedInsights.filter(i => i.verified);

        if (validInsights.length >= 2) {
          console.log(`  ✅ Found ${validInsights.length} verified insights from live research`);

          // Fact-check the insights for accuracy
          console.log(`  🔬 Fact-checking insights for accuracy...`);
          const factCheckedInsights = await validateIndustryInsights(validInsights, industry);

          // Filter out any insights flagged for discard
          const usableInsights = factCheckedInsights.filter(i =>
            i.recommendedAction !== 'DISCARD' && i.factCheckConfidence !== 'FLAGGED'
          );

          if (usableInsights.length >= 2) {
            console.log(`  ✅ ${usableInsights.length} insights passed fact-checking`);
            return usableInsights;
          } else {
            console.log(`  ⚠️  Only ${usableInsights.length} insights passed fact-checking, adding resource links...`);
            return [...usableInsights, getNoInsightsPlaceholder(industry)];
          }
        } else {
          console.log(`  ⚠️  Only ${validInsights.length} verified insights found, returning "No insights found" with resource links...`);
          // Return any valid insights found plus the "no insights" placeholder with resource links
          return [...validInsights, getNoInsightsPlaceholder(industry)];
        }
      } else {
        console.log(`  ⚠️  No live insights found, returning "No insights found" with resource links...`);
      }
    } catch (error) {
      console.log(`  ⚠️  Live research failed: ${error.message}, returning "No insights found" with resource links...`);
    }
  }

  // Return "No insights found" with resource links instead of template insights
  return [getNoInsightsPlaceholder(industry)];
}

/**
 * Returns a "No insights found" placeholder with links to common research resources
 */
function getNoInsightsPlaceholder(industry) {
  const resourceLinks = [
    { name: 'Salesforce Agentforce', url: 'https://www.salesforce.com/agentforce/' },
    { name: 'Salesforce AI', url: 'https://www.salesforce.com/artificial-intelligence/' },
    { name: 'Reuters Business News', url: 'https://www.reuters.com/business/' },
    { name: 'McKinsey Insights', url: 'https://www.mckinsey.com/featured-insights' },
    { name: 'Gartner Newsroom', url: 'https://www.gartner.com/en/newsroom' },
    { name: 'Forrester Blog', url: 'https://www.forrester.com/blogs/' },
    { name: 'Harvard Business Review', url: 'https://hbr.org/' }
  ];

  return {
    headline: 'No insights found',
    bullets: [
      'Live research did not return verified industry insights for this request.',
      'Please visit the resource links below to manually research relevant insights.',
      `Industry searched: ${industry || 'General'}`
    ],
    sourceUrl: null,
    sourceName: 'Manual Research Required',
    insightType: 'no_insights',
    verified: false,
    verificationNote: 'No verified insights available - manual research recommended',
    resourceLinks
  };
}

/**
 * Get template-based industry insights (fallback when live research unavailable)
 */
async function getTemplateInsights(industry) {
  console.log(`  📋 Using template insights for: ${industry || 'general'}`);

  // In production, this would scrape actual news sources and the company website
  // For now, return contextual fallback insights based on industry
  // Format: headline, bullets (for slides), sourceUrl, sourceName, insightType
  //
  // IMPORTANT: These URLs are representative category pages. For production use,
  // replace with specific article URLs from actual research.

  const templateInsights = {
    'SaaS/High Tech': [
      {
        headline: 'AI Adoption Accelerates in Enterprise SaaS',
        bullets: [
          '67% of enterprise software companies planning AI feature releases in 2026',
          'Average 23% productivity gain reported from AI-assisted development',
          'Customer expectation: AI-native experiences becoming table stakes'
        ],
        sourceUrl: 'https://www.gartner.com/en/newsroom/press-releases/2024-10-ai-software-spending',
        sourceName: 'Gartner Newsroom',
        insightType: 'industry_specific',
        verificationNote: 'Search: "Gartner AI software enterprise adoption 2026"'
      },
      {
        headline: 'Salesforce Agentforce Reshaping Enterprise Automation',
        bullets: [
          'Autonomous AI agents handling routine service inquiries',
          'Integration with existing flows enabling rapid deployment',
          'Early adopters reporting faster case resolution times'
        ],
        sourceUrl: 'https://www.salesforce.com/news/stories/agentforce-announcement/',
        sourceName: 'Salesforce News',
        insightType: 'salesforce',
        verificationNote: 'Search: "Salesforce Agentforce announcement 2024"'
      },
      {
        headline: 'Integration Complexity Driving Managed Services Demand',
        bullets: [
          'Average enterprise using 900+ applications (up from 600 in 2022)',
          'Integration costs representing significant portion of technology spend',
          'Staff augmentation models evolving to expertise-as-a-service'
        ],
        sourceUrl: 'https://www.mckinsey.com/capabilities/mckinsey-digital/our-insights/tech-forward',
        sourceName: 'McKinsey Tech Forward',
        insightType: 'general',
        verificationNote: 'Search: "McKinsey enterprise application sprawl integration"'
      },
      {
        headline: 'AI Governance Becoming Board-Level Priority',
        bullets: [
          'Fortune 500 establishing formal AI governance frameworks',
          'Regulatory pressure increasing across EMEA and US markets',
          'Risk management now precedes deployment in best-practice organizations'
        ],
        sourceUrl: 'https://www.forrester.com/blogs/category/artificial-intelligence/',
        sourceName: 'Forrester AI Blog',
        insightType: 'ai_automation',
        verificationNote: 'Search: "Forrester AI governance enterprise 2024"'
      }
    ],
    'Financial Services': [
      {
        headline: 'Regulatory AI Guidelines Tightening in Financial Services',
        bullets: [
          'SEC and OCC issuing new guidance on AI model risk management',
          'Explainability requirements for customer-facing AI decisions',
          'Audit trails and documentation now mandatory for AI systems'
        ],
        sourceUrl: 'https://www.occ.treas.gov/news-issuances/news-releases/2024/nr-occ-2024-ai.html',
        sourceName: 'OCC News',
        insightType: 'industry_specific',
        verificationNote: 'Search: "OCC AI guidance financial services 2024"'
      },
      {
        headline: 'Financial Services Cloud Adoption Accelerating',
        bullets: [
          'Salesforce FSC deployments up significantly year-over-year',
          'Wealth management firms prioritizing unified client views',
          'Compliant data sharing enabling enhanced client experiences'
        ],
        sourceUrl: 'https://www.salesforce.com/news/stories/financial-services-cloud-updates/',
        sourceName: 'Salesforce News',
        insightType: 'salesforce',
        verificationNote: 'Search: "Salesforce Financial Services Cloud adoption"'
      },
      {
        headline: 'Wealth Management Firms Investing in Client Experience Tech',
        bullets: [
          'High-net-worth clients expecting digital-first but high-touch service',
          'Strong ROI on CRM personalization investments',
          'Proactive outreach automation reducing client churn'
        ],
        sourceUrl: 'https://www.mckinsey.com/industries/financial-services/our-insights/wealth-management',
        sourceName: 'McKinsey Wealth Management',
        insightType: 'general',
        verificationNote: 'Search: "McKinsey wealth management digital experience"'
      },
      {
        headline: 'Process Automation Maturity in Banking',
        bullets: [
          'Leading banks automating significant back-office processes',
          'AI-assisted underwriting reducing decision time substantially',
          'Intelligent document processing now mainstream'
        ],
        sourceUrl: 'https://www.accenture.com/us-en/insights/banking/automation-banking',
        sourceName: 'Accenture Banking Insights',
        insightType: 'ai_automation',
        verificationNote: 'Search: "Accenture banking automation AI 2024"'
      }
    ],
    'Consumer Goods': [
      {
        headline: 'Supply Chain Visibility Driving CRM Integration',
        bullets: [
          'Real-time inventory data now flowing to customer service teams',
          'Proactive communication reducing "where is my order" calls',
          'End-to-end visibility becoming competitive differentiator'
        ],
        sourceUrl: 'https://www.gartner.com/en/supply-chain/insights/supply-chain-technology',
        sourceName: 'Gartner Supply Chain',
        insightType: 'industry_specific',
        verificationNote: 'Search: "Gartner supply chain visibility CRM integration"'
      },
      {
        headline: 'Consumer Goods Cloud Enabling Omnichannel Excellence',
        bullets: [
          'Unified B2B and D2C experiences on single platform',
          'Trade promotion management moving to intelligent automation',
          'Retailer collaboration portals reducing friction'
        ],
        sourceUrl: 'https://www.salesforce.com/news/stories/consumer-goods-cloud/',
        sourceName: 'Salesforce News',
        insightType: 'salesforce',
        verificationNote: 'Search: "Salesforce Consumer Goods Cloud features"'
      },
      {
        headline: 'D2C Brands Scaling with Automation',
        bullets: [
          'Customer acquisition costs rising - retention now critical',
          'Lifecycle automation delivering higher lifetime value',
          'Personalization at scale without proportional headcount'
        ],
        sourceUrl: 'https://www.mckinsey.com/industries/consumer-packaged-goods/our-insights/direct-to-consumer',
        sourceName: 'McKinsey CPG Insights',
        insightType: 'general',
        verificationNote: 'Search: "McKinsey D2C automation personalization"'
      },
      {
        headline: 'AI-Powered Demand Forecasting Revolution',
        bullets: [
          'ML models reducing forecast error significantly',
          'Dynamic pricing optimization becoming standard',
          'Inventory optimization AI reducing overstock'
        ],
        sourceUrl: 'https://www.forrester.com/blogs/category/retail/',
        sourceName: 'Forrester Retail Blog',
        insightType: 'ai_automation',
        verificationNote: 'Search: "Forrester AI demand forecasting retail"'
      }
    ],
    'Professional Services': [
      {
        headline: 'Professional Services Firms Automating Client Delivery',
        bullets: [
          'Client intake automation reducing onboarding time',
          'Matter management and billing integration driving efficiency',
          'Resource planning AI optimizing utilization rates'
        ],
        sourceUrl: 'https://www.thomsonreuters.com/en/insights/technology-innovation.html',
        sourceName: 'Thomson Reuters Insights',
        insightType: 'industry_specific',
        verificationNote: 'Search: "Thomson Reuters legal tech automation 2024"'
      },
      {
        headline: 'Salesforce Professional Services Automation Growing',
        bullets: [
          'PSA implementations up among consulting firms',
          'Project profitability visibility in real-time dashboards',
          'Skills-based resource matching reducing bench time'
        ],
        sourceUrl: 'https://www.salesforce.com/news/stories/professional-services-automation/',
        sourceName: 'Salesforce News',
        insightType: 'salesforce',
        verificationNote: 'Search: "Salesforce PSA professional services"'
      },
      {
        headline: 'AI-Assisted Research Transforming Knowledge Work',
        bullets: [
          'Document review time reduced significantly with AI assistance',
          'First-draft generation changing how knowledge workers operate',
          'Quality assurance AI catching errors before client delivery'
        ],
        sourceUrl: 'https://www.mckinsey.com/capabilities/mckinsey-digital/our-insights/generative-ai-in-business',
        sourceName: 'McKinsey GenAI Insights',
        insightType: 'ai_automation',
        verificationNote: 'Search: "McKinsey generative AI knowledge work"'
      },
      {
        headline: 'Expertise-as-a-Service Models Gaining Traction',
        bullets: [
          'Firms moving from staff augmentation to outcome-based partnerships',
          'Flexible capacity models reducing fixed overhead',
          'Specialized expertise on-demand vs. full-time hires'
        ],
        sourceUrl: 'https://www.accenture.com/us-en/insights/consulting/talent-strategy',
        sourceName: 'Accenture Consulting Insights',
        insightType: 'general',
        verificationNote: 'Search: "Accenture consulting as a service model"'
      }
    ],
    'Manufacturing': [
      {
        headline: 'Manufacturing CRM Integration with ERP Accelerating',
        bullets: [
          'Breaking silos between sales, production, and service',
          'Quote-to-cash automation reducing cycle time',
          'Dealer/distributor portals enhancing channel relationships'
        ],
        sourceUrl: 'https://www.gartner.com/en/information-technology/insights/manufacturing-technology',
        sourceName: 'Gartner Manufacturing Tech',
        insightType: 'industry_specific',
        verificationNote: 'Search: "Gartner manufacturing CRM ERP integration"'
      },
      {
        headline: 'Manufacturing Cloud Driving Digital Transformation',
        bullets: [
          'Sales agreements and forecasting now unified',
          'Account-based forecasting improving accuracy',
          'Partner ecosystem visibility across the value chain'
        ],
        sourceUrl: 'https://www.salesforce.com/news/stories/manufacturing-cloud/',
        sourceName: 'Salesforce News',
        insightType: 'salesforce',
        verificationNote: 'Search: "Salesforce Manufacturing Cloud features"'
      },
      {
        headline: 'Predictive Maintenance Data Flowing to Customer Systems',
        bullets: [
          'IoT-enabled equipment sending proactive alerts to CRM',
          'Service scheduling automation reducing downtime',
          'Customer satisfaction improving with proactive maintenance'
        ],
        sourceUrl: 'https://www.mckinsey.com/industries/advanced-electronics/our-insights/predictive-maintenance',
        sourceName: 'McKinsey Manufacturing',
        insightType: 'ai_automation',
        verificationNote: 'Search: "McKinsey predictive maintenance IoT"'
      },
      {
        headline: 'Field Service Transformation in Manufacturing',
        bullets: [
          'Mobile-first technician experiences now standard',
          'AI-powered dispatching optimizing routes and skills matching',
          'First-time fix rates improving with knowledge AI'
        ],
        sourceUrl: 'https://www.forrester.com/blogs/category/manufacturing/',
        sourceName: 'Forrester Manufacturing',
        insightType: 'general',
        verificationNote: 'Search: "Forrester field service manufacturing AI"'
      }
    ],
    'Healthcare': [
      {
        headline: 'Healthcare CRM Adoption Accelerating Post-Pandemic',
        bullets: [
          'Patient engagement platforms now essential infrastructure',
          'Care coordination automation reducing readmissions',
          'Provider relationship management becoming priority'
        ],
        sourceUrl: 'https://www.healthcareitnews.com/news/patient-engagement',
        sourceName: 'Healthcare IT News',
        insightType: 'industry_specific',
        verificationNote: 'Search: "Healthcare IT News patient engagement CRM"'
      },
      {
        headline: 'Health Cloud Enabling Connected Care',
        bullets: [
          'Unified patient views across care settings',
          'HIPAA-compliant automation for patient communications',
          'Care plan management with real-time collaboration'
        ],
        sourceUrl: 'https://www.salesforce.com/news/stories/health-cloud/',
        sourceName: 'Salesforce News',
        insightType: 'salesforce',
        verificationNote: 'Search: "Salesforce Health Cloud updates"'
      },
      {
        headline: 'AI in Healthcare: Balancing Innovation and Compliance',
        bullets: [
          'Clinical AI requires extensive validation before deployment',
          'Administrative AI seeing faster adoption with fewer barriers',
          'Patient-facing AI chatbots improving access to information'
        ],
        sourceUrl: 'https://www.mckinsey.com/industries/healthcare/our-insights/ai-healthcare',
        sourceName: 'McKinsey Healthcare',
        insightType: 'ai_automation',
        verificationNote: 'Search: "McKinsey AI healthcare adoption"'
      },
      {
        headline: 'Healthcare Interoperability Mandates Driving Change',
        bullets: [
          'FHIR adoption enabling data exchange across systems',
          'Patient data rights creating new engagement opportunities',
          'API-first architectures becoming requirement'
        ],
        sourceUrl: 'https://www.healthit.gov/topic/interoperability/standards',
        sourceName: 'HealthIT.gov',
        insightType: 'general',
        verificationNote: 'Search: "HealthIT.gov FHIR interoperability"'
      }
    ],
    'Unknown': [
      {
        headline: 'AI Governance Becoming Board-Level Priority',
        bullets: [
          'Fortune 500 establishing formal AI governance frameworks',
          'Regulatory pressure increasing across industries',
          'Risk management now precedes AI deployment in best-practice organizations'
        ],
        sourceUrl: 'https://www.gartner.com/en/newsroom/press-releases/2024-ai-governance',
        sourceName: 'Gartner Newsroom',
        insightType: 'ai_automation',
        verificationNote: 'Search: "Gartner AI governance enterprise 2024"'
      },
      {
        headline: 'Salesforce Data Cloud Enabling 360° Customer Views',
        bullets: [
          'Real-time data unification across all customer touchpoints',
          'Identity resolution reducing duplicate records',
          'Activation across marketing, sales, and service channels'
        ],
        sourceUrl: 'https://www.salesforce.com/news/stories/data-cloud/',
        sourceName: 'Salesforce News',
        insightType: 'salesforce',
        verificationNote: 'Search: "Salesforce Data Cloud announcement"'
      },
      {
        headline: 'Technical Debt Costs Rising as Systems Age',
        bullets: [
          'Legacy implementations compounding complexity over time',
          'Change velocity decreasing as customizations accumulate',
          'Proactive governance now essential for platform health'
        ],
        sourceUrl: 'https://www.mckinsey.com/capabilities/mckinsey-digital/our-insights/technical-debt',
        sourceName: 'McKinsey Digital',
        insightType: 'general',
        verificationNote: 'Search: "McKinsey technical debt enterprise"'
      },
      {
        headline: 'Automation ROI Expectations Maturing',
        bullets: [
          'Executive focus shifting from cost savings to strategic value',
          'Employee experience becoming key success metric',
          'End-to-end process optimization vs. task-level automation'
        ],
        sourceUrl: 'https://www.forrester.com/blogs/automation-roi/',
        sourceName: 'Forrester Automation',
        insightType: 'industry_specific',
        verificationNote: 'Search: "Forrester automation ROI enterprise"'
      }
    ]
  };

  return templateInsights[industry] || templateInsights['Unknown'];
}

/**
 * Format wins into professional bullet points with proper grammar
 * Cleans up typos and reformats raw notes into polished content
 */
function formatWinsForAgenda(recentWins) {
  if (!recentWins || recentWins.trim() === '') return null;

  // Clean up the text first
  const cleanedWins = cleanupText(recentWins);

  // Split wins by newlines or periods followed by capital letters
  // This handles multi-sentence wins better
  let winsList = cleanedWins
    .split(/\n+/)
    .flatMap(line => {
      // If a line has multiple sentences, keep them together as one win
      // unless it's clearly separate items
      return line.trim();
    })
    .filter(w => w.length > 0);

  if (winsList.length === 0) return null;

  // Format each win professionally
  const formattedBullets = winsList.map(win => {
    let formatted = win.trim();

    // Capitalize first letter
    formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1);

    // Remove trailing periods for consistency (we'll add them in display if needed)
    formatted = formatted.replace(/\.+$/, '');

    // Ensure proper sentence structure
    // If it starts with a verb like "completed", "launched", etc., keep as is
    // If it's a noun phrase, consider adding context

    return formatted;
  });

  return {
    summary: 'The team has made significant progress on several key initiatives:',
    bullets: formattedBullets
  };
}

/**
 * Format upcoming concerns into professional discussion points
 */
function formatConcernsForAgenda(upcomingConcerns) {
  if (!upcomingConcerns || upcomingConcerns.trim() === '') return null;

  // Clean up the text first
  const cleanedConcerns = cleanupText(upcomingConcerns);

  // Split by newlines
  let concernsList = cleanedConcerns
    .split(/\n+/)
    .map(line => line.trim())
    .filter(w => w.length > 0);

  if (concernsList.length === 0) return null;

  // Format each concern as a discussion topic
  const formattedTopics = concernsList.map(concern => {
    let formatted = concern.trim();

    // Capitalize first letter
    formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1);

    // Remove trailing periods
    formatted = formatted.replace(/\.+$/, '');

    return formatted;
  });

  return formattedTopics;
}

/**
 * Generate natural flowing email content that incorporates wins/concerns
 * without explicitly listing them - NOW WITH CLIENT PERSONALIZATION
 */
function generateNaturalEmail(formData, phaseContext, keyContext) {
  const { clientName, engagementType, channelType, recentWins, upcomingConcerns, industry, clientTier, lastTouchpointDate } = formData;

  // Calculate time since last touchpoint for natural reference
  let timeSinceTouch = '';
  if (lastTouchpointDate) {
    const lastDate = new Date(lastTouchpointDate);
    const now = new Date();
    const daysDiff = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));
    if (daysDiff > 60) {
      timeSinceTouch = "It's been a little while since we last connected, and ";
    } else if (daysDiff > 30) {
      timeSinceTouch = "It's been about a month since we last synced, and ";
    }
  }

  // Determine positive momentum indicator from wins (without listing them)
  const hasWins = recentWins && recentWins.trim().length > 0;
  const hasConcerns = upcomingConcerns && upcomingConcerns.trim().length > 0;

  // Build personalized references
  const hasProducts = keyContext.products && keyContext.products.length > 0;
  const hasMetrics = keyContext.metrics && keyContext.metrics.length > 0;
  const hasAchievements = keyContext.achievements && keyContext.achievements.length > 0;

  // Create contextual hint about the type of work
  let workHint = '';
  if (hasAchievements) {
    if (keyContext.achievements.includes('deduplication') || keyContext.achievements.includes('cleanup')) {
      workHint = 'the data cleanup work';
    } else if (keyContext.achievements.includes('documentation')) {
      workHint = 'the documentation and process work';
    } else if (keyContext.achievements.includes('automated') || keyContext.achievements.includes('automation')) {
      workHint = 'the automation work';
    } else if (keyContext.achievements.includes('launched') || keyContext.achievements.includes('deployed')) {
      workHint = 'the recent deployments';
    }
  }

  // Generate email based on engagement type
  if (engagementType === 'eb') {
    // EXECUTIVE BRIEF: Strategic, high-level, wins go in agenda not email
    if (channelType === 'email') {
      let body = `Hi Team,\n\n`;
      body += `${timeSinceTouch}I wanted to reach out about scheduling our Executive Briefing with ${clientName}. `;

      if (hasWins) {
        body += `I've been hearing great things from the team about the progress being made`;
        if (hasProducts && keyContext.products.length > 0) {
          body += ` - especially around ${keyContext.products[0]}`;
        }
        body += `, and I'd love to take some time to step back and look at the bigger picture together.\n\n`;
      } else {
        body += `These sessions are valuable opportunities to step back from the day-to-day and align on what's ahead.\n\n`;
      }

      body += `For our conversation, I'm planning to bring some industry insights on what we're seeing in ${industry !== 'Unknown' ? industry : 'your space'} `;
      body += `that I think you'll find relevant. I'd also like to understand how your priorities have evolved and where we can best support you going forward.\n\n`;

      if (hasConcerns) {
        body += `I know there are some important strategic items on your radar that we should make sure to address as well.\n\n`;
      }

      body += `Would you have 45 minutes in the next few weeks? Happy to work around your schedule.\n\n`;
      body += `Best,\n[Your Name]\nSOLVD`;

      return {
        subject: `Strategic Partnership Review - ${clientName}`,
        body
      };
    } else if (channelType === 'slack') {
      let body = `Hey ${clientName} team! `;
      body += hasWins
        ? `Been hearing great things about how things are going${workHint ? ` with ${workHint}` : ''}. `
        : ``;
      body += `Wanted to get our Executive Briefing on the calendar - I've got some interesting industry insights to share and would love to hear where your priorities are heading. `;
      body += `Does the team have 45 min in the next few weeks?`;
      return { body };
    } else {
      // In-person meeting invite
      return {
        subject: `Executive Briefing: ${clientName}`,
        body: `Bi-annual strategic review to discuss partnership progress, share industry trends, and align on priorities for the year ahead.\n\n` +
          `Attendees: ${clientName} executives, SOLVD leadership\n` +
          `Duration: 45 minutes\n` +
          `Format: ${clientTier === 'strategic' ? 'In-person recommended' : 'Video conference'}\n\n` +
          `Agenda preview will be shared in advance.`
      };
    }
  } else {
    // FULFILLMENT & FOLLOW-UP: Warm, collegial, reference momentum
    if (channelType === 'email') {
      let body = `Hi ${clientName} Team,\n\n`;
      body += timeSinceTouch;

      if (hasWins) {
        body += `I've been hearing positive things from the team about ${phaseContext}`;
        if (workHint) {
          body += ` - ${workHint} sounds like it's been going really well`;
        }
        body += `. Wanted to touch base to make sure everything is tracking well from your perspective.\n\n`;

        if (hasMetrics) {
          body += `The numbers are looking strong, and I'd love to hear more about what's been working well from your side. `;
        } else {
          body += `It sounds like there's been some great momentum, and I'd love to hear more about what's been working well from your side. `;
        }
      } else {
        body += `I wanted to check in on ${phaseContext} and see how things are going from your perspective.\n\n`;
        body += `I'd love to hear what's been going well and `;
      }

      if (hasConcerns) {
        body += `I also want to make sure we have a chance to talk through a few items I know are important - including the longer-term roadmap discussions.\n\n`;
      } else {
        body += `if there's anything we should be doing differently.\n\n`;
      }

      body += `Do you have 30 minutes this week or next for a quick sync?\n\n`;
      body += `Best,\n[Your Name]\nSOLVD`;

      return {
        subject: `Quick check-in: ${clientName} - ${phaseContext}`,
        body
      };
    } else if (channelType === 'slack') {
      let body = `Hey ${clientName} team! `;
      if (hasWins) {
        body += `Things are sounding great${workHint ? ` with ${workHint}` : ''} - nice work! `;
      } else {
        body += `Wanted to check in on ${phaseContext}. `;
      }
      body += `Got 30 min for a quick sync? Would love to hear how it's going from your end`;
      body += hasConcerns ? ` and make sure we're aligned on the priorities ahead.` : `.`;
      return { body };
    } else {
      // In-person meeting invite
      return {
        subject: `Check-in: ${clientName} - ${phaseContext}`,
        body: `Quarterly fulfillment check-in to review progress, gather feedback, and align on next steps.\n\n` +
          `Attendees: ${clientName} project leads, Executive sponsor (optional)\n` +
          `Duration: 30 minutes\n\n` +
          `Looking forward to hearing how things are going from your perspective.`
      };
    }
  }
}

/**
 * Client Engagement Generator
 * Generates FF (Fulfillment & Follow-up) or EB (Executive Brief) content
 */
export async function generateEngagement(formData) {
  const engagementType = formData.engagementType || 'ff';
  const engagementLabel = engagementType === 'eb' ? 'Executive Brief' : 'Fulfillment & Follow-up';

  console.log(`🤝 Generating ${engagementLabel} content for ${formData.clientName || 'client'}`);

  try {
    // Fetch industry insights
    const industryInsights = await fetchIndustryInsights(formData.industry, formData.website);

    // Load engagement prompt template
    const promptPath = path.join(__dirname, '../../prompts/engagement.md');
    let promptTemplate = await fs.readFile(promptPath, 'utf-8');

    // Replace template variables
    promptTemplate = promptTemplate
      .replace('{{toneDirective}}', getToneDirective(formData.tone))
      .replace('{{engagementType}}', engagementType)
      .replace('{{clientName}}', formData.clientName || 'Client')
      .replace('{{clientTier}}', formData.clientTier || 'target')
      .replace('{{industry}}', formData.industry || 'Unknown')
      .replace('{{projectPhase}}', formData.projectPhase || 'ongoing')
      .replace('{{lastTouchpointDate}}', formData.lastTouchpointDate || 'Not specified')
      .replace('{{recentWins}}', formData.recentWins || 'None provided')
      .replace('{{upcomingConcerns}}', formData.upcomingConcerns || 'None provided')
      .replace('{{channelType}}', formData.channelType || 'email')
      .replace('{{industryInsights}}', JSON.stringify(industryInsights, null, 2));

    // Call Claude API
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
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
    let engagementOutput;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      engagementOutput = JSON.parse(jsonMatch[0]);
    } else {
      engagementOutput = JSON.parse(responseText);
    }

    // Ensure industry insights are included with proper format
    if (!engagementOutput.industryInsights || engagementOutput.industryInsights.length === 0) {
      engagementOutput.industryInsights = industryInsights;
    }

    console.log(`✅ ${engagementLabel} content generated successfully`);

    return engagementOutput;

  } catch (error) {
    console.error(`❌ Error generating engagement content:`, error.message);

    // Build contextual fallback based on engagement type and inputs
    const clientName = formData.clientName || 'Client';
    const engagementType = formData.engagementType || 'ff';
    const channelType = formData.channelType || 'email';
    const clientTier = formData.clientTier || 'target';
    const projectPhase = formData.projectPhase || 'ongoing';
    const recentWins = formData.recentWins || '';
    const upcomingConcerns = formData.upcomingConcerns || '';
    const industry = formData.industry || 'Unknown';

    // Get fallback industry insights (now in slide-deck format)
    const industryInsights = await fetchIndustryInsights(industry, formData.website);

    // Build phase-specific context
    const phaseDescriptions = {
      'analysis_design': 'the Analysis & Design phase',
      'mid_build': 'the build phase',
      'end_build': 'wrapping up the build',
      'go_live': 'the recent go-live',
      'ongoing': 'our ongoing support work',
      'project_complete': 'the completed project'
    };
    const phaseContext = phaseDescriptions[projectPhase] || 'our ongoing work together';

    // Extract key context for personalization
    const keyContext = extractKeyContext(recentWins, upcomingConcerns);

    // Generate natural flowing email with personalization
    const outreachMessage = generateNaturalEmail(
      { clientName, engagementType, channelType, recentWins, upcomingConcerns, industry, clientTier, lastTouchpointDate: formData.lastTouchpointDate },
      phaseContext,
      keyContext
    );

    // Format wins for agenda (professional bullets with typo correction)
    const formattedWins = formatWinsForAgenda(recentWins);

    // Format concerns for agenda (with typo correction)
    const formattedConcerns = formatConcernsForAgenda(upcomingConcerns);

    // Build meeting agenda
    let meetingAgenda;

    if (engagementType === 'eb') {
      // Executive Brief Agenda - wins go HERE, not in email
      meetingAgenda = {
        purpose: `Strategic Executive Briefing to review partnership progress, share industry insights, and align on ${clientName}'s evolving priorities.`,
        duration: '45 minutes',
        sections: [
          {
            title: 'Progress & Wins',
            bullets: formattedWins
              ? [
                  formattedWins.summary,
                  ...formattedWins.bullets,
                  'Review adoption metrics and team feedback'
                ]
              : [
                  `Review accomplishments from ${phaseContext}`,
                  'Discuss key milestones achieved',
                  'Share adoption metrics and team feedback',
                  'Celebrate successes and recognize contributions'
                ],
            timeAllocation: '10-12 minutes'
          },
          {
            title: 'Industry Insights',
            bullets: [
              `Share trends affecting ${industry !== 'Unknown' ? industry : 'your industry'}`,
              'Discuss automation and AI developments relevant to your roadmap',
              'Highlight what peer companies are prioritizing',
              'Connect insights to your strategic context'
            ],
            timeAllocation: '12-15 minutes'
          },
          {
            title: 'Priorities & Recommendations',
            bullets: formattedConcerns
              ? [
                  'Revisit original business objectives',
                  'Understand how priorities have evolved',
                  ...formattedConcerns.map(c => `Discuss: ${c}`),
                  'Ask: "What other services would you want SOLVD to provide?"'
                ]
              : [
                  'Revisit original business objectives',
                  'Understand how priorities have evolved',
                  'Identify emerging needs and opportunities',
                  'Discuss potential next initiatives',
                  'Ask: "What other services would you want SOLVD to provide?"'
                ],
            timeAllocation: '15-18 minutes'
          }
        ]
      };
    } else {
      // FF Agenda - wins as professional paragraph/bullets
      meetingAgenda = {
        purpose: `Fulfillment & Follow-up check-in to ensure we're meeting expectations and identify opportunities to better support ${clientName}.`,
        duration: '30 minutes',
        sections: [
          {
            title: 'Reframe & Context',
            bullets: [
              'Recap original goals and project scope',
              `Review progress on ${phaseContext}`,
              'Confirm we\'re tracking against expectations'
            ],
            timeAllocation: '5-7 minutes'
          },
          {
            title: 'Celebrate Progress',
            bullets: formattedWins
              ? [
                  formattedWins.summary,
                  ...formattedWins.bullets
                ]
              : [
                  'Review completed deliverables and milestones',
                  'Acknowledge team contributions and wins',
                  'Confirm satisfaction with quality and outcomes'
                ],
            timeAllocation: '7-10 minutes'
          },
          {
            title: 'Collect Feedback & Key Topics',
            bullets: formattedConcerns
              ? [
                  'What has gone well from your perspective?',
                  'What could we improve?',
                  ...formattedConcerns.map(c => `Discuss: ${c}`),
                  'Any other concerns or blockers?'
                ]
              : [
                  'What has gone well from your perspective?',
                  'What could we improve?',
                  'Any concerns or blockers we should address?',
                  'How would you rate your experience so far?'
                ],
            timeAllocation: '8-10 minutes'
          },
          {
            title: 'Next Steps',
            bullets: [
              'Discuss upcoming phases or backlog items',
              'Identify expansion opportunities (other teams, departments)',
              'Set next engagement date',
              'Confirm action items and owners'
            ],
            timeAllocation: '5-7 minutes'
          }
        ]
      };
    }

    return {
      engagementType,
      channelType,
      outreachMessage,
      meetingAgenda,
      industryInsights
    };
  }
}
