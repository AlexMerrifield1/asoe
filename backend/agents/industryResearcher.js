import axios from 'axios';
import * as cheerio from 'cheerio';
import '../config.js';
import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

/**
 * Industry Research Agent
 * Fetches REAL articles from verified sources and extracts insights
 * All URLs are verified to be accessible before being returned
 */

/**
 * Known research sources by industry
 * These are reliable sources that consistently publish industry research
 */
const RESEARCH_SOURCES = {
  'SaaS/High Tech': [
    { name: 'Salesforce Blog', baseUrl: 'https://www.salesforce.com/blog/', searchPath: 'ai' },
    { name: 'Salesforce News', baseUrl: 'https://www.salesforce.com/news/', searchPath: '' },
    { name: 'TechCrunch', baseUrl: 'https://techcrunch.com/', searchPath: 'enterprise' },
    { name: 'VentureBeat AI', baseUrl: 'https://venturebeat.com/', searchPath: 'ai' },
    { name: 'MIT Tech Review', baseUrl: 'https://www.technologyreview.com/', searchPath: 'artificial-intelligence' }
  ],
  'Financial Services': [
    { name: 'American Banker', baseUrl: 'https://www.americanbanker.com/', searchPath: 'technology' },
    { name: 'Finextra', baseUrl: 'https://www.finextra.com/', searchPath: 'newsarticle' },
    { name: 'Banking Dive', baseUrl: 'https://www.bankingdive.com/', searchPath: 'topic/technology' }
  ],
  'Healthcare': [
    { name: 'Healthcare IT News', baseUrl: 'https://www.healthcareitnews.com/', searchPath: '' },
    { name: 'Modern Healthcare', baseUrl: 'https://www.modernhealthcare.com/', searchPath: 'technology' },
    { name: 'HIMSS', baseUrl: 'https://www.himss.org/', searchPath: 'news' }
  ],
  'Manufacturing': [
    { name: 'Industry Week', baseUrl: 'https://www.industryweek.com/', searchPath: 'technology' },
    { name: 'Manufacturing.net', baseUrl: 'https://www.manufacturing.net/', searchPath: 'automation' }
  ],
  'Consumer Goods': [
    { name: 'Retail Dive', baseUrl: 'https://www.retaildive.com/', searchPath: 'topic/technology' },
    { name: 'Grocery Dive', baseUrl: 'https://www.grocerydive.com/', searchPath: 'topic/technology' }
  ],
  'Professional Services': [
    { name: 'Consultancy.uk', baseUrl: 'https://www.consultancy.uk/', searchPath: 'news' },
    { name: 'Law.com', baseUrl: 'https://www.law.com/', searchPath: 'technology' }
  ],
  'general': [
    { name: 'Harvard Business Review', baseUrl: 'https://hbr.org/', searchPath: 'topic/subject/technology' },
    { name: 'MIT Sloan Review', baseUrl: 'https://sloanreview.mit.edu/', searchPath: 'topic/artificial-intelligence' },
    { name: 'ZDNet', baseUrl: 'https://www.zdnet.com/', searchPath: 'topic/artificial-intelligence' }
  ]
};

/**
 * Topics to research for each insight type
 */
const RESEARCH_TOPICS = {
  'industry_specific': ['industry trends 2024', 'market outlook', 'digital transformation'],
  'salesforce': ['Salesforce AI', 'Agentforce', 'Data Cloud', 'Einstein GPT', 'Salesforce automation'],
  'ai_automation': ['enterprise AI adoption', 'AI governance', 'automation ROI', 'generative AI business'],
  'general': ['digital strategy', 'technology investment', 'business transformation']
};

/**
 * Fetch a page with error handling and timeout
 */
async function fetchPage(url, timeout = 10000) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout,
      maxRedirects: 5,
      validateStatus: (status) => status < 400 // Accept 2xx and 3xx
    });
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      status: error.response?.status || 0
    };
  }
}

/**
 * Verify a URL is accessible and returns valid content
 */
async function verifyUrl(url) {
  console.log(`      🔍 Verifying URL: ${url}`);
  const result = await fetchPage(url, 8000);

  if (result.success) {
    // Check for common "not found" or "error" page indicators
    const html = result.data.toLowerCase();
    const errorIndicators = [
      'page not found',
      'this page is no longer available',
      '404',
      'we couldn\'t find',
      'doesn\'t exist',
      'has been removed',
      'no longer available'
    ];

    for (const indicator of errorIndicators) {
      if (html.includes(indicator)) {
        console.log(`      ❌ URL contains error indicator: "${indicator}"`);
        return { valid: false, reason: `Page contains error: ${indicator}` };
      }
    }

    console.log(`      ✅ URL verified`);
    return { valid: true, html: result.data };
  }

  console.log(`      ❌ URL failed: ${result.error}`);
  return { valid: false, reason: result.error };
}

