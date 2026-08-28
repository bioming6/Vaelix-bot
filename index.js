const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  REST,
  Routes,
  PermissionFlagsBits
} = require("discord.js");

const TOKEN = process.env.DISCORD_TOKEN;

const GUILD_ID = "1541124583606714491";
const WELCOME_CHANNEL_ID = "1541163863641300992";

if (!TOKEN) {
  console.error("❌ DISCORD_TOKEN is missing!");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

/* =========================
   WELCOME EMBED
========================= */

function createWelcomeEmbed(member) {
  return new EmbedBuilder()
    .setColor(0x7c3aed)
    .setTitle("👋 Welcome!")
    .setDescription(
      `Welcome ${member} to **${member.guild.name}**! 🎉\n\n` +
      `✨ We're happy to have you here!\n\n` +
      `👥 Member #${member.guild.memberCount}`
    )
    .setThumbnail(
      member.user.displayAvatarURL({
        extension: "png",
        size: 256
      })
    )
    .setTimestamp()
    .setFooter({
      text: "𝙑𝙖𝙚𝙡𝙞𝙭 • Welcome System"
    });
}

/* =========================
   SEND WELCOME
========================= */

async function sendWelcome(member) {

  const channel = await member.guild.channels
    .fetch(WELCOME_CHANNEL_ID)
    .catch(() => null);

  if (!channel) {
    throw new Error("❌ Welcome channel not found!");
  }

  if (!channel.isTextBased() || !channel.isSendable()) {
    throw new Error("❌ Welcome channel cannot receive messages!");
  }

  await channel.send({
    content: `👋 Welcome ${member}!`,
    embeds: [createWelcomeEmbed(member)]
  });

  console.log(`✅ Welcome sent to ${member.user.tag}`);
}

/* =========================
   BOT READY
========================= */

client.once("ready", async () => {

  console.log("━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`🟢 ${client.user.tag} is ONLINE!`);
  console.log(`🆔 ${client.user.id}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━");

  try {

    const rest = new REST({ version: "10" }).setToken(TOKEN);

    await rest.put(
      Routes.applicationGuildCommands(
        client.user.id,
        GUILD_ID
      ),
      {
        body: [
          {
            name: "welcometest",
            description: "Test the Welcome System"
          }
        ]
      }
    );

    console.log("✅ /welcometest registered!");

  } catch (error) {

    console.error(
      "❌ Failed to register /welcometest:",
      error
    );

  }
});

/* =========================
   AUTOMATIC WELCOME
========================= */

client.on("guildMemberAdd", async (member) => {

  if (member.guild.id !== GUILD_ID) return;

  try {

    await sendWelcome(member);

  } catch (error) {

    console.error(
      "❌ Automatic Welcome Error:",
      error.message
    );

  }
});

/* =========================
   /welcometest
========================= */

client.on("interactionCreate", async (interaction) => {

  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName !== "welcometest") return;

  if (interaction.guildId !== GUILD_ID) {
    return interaction.reply({
      content: "❌ This command can only be used in the configured server.",
      ephemeral: true
    });
  }

  if (
    !interaction.memberPermissions?.has(
      PermissionFlagsBits.ManageGuild
    )
  ) {
    return interaction.reply({
      content: "❌ You need **Manage Server** permission.",
      ephemeral: true
    });
  }

  try {

    await interaction.deferReply({
      ephemeral: true
    });

    await sendWelcome(interaction.member);

    await interaction.editReply(
      "✅ Welcome test sent successfully!"
    );

  } catch (error) {

    console.error(
      "❌ /welcometest error:",
      error
    );

    await interaction.editReply(
      `❌ Failed to send the welcome message.\n\`${error.message}\``
    ).catch(() => {});

  }

});

/* =========================
   ERROR HANDLING
========================= */

client.on("error", (error) => {
  console.error("❌ Discord Client Error:", error);
});

process.on("unhandledRejection", (error) => {
  console.error("❌ Unhandled Rejection:", error);
});

/* =========================
   LOGIN
========================= */

client.login(TOKEN).catch((error) => {

  console.error(
    "❌ Discord login failed:",
    error.message
  );

  process.exit(1);

});