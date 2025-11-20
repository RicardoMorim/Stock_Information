# 📊 AI-Powered Stock Analysis Platform

A full-stack financial analysis application featuring real-time stock data, portfolio management, and AI-powered investment insights. Built with modern web technologies and integrated with multiple financial data providers.

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-blue?logo=react)
![MongoDB](https://img.shields.io/badge/MongoDB-Database-green?logo=mongodb)
![AI](https://img.shields.io/badge/AI-8%20Models-purple?logo=openai)

---

## 🚀 Project Overview

This project is a comprehensive stock market analysis platform that combines real-time financial data with AI-powered insights. It demonstrates full-stack development skills, API integration, real-time data handling, and modern AI implementation patterns.

**Live Demo Features:**
- 📈 Real-time stock quotes and charts
- 💼 Personal portfolio management with P&L tracking
- 🤖 AI-powered stock and portfolio analysis
- 📰 News aggregation with sentiment analysis
- 📊 Technical indicators and fundamental metrics
- 🔐 Secure authentication and data persistence

---

## 🎯 What I Learned & Demonstrated

### **Full-Stack Development**
- ✅ **Next.js 15 App Router** - Modern React framework with server/client components
- ✅ **API Route Development** - RESTful endpoints with authentication and error handling
- ✅ **Database Integration** - MongoDB with Mongoose for portfolio persistence
- ✅ **Authentication** - JWT-based secure user authentication
- ✅ **State Management** - React Context API for global state

### **Frontend Engineering**
- ✅ **React 19** - Latest React features including hooks and concurrent rendering
- ✅ **Responsive UI** - Mobile-first design with Tailwind CSS
- ✅ **Real-time Updates** - Server-Sent Events (SSE) for streaming AI responses
- ✅ **Performance Optimization** - Client-side caching, lazy loading, code splitting
- ✅ **Data Visualization** - Charts with ApexCharts and Chart.js

### **Backend & APIs**
- ✅ **API Integration** - Multiple financial data providers with fallback chains
- ✅ **Error Handling** - Comprehensive error recovery and user feedback
- ✅ **Data Aggregation** - Parallel fetching and data normalization
- ✅ **Caching Strategy** - Redis/Upstash for rate limit optimization
- ✅ **Rate Limiting** - Smart API call management

### **AI & Machine Learning Integration**
- ✅ **Multi-Model AI System** - 8-model fallback chain for 99.9% uptime
- ✅ **Streaming Responses** - Real-time AI output with SSE
- ✅ **Prompt Engineering** - Structured prompts for financial analysis
- ✅ **Data-Driven Insights** - Technical and fundamental analysis integration
- ✅ **Sentiment Analysis** - News sentiment classification algorithms

### **Software Engineering Best Practices**
- ✅ **Modular Architecture** - Separation of concerns, reusable components
- ✅ **Error Recovery** - Graceful degradation and automatic failover
- ✅ **Logging & Debugging** - Comprehensive logging for troubleshooting
- ✅ **Documentation** - Extensive inline comments and guides
- ✅ **Code Organization** - Clean folder structure and naming conventions

---

## 🏗️ Technical Architecture

```
┌─────────────────────────────────────────────────┐
│           Frontend (React/Next.js)              │
│  • Portfolio Management UI                      │
│  • Stock Detail Pages                           │
│  • AI Analysis Components                       │
│  • Real-time Charts                             │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────┐
│              API Layer (Next.js)                │
│  • /api/stocks          • /api/portfolio        │
│  • /api/auth           • /api/ai                │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────┐
│         Services & Data Aggregation             │
│  • Stock Data Service (4 providers)            │
│  • AI Service (8 models)                       │
│  • Historical Data Service                     │
│  • News & Sentiment Service                    │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────┐
│           External APIs & Database              │
│  • Polygon.io    • MongoDB                     │
│  • Alpaca        • NVIDIA AI                   │
│  • Yahoo Finance • OpenRouter                  │
│  • Alpha Vantage • Fear & Greed Index         │
└─────────────────────────────────────────────────┘
```

---

## 🔑 Key Features

### **1. Stock Market Data Integration**
- Real-time quotes from multiple providers (Polygon, Alpaca, Yahoo Finance, Alpha Vantage)
- Automatic fallback system ensuring 99% data availability
- Historical price data with technical indicators (SMA, RSI, Bollinger Bands)
- Dividend information and financial fundamentals
- SEC filings integration

### **2. Portfolio Management**
- Add/remove stock positions with cost basis tracking
- Multi-currency support (USD, EUR, GBP, PLN)
- Real-time P&L calculation
- Automatic price updates
- Portfolio performance metrics

### **3. AI-Powered Analysis** 🤖
- **8-Model Fallback Chain:**
  - NVIDIA Models: LLaMA 3.1 Nemotron (253B), Qwen 3 (235B), MiniMax M2, GPT OSS (120B)
  - OpenRouter Models: Grok 4.1, DeepSeek R1T2, Qwen 3 Free, DeepSeek Chat v3
- Real-time streaming responses (Server-Sent Events)
- Comprehensive stock analysis:
  - Technical indicators interpretation
  - Fundamental analysis
  - News sentiment analysis
  - Risk assessment
  - Buy/hold/sell recommendations
- Portfolio analysis:
  - Diversification scoring
  - Sector allocation
  - Rebalancing recommendations
  - Risk metrics

### **4. News & Sentiment**
- Aggregated news from multiple sources
- Sentiment analysis (positive/negative/neutral)
- Recent headlines with links to sources
- Integration with Fear & Greed Index

### **5. User Experience**
- Dark mode support
- Responsive design (mobile, tablet, desktop)
- Real-time data updates
- Intuitive navigation
- Loading states and error handling
- Caching for improved performance

---

## 🛠️ Tech Stack

### **Frontend**
- **Framework:** Next.js 15 (App Router)
- **UI Library:** React 19
- **Styling:** Tailwind CSS
- **Charts:** ApexCharts, Chart.js
- **Icons:** Heroicons
- **State:** React Context API

### **Backend**
- **Runtime:** Node.js
- **API Routes:** Next.js API Routes
- **Authentication:** JWT (jsonwebtoken)
- **Database:** MongoDB with Mongoose
- **Caching:** Upstash Redis

### **External APIs**
- **Financial Data:** Polygon.io, Alpaca, Yahoo Finance, Alpha Vantage
- **AI Models:** NVIDIA NIM, OpenRouter (Grok, DeepSeek, Qwen)
- **Market Sentiment:** Fear & Greed Index API

### **Tools & Libraries**
- OpenAI SDK (for AI integrations)
- Fuse.js (fuzzy search)
- date-fns (date manipulation)
- bcrypt (password hashing)

---

## 📊 Performance & Reliability

### **API Fallback System**
```
Primary (Polygon) → Alpaca → Yahoo Finance → Alpha Vantage
```
Each service tries the next in line if the previous fails, ensuring **99%+ uptime**.

### **AI Model Reliability**
```
NVIDIA (4 models) → OpenRouter Free (4 models)
```
8 AI models ensure analysis requests succeed even during high load or provider outages.

### **Caching Strategy**
- Stock data: 15-minute cache (localStorage)
- Filing data: Persistent cache
- Redis cache for rate-limited APIs

---

## 🚀 Getting Started

### Prerequisites
```bash
Node.js 18+ 
MongoDB instance
API keys (see .env.template)
```

### Installation
```bash
# Clone the repository
git clone https://github.com/RicardoMorim/Stock_Information.git

# Install dependencies
npm install

# Set up environment variables
cp .env.template .env
# Add your API keys to .env

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Required API Keys
- `NVIDIA_NIM_API_KEY` - Get from [build.nvidia.com](https://build.nvidia.com/)
- `OPEN_ROUTER_KEY` - Get from [openrouter.ai](https://openrouter.ai/)
- `POLYGON_API_KEY` - Get from [polygon.io](https://polygon.io/)
- `ALPACA_KEY` & `ALPACA_SECRET_KEY` - Get from [alpaca.markets](https://alpaca.markets/)
- MongoDB connection string

---

## 📁 Project Structure

```
src/app/
├── api/                    # API routes
│   ├── ai/                # AI analysis endpoints
│   ├── auth/              # Authentication
│   ├── portfolio/         # Portfolio management
│   └── stocks/            # Stock data endpoints
├── components/            # React components
│   ├── Portfolio/         # Portfolio UI components
│   └── Stock/             # Stock UI components
├── contexts/              # React contexts
├── models/                # MongoDB models
├── services/              # Business logic
│   ├── aiService.js       # 8-model AI orchestration
│   ├── aiDataAggregator.js # Data collection
│   ├── stockDataService.js # Stock data fetching
│   └── ...
├── utils/                 # Utilities
│   ├── alpaca.js         # Alpaca integration
│   ├── polygon.js        # Polygon integration
│   ├── fearGreedService.js # Market sentiment
│   └── ...
└── [pages]/               # Next.js pages
```

---

## 🎓 Learning Outcomes

Through building this project, I gained expertise in:

### **Technical Skills**
1. **Full-Stack JavaScript** - End-to-end application development
2. **API Design** - RESTful principles, authentication, rate limiting
3. **Database Design** - Schema design, indexing, relationships
4. **Real-time Features** - SSE, streaming, WebSocket concepts
5. **AI Integration** - Prompt engineering, model orchestration, fallback chains
6. **Financial Data** - Market data APIs, technical indicators, portfolio math

### **Software Engineering**
1. **Architecture** - Modular design, separation of concerns
2. **Error Handling** - Graceful degradation, user feedback
3. **Performance** - Caching, lazy loading, optimization
4. **Security** - Authentication, authorization, data validation
5. **Testing** - Edge cases, error scenarios, user flows

### **Problem Solving**
1. **API Reliability** - Multi-provider fallback systems
2. **Data Normalization** - Handling different API response formats
3. **Rate Limiting** - Smart caching and request management
4. **User Experience** - Loading states, error messages, responsive design

---

## 🌟 Highlights

- 🏆 **8 AI Models** working in harmony with automatic failover
- 📊 **4 Financial Data Providers** ensuring data reliability
- ⚡ **Real-time Streaming** for AI insights
- 🎨 **Modern UI/UX** with Tailwind CSS
- 🔐 **Secure Authentication** with JWT
- 📱 **Fully Responsive** design
- 🧪 **Production Ready** with comprehensive error handling

---


## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

## 👤 Author

**Ricardo Morim**
- GitHub: [@RicardoMorim](https://github.com/RicardoMorim)
- LinkedIn: [linkedin.com/in/ricardomorim](https://linkedin.com/in/ricardomorim)

---

## 🙏 Acknowledgments

- Financial data provided by Polygon.io, Alpaca, Yahoo Finance, and Alpha Vantage
- AI powered by NVIDIA and OpenRouter
- Built with Next.js and React
- Deployed on Vercel

---

**⭐ If you found this project interesting, please consider giving it a star!**
