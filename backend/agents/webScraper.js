import axios from 'axios';
import * as cheerio from 'cheerio';
import '../config.js';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Enhanced Web Scraper Agent v3.0
 * Multi-page scraper with AI-powered intelligence extraction
 */

/**
 * Helper: Fetch a single page with error handling
 */
async function fetchPage(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 8000,
      maxRedirects: 5
    });
    return response.data;
  } catch (error) {
    return null;
  }
}

/**
 * Helper: Extract structured data (JSON-LD, Schema.org)
 */
function extractStructuredData($) {
  const structuredData = {
    description: null,
    founder: null,
    numberOfEmployees: null
  };

  // Find all JSON-LD script tags
  $('script[type="application/ld+json"]').each((i, el) => {
    try {
      const jsonData = JSON.parse($(el).html());

      // Handle array of structured data
      const dataArray = Array.isArray(jsonData) ? jsonData : [jsonData];

      for (const data of dataArray) {
        // Extract description
        if (data.description && !structuredData.description) {
          structuredData.description = data.description;
        }

        // Extract founder
        if (data.founder && !structuredData.founder) {
          if (typeof data.founder === 'string') {
            structuredData.founder = data.founder;
          } else if (data.founder.name) {
            structuredData.founder = data.founder.name;
          }
        }

        // Extract employee count
        if (data.numberOfEmployees && !structuredData.numberOfEmployees) {
          structuredData.numberOfEmployees = data.numberOfEmployees.value || data.numberOfEmployees;
        }
      }
    } catch (e) {
      // Ignore malformed JSON
    }
  });

  return structuredData;
}

/**
 * Helper: Find links to key pages (enhanced patterns)
 */
function findKeyPageLinks($, baseUrl) {
  const links = {
    about: [],
    products: []
  };

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    const text = $(el).text().toLowerCase().trim();

    if (!href) return;

    // Convert relative URLs to absolute
    let fullUrl;
    try {
      fullUrl = new URL(href, baseUrl).href;
    } catch (e) {
      return;
    }

    // Only include links from the same domain
    const baseHostname = new URL(baseUrl).hostname;
    const linkHostname = new URL(fullUrl).hostname;
    if (linkHostname !== baseHostname) return;

    // Enhanced about page detection (catches /about-us, /about-company, etc.)
    if (href.match(/about[-_]?(us|company|we|solvd)?|company|who-we-are|our-story|our-company/i) ||
        text.match(/about\s*(us|company)?|company|who we are|our story/i)) {
      links.about.push(fullUrl);
    }

    if (href.match(/product|service|solution|offering|platform/i) ||
        text.match(/product|service|solution|offering|platform/i)) {
      links.products.push(fullUrl);
    }
  });

  // Deduplicate and take first of each type
  return {
    about: links.about[0] || null,
    products: links.products[0] || null
  };
}

/**
 * Helper: Extract text content with limit
 */
function extractText($, selector, limit = 500) {
  return $(selector)
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(text => text.length > 0)
    .join(' ')
    .substring(0, limit);
}

/**
 * AI-powered company intelligence extraction via Claude Haiku
 * Returns: { companySummary, businessModel, servicesProducts[] }
 */
async function extractCompanyIntelligence(combinedText) {
  const truncated = combinedText.substring(0, 3000);
  try {
    console.log('   🤖 Extracting company intelligence via Claude...');
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      temperature: 0.1,
      messages: [{
        role: 'user',
        content: `Extract structured company intelligence from the following website text. Return ONLY valid JSON with exactly these three fields:
- companySummary: 1-2 sentences describing what the company does
- businessModel: 1 sentence describing how they make money (e.g. "SaaS subscription fees", "consulting engagements", "transaction fees")
- servicesProducts: array of 2-5 short noun phrases listing specific services or products (e.g. ["CRM software", "marketing automation", "analytics dashboard"])

Website text:
${truncated}

JSON:`
      }]
    });
    const raw = response.content[0].text;
    const match = raw.match(/{[\s\S]*}/);
    if (!match) throw new Error('No JSON found in response');
    const parsed = JSON.parse(match[0]);
    return {
      companySummary: parsed.companySummary || null,
      businessModel: parsed.businessModel || null,
      servicesProducts: Array.isArray(parsed.servicesProducts) ? parsed.servicesProducts : []
    };
  } catch (err) {
    console.log(`   ⚠️  Company intelligence extraction failed: ${err.message}`);
    return { companySummary: null, businessModel: null, servicesProducts: [] };
  }
}

