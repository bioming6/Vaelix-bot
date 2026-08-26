# Vaelix Bot

A Discord bot that connects to Discord and stays online 24/7.

## Setup

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Set Discord Token
Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

Then add your Discord bot token to `.env`:
```
DISCORD_TOKEN=your_bot_token_here
```

**How to get a Discord bot token:**
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to "Bot" section and create a bot
4. Copy the token and add it to your `.env` file

### 3. Run the Bot
```bash
python main.py
```

The bot will connect to Discord and stay online automatically.

## Features
- ✅ Connects to Discord using `DISCORD_TOKEN`
- ✅ Stays online 24/7
- ✅ Error handling to maintain connection stability
- ✅ Ready to extend with additional features
