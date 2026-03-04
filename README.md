# 📊 Vizzy Pro - AI-Powered Business Intelligence Platform

<p align="center">
  <img src="https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Frontend-React%20v19-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/Database-DuckDB-FFF000?style=for-the-badge&logo=duckdb&logoColor=black" alt="DuckDB" />
  <img src="https://img.shields.io/badge/AI-Groq%20%26%20Gemini-orange?style=for-the-badge" alt="AI" />
  <img src="https://img.shields.io/badge/Styling-Tailwind%20v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind" />
</p>

---

## 🚀 Overview

**Vizzy Pro** is a state-of-the-art, production-grade analytics platform that bridges the gap between raw datasets and actionable business intelligence. By marrying **Advanced LLM Orchestration** with a **Deterministic Heuristic Engine**, Vizzy allows users to interact with their data naturally while maintaining absolute mathematical precision.

> "Talk to your data as if it were a senior analyst, with the speed of a machine."

---

## ✨ Key Features

### 🧠 Intent-Driven Analytics
- **Conversational SQL**: Powered by a multi-provider LLM gateway (Groq, Gemini, Llama-3) with automatic failover.
- **Context-Aware Memory**: Seamless follow-up questions via a sophisticated intent-orchestration layer.
- **Auto-Domain Detection**: Instant classification of datasets (Sales, Finance, Healthcare, Marketing) for tailored insights.

### 🎨 Visual Excellence
- **Smart Chart Recommendation**: Intelligent selection of optimal visualizations (Bar, Line, Scatter, Pie) based on data cardinality.
- **Glassmorphism UI**: A premium, modern interface built with **Tailwind CSS v4** and **Framer Motion**.
- **Interactive Dashboards**: Real-time multi-widget generation for comprehensive data overview.

### 🧼 Data Cleaning Studio 2.0
- **Automated Health Checks**: Evaluation of data quality with a transparent scoring system and risk levels.
- **One-Click Cleaning**: Advanced heuristics to resolve duplicates, nulls, and data type inconsistencies.
- **Visual Penalty Breakdown**: Transparent insights into *why* your data needs attention.

---

## 🏗️ Technical Architecture

### Tech Stack
- **Frontend**: `React 19`, `Vite`, `Tailwind CSS v4`, `Zustand`, `TanStack Query`, `Recharts`.
- **Backend**: `FastAPI`, `DuckDB`, `Groq SDK`, `Tiktoken`.
- **Logic**: Async task orchestration, deterministic heuristic engines, and semantic intent mapping.

### Project Structure
```text
├── 📂 backend              # FastAPI Analytics Engine
│   ├── 📂 app/api          # API Route Definitions
│   ├── 📂 app/core         # Security, Logger, Config
│   ├── 📂 app/models       # Database Schema & Models
│   └── 📂 app/services     # Core Logic (LLM, Charts, Cleaning)
├── 📂 frontend             # React v19 UI Application
│   ├── 📂 src/components   # Shared UI Components
│   ├── 📂 src/pages        # Application Pages
│   └── 📂 src/store        # Zustand State Management
├── 📂 streamlit            # Internal Tools & Logic Previews
└── 📂 ui-prototype         # Design Mockups & Static Assets
```

---

## 🛠️ Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- [Groq API Key](https://console.groq.com/) or [Gemini API Key](https://aistudio.google.com/)

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Configure your environment:
   - Create a `.env` file based on `.env.example`.
   - Add your `GROQ_API_KEY` and `GEMINI_API_KEY`.
4. Launch the server:
   ```bash
   uvicorn app.main:app --reload
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install packages:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

---

## 🗺️ Roadmap
- [ ] **Heuristic Fast-Path**: Bypassing LLMs for standard queries to achieve <100ms latency.
- [ ] **Predictive Insights**: Integration of Prophet for time-series forecasting.
- [ ] **Data Engineering Agents**: Recursive task planning for multi-step cleaning operations.
- [ ] **Enterprise Export**: PDF Insight Reports and specialized CSV exporters.

---

<p align="center">
  Built with ❤️ for the next generation of Data Professionals.
</p>
