const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const TOKEN = process.env.DISCORD_TOKEN;

if (!TOKEN) {
  console.error("❌ DISCORD_TOKEN is missing!");
  process.exit(1);
}

client.once("ready", () => {
  console.log(`🟢 ${client.user.tag} is ONLINE!`);
});

client.on("error", (error) => {
  console.error("❌ Discord error:", error);
});

client.login(TOKEN).catch((error) => {
  console.error("❌ Login failed:", error.message);
  process.exit(1);
});