/**
 * Extract article links from a news/blog page
 */
function extractArticleLinks($, baseUrl) {
  const articles = [];

  // Common article selectors
  const selectors = [
    'article a[href]',
    '.post a[href]',
    '.article-card a[href]',
    '.news-item a[href]',
    'h2 a[href]',
    'h3 a[href]',
    '.entry-title a[href]',
    '.card-title a[href]',
    '[class*="article"] a[href]',
    '[class*="post"] a[href]'
  ];

  for (const selector of selectors) {
    $(selector).each((_, el) => {
      const href = $(el).attr('href');
      const title = $(el).text().trim();

      if (!href || !title || title.length < 10) return;

      // Convert relative URLs to absolute
      let fullUrl;
      try {
        fullUrl = new URL(href, baseUrl).href;
      } catch (e) {
        return;
      }

      // Filter out non-article links
      if (fullUrl.includes('/tag/') || fullUrl.includes('/category/') ||
          fullUrl.includes('/author/') || fullUrl.includes('#')) {
        return;
      }

      // Avoid duplicates
      if (!articles.some(a => a.url === fullUrl)) {
        articles.push({
          url: fullUrl,
          title: title.substring(0, 150)
        });
      }
    });

    if (articles.length >= 5) break;
  }

  return articles.slice(0, 10); // Return max 10 articles
}

/**
 * Extract key points from article content
 */
function extractKeyPoints($, html) {
  const keyPoints = [];

  // Get main content paragraphs
  const contentSelectors = [
    'article p',
    '.article-content p',
    '.post-content p',
    '.entry-content p',
    'main p',
    '.content p'
  ];

  let paragraphs = [];
  for (const selector of contentSelectors) {
    $(selector).each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 100 && text.length < 500) {
        paragraphs.push(text);
      }
    });
    if (paragraphs.length >= 5) break;
  }

  // Extract sentences that contain statistics or key insights
  const insightPatterns = [
    /\d+%|\d+ percent/i,
    /\$\d+|\d+ billion|\d+ million/i,
    /according to|research shows|study found|report reveals/i,
    /key (finding|insight|trend)/i,
    /significant|substantial|major|critical|essential/i
  ];

  for (const para of paragraphs) {
    for (const pattern of insightPatterns) {
      if (pattern.test(para) && keyPoints.length < 4) {
        // Extract the relevant sentence
        const sentences = para.match(/[^.!?]+[.!?]+/g) || [para];
        for (const sentence of sentences) {
          if (pattern.test(sentence) && sentence.length > 30 && sentence.length < 200) {
            const cleaned = sentence.trim();
            if (!keyPoints.includes(cleaned)) {
              keyPoints.push(cleaned);
            }
            break;
          }
        }
      }
    }
  }

  // If we don't have enough points, add general summary sentences
  if (keyPoints.length < 3 && paragraphs.length > 0) {
    // Take first substantive paragraph as summary
    const firstPara = paragraphs[0];
    const sentences = firstPara.match(/[^.!?]+[.!?]+/g) || [];
    for (const sentence of sentences.slice(0, 3 - keyPoints.length)) {
      if (sentence.length > 40 && sentence.length < 150) {
        keyPoints.push(sentence.trim());
      }
    }
  }

  return keyPoints.slice(0, 3);
}

/**
 * Search for and fetch a real article on a topic
 */
async function findRealArticle(topic, insightType, industry) {
  console.log(`    📰 Searching for article on: "${topic}" (${insightType})`);

  // Get relevant sources
  const industrySources = RESEARCH_SOURCES[industry] || [];
  const generalSources = RESEARCH_SOURCES['general'] || [];
  const sources = [...industrySources, ...generalSources];

  // Shuffle sources to get variety
  const shuffledSources = sources.sort(() => Math.random() - 0.5);

  for (const source of shuffledSources.slice(0, 3)) {
    const searchUrl = source.baseUrl + (source.searchPath || '');
    console.log(`    🔎 Checking ${source.name}: ${searchUrl}`);

    const pageResult = await fetchPage(searchUrl, 10000);
    if (!pageResult.success) {
      console.log(`    ⏭️  ${source.name} unreachable, trying next...`);
      continue;
    }

    const $ = cheerio.load(pageResult.data);
    const articles = extractArticleLinks($, source.baseUrl);

    if (articles.length === 0) {
      console.log(`    ⏭️  No articles found on ${source.name}, trying next...`);
      continue;
    }

    // Try each article until we find one that works
    for (const article of articles.slice(0, 3)) {
      // Check if title is relevant to our topic
      const titleLower = article.title.toLowerCase();
      const topicWords = topic.toLowerCase().split(' ');
      const isRelevant = topicWords.some(word =>
        word.length > 3 && titleLower.includes(word)
      );

      if (!isRelevant && insightType !== 'general') {
        continue;
      }

      // Verify the article URL works
      const verification = await verifyUrl(article.url);
      if (!verification.valid) {
        continue;
      }

      // Extract key points from the article
      const $article = cheerio.load(verification.html);
      const keyPoints = extractKeyPoints($article, verification.html);

      if (keyPoints.length >= 2) {
        console.log(`    ✅ Found valid article: "${article.title.substring(0, 50)}..."`);
        return {
          success: true,
          url: article.url,
          title: article.title,
          sourceName: source.name,
          keyPoints
        };
      }
    }

    console.log(`    ⏭️  No suitable articles from ${source.name}, trying next...`);
  }

  return { success: false, reason: 'No valid articles found' };
}

