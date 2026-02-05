# Hao87bot 3.0

A Telegram group statistics bot that automatically tracks member messages, links, photos, stickers, and more, with a pixel-style frontend stats page.

## Features

- 📊 Auto stats: message count, link count, photo count, sticker count per group
- 🤖 **Bot mention stats**: Counts how often the bot is invoked by command or @mention (shown on the frontend and in `/show`)
- 🎨 Sticker leaderboard with image previews
- 🌐 Pixel-style frontend (Vue 3 + TypeScript)
- 🔐 **Admin panel**: Firebase Auth; only `cyy25121@gmail.com` can sign in. View group stats overview, system settings, AI settings, logs, and group management
- 🔥 Backend: Firebase Functions v2 (Node.js 22)
- 🤖 **AI replies**: Natural language responses via Ollama (qwen3:8b)
- 🏥 `/health` command for health checks
- ⚙️ `/set-activate-th` to set the global activation threshold
- 📊 `/show` to display group stats and system status

## Project structure

```
hao87bot.git/
├── functions/          # Firebase Functions backend (Node.js + TypeScript)
├── frontend/           # Vue 3 frontend (TypeScript + Vite)
└── firebase.json       # Firebase config
```

## Database setup

The project uses a Firestore database named `hao87bot`. Before deploying:

1. Create a Firestore database named `hao87bot` in the Firebase Console
2. Configure appropriate security rules
3. If you use the default database, update the database name in the code

**Steps to create the database:**
- Go to Firebase Console → Firestore Database
- Click “Create database”
- Choose “Create database” and enter database ID: `hao87bot`

## Secrets

Sensitive values are stored with Firebase Secrets Manager:

```bash
# Telegram Bot Token
echo -n "YOUR_BOT_TOKEN" | firebase functions:secrets:set TELEGRAM_BOT_TOKEN

# OpenAI API Key (kept for backward compatibility)
echo -n "YOUR_OPENAI_API_KEY" | firebase functions:secrets:set OPENAI_API_KEY

# ngrok Ollama URL (for AI replies)
echo -n "https://your-ngrok-url.ngrok-free.app" | firebase functions:secrets:set NGROK_OLLAMA_URL
```

**Local development:** Set these in `functions/.env` (see `QUICKSTART.md`).

**Tunnel setup:** See [NGROK_SETUP.md](NGROK_SETUP.md) or [CLOUDFLARE_TUNNEL_SETUP.md](CLOUDFLARE_TUNNEL_SETUP.md).

## Development

### Backend

```bash
cd functions
npm install
npm run serve
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend is built with **Vue 3 + TypeScript + Vite** and includes:
- 🎨 Pixel-style UI (NES.css)
- 🎭 Vue Transition animations
- 📱 Responsive layout
- 🔍 Debug logging

## Deployment

```bash
# Deploy Functions
firebase deploy --only functions

# Deploy frontend
firebase deploy --only hosting

# Set Telegram webhook
# Use the webhook URL from deployment and configure it for your bot
```

## Usage

1. Add the bot to a Telegram group.
2. The bot will start tracking messages, links, photos, stickers, and bot mentions.
3. Open `/stats/:groupId` to view stats.
4. Admins can sign in at `/login` (only `cyy25121@gmail.com`), then use `/admin`.

**Important:** Group IDs are usually negative; include the minus sign in the URL:
- ✅ `/stats/-123456789` (correct)
- ❌ `/stats/123456789` (wrong; missing minus)

**How to get the group ID:**
- Send `/health` and check Firebase Functions logs, or
- Use the Telegram Bot API: `https://api.telegram.org/botYOUR_TOKEN/getUpdates`

## Bot reply behavior

### AI replies (default)

When the bot is @mentioned, it replies using the Ollama (qwen3:8b) model.

**Details:**
- Uses a local Ollama instance (reached via ngrok or similar)
- Model: qwen3:8b
- Tone: humorous, witty, slightly playful
- Language: Traditional Chinese

**Requirements:**
- Ollama running locally
- ngrok or Cloudflare Tunnel to expose Ollama
- See [NGROK_SETUP.md](NGROK_SETUP.md)

### Legacy reply behavior (disabled)

The old “no reply” and stats-link reply behavior is disabled by default. Set `ENABLE_LEGACY_MENTION_RESPONSE` to re-enable it.

**Threshold:**
- Default: 100 messages
- Global: one threshold for all groups
- Set via `/set-activate-th` (see below)

## Commands

### `/health`

Health check to verify the bot is running.

**Usage:**
- Send `/health` in a group or in a private chat with the bot

**Checks:**
- ✅ Telegram Bot Token set
- ✅ OpenAI API Key set
- ✅ Firestore (hao87bot) connection
- ✅ Firebase Storage connection

