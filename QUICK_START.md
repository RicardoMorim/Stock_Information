# 🚀 AI Analysis Quick Start

## ⚡ Get Up and Running in 3 Steps

### Step 1: Set Environment Variables
```bash
# Add to your .env or .env.local file:
NVIDIA_NIM_API_KEY=your_key_here
OPEN_ROUTER_KEY=your_key_here
```

### Step 2: Restart Your Dev Server
```bash
npm run dev
```

### Step 3: Test the Feature
1. **Stock Analysis**: Go to `/stocks/AAPL` → Click "Analyze AAPL with AI"
2. **Portfolio Analysis**: Go to `/portfolio` → Click "Analyze My Portfolio with AI"

---

## 🎯 What You Get

### For Individual Stocks:
- 📊 Technical Analysis (SMA, RSI, volatility)
- 💼 Fundamental Analysis (financials, dividends)
- 📰 News Sentiment (positive/negative analysis)
- ⚠️ Risk Assessment
- 🎯 Investment Recommendations

### For Your Portfolio:
- 🎨 Diversification Score
- 📈 Performance Metrics
- ⚖️ Risk Analysis
- 🔄 Rebalancing Suggestions
- 🌍 Market Context

---

## 🔑 Getting API Keys

### NVIDIA (Free - 2 minutes)
1. Go to https://build.nvidia.com/
2. Click "Sign In" (use GitHub, Google, or email)
3. Go to "API Keys" section
4. Click "Generate API Key"
5. Copy and paste into `.env`

### OpenRouter (Free - 2 minutes)
1. Go to https://openrouter.ai/
2. Click "Sign In" (use Google or email)
3. Go to "Keys" page
4. Click "Create Key"
5. Copy and paste into `.env`

**Both are 100% FREE for the models we use!**

---

## 🎨 Feature Highlights

- ⚡ **Real-time Streaming** - Watch analysis appear word-by-word
- 🔄 **8-Model Fallback** - If one fails, automatically tries the next
- 🎯 **Comprehensive Data** - Uses all your existing data sources
- 🌙 **Dark Mode** - Beautiful UI that matches your app
- 📱 **Responsive** - Works on mobile, tablet, and desktop
- 🔒 **Secure** - Requires authentication for portfolio analysis

---

## 💡 Pro Tips

1. **Test with popular stocks first** (AAPL, MSFT, GOOGL) - They have the most data
2. **Wait for complete analysis** - It takes 10-30 seconds to stream
3. **Expand analysis** - Click "Expand" to see full content
4. **Refresh for updates** - Market conditions change, refresh to get new insights
5. **Use on real portfolio** - More holdings = better diversification analysis

---

## 🐛 Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| "All AI models failed" | Check your API keys are set correctly |
| "Unauthorized" | Make sure you're logged in |
| "No data available" | Try a different stock symbol (e.g., AAPL) |
| Analysis not appearing | Check browser console for errors |
| Slow streaming | Normal! Analysis takes 10-30 seconds |

---

## 📊 Model Information

You get access to **8 powerful AI models**:

**Primary (NVIDIA - Free at https://build.nvidia.com/):**
- LLaMA 3.1 Nemotron (253B params) 🔥
- Qwen 3 (235B params)
- MiniMax M2
- GPT OSS (120B params)

**Secondary (OpenRouter - Free at https://openrouter.ai/):**
- Grok 4.1 Fast ⚡
- DeepSeek R1T2 Chimera
- Qwen 3 (Free)
- DeepSeek Chat v3

---

## ✅ Verify Installation

Run this checklist:

- [ ] `openai` package installed (`npm list openai`)
- [ ] Environment variables set (check `.env`)
- [ ] Dev server restarted (`npm run dev`)
- [ ] Can access stock page (`/stocks/AAPL`)
- [ ] Can access portfolio page (`/portfolio`)
- [ ] "AI Stock Analysis" section appears on stock page
- [ ] "AI Portfolio Analysis" section appears on portfolio page

If all checked ✅, you're ready to go! 🎉

---

## 🎉 That's It!

You now have a production-ready AI analysis feature integrated into your stock app!

**Start analyzing stocks like a pro! 📈🤖**
