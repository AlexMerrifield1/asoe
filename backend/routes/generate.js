import express from 'express';
import { generateOutreachAssets } from '../agents/orchestrator.js';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { formData, workflowType } = req.body;

    // Validate input
    if (!formData || !workflowType) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'formData and workflowType are required'
      });
    }

    console.log(`\n📋 Generating outreach assets for: ${formData.companyName || formData.targetCompany}`);
    console.log(`📌 Workflow type: ${workflowType}`);

    // Generate outreach assets
    const result = await generateOutreachAssets(formData, workflowType);

    console.log(`✅ Successfully generated assets for ${formData.companyName || formData.targetCompany}\n`);

    res.json(result);
  } catch (error) {
    console.error('❌ Error generating assets:', error);
    res.status(500).json({
      error: 'Failed to generate assets',
      message: error.message
    });
  }
});

export default router;
