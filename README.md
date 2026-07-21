<div align="center">

# 💬 How It Lands

### *Think Before You Send.*

AI-powered communication coaching that helps you understand **how your message will land before anyone reads it.**

Analyze • Rewrite • Rehearse • Improve

<br>

![Version](https://img.shields.io/badge/Version-v0.1-2563eb?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Stable-success?style=for-the-badge)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql)
![Gemini](https://img.shields.io/badge/Google-Gemini-4285F4?style=for-the-badge)

---

### 🚀 Current Release: **Version 0.1**

*A stable MVP focused on validating the core AI-powered communication intelligence platform.*

</div>

---

# 📖 About

**How It Lands** is an AI-powered communication intelligence platform that helps users evaluate, improve, and rehearse messages **before they are sent.**

Instead of wondering

> *"Did I say that the right way?"*

How It Lands provides strategic feedback, rewrite suggestions, conversation simulations, and AI coaching to help users communicate with greater clarity, confidence, and empathy.

Whether you're

- 💼 Negotiating with a client
- 🎓 Emailing a professor
- 👨‍💼 Giving workplace feedback
- ❤️ Sending an important personal message
- 🤝 Handling difficult conversations

How It Lands helps you understand **how your words are likely to be received—not just what they say.**

---

# ✨ Core Features

### 🧠 AI Message Analysis

Analyze messages across multiple communication dimensions including tone, clarity, empathy, confidence, professionalism, emotional impact, and intent.

---

### ✍ AI Rewrite Suggestions

Receive AI-powered rewrites tailored for different communication styles and goals.

---

### 💬 Conversation Path Simulator

Preview how a conversation may evolve before sending your message.

---

### 🎯 AI Communication Coach

Interact with a real-time AI coach for personalized communication guidance and improvement.

---

### 📊 Diagnostics Dashboard

Track communication quality, saved analyses, trends, and conversation insights.

---

### 📧 Smart Email Notifications

Receive

- Analysis reports
- Security alerts
- Monthly communication summaries

---

### 🔐 Secure Authentication

- Email Authentication
- Google Sign-In
- Password Reset
- Security Notifications

---

### ⚡ Graceful Offline Mode

The application continues functioning even when AI services are unavailable.

---

# 🏗️ System Architecture

```text
                User

                  │

                  ▼

      React + TypeScript Frontend

                  │

                  ▼

          Express Backend API

        ┌─────────┴─────────┐

        ▼                   ▼

   Google Gemini       PostgreSQL

        │                   │

        └─────────┬─────────┘

                  ▼

      AI Analysis & Coaching Engine

                  │

                  ▼

        Reports • Notifications

      Conversation Simulations
```

---

# 🛠️ Tech Stack

| Category | Technologies |
|-----------|--------------|
| Frontend | React, TypeScript, Tailwind CSS |
| Backend | Node.js, Express |
| Database | PostgreSQL |
| AI | Google Gemini |
| Authentication | Google OAuth, Email Authentication |
| Deployment | Render |
| Build Tools | Vite, ESBuild |

---

# 📂 Project Structure

```text
.

├── client/
│   ├── components
│   ├── pages
│   └── hooks
│
├── server/
│   ├── api
│   ├── services
│   └── routes
│
├── shared/
│
├── migrations/
│
├── public/
│
└── docs/
```

---

# ⚙️ Prerequisites

- Node.js **20+**
- PostgreSQL
- Gemini API Key *(Optional but recommended)*

---

# 🚀 Getting Started

## 1. Install Dependencies

```bash
npm install
```

---

## 2. Configure Environment Variables

```bash
cp .env.example .env
```

Configure at minimum:

```env
DATABASE_URL=

SIGNING_SECRET=

WEBHOOK_SECRET=
```

Generate secrets:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

For AI features:

```env
GEMINI_API_KEY=
```

See `.env.example` for additional configuration.

---

## 3. Run Database Migrations

```bash
npm run migrate
```

---

# 💻 Development

```bash
npm run dev
```

Runs locally at

```
http://localhost:3000
```

---

# 🚀 Production

Always rebuild before starting.

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
| `npm run build` | Build production bundle |
| `npm start` | Run production build |
| `npm run migrate` | Apply database migrations |
| `npm run lint` | Type checking |
| `npm run clean` | Remove build artifacts |

---

# 🔔 Notifications

The platform currently supports

- 📧 Analysis Reports
- 🔐 Security Alerts
- 📈 Monthly Communication Reports

Notification preferences are configurable within **Profile Settings**.

---

# ☁️ Deployment

This repository includes a **Render Blueprint (`render.yaml`)** for one-click deployment.

Deployment automatically provisions

- PostgreSQL Database
- Render Web Service
- Environment Variables
- Database Migrations
- Health Checks

---

# 🚀 Roadmap

## ✅ Version 0.1 (Current)

- AI Message Analysis
- AI Rewrite Suggestions
- Conversation Path Simulator
- AI Communication Coach
- Diagnostics Dashboard
- Authentication & Security
- Email Reports
- Render Deployment

---

## 🚧 Version 0.2

- 🎥 Multimedia Conversation Rehearsal
  - Images
  - Voice Messages
  - Attachments
  - Screenshots

- 🔔 Fully implemented Notification Trigger Settings

- 📊 Enhanced communication analytics

- ⚡ Faster AI reasoning

- 🧠 Improved conversation intelligence

---

## 🚀 Future Versions

The platform will continue evolving with advanced capabilities including

- Personalized AI communication profiles
- Multi-language communication analysis
- Browser Extension
- Mobile Application
- Shared Workspaces
- Team Collaboration
- Calendar Integration
- Meeting Preparation Assistant
- Email Draft Coaching
- Organization-wide Communication Analytics
- Rich conversation history intelligence
- Advanced emotional intelligence analysis
- Smarter AI reasoning
- Many more product enhancements currently under development

---

# 🎯 Project Vision

How It Lands aims to become an **AI Communication Intelligence Platform** that enables people to communicate with greater clarity, empathy, confidence, and strategic intent across personal, academic, and professional conversations.

---

# ❤️ Built With

- React
- TypeScript
- Node.js
- Express
- PostgreSQL
- Google Gemini
- Tailwind CSS
- Render

---

# 📄 License

This project is released under the **MIT License**.

---

<div align="center">

## 💙 How It Lands

### *Helping conversations land better—before they're ever sent.*

**Version 0.1**

⭐ If you found this project interesting, consider giving it a star!

</div>
