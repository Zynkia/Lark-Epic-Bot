# Lark Epic Games Bot

A Cloudflare Worker bot that detects free games on the Epic Games Store every day and pushes the information to users or group chats via Lark (or Feishu).

This project runs entirely on Cloudflare Workers and uses Cloudflare D1 as its database, meaning it is **serverless** and **free** to host for most use cases!

## ✨ Features

- **Daily Check:** Automatically checks for new free Epic games every day at 16:20 UTC.
- **Push Notifications:** Sends interactive card messages about new free games to subscribed users and group chats.
- **Interactive Bot Commands:** Users can interact with the bot to subscribe, unsubscribe, and check current free games on demand.
- **Smart Tracking:** Uses Cloudflare D1 database to track which games have been pushed to prevent duplicate notifications.
- **Auto Cleanup:** Automatically deletes expired free games from the database during the daily check.
- **Internationalization (i18n):** Automatically adapts the language (English/Chinese) based on your `LARK_API_BASE`. If set to `https://open.feishu.cn/`, the bot responds in Chinese and fetches the Chinese locale for Epic Games.

## 🚀 Deployment Guide

There are two ways to deploy this project: a zero-CLI approach using GitHub Actions (recommended), or a local deployment using Wrangler.

### Method 1: Deploy via GitHub Actions (Zero CLI - Recommended)

This is the easiest method and requires no local setup. You can deploy everything directly from your browser!

1. **Fork this repository** to your own GitHub account.
2. **Create a Cloudflare D1 Database:**
   - Go to your [Cloudflare Dashboard](https://dash.cloudflare.com/) > **Storage & databases** > **D1 SQL Database**.
   - Click **Create**, name it `epic-games-db`, and copy the **Database ID** (e.g., `xxxx-xxxx-xxxx-xxxx`).
3. **Get Cloudflare Credentials:**
   - **API Token**: Go to **My Profile** > **API Tokens** > Create a token using the "Edit Cloudflare Workers" template.
   - **Account ID**: Copy your **Account ID** from the Account home.
4. **Set up GitHub Secrets:**
   - Go to your forked repository on GitHub > **Settings** > **Secrets and variables** > **Actions** > **New repository secret**.
   - Add the following secrets:
     - `CLOUDFLARE_API_TOKEN`: Your Cloudflare API Token
     - `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare Account ID
     - `D1_DATABASE_ID`: The D1 Database ID you copied in step 2
     - `LARK_APP_ID`: Your Lark/Feishu App ID
     - `LARK_APP_SECRET`: Your Lark/Feishu App Secret
     - `LARK_API_BASE`: (Optional) Use `https://open.feishu.cn/` if you are using Feishu (Chinese). Default is `https://open.larksuite.com/`.
5. **Run the Deployment Workflow:**
   - Go to the **Actions** tab in your GitHub repository.
   - Select **Deploy to Cloudflare Workers** on the left.
   - Click **Run workflow**. 
   - GitHub Actions will automatically initialize the database schema and deploy your Worker!

### Method 2: Local CLI Deployment

If you prefer to deploy from your local machine, ensure you have Node.js and Wrangler CLI installed.

#### 1. Clone the Repository

```bash
git clone https://github.com/Zynkia/Lark-Epic-Bot.git
cd Lark-Epic-Bot
npm install
```

#### 2. Create a Cloudflare D1 Database

Use Wrangler to create a new D1 database:

```bash
wrangler d1 create epic-games-db
```

This command will output a `database_id`. Copy this ID.

#### 3. Update Configuration

Open the `wrangler.toml` file and update the `database_id` under `[[d1_databases]]` with the ID you just copied.

```toml
[[d1_databases]]
binding = "DB"
database_name = "epic-games-db"
database_id = "YOUR_D1_DATABASE_ID" # Replace with your copied ID
```

Also, update the `[vars]` section with your Lark/Feishu App credentials:

```toml
[vars]
LARK_APP_ID = "cli_a1b2c3d4e5f6"
LARK_APP_SECRET = "your_app_secret_here"
# Use https://open.larksuite.com/ for English (Lark)
# Use https://open.feishu.cn/ for Chinese (Feishu)
LARK_API_BASE = "https://open.larksuite.com/" 
```

#### 4. Initialize the Database Schema

Run the following command to apply the database schema to your remote D1 database:

```bash
npm run db:init:remote
```

#### 5. Deploy the Worker

Deploy the bot to Cloudflare Workers:

```bash
npm run deploy
```

Once deployed, you will get a Worker URL (e.g., `https://lark-epic-bot.your-subdomain.workers.dev`).

### Final Step: Configure Lark/Feishu Event Subscriptions (For both methods)

1. Go to the [Lark Developer Console](https://open.larksuite.com/app) or [Feishu Developer Console](https://open.feishu.cn/app).
2. Select your App.
3. Navigate to **Event Subscriptions** and set the **Event Request URL** to your Worker URL.
4. In the same **Event Subscriptions** page, click **Add Events**.
   - Search for `im.message.receive_v1` or look for the event named **"Receive messages"**.
   - Check the box to add this event. This allows the bot to receive messages from users.
5. Navigate to **Permissions** -> **Manage Permissions** and ensure your app has the following permissions:
   - `im:message`
   - `im:message:send_as_bot`
6. Make sure you have enabled the Bot feature under **Add Features** -> **Bot**.
7. Publish a new version of your App.

## 💬 Bot Commands

Users or groups can interact with the bot using the following text commands:

- **`subscribe`** (or **`订阅`**): Subscribe to daily free game notifications.
- **`unsubscribe`** (or **`取消订阅`**): Stop receiving daily notifications.
- **`games`** (or **`免费游戏`**): Check the currently available free games.

## 🛠️ How It Works

1. **Cron Trigger:** The Cloudflare Worker is scheduled via a Cron Trigger (`20 16 * * *`) to run every day at 16:20 UTC.
2. **Fetch & Store:** It fetches the latest free games from the Epic Games API and stores them in the D1 database.
3. **Cleanup:** It checks for games whose `end_date` has passed and removes them from the database.
4. **Push:** It retrieves all subscribed users/groups and pushes newly discovered free games to them via interactive Lark message cards.
5. **Webhook:** The Worker also acts as an HTTP server to listen for Lark webhook events (e.g., users sending commands).

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