/**
 * Generate a headline from article content using Claude
 */
async function generateHeadlineFromContent(articleTitle, keyPoints, insightType) {
  // If API not available, create headline from title
  if (!process.env.ANTHROPIC_API_KEY) {
    // Clean up the article title to be more headline-like
    let headline = articleTitle;

    // Remove site names and common suffixes
    headline = headline.replace(/\s*[-|]\s*(TechCrunch|VentureBeat|ZDNet|Forbes|MIT|Harvard|Salesforce).*$/i, '');
    headline = headline.replace(/\s*:\s*.*$/, ''); // Remove subtitle

    // Ensure it's not too long
    if (headline.length > 60) {
      const words = headline.split(' ').slice(0, 8);
      headline = words.join(' ');
    }

    return headline;
  }

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 100,
      temperature: 0.3,
      messages: [{
        role: 'user',
        content: `Create a concise, impactful headline (max 10 words) for an industry insight slide based on this article.

Article title: "${articleTitle}"
Key points: ${keyPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}
Insight type: ${insightType}

Return ONLY the headline, no quotes or explanation.`
      }]
    });

    return message.content[0].text.trim();
  } catch (error) {
    // Fallback to cleaned article title
    return articleTitle.substring(0, 60);
  }
}

/**
 * Main function: Research industry insights with real, verified URLs
 */
export async function researchIndustryInsights(industry, websiteUrl) {
  console.log(`\n📚 INDUSTRY RESEARCH AGENT`);
  console.log(`   Industry: ${industry || 'Unknown'}`);
  console.log(`   Company URL: ${websiteUrl || 'Not provided'}`);

  const insights = [];
  const targetInsightTypes = ['industry_specific', 'salesforce', 'ai_automation', 'general'];

  for (const insightType of targetInsightTypes) {
    console.log(`\n  🎯 Researching ${insightType} insights...`);

    const topics = RESEARCH_TOPICS[insightType] || RESEARCH_TOPICS['general'];

    // Try each topic until we find a good article
    let foundArticle = null;
    for (const topic of topics) {
      const result = await findRealArticle(topic, insightType, industry);
      if (result.success) {
        foundArticle = result;
        break;
      }
    }

    if (foundArticle) {
      // Generate a proper headline
      const headline = await generateHeadlineFromContent(
        foundArticle.title,
        foundArticle.keyPoints,
        insightType
      );

      insights.push({
        headline,
        bullets: foundArticle.keyPoints,
        sourceUrl: foundArticle.url,
        sourceName: foundArticle.sourceName,
        insightType,
        verified: true,
        verificationNote: `Verified article from ${foundArticle.sourceName}`
      });

      console.log(`  ✅ Added ${insightType} insight from ${foundArticle.sourceName}`);
    } else {
      console.log(`  ⚠️  Could not find verified article for ${insightType}`);
    }

    // Small delay between searches to be respectful to servers
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`\n📊 Research complete: Found ${insights.length} verified insights`);

  return insights;
}

/**
 * Verify all URLs in existing insights and remove/flag invalid ones
 */
export async function verifyInsightUrls(insights) {
  console.log(`\n🔍 URL VERIFICATION AGENT`);
  console.log(`   Checking ${insights.length} insight URLs...`);

  const verified = [];

  for (const insight of insights) {
    if (!insight.sourceUrl) {
      insight.verified = false;
      insight.verificationNote = 'No source URL provided';
      verified.push(insight);
      continue;
    }

    const result = await verifyUrl(insight.sourceUrl);

    if (result.valid) {
      insight.verified = true;
      insight.verificationNote = 'URL verified and accessible';
      verified.push(insight);
      console.log(`   ✅ ${insight.sourceName}: URL valid`);
    } else {
      insight.verified = false;
      insight.verificationNote = `URL failed: ${result.reason}`;
      console.log(`   ❌ ${insight.sourceName}: ${result.reason}`);
      // Still include it but mark as unverified
      verified.push(insight);
    }
  }

  return verified;
}
