const { Client, GatewayIntentBits } = require("discord.js");

const token = process.env.DISCORD_TOKEN;

if (!token) {
  console.error("❌ DISCORD_TOKEN is missing.");
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once("ready", () => {
  console.log(`✅ ${client.user.tag} is ONLINE!`);
});

client.login(token).catch((error) => {
  console.error("❌ Discord login failed:", error.message);
  process.exit(1);
});
