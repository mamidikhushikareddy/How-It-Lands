<div align="center">

# 💬 How It Lands

### *Think Before You Send.*

**How It Lands** is an AI-powered communication coach that helps you understand **how your message will be perceived before you hit send.** Analyze conversations, receive strategic rewrites, simulate possible replies, and improve your communication with real-time AI coaching.

<p>
  <img src="https://img.shields.io/badge/Version-v0.1-blue?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Status-Active-success?style=for-the-badge" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" />

  <a href="https://app.notion.com/p/PRD-How-It-Lands-3a45e82851bf801db597f082c1ec319e?source=copy_link">
    <img src="https://img.shields.io/badge/Product%20Requirements-View%20PRD-8A2BE2?style=for-the-badge" />
  </a>

  <a href="docs/How%20It%20Lands-%20Research.xlsx">
    <img src="https://img.shields.io/badge/Product%20Research-Excel%20Workbook-2E8B57?style=for-the-badge" />
  </a>
</p>

**Current Version:** **v0.1**

*The first public release focused on validating the core communication intelligence engine.*

### 🧠 Communicate with confidence, not uncertainty.

</div>

---

# ✨ Features

### 📝 AI Message Analysis
Analyze how your message is likely to be perceived across multiple communication dimensions.

### ✨ AI Rewrite Suggestions
Receive context-aware rewrites that improve tone, clarity, empathy, and intent.

### 💬 Conversation Path Simulator
Preview possible conversation outcomes before sending a message.

### 🎯 Communication Coach
Chat with an AI coach for personalized communication guidance.

### 📊 Diagnostics Dashboard
Track communication patterns and insights over time.

### 📧 Smart Email Reports
Receive AI-generated analysis reports directly in your inbox.

### 🔒 Secure Authentication
Email authentication, Google Sign-In, password reset, and security notifications.

### ⚡ Offline AI Fallback
Gracefully falls back when AI services are unavailable.

---

# 🚀 Why How It Lands?

Most messaging apps help you **send messages.**

**How It Lands helps you understand how they'll be received.**

Whether you're:

- Negotiating
- Giving feedback
- Handling conflict
- Communicating with colleagues
- Texting someone important

The goal is simple:

> **Reduce misunderstandings before they happen.**

---

# 📄 Product Requirements Document

Product thinking is at the heart of **How It Lands**.

Explore the complete **Product Requirements Document (PRD)** to understand the product vision, research, user journeys, feature specifications, roadmap, and success metrics behind the project.

<div align="center">

### 👉 **[View the Complete PRD on Notion](https://app.notion.com/p/PRD-How-It-Lands-3a45e82851bf801db597f082c1ec319e?source=copy_link)**

</div>

---

# 🛠 Tech Stack

| Layer | Technologies |
|--------|--------------|
| **Frontend** | React, TypeScript, Tailwind CSS |
| **Backend** | Node.js, Express |
| **Database** | PostgreSQL |
| **AI** | Google Gemini |
| **Authentication** | Google OAuth + Email Authentication |
| **Deployment** | Render |
| **Build Tools** | Vite, ESBuild |

---

# 🏗 Architecture

```text
                User
                  │
                  ▼
        React + TypeScript UI
                  │
                  ▼
          Express API Server
         ┌────────┴────────┐
         ▼                 ▼
    Gemini AI        PostgreSQL
         │                 │
         └────────┬────────┘
                  ▼
      Analysis • Coaching
   Conversation Simulation
   Notifications & Reports
```

---

# 📂 Project Structure

```text
.
├── client/          Frontend
├── server/          Backend APIs
├── shared/          Shared schemas
├── migrations/      Database migrations
├── public/          Static assets
├── docs/            Documentation
└── dist/            Production build
```

---

# ⚙️ Prerequisites

- Node.js **20+**
- PostgreSQL
- Gemini API Key *(optional but recommended)*

---

# 🚀 Getting Started

## 1️⃣ Install Dependencies

```bash
npm install
```

---

## 2️⃣ Configure Environment Variables

Create a local environment file.

```bash
cp .env.example .env
```

Fill in the required variables:

```env
DATABASE_URL=

SIGNING_SECRET=

WEBHOOK_SECRET=

GEMINI_API_KEY=
```

Generate secure secrets:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 3️⃣ Run Database Migrations

```bash
npm run migrate
```

---

# 💻 Development

Run the development server:

```bash
npm run dev
```

Application runs locally at:

```text
http://localhost:3000
```

---

# 🚀 Production

Build and start the production server.

```bash
npm run build
npm start
```

or

```bash
npm run build && npm start
```

---

# 📦 Available Commands

| Command | Description |
|----------|-------------|
| `npm install` | Install dependencies |
| `npm run dev` | Start development server |
| `npm run build` | Create production build |
| `npm start` | Start production server |
| `npm run migrate` | Run database migrations |
| `npm run lint` | Run type checking |
| `npm run clean` | Remove build artifacts |

---

# ☁️ Deployment

The project includes a ready-to-use **Render Blueprint** (`render.yaml`) for one-click deployment.

Deployment automatically provisions:

- PostgreSQL Database
- Web Service
- Environment Variables
- Database Migrations
- Health Checks

---

# ❤️ Release Notes

## Version **0.1**

The first public release focused on validating the core communication intelligence engine.

### Included

- ✅ AI Message Analysis
- ✅ AI Rewrite Suggestions
- ✅ Conversation Path Simulator
- ✅ AI Communication Coach
- ✅ Diagnostics Dashboard
- ✅ Email Reports
- ✅ Authentication
- ✅ Secure Account Management
- ✅ Multi-language Support
- ✅ Render Deployment

---

# 🚀 Roadmap

## Version 0.2

- 🎥 Multimedia Conversation Rehearsal (Images, Voice & Attachments)
- 🔔 Configurable Notification Trigger Settings
- 📊 Expanded Analytics Dashboard
- 🧠 Improved Conversation Intelligence
- ⚡ Faster AI Response Pipeline
- 📱 Enhanced UI/UX

---

## Version 0.3

- 🤝 Shared Conversation Workspaces
- 👥 Team Collaboration
- 📱 Fully Responsive Mobile Experience
- 🧩 Browser Extension
- ✨ Many more advanced AI-powered features

---

# 🌟 Future Vision

The long-term vision for **How It Lands** is to become an intelligent communication platform that helps people prepare for every important conversation.

Future capabilities include:

- Predictive conversation modeling
- Personalized communication coaching
- Multimedia conversation rehearsal
- AI-powered behavioral insights
- Relationship-aware recommendations
- Enterprise collaboration
- Advanced communication analytics

The goal is simple:

> **Help every message land the way it was intended.**

---

<div align="center">

## 💬 How It Lands

### *Helping conversations land better—before they're ever sent.*

**Current Release:** **v0.1**

⭐ **If you found this project interesting, consider giving it a star!**

</div>
