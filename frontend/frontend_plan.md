# Vizzy Frontend Implementation Plan

> **Document Version:** 1.2  
> **Last Updated:** Feb 4, 2026  
> **Status:** In Progress

---

## 1. Tech Stack

| Layer | Technology | Why |
|-------|------------|-----|
| **Framework** | React 18 + Vite | Fast dev server, simple SPA |
| **Routing** | React Router v6 | Client-side routing |
| **Styling** | Tailwind CSS v4 | Utility-first CSS |
| **State** | Zustand | Lightweight global state |
| **Data Fetching** | TanStack Query | Caching, refetching, loading states |
| **Forms** | React Hook Form + Zod | Validation, performance |
| **Charts** | Recharts | React-native, interactive, DA-focused |
| **HTTP** | Axios | JWT interceptors |
| **Icons** | Heroicons | Consistent with Tailwind |

---

## 2. Interactive Charts (Recharts)

### Available Chart Types

| Chart | Use Case |
|-------|----------|
| **BarChart** | Category comparisons, distributions |
| **LineChart** | Trends over time, user growth |
| **AreaChart** | Cumulative trends |
| **PieChart** | Proportions (donut via `innerRadius`) |
| **Treemap** | Hierarchical data, storage breakdown |
| **ScatterChart** | Correlations |
| **RadarChart** | Multi-dimensional comparisons |
| **FunnelChart** | Conversion analysis |
| **ComposedChart** | Mix bar + line + area |

---

## 3. Project Structure

```
frontend/
├── src/
│   ├── pages/
│   │   ├── public/          # Landing, Login, Register
│   │   ├── user/            # Dashboard, Datasets, Chat, etc.
│   │   └── admin/           # Admin panel pages
│   ├── components/
│   │   ├── ui/              # Button, Input, Modal, Table
│   │   ├── layout/          # Sidebar, Header, Guards
│   │   ├── charts/          # Wrapped Recharts components
│   │   └── forms/           # Form components
│   ├── lib/
│   │   ├── api/             # API client modules
│   │   └── store/           # Zustand stores
│   ├── hooks/               # Custom hooks
│   ├── types/               # TypeScript types
│   ├── App.tsx              # Router
│   └── main.tsx             # Entry
├── .env                     # VITE_API_URL
└── package.json
```

---

## 4. API Client Modules

| Module | Backend Endpoints |
|--------|-------------------|
| `auth.ts` | POST /auth/login, register, refresh |
| `users.ts` | GET /users/me, list, activate, delete |
| `datasets.ts` | CRUD /datasets, versions, upload |
| `chat.ts` | GET/POST /chat sessions, messages |
| `externalDb.ts` | POST /external-db test, tables, ingest |
| `cleaning.ts` | GET/POST cleaning plans, apply |
| `downloads.ts` | GET /download raw, cleaned |
| `dashboards.ts` | CRUD /dashboards |
| `audit.ts` | GET /audit (admin) |

---

## 5. Pages to Implement

| Route | Page | Backend APIs | Status |
|-------|------|--------------|--------|
| `/` | Landing | — | ✅ Created |
| `/login` | Login | auth | ✅ Created |
| `/register` | Register | auth | ✅ Created |
| `/admin/login` | Admin Login | auth | ✅ Created |
| `/dashboard` | User Dashboard | datasets, chat | ⏳ Pending |
| `/datasets` | Dataset List | datasets | ⏳ Pending |
| `/upload` | File Upload | datasets, upload | ⏳ Pending |
| `/connect-db` | External DB | externalDb | ⏳ Pending |
| `/chat` | Chat Interface | chat | ⏳ Pending |
| `/cleaning/:id` | Data Cleaning | cleaning | ⏳ Pending |
| `/downloads` | Downloads | downloads | ⏳ Pending |
| `/admin` | Admin Dashboard | users, datasets | ⏳ Pending |
| `/admin/users` | User Management | users | ⏳ Pending |
| `/admin/datasets` | All Datasets | datasets | ⏳ Pending |
| `/admin/audit` | Audit Logs | audit | ⏳ Pending |

---

## 6. Implementation Roadmap

### Week 1: Setup & Auth
- [x] Create Vite + React project
- [x] Configure Tailwind CSS v4
- [x] Setup Axios with JWT interceptors
- [x] Build Login/Register pages
- [ ] Implement AuthGuard
- [ ] Fix Tailwind styling issues

### Week 2: Core Features
- [ ] User Dashboard with KPI cards
- [ ] Dataset list, create, delete
- [ ] File upload with drag-drop
- [ ] External DB connection form

### Week 3: Chat & Analysis
- [ ] Chat sessions sidebar
- [ ] Message interface with AI responses
- [ ] Interactive chart rendering from AI
- [ ] Data cleaning interface
- [ ] Download options

### Week 4: Admin Panel
- [ ] Admin dashboard with analytics charts
- [ ] User management table
- [ ] All datasets view
- [ ] Audit logs

---

## 7. Key Decisions Summary

| Decision | Choice | Reason |
|----------|--------|--------|
| Framework | React + Vite (not Next.js) | Already have FastAPI backend, no SSR needed |
| Charts | Recharts (not Chart.js) | React-native API, built-in Treemap/Funnel |
| State | Zustand (not Redux) | Simpler, less boilerplate |
| Forms | React Hook Form (not Formik) | Better performance, smaller bundle |

---so 

## 8. Brand Colors (Vizzy)

```css
--navy: #14213d
--primary-blue: #2962ff
--accent-cyan: #00c2ff
--accent-orange: #ff6b35
--admin-purple: #7c3aed
```

---

## 9. Current Files Created

| File | Purpose |
|------|---------|
| `src/pages/public/Landing.tsx` | Landing page |
| `src/pages/public/Login.tsx` | User login |
| `src/pages/public/Register.tsx` | User registration |
| `src/pages/public/AdminLogin.tsx` | Admin login |
| `src/lib/api/client.ts` | Axios instance with interceptors |
| `src/lib/api/auth.ts` | Auth API module |
| `src/lib/store/authStore.ts` | Zustand auth store |
| `src/types/index.ts` | TypeScript types |

---

## Ready to Continue ✅

This plan covers everything needed to build the Vizzy frontend.
