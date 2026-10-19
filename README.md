# YouTube Playback QA & Browser Automation Testing Bot

A complete, locally hosted web application with a modern graphical user interface (GUI) designed for automated YouTube video playback Quality Assurance (QA) and verification using Playwright Chromium and Groq/Grok AI natural language intent parsing.

Operate everything through the browser GUI—no terminal commands, manual browser launches, or script editing required after setup.

---

## Key Features

- **Private Authentication System**:
  - Secure login with bcrypt-hashed passwords (never stored in plaintext).
  - Cryptographically secure, HTTP-only session cookies.
  - Login rate-limiting (anti-brute force) and session expiration.
  - Secure in-app password change functionality.
  - Zero public registration.
- **Modern Responsive Dashboard**:
  - Sleek dark mode aesthetic with glassmorphism panels and dynamic telemetry animations.
  - YouTube URL input with debounced validation and official oEmbed metadata query.
  - Live preview card displaying video title, author/channel, video ID badge, high-res thumbnail, and optional inline embed player.
  - Test repetition selector (1 to 20 cycles) and continuous playback duration (5s to 300s).
  - Visible GUI browser window toggle (default enabled: launches a visible Chromium window so you can watch playback automation in real-time).
  - Immediate **Stop Test** button to abort running automation sessions instantly.
  - Real-time Server-Sent Events (SSE) telemetry console with live player metrics (currentTime, readyState, paused/buffering state) and auto-scrolling log stream.
  - Comprehensive SQLite test history with individual repetition audit logs and one-click history clearing.
- **Playwright Chromium Automation Engine**:
  - Opens target video in a dedicated, isolated browser session.
  - Automatically handles and dismisses YouTube cookie/consent dialogs.
  - Detects error screens ("Video unavailable", private, removed, region-locked).
  - Unmutes and triggers HTML5 video playback.
  - Verifies that playback begins (`currentTime > 0` and `!paused`).
  - Observes continuous playback for configured duration.
  - Logs interruptions, stalls, and playback anomalies.
  - Gracefully closes browser sessions upon completion or user abort.
- **Groq / Grok AI Integration**:
  - Built-in natural language parser powered by Groq (`openai/gpt-oss-120b`).
  - Supports standard Groq and xAI Grok OpenAI-compatible endpoints.
  - Converts natural instructions (e.g. *"Test this video 3 times for 20 seconds: https://www.youtube.com/watch?v=..."*) into validated test settings.
  - Browser automation remains 100% operational even if AI is offline.
  - Dedicated in-app Settings modal to update API keys, base endpoints, and test AI connectivity.

---

## Technology Stack

- **Frontend**: React 19, Vite, Lucide Icons, Vanilla CSS Design System with glassmorphism and responsive layout.
- **Backend**: Node.js, Express, Cookie-Parser, Bcrypt.js, Express-Rate-Limit.
- **Automation**: Playwright Chromium (with visible headed browser support).
- **Database**: SQLite (`better-sqlite3`) with WAL journal mode.
- **AI**: Groq Cloud API / Grok Chat API.

---

## Windows Installation & Quick Start

### Prerequisites
- **Node.js**: Version 18 or newer (v20+ recommended). Download from [https://nodejs.org/](https://nodejs.org/).
- **Windows 10 / 11** with PowerShell or Command Prompt.

### 1-Click Launch (Recommended)

Simply double-click **`start.bat`** in the project folder (or run `./start.ps1` in PowerShell).

The startup script will automatically:
1. Verify Node.js.
2. Install any missing backend and frontend dependencies.
3. Build the production React client.
4. Launch the application server on `http://localhost:3000`.
5. Open your default web browser directly to the login page.

---

### Manual Launch

If you prefer using the command line:

```bash
# 1. Install root backend dependencies
npm install

# 2. Install client dependencies
npm --prefix client install

# 3. Download Chromium for Playwright (if not already downloaded)
npx playwright install chromium

# 4. Build the React frontend
npm run build

# 5. Start the server
npm start
```

Then open your browser at **[http://localhost:3000](http://localhost:3000)**.

---

## Default Credentials & Initial Setup

Initial credentials are read from `.env` on first launch and hashed into the local SQLite database (`data/youtube_qa.db`):

- **Username**: `admin`
- **Password**: `AdminSecurePass123!`

### Changing the Initial Password
1. Log into the dashboard with the default password.
2. Click **Settings** in the top navigation bar.
3. Switch to the **Security & Password** tab.
4. Enter your current password and desired new password (minimum 8 characters).

You can also customize the initial default before the first launch by editing `ADMIN_USERNAME` and `ADMIN_PASSWORD` in `.env`.

---

## Environment Configuration (`.env`)

```ini
# Server Port
PORT=3000

# Session Encryption Secret
SESSION_SECRET=yt_qa_miner_super_secure_secret_key_871263871263

# Admin Initial Credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=AdminSecurePass123!

# AI / Groq API Configuration
GROK_API_KEY=gsk_your_groq_api_key_here
GROK_API_BASE=https://api.groq.com/openai/v1
GROK_MODEL=openai/gpt-oss-120b

# Playback QA Limits
DEFAULT_BROWSER=chromium
HEADLESS_DEFAULT=false
MAX_REPETITIONS=20
MAX_DURATION_SECONDS=300
```

---

## Using the Application

1. **Sign In**: Navigate to `http://localhost:3000` and enter your credentials.
2. **AI Instruction (Optional)**:
   - Type in the AI Assistant prompt bar (e.g. *"Run 2 repetitions for 15 seconds on https://www.youtube.com/watch?v=..."*).
   - Click **Parse with AI** to automatically populate settings.
3. **Manual Configuration**:
   - Paste any YouTube video or Shorts URL into the **YouTube Video URL** field.
   - The system automatically validates the URL and displays title, thumbnail, channel, and video ID.
   - Adjust **Test Repetitions** (1 to 20).
   - Adjust **Playback Duration** (5 to 300 seconds).
   - Ensure **Visible Browser GUI Window** is checked to observe the Chromium browser window in action.
4. **Run Playback QA Test**:
   - Click **Start Playback QA Test**.
   - Watch the visible Chromium browser window open, load the video, dismiss consent dialogs, start playback, and monitor playback.
   - Follow live progress, percentage bar, player telemetry, and console logs in the dashboard.
   - Click **Stop Test Immediately** at any time if you wish to abort.
5. **Review History**:
   - View past test runs in the history table.
   - Click **Details** on any run to inspect step-by-step logs and durations for each repetition.
   - Delete individual runs or click **Clear History** to purge all logs.

---

## Quality Assurance & Compliance Notice

> **Important**: This software is designed exclusively for local browser automation playback quality assurance, verification, and streaming stability testing. It does **not** generate artificial YouTube views, bypass public view verification systems, or tamper with YouTube accounts. All tests run in controlled local browser sessions and are strictly recorded as playback QA checks.
