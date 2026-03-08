# 🎓 CampusBarter

> **A skill-trading platform for SAIT students** — Trade what you know for what you need, powered by Time Credits.

[![CI/CD Pipeline](https://github.com/Aniket-ui1/campusBarter-mobile/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/Aniket-ui1/campusBarter-mobile/actions)
[![Security Scan](https://img.shields.io/badge/Security-A+-brightgreen)](https://github.com/Aniket-ui1/campusBarter-mobile/security)
[![API Status](https://img.shields.io/badge/API-Live-blue)](https://campusbarter-api-f3b4ascaemgthae3.canadacentral-01.azurewebsites.net/health)

---

## 📸 Features

| Feature | Description |
|---------|-------------|
| 🔐 **SAIT Auth** | Microsoft Entra ID (Azure AD) — only `@edu.sait.ca` emails |
| 📦 **Listings** | Post skills you OFFER or REQUEST with Time Credits |
| 💬 **Real-Time Chat** | Socket.io WebSocket messaging with typing indicators |
| ⏱️ **Time Credits** | Earn by helping, spend by getting help — no real money |
| 🔄 **QR Exchange** | In-person verification with unique exchange codes |
| 🏆 **Leaderboard** | Weekly top helpers — resets every Monday |
| 📊 **Market Insights** | Trending listings, category analytics, campus stats |
| 🔔 **Smart Matching** | Auto-notify users when a matching listing appears |
| ⭐ **Reviews** | Rate and review your exchange partners |
| 🛡️ **Admin Dashboard** | Manage listings, users, and view audit logs |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                 Mobile App (Expo / React Native)     │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │ Screens  │  │ Context  │  │  lib/api.ts      │   │
│  │ (Expo    │◄─┤ Auth +   │◄─┤  lib/socket.ts   │   │
│  │  Router) │  │ Data     │  │  (HTTP + WS)     │   │
│  └──────────┘  └──────────┘  └────────┬─────────┘   │
└───────────────────────────────────────┼─────────────┘
                                        │ HTTPS + WSS
                                        ▼
┌─────────────────────────────────────────────────────┐
│           Azure App Service (Node 22, Linux)         │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │ Express  │  │ Socket.io│  │ Middleware        │   │
│  │ REST API │  │ WebSocket│  │ - Azure AD JWT    │   │
│  │ /api/v1/*│  │ Server   │  │ - RBAC            │   │
│  └────┬─────┘  └──────────┘  │ - Rate Limiting   │   │
│       │                      │ - Helmet CSP       │   │
│       ▼                      └──────────────────┘   │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │ Azure    │  │ Azure    │  │ Azure Key Vault   │   │
│  │ SQL DB   │  │ Blob     │  │ (Secrets)         │   │
│  │ (8 tables│  │ Storage  │  │                   │   │
│  └──────────┘  └──────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ (22 recommended)
- **npm** 9+
- **Expo CLI**: `npm install -g @expo/cli`
- **Expo Go** app on your phone (iOS/Android)

### 1. Clone & Install

```bash
git clone https://github.com/Aniket-ui1/campusBarter-mobile.git
cd campusBarter-mobile

# Frontend
npm install

# Backend
cd backend && npm install && cd ..
```

### 2. Environment Variables

Create a `.env` file in the root:

```env
EXPO_PUBLIC_API_URL=https://campusbarter-api-f3b4ascaemgthae3.canadacentral-01.azurewebsites.net
```

Backend environment (set in Azure App Service → Configuration):

| Variable | Description |
|----------|-------------|
| `SQL_CONNECTION_STRING` | Azure SQL connection string (from Key Vault) |
| `JWT_SECRET` | Token signing secret (from Key Vault) |
| `AZURE_STORAGE_CONNECTION_STRING` | Blob storage connection string |
| `AZURE_AD_TENANT_ID` | Microsoft Entra ID tenant |
| `AZURE_AD_CLIENT_ID` | App registration client ID |
| `PORT` | Server port (default: 3000) |

### 3. Run Locally

```bash
# Start the mobile app
npx expo start

# Start the backend (in another terminal)
cd backend && npm run dev
```

### 4. Run with local CORS proxy (for web dev)

```bash
node dev-proxy.js      # Starts proxy on port 3999
npx expo start --web   # App connects via proxy
```

---

## 🔗 Live URLs

| Resource | URL |
|----------|-----|
| **API (Production)** | https://campusbarter-api-f3b4ascaemgthae3.canadacentral-01.azurewebsites.net |
| **Health Check** | https://campusbarter-api-f3b4ascaemgthae3.canadacentral-01.azurewebsites.net/health |
| **GitHub Repo** | https://github.com/Aniket-ui1/campusBarter-mobile |
| **CI/CD Pipeline** | https://github.com/Aniket-ui1/campusBarter-mobile/actions |

---

## 📚 API Documentation

Full OpenAPI 3.1 spec: [`docs/openapi.yaml`](docs/openapi.yaml)

### Key Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| `GET` | `/health` | ❌ | Health check |
| `GET` | `/api/v1/listings` | ✅ | All open listings |
| `POST` | `/api/v1/listings` | ✅ | Create listing |
| `GET` | `/api/v1/chats` | ✅ | User's chats |
| `POST` | `/api/v1/chats/:id/messages` | ✅ | Send message |
| `GET` | `/api/v1/insights/leaderboard` | ✅ | Weekly top helpers |
| `GET` | `/api/v1/insights/market` | ✅ | Market analytics |
| `POST` | `/api/v1/insights/exchange` | ✅ | Create QR exchange |
| `GET` | `/api/v1/credits/balance` | ✅ | Credit balance |
| `POST` | `/api/v1/upload` | ✅ | Upload image |

> All authenticated endpoints require `Authorization: Bearer <Azure AD token>`

---

## 🗄️ Database Schema

**10 tables** in Azure SQL:

| Table | Purpose |
|-------|---------|
| `Users` | Student profiles, roles, credits |
| `Listings` | OFFER/REQUEST listings |
| `Chats` | Chat rooms |
| `ChatParticipants` | Many-to-many users ↔ chats |
| `Messages` | Chat messages |
| `Notifications` | Push + in-app notifications |
| `Reviews` | User reviews (1-5 stars) |
| `AuditLog` | Security audit trail |
| `TimeCredits` | Credit transaction ledger |
| `Exchanges` | QR exchange verification |

Schema file: [`infrastructure/schema.sql`](infrastructure/schema.sql)

---

## 🛡️ Security

- **Authentication**: Microsoft Entra ID (Azure AD) with SAIT email enforcement
- **Authorization**: Role-Based Access Control (Student / Moderator / Admin)
- **API Security**: Helmet CSP, HSTS preload, rate limiting (100 req/15min), CORS
- **Data**: Parameterized SQL queries, Azure Key Vault for secrets
- **Headers**: Content-Security-Policy, X-Frame-Options, Permissions-Policy
- **Monitoring**: Azure Application Insights, audit logging middleware

Security docs: [`infrastructure/security.md`](infrastructure/security.md) | [`infrastructure/security-headers.md`](infrastructure/security-headers.md)

---

## 🧪 Testing

```bash
# Backend TypeScript check
cd backend && npx tsc --noEmit

# NPM security audit
cd backend && npm audit

# Load test (requires k6)
k6 run tests/load-test.js

# E2E manual testing
# See tests/e2e-checklist.md
```

---

## 📁 Project Structure

```
campusBarter-mobile/
├── app/                    # Expo Router screens
│   ├── (tabs)/             # Tab navigation (Home, Search, Post, Chats, Profile)
│   ├── (auth)/             # Auth screens (Welcome, Register)
│   ├── (onboarding)/       # Tutorial + profile setup
│   ├── chat/[id].tsx       # Chat detail
│   ├── exchange.tsx        # QR exchange verification
│   ├── leaderboard.tsx     # Weekly leaderboard
│   ├── insights.tsx        # Market insights dashboard
│   ├── credits.tsx         # Time credits balance
│   ├── reviews/[userId].tsx # User reviews
│   └── admin.tsx           # Admin dashboard
├── backend/                # Express.js API server
│   └── src/
│       ├── server.ts       # Express + Socket.io entry point
│       ├── db.ts           # Azure SQL data access layer
│       ├── middleware/      # Auth, validation, RBAC
│       ├── routes/          # REST API routes (10 files)
│       ├── socket.ts        # WebSocket event handlers
│       └── matcher.ts       # Smart matching engine
├── context/                # React context (Auth, Data)
├── lib/                    # API client, socket.io client
├── components/             # Reusable UI components
├── constants/              # Theme, categories
├── infrastructure/         # Azure resources, SQL schema, security docs
├── docs/                   # OpenAPI spec
├── tests/                  # Load tests, E2E checklist
└── .github/workflows/      # CI/CD pipeline
```

---

## 🔄 CI/CD Pipeline

GitHub Actions workflow (`.github/workflows/ci-cd.yml`):

1. **🔒 Security Scan** — `npm audit`
2. **🧹 Lint Check** — ESLint
3. **📦 TypeScript Build** — `tsc --noEmit`
4. **☁️ Deploy to Azure** — Azure App Service deployment

Triggers on every push to `main`.

---

## 👥 Team

Developed as part of the **SAIT ITS Program** capstone project.

---

## 📄 License

This project is for educational purposes as part of the SAIT curriculum.
