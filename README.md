# Commit2Harvest Workbench

> Developer timesheet bridge combining **GitHub Primer's** high-contrast precision with **Postman's** ergonomic API workbench design.

Commit2Harvest clusters raw technical Git commits across date ranges, translates them into executive client-ready deliverables in Portuguese via **Gemini 2.5 Flash**, maps them to **Harvest v2** project and task categories, and logs them directly as billable timesheet entries.

---

## Visual & Ergonomic Architecture

- **Strict Orthogonal Geometry:** Every UI element strictly uses `0px` border-radius (`rounded-none`). No rounded corners on inputs, dropdowns, buttons, modals, or badges.
- **Hairline Grid Architecture:** Exposed `1px solid #30363d` hairlines on `#0d1117` canvas background with zero drop shadows.
- **Color Hierarchy:**
  - Canvas: `#0d1117`
  - Surfaces & Panels: `#161b22`
  - Hover / Elevation: `#1f242c`
  - Postman Action CTA: `#ff6c37`
  - GitHub Sync Green: `#238636`
  - Technical Links / Focus: `#2f81f7`
- **100vh Fixed Viewport Split-Pane:**
  - **Top Bar (48px):** Date range filters (`Today`, `Yesterday`, `This Week`, `Last 7d`, `Custom`), Repo-to-Harvest preset indicator, and live connection health pills (`[● GH]`, `[● AI]`, `[● HV]`).
  - **Left Pane (45%):** GitHub commit log with square checkboxes, 7-char monospace SHA badges, relative dates, and `[SYNCED]` markers.
  - **Right Pane (55%):** Postman-style AI task cards with editable titles, business descriptions, hour inputs, and Harvest routing dropdowns.
  - **Bottom Status Console (28px):** HTTP telemetry, status codes (`201 Created`), selected commit counts, and total hours summary with an expandable log drawer.

---

## Quick Start

### 1. Install & Run Dev Server
```bash
cd commit2harvest
npm install
npm run dev
```

The application will start on `http://localhost:5173`.

### 2. Configure Credentials
You can either:
- Open the application, click **"Settings"** in the top bar, enter your credentials, and click **"Test Connections"**. All keys are securely stored in browser `localStorage`.
- Or create a `.env` file from `.env.example`:
  ```bash
  cp .env.example .env
  ```
  And populate:
  ```env
  VITE_GITHUB_TOKEN=ghp_...
  VITE_GEMINI_API_KEY=AIzaSy...
  VITE_HARVEST_ACCOUNT_ID=1234567
  VITE_HARVEST_ACCESS_TOKEN=2345678.pt...
  ```

### 3. Demo Mode (Test-Drive Without Live Keys)
If you don't have API keys immediately on hand, Commit2Harvest starts in **Demo Mode** with realistic sample data (Saudigitus Helpdesk & DHIS2 Tracker projects). You can test commit selection, AI transformation simulation in Portuguese, and Harvest time entry pushes right away!

---

## Production Build

```bash
npm run build
npm run preview
```