**Example response:**
```
Hao87bot 3.0 Health Check

Status: 🟢 Healthy
Time: 2026-02-04T15:00:00.000Z

Checks:
✅ Telegram Bot Token: Set
✅ OpenAI API Key: Set
✅ Firestore (hao87bot): Connected
✅ Firebase Storage: Connected
```

### `/set-activate-th <number>`

Set the global activation threshold (applies to all groups).

**Usage:**
- In a group or in private: `/set-activate-th 100`

**Arguments:**
- `<number>`: Positive integer (minimum 1)

**Example (private):**
```
✅ Global activation threshold set to 100 messages

This applies to all groups.
```

**Example (in group):**
```
✅ Global activation threshold set to 100 messages

Current messages: 50 / 100
```

**Notes:**
- This is global and affects all groups.
- Any member can change it; consider setting it in private to avoid accidents.
- Default is 100 messages.

### `/show`

Show group statistics and system status. **Group only.**

**Usage:**
- Send `/show` in the group

**Shows:**
- Link to the full stats page
- Message count, link count, photo count, sticker count, bot mention count
- Top 5 active members
- System status (last restart time)

**Example response:**
```
📊 Group statistics

🔗 View full stats

Group stats:
📝 Messages: 1234
🔗 Links: 56
📷 Photos: 78
😊 Stickers: 234
🤖 Bot mentions: 42

🏆 Top 5 active members:
1. Alice: 456 messages
2. Bob: 234 messages
3. Carol: 123 messages
4. Dave: 89 messages
5. Eve: 67 messages

🔄 System status:
Last restart: 2 hours ago (2026/2/4 9:30 PM)
```

## Admin panel

- **Paths:** `/login` to sign in → `/admin` for the panel
- **Auth:** Firebase Auth; only `cyy25121@gmail.com` can sign in
- **Features:**
  - **Group stats overview:** List all groups with basic stats; click through to each group’s stats page
  - **System settings:** Global activation threshold
  - **AI settings:** AI provider (Ollama / OpenAI), model selection
  - **System logs:** View operation logs
  - **Group management:** View and manage group data (e.g. delete a group)

## Statistics

### Group stats

- Total messages
- Active member count
- Link count
- Photo count
- Sticker count
- Bot mention count (commands or @mentions)

### Member leaderboard

Shows members by message count:
- Rank
- Name (username preferred, then firstName)
- Message count

### Sticker leaderboard

Top 10 stickers by usage:
- Rank
- Sticker image (click to enlarge)
- Use count

**Sticker display:**
- Images load automatically
- Hover to zoom 2.5×
- Fallback emoji if the image fails to load

## AI reply setup

### Architecture

- **Model:** qwen3:8b (via Ollama)
- **Connection:** ngrok or Cloudflare Tunnel
- **Limit:** Cloud Function timeout is 540 seconds (9 minutes)

### Setup

1. **Install and run Ollama**
   ```bash
   # macOS
   brew install ollama

   # Run (allow external connections)
   export OLLAMA_HOST=0.0.0.0:11434
   ollama serve

   # Pull model
   ollama pull qwen3:8b
   ```

2. **Start a tunnel (pick one)**

   **Option A: ngrok**
   ```bash
   brew install ngrok
   ngrok http 11434
   ```
   See [NGROK_SETUP.md](NGROK_SETUP.md)

   **Option B: Cloudflare Tunnel (recommended)**
   ```bash
   brew install cloudflared
   cloudflared tunnel --url http://localhost:11434
   ```
   See [CLOUDFLARE_TUNNEL_SETUP.md](CLOUDFLARE_TUNNEL_SETUP.md)

3. **Set Firebase secret**
   ```bash
   firebase functions:secrets:set NGROK_OLLAMA_URL
   # Enter tunnel URL (e.g. https://xxxx-xxx-xxx.ngrok-free.app)
   ```

### System prompt

The bot uses:
- **Role:** hao87bot, AI assistant in Telegram groups
- **Tone:** Humorous, witty, slightly playful
- **Language:** Traditional Chinese
- **Length:** Short (typically 1–3 sentences)

### Roadmap

- [ ] Context management: keep conversation history so the bot can follow group context
- [ ] Conversation log: record each @bot Q&A for analysis and tuning
- [ ] Smarter truncation for context window limits

See [CONTEXT_MANAGEMENT_PLAN.md](CONTEXT_MANAGEMENT_PLAN.md).

## Tech stack

### Backend

- Firebase Functions v2 (Node.js 22)
- Firestore database named `hao87bot`
- Telegram Bot API
- Ollama (qwen3:8b) for AI replies

### Frontend

- Vue 3 + TypeScript + Vite
- Firebase SDK
- NES.css (pixel-style UI)

### Data layout

- `groups/{groupId}`: Group stats
- `groups/{groupId}/members/{userId}`: Member stats
- `groups/{groupId}/stickers/{fileUniqueId}`: Sticker stats
- `settings/global`: Global settings (threshold, last restart, etc.)
