# ASOE Demo - Quick Start Guide

## ⚡ 3-Minute Setup

### Step 1: Add Your API Key (30 seconds)

```bash
# Open the .env file
open .env

# Replace YOUR_API_KEY_HERE with your actual Anthropic API key
# Get one here: https://console.anthropic.com/
```

Your `.env` should look like:
```
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxx...
```

### Step 2: Start Backend (Terminal 1)

```bash
cd backend
npm start
```

You should see:
```
🚀 ASOE Backend running on http://localhost:3001
📡 API endpoint: http://localhost:3001/api/generate
```

### Step 3: Start Frontend (Terminal 2)

```bash
cd frontend
npm run dev
```

You should see:
```
  VITE v6.x.x  ready in xxx ms

  ➜  Local:   http://localhost:3000/
```

### Step 4: Test It! (2 minutes)

1. Open [http://localhost:3000](http://localhost:3000)

2. **Quick Test - Net New Prospecting:**
   - Target Company: `Vercel`
   - Website URL: `https://vercel.com`
   - Industry: `SaaS/High Tech`
   - Business Challenge: `Hiring Internal is Safer`
   - Click "Generate Outreach Assets"

3. Wait 20-40 seconds (watch the progress indicators!)

4. Review the generated:
   - Email draft with "Accusation Audit" style
   - 90-second Loom script with timestamps
   - Customized "Complexity Wall" slide content

## ✅ Success Checklist

- [ ] Backend running on port 3001
- [ ] Frontend running on port 3000
- [ ] `.env` file has valid Anthropic API key
- [ ] Can see the ASOE Demo UI at localhost:3000
- [ ] Generated test assets successfully

## 🐛 Quick Troubleshooting

**"ANTHROPIC_API_KEY not set"**
- Check `.env` file exists in root directory
- Verify API key starts with `sk-ant-api03-`
- Restart backend after changing `.env`

**Port already in use**
```bash
# Kill process on port 3001 (backend)
lsof -i :3001
kill -9 <PID>

# Kill process on port 3000 (frontend)
lsof -i :3000
kill -9 <PID>
```

**Module not found errors**
```bash
# Reinstall dependencies
cd backend && npm install
cd ../frontend && npm install
```

## 📊 What to Demo

### Workflow 1: Net New (Cold Outreach)
**Best for:** Showing how AI challenges business assumptions
- Try: Vercel, Stripe, or any SaaS company website
- Shows: Web scraping + strategic analysis

### Workflow 2: Closed Lost (Re-Engagement)
**Best for:** Showing "Black Swan" methodology
- Uses: Mock Salesforce data
- Shows: Past context + new trigger = re-engagement angle

### Workflow 3: Past Client (Expansion)
**Best for:** Showing relationship leverage
- Uses: Mock Salesforce data (existing project)
- Shows: Building on trust + new opportunity

## 🎯 Key Features to Highlight

1. **Real-Time Progress** - 6-step AI pipeline visualization
2. **Confidence Scoring** - HIGH/MEDIUM/LOW fact validation
3. **Parallel Generation** - Email, Loom, Slides created simultaneously
4. **Framework-Driven** - Chris Voss "Accusation Audit" + EaaSe methodology
5. **Personalized Content** - Uses real company data from website scraping

## 📝 Next Steps

After testing, explore:
- Different industries and company types
- All three workflow types
- How confidence scores affect content
- Processing time variations (typically 20-40s)
- Editing the prompt templates in `backend/prompts/`

## 🚀 Full Documentation

See [README.md](README.md) for:
- Complete architecture details
- Prompt template customization
- Phase 4 roadmap (real Salesforce, n8n, etc.)
- Troubleshooting guide
- Future enhancements

---

**Built with Claude Sonnet 4.5** | Questions? Check [README.md](README.md)
