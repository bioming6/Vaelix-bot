const { Client, GatewayIntentBits } = require("discord.js");

const token = process.env.DISCORD_TOKEN;

if (!token) {
  console.error("❌ DISCORD_TOKEN is missing.");
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once("ready", (client) => {
  console.log(`✅ ${client.user.tag} is ONLINE!`);
  console.log(`🆔 Bot ID: ${client.user.id}`);
});

client.on("error", (error) => {
  console.error("❌ Discord client error:", error.message);
});

process.on("unhandledRejection", (error) => {
  console.error("❌ Unhandled rejection:", error);
});

process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught exception:", error);
});

client.login(token).catch((error) => {
  console.error("❌ Discord login failed:", error.message);
  process.exit(1);
});