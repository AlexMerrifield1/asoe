import express from 'express';
import { scrapeWebsite } from '../agents/webScraper.js';

const router = express.Router();

/**
 * POST /api/scrape-preview
 * Quick scrape to extract company name and industry for Magic Link feature
 */
router.post('/', async (req, res) => {
  const startTime = Date.now();

  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required'
      });
    }

    console.log(`\n🔍 Scrape Preview requested for: ${url}`);

    const companyProfile = await scrapeWebsite(url);

    // Extract company name from title (remove common suffixes)
    let companyName = (companyProfile.title || '')
      .replace(/\s*[|—–-]\s*.*/g, '')  // Remove "| Company Name" or "- Tagline" patterns
      .replace(/\s*(Home|Homepage|Welcome|Official Site)$/i, '')
      .trim();

    // Fallback: try to extract from URL domain
    if (!companyName || companyName.length < 2) {
      try {
        const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
        companyName = urlObj.hostname
          .replace(/^www\./, '')
          .replace(/\.(com|io|co|org|net|ai|tech)$/, '')
          .split('.')[0]
          .replace(/-/g, ' ')
          .replace(/\b\w/g, c => c.toUpperCase());
      } catch {
        companyName = 'Unknown Company';
      }
    }

    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Scrape preview completed in ${elapsedTime}s - Found: ${companyName}`);

    res.json({
      success: !companyProfile.error,
      companyName,
      industry: companyProfile.intelligenceBrief?.industry || null,
      companySummary: companyProfile.intelligenceBrief?.companySummary || null,
      scrapedAt: companyProfile.scrapedAt || new Date().toISOString(),
      error: companyProfile.error || null
    });

  } catch (error) {
    console.error('❌ Scrape preview error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to scrape website'
    });
  }
});

export default router;
