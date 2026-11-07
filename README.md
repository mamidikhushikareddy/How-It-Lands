 <div align="center">

# 💬 How It Lands

### *Think Before You Send.*

**How It Lands** is an AI-powered communication coach that helps you understand **how your message will be perceived before you hit send.**

Analyze messages, receive strategic rewrites, simulate possible replies, and improve your communication through AI-powered coaching.

[![Version](https://img.shields.io/badge/Version-v0.1-blue?style=for-the-badge)](https://github.com/mamidikhushikareddy/How-It-Lands)
[![Status](https://img.shields.io/badge/Status-Active-success?style=for-the-badge)](https://how-it-lands.onrender.com/)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

[![Live Application](https://img.shields.io/badge/Live_Application-Launch-007ACC?style=for-the-badge)](https://how-it-lands.onrender.com/)
[![Product Requirements](https://img.shields.io/badge/Product_Requirements-View_PRD-8A2BE2?style=for-the-badge)](https://app.notion.com/p/PRD-How-It-Lands-3a45e82851bf801db597f082c1ec319e?source=copy_link)
[![User Research](https://img.shields.io/badge/User_Research-View_Research-2E8B57?style=for-the-badge)](https://app.notion.com/p/PRIMARY-USER-RESEARCH-PRODUCT-VALIDATION-3a55e82851bf8016833bf152b0e39c0e?source=copy_link)
[![Research Workbook](https://img.shields.io/badge/Research_Workbook-Excel-228B22?style=for-the-badge)](docs/How%20It%20Lands-%20Research.xlsx)
[![Competitor Analysis](https://img.shields.io/badge/Competitor_Analysis-View_Report-2E8B57?style=for-the-badge)](https://app.notion.com/p/Competitor-Analysis-using-Similarweb-3a65e82851bf80a5b82df86c070af5c2?source=copy_link)

**Current Release: v0.1**

*The first public release focused on validating the core communication intelligence engine.*

### 🧠 Communicate with confidence, not uncertainty.

</div>

---

# ✨ Features

### 📝 AI Message Analysis

Analyze how a message may be perceived across multiple communication dimensions, including tone, clarity, empathy, intent, and potential impact.

### ✨ AI Rewrite Suggestions

Generate context-aware rewrites designed to improve communication while preserving the original intent.

### 💬 Conversation Path Simulator

Explore possible recipient responses and conversation outcomes before sending a message.

### 🎯 Communication Coach

Interact with an AI-powered communication coach for guidance on difficult or important conversations.

### 📊 Diagnostics Dashboard

Explore communication patterns and analysis insights through the application's diagnostics interface.

### 📧 Smart Email Reports

Receive AI-generated analysis reports through supported email notification workflows.

### 🔒 Authentication and Account Management

Support for email authentication, Google Sign-In, password reset, and account management.

### ⚡ Offline AI Fallback

Graceful handling of unavailable AI services, with fallback behavior where supported.

### 🌍 Multilingual Communication

Support for communication assistance across available languages.

### 📈 Product Analytics Instrumentation

The analytics integration is designed to support:

- Acquisition and engagement tracking
- Onboarding and activation funnels
- Feature usage analysis
- User retention and cohort analysis
- AI request success and failure monitoring
- Consent-aware user experience analytics

Analytics instrumentation and dashboards should be validated against actual collected events before treating these measurements as production-ready.

---

# 🚀 Why How It Lands?

Most messaging applications help people **send messages**.

**How It Lands helps people understand how their messages might be received.**

Whether you're:

- Negotiating
- Giving feedback
- Handling conflict
- Communicating with colleagues
- Preparing an important personal message
- Navigating sensitive conversations

The goal is simple:

> **Reduce misunderstandings before they happen.**

AI-generated communication predictions are advisory, not guarantees of another person's behavior.

---

# 📄 Product Requirements and Research

Product thinking is at the heart of **How It Lands**.

The project includes product requirements, primary user research, competitor analysis, and a research workbook.

| Resource | Description |
|---|---|
| [Product Requirements Document](https://app.notion.com/p/PRD-How-It-Lands-3a45e82851bf801db597f082c1ec319e?source=copy_link) | Product vision, user journeys, feature requirements, roadmap, and success metrics |
| [Primary User Research](https://app.notion.com/p/PRIMARY-USER-RESEARCH-PRODUCT-VALIDATION-3a55e82851bf8016833bf152b0e39c0e?source=copy_link) | User needs, research findings, and product validation |
| [Research Workbook](docs/How%20It%20Lands-%20Research.xlsx) | Supporting research and analysis |
| [Competitor Analysis](https://app.notion.com/p/Competitor-Analysis-using-Similarweb-3a65e82851bf80a5b82df86c070af5c2?source=copy_link) | Competitive landscape and Similarweb-based analysis |

---

# 🛠 Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | React, TypeScript, Tailwind CSS |
| Backend | Node.js, Express |
| Database | PostgreSQL |
| AI | Google Gemini |
| Authentication | Firebase Authentication / Google Sign-In and email authentication |
| Product Analytics | Google Analytics 4, Google Tag Manager, Mixpanel, Amplitude |
| UX Analytics | Microsoft Clarity |
| Deployment | Render |
| Build Tools | Vite, ESBuild |
| Version Control | Git, GitHub |

The precise database and authentication implementations should be checked against the deployed application configuration.

---

# 🏗 Architecture

```text
                     USER
                       |
                       v
              React + TypeScript
                       |
             +---------+---------+
             |                   |
             v                   v
       Express API          Authentication
             |               (Firebase)
       +-----+-----+
       |           |
       v           v
   Gemini AI    PostgreSQL
       |           |
       +-----+-----+
             |
             v
    Communication Intelligence
             |
      +------+------+------+
      |             |      |
      v             v      v
   Analysis       Rewrites Coaching
      |
      v
 Conversation Simulation
```

## Product Analytics Architecture

```text
                  HOW IT LANDS
                        |
                        v
             Consent-Aware Events
                        |
          +-------------+-------------+
          |             |             |
          v             v             v
        GA4          Mixpanel      Amplitude
          |             |             |
          v             v             v
      Acquisition     Funnels       Cohorts
      Engagement      Journeys      Retention

          Google Tag Manager
            Tag Management

          Microsoft Clarity
          UX Behavior Analysis

               Future Analysis
                     |
                     v
             BigQuery + SQL
                     |
                     v
              Python / PySpark
                     |
                     v
              Looker Studio
```

**Note:** The warehouse, PySpark, and reporting components represent the intended analytics workflow. They should not be considered deployed until their data pipelines and dashboards are implemented and verified.

---

# 📂 Project Structure

The project includes frontend components, backend services, shared application logic, configuration, and supporting documentation.

An illustrative structure is:

```text
How-It-Lands/
|
|-- src/                    React application
|   |-- components/         UI components
|   |-- lib/                Shared client utilities
|   |   |-- analytics/      Analytics integration (when present)
|
|-- server.ts               Express server entry point
|-- public/                 Static assets
|-- docs/                   Research and documentation
|-- tests/                  Test files (where available)
|-- dist/                   Generated production output
|
|-- package.json
|-- .env.example
|-- .gitignore
|-- README.md
```

The exact directory structure may differ between releases.

---

# ⚙️ Prerequisites

Before running the project, ensure you have:

- Node.js 20 or newer, compatible with the project's dependencies
- npm
- A configured PostgreSQL database, if required by the backend
- Firebase project configuration, if Firebase authentication is enabled
- A Google Gemini API key for AI-powered features
- Optional analytics provider projects and client configuration identifiers

---

# 🚀 Getting Started

## 1️⃣ Clone the Repository

```bash
git clone https://github.com/mamidikhushikareddy/How-It-Lands.git
cd How-It-Lands
```

## 2️⃣ Install Dependencies

```bash
npm install
```

## 3️⃣ Configure Environment Variables

How It Lands uses environment variables for backend security, database connections, AI processing, authentication, email delivery, and analytics.

**Never commit real credentials to GitHub.**

Create your local environment file:

macOS/Linux:

```bash
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Populate the variables required by your current application.

### 🗄️ Database and Backend Security

```dotenv
DATABASE_URL=
SIGNING_SECRET=
WEBHOOK_SECRET=
```

Generate secure random values for applicable signing secrets:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Generate separate values for separate secrets.

### 🧠 Google Gemini

```dotenv
GEMINI_API_KEY=
```

This key is used for supported AI processing.

Keep it on the server. Never place private AI credentials in client-side `VITE_` variables.

### 🔐 Firebase Authentication

Depending on the implementation, the frontend may require:

```dotenv
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
```

These are common Firebase web configuration names. Confirm the exact variable names used by the source code.

Firebase web API keys are public client configuration values, not Firebase Admin service-account private keys.

Protect application data with appropriate Firebase Security Rules, backend authorization, and verified authentication tokens.

### 📊 Google Analytics 4

```dotenv
VITE_GA4_MEASUREMENT_ID=
```

Used for web analytics, traffic acquisition, engagement, and conversion measurement.

The measurement ID typically begins with `G-`.

### 🏷 Google Tag Manager

```dotenv
VITE_GTM_CONTAINER_ID=
```

Used to manage analytics tags and related measurement integrations.

The container ID typically begins with `GTM-`.

If GA4 is managed through GTM, avoid duplicate GA4 event collection through a separate direct integration.

### 📈 Mixpanel

```dotenv
VITE_MIXPANEL_TOKEN=
```

Used for product events, conversion funnels, and behavioral analysis.

Use the public client-side project token, not a private service-account credential.

### 📉 Amplitude

```dotenv
VITE_AMPLITUDE_API_KEY=
```

Used for behavioral analytics, retention, cohort analysis, and feature adoption.

Use the appropriate client-side project API key, not a private management or secret key.

### 🖱 Microsoft Clarity

```dotenv
VITE_CLARITY_PROJECT_ID=
```

Used for UX behavior analysis and session recordings.

Configure appropriate consent and privacy protections before recording user activity.

### 📧 Email and Notification Services

The application may require additional email-provider settings.

For an SMTP-based implementation, example variables include:

```dotenv
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=
```

These are illustrative placeholders. Use only the exact names supported by the backend.

Email passwords and provider authentication tokens must remain server-side.

### 🛡 Administrative Authorization

Administrative functionality must be restricted using server-enforced authorization.

Do not hardcode administrator email addresses, passwords, or access bypasses into the repository.

Use appropriate private environment configuration or server-side role management.

---

# 🔒 Environment Variable Security

The following practices are required for safe development and deployment.

### Never Commit

```text
.env
.env.local
.env.production
Private API keys
Database passwords
Service-account JSON files
Private key files
SMTP passwords
Authentication tokens
```

### Example `.gitignore` Entries

```gitignore
# Environment files
.env
.env.*
!.env.example

# Sensitive credentials
*.pem
*.key
*.p12
*.pfx
*service-account*.json
*firebase-adminsdk*.json
credentials.json
secrets.json

# Local dependencies
node_modules/
.venv/

# Generated artifacts
dist/
coverage/
*.log

# Local database
db.json
```

`.gitignore` does not remove files already tracked by Git or erase secrets from previous commits.

Before committing, inspect staged changes and run a dedicated secret scanner where possible.

### Public vs Private Variables

| Variable Type | Browser Exposure | Recommended Storage |
|---|---|---|
| `VITE_GA4_MEASUREMENT_ID` | Public | Build-time environment |
| `VITE_GTM_CONTAINER_ID` | Public | Build-time environment |
| `VITE_MIXPANEL_TOKEN` | Public | Build-time environment |
| `VITE_AMPLITUDE_API_KEY` | Public | Build-time environment |
| `VITE_CLARITY_PROJECT_ID` | Public | Build-time environment |
| Firebase web configuration | Public | Build-time environment |
| `GEMINI_API_KEY` | Private | Server environment |
| `DATABASE_URL` | Private | Server environment |
| `SIGNING_SECRET` | Private | Server environment |
| `WEBHOOK_SECRET` | Private | Server environment |
| SMTP password | Private | Server environment |

All `VITE_` values are embedded into the frontend bundle and must be treated as publicly visible.

---

# 🗄️ Database Setup

If your backend uses PostgreSQL migrations, configure `DATABASE_URL` and run the migration command defined by the project.

For versions that provide a `migrate` script:

```bash
npm run migrate
```

Check `npm run` first to confirm that this command exists in your current release.

---

# 💻 Development

Start the development server:

```bash
npm run dev
```

Open the local address displayed in the terminal.

The port depends on the current server configuration.

---

# 🧪 Build and Validation

Run TypeScript validation:

```bash
npm run lint
```

Build the frontend and backend:

```bash
npm run build
```

Start the production build:

```bash
npm start
```

The current build uses Vite for the frontend and ESBuild for the backend.

A successful build confirms compilation, but does not by itself guarantee that authentication, analytics, authorization, or AI requests function correctly.

Automated tests should be run using the scripts available in the current `package.json`.

---

# 📦 Available Commands

| Command | Description |
|---|---|
| `npm install` | Install project dependencies |
| `npm run dev` | Start the development server |
| `npm run build` | Build the frontend and backend |
| `npm start` | Start the production server |
| `npm run lint` | Run TypeScript validation |
| `npm run clean` | Remove generated build artifacts, where supported |
| `npm run migrate` | Run database migrations, if a migration script exists |
| `npm audit` | Inspect dependency security advisories |

Run `npm run` to see the commands available in your installed version.

---

# ☁️ Deployment

How It Lands is deployed using **Render**.

**Live Application:** https://how-it-lands.onrender.com/

## Render Environment Configuration

1. Open the Render Dashboard.
2. Select the How It Lands web service.
3. Navigate to **Environment**.
4. Add the environment variables required by your deployed version.
5. Save the configuration.
6. Trigger a new build and deployment when necessary.

### Production Build

```bash
npm install
npm run build
npm start
```

For Render, the service's configured build and start commands must match the repository and deployment settings.

Vite client variables must be available during the frontend build.

Private backend credentials must remain server-side.

The project may also use a `render.yaml` Blueprint to describe infrastructure and deployment configuration.

Verify the Blueprint and any database migration behavior against the current source before deploying.

---

# 📊 Product Analytics and Measurement

How It Lands aims to use real product events to understand user behavior and improve the communication experience.

## Analytics Platforms

| Platform | Focus |
|---|---|
| Google Analytics 4 | Acquisition, traffic, engagement, conversions |
| Google Tag Manager | Analytics tag configuration and management |
| Mixpanel | Product funnels, user journeys, event analysis |
| Amplitude | Behavioral cohorts, retention, feature adoption |
| Microsoft Clarity | UX behavior, recordings, interaction analysis |
| BigQuery (planned) | Centralized analytics warehouse |
| Python / PySpark (planned) | Data transformation and cohort analysis |
| Looker Studio (planned) | Product analytics dashboards |

## Product Metrics

### North Star / Activation

**Activation Rate**

Percentage of newly registered users who successfully complete their first AI-powered analysis within 24 hours of registration.

```text
Activation Rate =
(New users with a successful AI analysis within 24 hours
 / Eligible new registered users) × 100
```

### Additional Metrics

- Signup conversion
- Onboarding completion
- Time to first successful AI result
- AI request success and failure rates
- Feature adoption
- D1, D7, and D30 retention
- Conversion funnel drop-off
- User experience friction
- Engagement by acquisition source

## Suggested Event Taxonomy

```text
signup_started
signup_completed
login_completed
logout_completed

onboarding_started
onboarding_step_viewed
onboarding_step_completed
onboarding_completed

feature_opened

ai_request_started
ai_request_succeeded
ai_request_failed

result_saved
result_copied
```

Events should be emitted only when the corresponding user action or system outcome actually occurs.

## Analytics Privacy

Analytics instrumentation should:

- Respect user consent and withdrawal
- Avoid collecting raw message or conversation content
- Exclude passwords and authentication tokens
- Avoid unnecessary personally identifiable information
- Use appropriate pseudonymous identifiers
- Prevent duplicate events
- Keep production and development data distinguishable
- Clearly separate measured results from simulated or illustrative data

---

# ❤️ Release Notes

## Version 0.1

The first public release focused on validating the core communication intelligence engine.

### Core Capabilities

- AI Message Analysis
- AI Rewrite Suggestions
- Conversation Path Simulator
- AI Communication Coach
- Diagnostics Dashboard
- Email Reports
- Authentication
- Account Management
- Multilingual Communication Support
- Render Deployment

Product analytics instrumentation is being integrated and validated as part of ongoing product development.

---

# 🚀 Roadmap

## Version 0.2 — Product Intelligence and Experience

- 🎥 Multimedia Conversation Rehearsal (Images, Voice, Attachments)
- 🔔 Configurable Notification Trigger Settings
- 📊 Expanded Analytics Dashboard
- 📈 Conversion Funnel and Cohort Analysis
- 🧠 Improved Conversation Intelligence
- ⚡ Faster AI Response Pipeline
- 📱 Enhanced UI/UX
- 🧪 Product Experimentation and Measurement

## Version 0.3 — Collaboration and Expansion

- 🤝 Shared Conversation Workspaces
- 👥 Team Collaboration
- 📱 Fully Responsive Mobile Experience
- 🧩 Browser Extension
- ✨ Advanced AI-Powered Features

---

# 🌟 Future Vision

The long-term vision for **How It Lands** is to become an intelligent communication platform that helps people prepare for important conversations.

Future capabilities include:

- Predictive conversation modeling
- Personalized communication coaching
- Multimedia conversation rehearsal
- AI-powered behavioral insights
- Relationship-aware recommendations
- Enterprise collaboration
- Advanced product analytics

The goal is simple:

> **Help every message land the way it was intended.**

---

<div align="center">

## 💬 How It Lands

### *Helping conversations land better—before they're ever sent.*

**Current Release: v0.1**

[![Launch Application](https://img.shields.io/badge/Launch-How_It_Lands-007ACC?style=for-the-badge)](https://how-it-lands.onrender.com/)

⭐ **If you found this project interesting, consider giving it a star!**

</div>
