const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");

const token = process.env.DISCORD_TOKEN;
const WELCOME_CHANNEL_ID = "1541163863641300992";

if (!token) {
  console.error("❌ DISCORD_TOKEN is missing.");
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

client.once("ready", (client) => {
  console.log(`✅ ${client.user.tag} is ONLINE!`);
  console.log(`🆔 Bot ID: ${client.user.id}`);
});

// Welcome System
client.on("guildMemberAdd", async (member) => {
  try {
    const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);

    if (!channel || !channel.isTextBased()) {
      console.error("❌ Welcome channel not found.");
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x7c3aed)
      .setTitle("👋 Welcome to 𝙑𝙖𝙚𝙡𝙞𝙭!")
      .setDescription(
        `Welcome ${member}!\n\n` +
        `✨ We're happy to have you here!\n` +
        `👥 You are member #${member.guild.memberCount}\n\n` +
        `Enjoy your stay! 🎉`
      )
      .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
      .setTimestamp()
      .setFooter({ text: "𝙑𝙖𝙚𝙡𝙞𝙭 • Welcome System" });

    await channel.send({
      embeds: [embed]
    });

    console.log(`✅ Welcome message sent for ${member.user.tag}`);
  } catch (error) {
    console.error("❌ Welcome System error:", error);
  }
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
