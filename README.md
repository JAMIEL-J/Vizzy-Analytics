# 📊 Vizzy Pro - Next-Generation AI-Powered Analytics Platform

<div align="center">

![Version](https://img.shields.io/badge/Version-2.0-blue?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Production%20Ready-success?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

### Transform Raw Data into Actionable Intelligence with Conversational AI

<br>

**[🚀 Quick Start](#-getting-started)** • **[📚 Documentation](#-documentation)** • **[🎯 Features](#-core-features)** • **[🏗️ Architecture](#-system-architecture)**

</div>

---

## 🎯 Overview

**Vizzy Pro** is a revolutionary, enterprise-grade analytics platform that synthesizes **Advanced LLM Orchestration** with **Deterministic Computing Logic** to unlock the full potential of your data. Designed for modern data professionals, analysts, and business leaders—Vizzy enables natural language interaction with datasets while guaranteeing mathematical precision and auditability.

> **"Talk to your data like a senior analyst. Get answers at machine speed."**

### Why Vizzy?
- 🔮 **Natural Language Querying**: Ask questions in plain English, not SQL
- ⚡ **Lightning-Fast Insights**: Get complex analyses in seconds
- 🧠 **Context-Aware Conversations**: Follow-up questions maintain conversation history
- 🎨 **Auto-Visualizations**: Optimal chart recommendations based on data patterns
- 🧼 **Smart Data Cleaning**: Automated quality assessment and remediation
- 🔐 **Enterprise-Ready**: Audit trails, role-based access, and data governance

---

## 🚀 Core Features

### 🧠 **Conversational Analytics Engine**
- **Multi-LLM Gateway**: Seamless integration with Groq, Gemini, and Llama-3 with intelligent failover
- **Intent Recognition**: Automatic classification of user queries into actionable analysis patterns
- **Context Memory**: Sophisticated session management preserving conversation history
- **Domain Detection**: Auto-identification of dataset types (Sales, Finance, Healthcare, Marketing, Custom)

### 📊 **Visual Intelligence Suite**
- **Smart Chart Selection**: ML-powered visualization recommender based on data cardinality and trends
- **Interactive Dashboards**: Real-time, multi-widget dashboards with drill-down capabilities
- **Glassmorphism Design**: Premium UI with Tailwind CSS v4 + Framer Motion animations
- **Export Ready**: Download dashboards as PNG, PDF, or interactive HTML

### 🧼 **Data Cleaning Studio 2.0**
- **Automated Profiling**: Comprehensive data quality assessment with risk scoring
- **Intelligent Remediation**: One-click cleaning for duplicates, nulls, type mismatches, outliers
- **Transparency First**: Visual penalty breakdown explaining *why* data needs attention
- **Version Control**: Track and compare data versions across cleaning operations

### 📈 **Advanced Analytics**
- **Pivot Tables**: Dynamic cross-tabulation with custom aggregations
- **Outlier Detection**: Statistical anomaly identification with context
- **Column Filtering**: Intelligent semantic filtering across all dimensions
- **Business Metrics**: Pre-built KPI calculators and metric libraries

---

## 📋 System Properties

### **Frontend Stack**
| Component | Version | Purpose |
|-----------|---------|---------|
| React | 19.2.4 | UI Framework |
| TypeScript | 5.9.3 | Type Safety |
| Vite | 7.2.4 | Build Tool |
| Tailwind CSS | 4.1.18 | Styling Engine |
| Framer Motion | 12.34.3 | Animations |
| Zustand | 5.0.11 | State Management |
| TanStack Query | 5.90.20 | Data Fetching |
| Recharts | 3.7.0 | Charting Library |
| Axios | 1.13.4 | HTTP Client |
| React Router | 7.13.0 | Navigation |

### **Backend Stack**
| Component | Version | Purpose |
|-----------|---------|---------|
| FastAPI | Latest | API Framework |
| DuckDB | ≥1.0.0 | In-Memory Analytics DB |
| Groq SDK | ≥0.9.0 | LLM Integration |
| SQLGlot | ≥25.0.0 | SQL Parsing & Translation |
| Tiktoken | ≥0.7.0 | Token Counting |
| Python | 3.10+ | Runtime |

### **Key Metrics**
- **Response Time**: <500ms for typical queries
- **Max Dataset Size**: Up to 2GB (in-memory with DuckDB)
- **Concurrent Users**: 100+ (with proper infrastructure)
- **Query Cache**: In-memory LRU with 1-hour TTL
- **API Rate Limit**: 1000 req/min per API key

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         VIZZY PRO ARCHITECTURE                          │
└─────────────────────────────────────────────────────────────────────────┘

                              ┌──────────────┐
                              │   End User   │
                              └──────┬───────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
            ┌───────▼──────┐  ┌──────▼──────┐  ┌─────▼──────┐
            │   Analytics  │  │  Dashboard  │  │   Chat     │
            │   Engine     │  │  Builder    │  │   Interface│
            └───────┬──────┘  └──────┬──────┘  └─────┬──────┘
                    │                │                │
                    └────────────────┼────────────────┘
                                     │
                    ┌────────────────▼────────────────┐
                    │     REACT 19 FRONTEND LAYER     │
                    │  (Zustand + TanStack Query)     │
                    └────────────────┬────────────────┘
                                     │
                    ┌────────────────▼────────────────┐
                    │    HTTP/REST API Gateway        │
                    │  (Rate Limiting, Auth, Logging) │
                    └────────────────┬────────────────┘
                                     │
        ┌────────────────────────────┼────────────────────────────┐
        │                            │                            │
    ┌───▼────────┐      ┌───────────▼───────────┐      ┌─────────▼──────┐
    │ Intent     │      │ Analysis              │      │ Cleaning       │
    │ Engine     │      │ Execution Layer       │      │ Engine         │
    │            │      │                       │      │                │
    │ • Intent   │      │ • SQL Generation      │      │ • Anomaly      │
    │   Mapper   │      │ • Query Validation    │      │   Detection    │
    │ • Business │      │ • Result Formatting   │      │ • Duplicate    │
    │   Rules    │      │ • Memory Manager      │      │   Removal      │
    └───┬────────┘      └───────────┬───────────┘      └─────────┬──────┘
        │                           │                           │
        └───────────────────────────┼───────────────────────────┘
                                    │
        ┌───────────────────────────▼───────────────────────────┐
        │        DETERMINISTIC COMPUTATION LAYER                │
        │  (Heuristic Rules, Type System, Risk Scoring)         │
        └───────────────────────────┬───────────────────────────┘
                                    │
        ┌───────────────────────────▼───────────────────────────┐
        │         DATA ACCESS & QUERY ENGINE                    │
        │                                                       │
        │  ┌─────────────────┐    ┌──────────────────────┐      │
        │  │ DuckDB Engine   │    │ External Database    │      │
        │  │ (In-Memory)     │    │ Connectors           │      │
        │  │                 │    │ • PostgreSQL         │      │
        │  │ • CSV/Parquet   │    │ • MySQL              │      │
        │  │   Ingestion     │    │ • SQL Server         │      │
        │  │ • Query Exec    │    │ • BigQuery           │      │
        │  │ • Analytics     │    └──────────────────────┘      │
        │  └─────────────────┘                                  │
        └───────────────────────────┬───────────────────────────┘
                                    │
        ┌───────────────────────────▼───────────────────────────┐
        │           EXTERNAL INTEGRATIONS                       │
        │                                                       │
        │  ┌────────────────┐  ┌────────────────┐              │
        │  │ LLM Providers  │  │ Storage Layer  │              │
        │  │ • Groq API     │  │ • File Upload  │              │
        │  │ • Gemini API   │  │ • Cloud Storage│              │
        │  │ • Stripe       │  │                │              │
        │  │   Failover     │  └────────────────┘              │
        │  └────────────────┘                                  │
        └─────────────────────────────────────────────────────┘
```

### **Component Deep Dive**

#### **Frontend Layer (React 19)**
- **Components**: Reusable UI blocks with Tailwind CSS v4
- **State Management**: Zustand for global state, React Context for theme
- **Data Fetching**: TanStack Query (React Query) for server state
- **Visualization**: Recharts for charts, Framer Motion for animations
- **Routing**: React Router v7 for navigation

#### **API Gateway**
- **Security**: JWT authentication, CORS, CSRF protection
- **Rate Limiting**: Sliding window rate limiter (1000 req/min)
- **Logging**: Structured JSON logging with request/response tracking
- **Error Handling**: Standardized error responses with trace IDs

#### **Intent Processing Engine**
- **Intent Mapper**: Maps queries to 15+ predefined intent patterns
- **Semantic Resolver**: Column name fuzzy matching and aliasing
- **Business Rules**: Domain-specific validation and business logic
- **Memory Manager**: Session-aware conversation context persistence

#### **Analysis Execution**
- **SQL Generator**: LLM-powered SQL with fallback heuristics
- **Query Validator**: Syntax and semantic validation
- **Result Formatter**: Transforms raw query results for frontend
- **Chart Recommender**: Selects optimal visualization type

#### **Data Engine (DuckDB)**
- **Format Support**: CSV, Parquet, JSON, Arrow
- **In-Memory Performance**: Sub-second query execution
- **Schema Inference**: Automatic type detection
- **Version Control**: Track dataset versions and transformations

#### **Cleaning Engine**
- **Profiler**: Column-level statistics and data quality metrics
- **Anomaly Detector**: Statistical outlier identification
- **Duplicate Handler**: Smart deduplication with conflict resolution
- **Type Converter**: Automatic or manual type conversion

---

## 🔧 Project Structure

```
vizzy-analytics/
├── backend/                          # FastAPI Backend
│   ├── app/
│   │   ├── api/                    # API Endpoints
│   │   │   ├── analysis_routes.py
│   │   │   ├── chat_routes.py
│   │   │   ├── cleaning_plan_routes.py
│   │   │   ├── dashboard_routes.py
│   │   │   ├── upload_routes.py
│   │   │   └── ...
│   │   ├── core/                   # Configuration & Security
│   │   │   ├── config.py
│   │   │   ├── security.py
│   │   │   ├── logger.py
│   │   │   └── exceptions.py
│   │   ├── models/                 # Data Models
│   │   │   ├── user.py
│   │   │   ├── dataset.py
│   │   │   ├── chat_session.py
│   │   │   └── ...
│   │   ├── services/               # Business Logic
│   │   │   ├── llm/                # LLM Integration
│   │   │   ├── analytics/          # Analytics Logic
│   │   │   ├── cleaning_execution/ # Data Cleaning
│   │   │   ├── visualization/      # Chart Generation
│   │   │   └── ...
│   │   └── main.py                # App Entry Point
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/                         # React 19 Frontend
│   ├── src/
│   │   ├── components/             # Reusable Components
│   │   │   ├── Analytics/
│   │   │   ├── Dashboard/
│   │   │   ├── Chat/
│   │   │   └── ...
│   │   ├── pages/                  # Page Components
│   │   │   ├── AnalyticsPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   └── ...
│   │   ├── store/                  # Zustand Store
│   │   └── App.tsx
│   ├── public/                     # Static Assets
│   ├── index.html
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── package.json
│
├── ui-prototype/                    # Design Files
├── streamlit/                       # Internal Tools
├── README.md
└── docker-compose.yml (Optional)
```

---

## 🛠️ Getting Started

### **Prerequisites**
- Python 3.10+ — [Download](https://www.python.org/downloads/)
- Node.js 18+ — [Download](https://nodejs.org/)
- API Keys:
  - [Groq API Key](https://console.groq.com/) (Primary LLM)
  - [Gemini API Key](https://aistudio.google.com/) (Fallback)

### **Backend Setup**

```bash
# 1. Navigate to backend
cd backend

# 2. Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Create environment file
cp .env.example .env
# Edit .env and add your API keys

# 5. Start the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Backend URL**: `http://localhost:8000`
**API Docs**: `http://localhost:8000/docs`

### **Frontend Setup**

```bash
# 1. Navigate to frontend
cd frontend

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.example .env
# Configure API endpoint (default: http://localhost:8000)

# 4. Start development server
npm run dev
```

**Frontend URL**: `http://localhost:5173`

### **Production Build**

```bash
# Frontend
npm run build
npm run preview

# Backend
gunicorn -w 4 -k uvicorn.workers.UvicornWorker app.main:app
```

---

## 📚 API Documentation

### **Key Endpoints**

**Analytics**
```
POST /api/analysis/chat        # Send query to AI engine
GET  /api/analysis/history     # Get query history
POST /api/analysis/save        # Save analysis
```

**Dashboards**
```
GET  /api/dashboards           # List dashboards
POST /api/dashboards           # Create dashboard
PUT  /api/dashboards/{id}      # Update dashboard
```

**Data Cleaning**
```
POST /api/cleaning/assess      # Assess data quality
POST /api/cleaning/execute     # Execute cleaning plan
GET  /api/cleaning/history     # Get cleaning history
```

**Dataset Management**
```
POST /api/datasets/upload      # Upload CSV/Parquet
GET  /api/datasets             # List datasets
DELETE /api/datasets/{id}      # Delete dataset
```

Full API documentation available at `http://localhost:8000/docs` (Swagger UI)

---

## 🚀 Deployment

### **Docker**
```bash
docker-compose up
```

### **Cloud Platforms**
- **Vercel** (Frontend)
- **AWS Lambda / Google Cloud Run** (Backend)
- **Render / Railway** (Full Stack)

---

## 🗺️ Roadmap

- [ ] **Sub-100ms Queries**: Heuristic fast-path for standard queries
- [ ] **Time-Series Forecasting**: Prophet integration for trend prediction
- [ ] **Advanced Data Engineering**: Multi-step cleaning orchestration
- [ ] **Enterprise Export**: PDF reports, specialized data exports
- [ ] **Team Collaboration**: Real-time dashboards, comments, annotations
- [ ] **Data Catalog**: Automated metadata and data lineage tracking
- [ ] **Custom AI Models**: Fine-tuned models for domain-specific queries

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

---

## 📄 License

Vizzy Pro is released under the [MIT License](LICENSE).

---

## 💡 Support & Resources

- 📖 [Documentation](https://docs.vizzy.dev)
- 💬 [Community Discord](https://discord.gg/vizzy)
- 🐛 [Report Issues](https://github.com/vizzy/analytics/issues)
- 📧 [Email Support](mailto:support@vizzy.dev)

---

<div align="center">

### 🎉 Transform Your Data, Today

**[Get Started →](#-getting-started)**

Built with ❤️ for the next generation of Data Professionals.

*Vizzy Pro • © 2024-2026 • [Website](https://vizzy.dev)*

</div>
