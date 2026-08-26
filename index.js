const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require("discord.js");

const token = process.env.DISCORD_TOKEN;
const WELCOME_CHANNEL_ID = "1541163863641300992";

if (!token) {
  console.error("❌ DISCORD_TOKEN is missing.");
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

function createWelcomeEmbed(member) {
  return new EmbedBuilder()
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
}

// Automatic welcome
client.on("guildMemberAdd", async (member) => {
  try {
    const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);

    if (!channel?.isTextBased()) {
      console.error("❌ Welcome channel not found.");
      return;
    }

    await channel.send({
      embeds: [createWelcomeEmbed(member)],
    });

    console.log(`✅ Welcome sent for ${member.user.tag}`);
  } catch (error) {
    console.error("❌ Welcome System error:", error);
  }
});

// /testwelcome
const testWelcomeCommand = new SlashCommandBuilder()
  .setName("testwelcome")
  .setDescription("Test the Welcome System");

client.once("ready", async (client) => {
  console.log(`✅ ${client.user.tag} is ONLINE!`);
  console.log(`🆔 Bot ID: ${client.user.id}`);

  try {
    const guild = client.guilds.cache.first();

    if (guild) {
      await guild.commands.create(testWelcomeCommand);
      console.log("✅ /testwelcome registered.");
    }
  } catch (error) {
    console.error("❌ Command registration error:", error);
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== "testwelcome") return;

  if (
    !interaction.memberPermissions?.has(
      PermissionFlagsBits.ManageGuild
    )
  ) {
    await interaction.reply({
      content: "❌ You need Manage Server permission.",
      ephemeral: true,
    });
    return;
  }

  try {
    const channel =
      interaction.guild.channels.cache.get(WELCOME_CHANNEL_ID);

    if (!channel?.isTextBased()) {
      await interaction.reply({
        content: "❌ Welcome channel was not found.",
        ephemeral: true,
      });
      return;
    }

    await channel.send({
      embeds: [createWelcomeEmbed(interaction.member)],
    });

    await interaction.reply({
      content: "✅ Welcome test sent!",
      ephemeral: true,
    });
  } catch (error) {
    console.error("❌ Test welcome error:", error);

    if (!interaction.replied) {
      await interaction.reply({
        content: "❌ Failed to send the welcome message.",
        ephemeral: true,
      });
    }
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