/**
 * Main scraper function with multi-page support and AI-powered intelligence extraction
 */
export async function scrapeWebsite(websiteUrl) {
  websiteUrl = websiteUrl.trim();
  console.log(`🕷️  Scraping website: ${websiteUrl}`);

  try {
    // Ensure URL has protocol
    if (!websiteUrl.startsWith('http://') && !websiteUrl.startsWith('https://')) {
      websiteUrl = 'https://' + websiteUrl;
    }

    // 1. Fetch homepage
    console.log(`   📄 Fetching homepage...`);
    const homepageHtml = await fetchPage(websiteUrl);
    if (!homepageHtml) {
      throw new Error('Could not fetch homepage');
    }

    const $ = cheerio.load(homepageHtml);

    // Extract meta tags helper
    const getMetaContent = (name) => {
      return $(`meta[name="${name}"]`).attr('content') ||
             $(`meta[property="${name}"]`).attr('content') ||
             $(`meta[property="og:${name}"]`).attr('content') || '';
    };

    // 2. Extract structured data (JSON-LD)
    console.log(`   📊 Extracting structured data...`);
    const structuredData = extractStructuredData($);

    // 3. Find key page links
    const keyPages = findKeyPageLinks($, websiteUrl);
    console.log(`   🔗 Found key pages:`, {
      about: !!keyPages.about,
      products: !!keyPages.products
    });

    // 4. Gather all text content
    let allText = $('body').text();
    let aboutText = '';

    // 5. Fetch and parse About page
    if (keyPages.about) {
      console.log(`   📄 Fetching about page...`);
      const aboutHtml = await fetchPage(keyPages.about);
      if (aboutHtml) {
        const $about = cheerio.load(aboutHtml);
        aboutText = $about('body').text();
        allText += ' ' + aboutText;
      }
    }

    // 6. AI-powered company intelligence extraction
    const companyIntelligence = await extractCompanyIntelligence(aboutText + ' ' + allText);

    // 7. Detect industry
    const industryTerms = {
      'SaaS/High Tech': ['software as a service', 'saas', 'cloud platform', 'cloud software', 'technology company', 'tech startup'],
      'Financial Services': ['financial institution', 'wealth management', 'asset management', 'brokerage', 'fintech', 'banking technology', 'payments platform', 'credit union', 'investment banking', 'insurance technology'],
      'Healthcare': ['healthcare', 'medical', 'patient care', 'hospital', 'clinical', 'pharmaceutical', 'health system'],
      'E-commerce': ['e-commerce', 'ecommerce', 'online store', 'online marketplace', 'direct-to-consumer'],
      'Manufacturing': ['manufacturing', 'factory', 'production', 'industrial', 'supply chain'],
      'Professional Services': ['consulting firm', 'advisory services', 'professional services', 'management consulting'],
      'Consumer Goods': ['consumer packaged goods', 'cpg', 'consumer brands', 'fmcg'],
      'Restaurant Tech': ['restaurant', 'hospitality technology', 'food service', 'menu management', 'point of sale']
    };

    const detectedIndustries = [];
    const bodyTextLower = allText.toLowerCase();
    for (const [industry, terms] of Object.entries(industryTerms)) {
      if (terms.some(term => bodyTextLower.includes(term))) {
        detectedIndustries.push(industry);
      }
    }

    // If keyword matching found nothing, use Claude to infer from actual content
    if (detectedIndustries.length === 0 && process.env.ANTHROPIC_API_KEY) {
      try {
        const contentForInference = [
          companyIntelligence.companySummary ? `About: ${companyIntelligence.companySummary}` : '',
          $('h1, h2').map((_, el) => $(el).text().trim()).get().filter(t => t.length > 0 && t.length < 100).slice(0, 5).join(' | '),
          allText ? `Content: ${allText.substring(0, 400)}` : ''
        ].filter(Boolean).join('\n');

        if (contentForInference.trim()) {
          console.log('   🤖 Inferring industry from content via Claude...');
          const inferMsg = await anthropic.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 20,
            temperature: 0.1,
            messages: [{
              role: 'user',
              content: `Classify this company's industry. Return ONLY one exact option: SaaS/High Tech, Financial Services, Healthcare, E-commerce, Manufacturing, Professional Services, Consumer Goods, Restaurant Tech, Unknown\n\n${contentForInference}\n\nIndustry:`
            }]
          });
          const inferred = inferMsg.content[0].text.trim();
          const validIndustries = ['SaaS/High Tech', 'Financial Services', 'Healthcare', 'E-commerce', 'Manufacturing', 'Professional Services', 'Consumer Goods', 'Restaurant Tech'];
          if (validIndustries.includes(inferred)) {
            detectedIndustries.push(inferred);
            console.log(`   🤖 Claude inferred industry: ${inferred}`);
          } else {
            console.log('   🤖 Claude could not determine industry — setting Unknown');
          }
        }
      } catch (err) {
        console.log(`   ⚠️  Industry inference failed: ${err.message}`);
      }
    }

    // 8. Build company profile
    const companyProfile = {
      url: websiteUrl,
      title: $('title').text().trim() || '',
      description: getMetaContent('description') || extractText($, 'p', 300),

      // Main headings
      mainHeadings: $('h1, h2')
        .map((_, el) => $(el).text().trim())
        .get()
        .filter(text => text.length > 0 && text.length < 100)
        .slice(0, 10),

      // Keywords
      keywords: getMetaContent('keywords').split(',').map(k => k.trim()).filter(k => k),

      // Tech stack detection
      techStack: [],

      // Body text for context
      bodyText: extractText($, 'p, article, main', 1000),

      // Industry indicators
      industryKeywords: [],

      // Company Intelligence Brief
      intelligenceBrief: {
        companySummary: companyIntelligence.companySummary,
        businessModel: companyIntelligence.businessModel,
        servicesProducts: companyIntelligence.servicesProducts,
        industry: detectedIndustries.length > 0 ? detectedIndustries[0] : null,
        pagesScraped: {
          homepage: true,
          about: !!keyPages.about,
          products: !!keyPages.products
        }
      },

      scrapedAt: new Date().toISOString()
    };

    // Detect tech stack
    const htmlLower = homepageHtml.toLowerCase();
    if (htmlLower.includes('salesforce')) companyProfile.techStack.push('Salesforce');
    if (htmlLower.includes('react')) companyProfile.techStack.push('React');
    if (htmlLower.includes('next.js') || htmlLower.includes('nextjs')) companyProfile.techStack.push('Next.js');
    if (htmlLower.includes('vercel')) companyProfile.techStack.push('Vercel');
    if (htmlLower.includes('hubspot')) companyProfile.techStack.push('HubSpot');

    // Industry keywords were already detected and stored in detectedIndustries
    companyProfile.industryKeywords = detectedIndustries;

    console.log(`✅ Scraped ${websiteUrl} successfully`);
    console.log(`   📊 Intelligence: ${companyIntelligence.companySummary ? 'Summary found' : 'No summary'}, Industry: ${detectedIndustries.length > 0 ? detectedIndustries[0] : 'Unknown'}, ${companyIntelligence.servicesProducts.length} services/products`);

    return companyProfile;

  } catch (error) {
    console.error(`❌ Error scraping ${websiteUrl}:`, error.message);

    // Return minimal profile on error
    return {
      url: websiteUrl,
      title: '',
      description: '',
      mainHeadings: [],
      keywords: [],
      techStack: [],
      bodyText: '',
      industryKeywords: [],
      intelligenceBrief: {
        companySummary: null,
        businessModel: null,
        servicesProducts: [],
        industry: null,
        pagesScraped: {
          homepage: false,
          about: false,
          products: false
        }
      },
      error: error.message,
      scrapedAt: new Date().toISOString()
    };
  }
}
