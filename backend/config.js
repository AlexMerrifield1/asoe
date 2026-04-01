import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '.env') });

// Verify API key is loaded
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('❌ ANTHROPIC_API_KEY not found in environment variables');
  console.error('   Please check that .env file exists and contains ANTHROPIC_API_KEY');
}

export const config = {
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development'
};
