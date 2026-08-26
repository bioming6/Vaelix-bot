const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  PermissionFlagsBits,
  REST,
  Routes,
  SlashCommandBuilder,
} = require("discord.js");

const TOKEN = process.env.DISCORD_TOKEN;

const GUILD_ID = "PUT_YOUR_SERVER_ID_HERE";
const WELCOME_CHANNEL_ID = "1541163863641300992";

if (!TOKEN) {
  console.error("❌ DISCORD_TOKEN is missing.");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ],
});

const testWelcomeCommand = new SlashCommandBuilder()
  .setName("testwelcome")
  .setDescription("Test the Welcome System");

function createWelcomeEmbed(member) {
  return new EmbedBuilder()
    .setColor(0x7c3aed)
    .setTitle("👋 Welcome to 𝙑𝙖𝙚𝙡𝙞𝙭!")
    .setDescription(
      [
        `Welcome ${member}!`,
        "",
        "✨ We're happy to have you here!",
        "",
        `👥 You are member #${member.guild.memberCount}`,
        "",
        "🎉 Enjoy your stay!",
      ].join("\n"),
    )
    .setThumbnail(
      member.user.displayAvatarURL({
        extension: "png",
        size: 256,
      }),
    )
    .setTimestamp()
    .setFooter({
      text: "𝙑𝙖𝙚𝙡𝙞𝙭 • Welcome System",
    });
}

async function sendWelcome(member) {
  const channel = await member.guild.channels
    .fetch(WELCOME_CHANNEL_ID)
    .catch((error) => {
      console.error("❌ Failed to fetch Welcome channel:", error.message);
      return null;
    });

  if (!channel) {
    throw new Error(
      `Welcome channel ${WELCOME_CHANNEL_ID} was not found.`,
    );
  }

  if (!channel.isTextBased() || !channel.isSendable()) {
    throw new Error(
      `Channel ${WELCOME_CHANNEL_ID} is not a sendable text channel.`,
    );
  }

  const permissions = channel.permissionsFor(client.user);

  if (!permissions?.has(PermissionFlagsBits.ViewChannel)) {
    throw new Error("Bot does not have View Channel permission.");
  }

  if (!permissions?.has(PermissionFlagsBits.SendMessages)) {
    throw new Error("Bot does not have Send Messages permission.");
  }

  if (!permissions?.has(PermissionFlagsBits.EmbedLinks)) {
    throw new Error("Bot does not have Embed Links permission.");
  }

  await channel.send({
    embeds: [createWelcomeEmbed(member)],
  });

  console.log(`✅ Welcome message sent for ${member.user.tag}`);
}

// Bot online
client.once("ready", async () => {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`🟢 ${client.user.tag} is ONLINE!`);
  console.log(`🆔 Bot ID: ${client.user.id}`);
  console.log(`🏠 Servers: ${client.guilds.cache.size}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {
    const rest = new REST({ version: "10" }).setToken(TOKEN);

    await rest.put(
      Routes.applicationGuildCommands(
        client.user.id,
        GUILD_ID,
      ),
      {
        body: [testWelcomeCommand.toJSON()],
      },
    );

    console.log("✅ /testwelcome registered.");
  } catch (error) {
    console.error(
      "❌ Failed to register /testwelcome:",
      error.message,
    );
  }
});

// Automatic Welcome
client.on("guildMemberAdd", async (member) => {
  if (member.guild.id !== GUILD_ID) return;

  try {
    await sendWelcome(member);
  } catch (error) {
    console.error(
      `❌ Welcome failed for ${member.user.tag}:`,
      error.message,
    );
  }
});

// Slash commands
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName !== "testwelcome") return;

  if (interaction.guild?.id !== GUILD_ID) {
    await interaction.reply({
      content: "❌ This command is not configured for this server.",
      ephemeral: true,
    });
    return;
  }

  if (
    !interaction.memberPermissions?.has(
      PermissionFlagsBits.ManageGuild,
    )
  ) {
    await interaction.reply({
      content: "❌ You need the Manage Server permission.",
      ephemeral: true,
    });
    return;
  }

  try {
    await interaction.deferReply({
      ephemeral: true,
    });

    await sendWelcome(interaction.member);

    await interaction.editReply(
      "✅ Welcome test sent successfully!",
    );
  } catch (error) {
    console.error(
      "❌ Test welcome failed:",
      error,
    );

    if (interaction.deferred) {
      await interaction.editReply(
        `❌ Failed to send the welcome message.\n\nReason: ${error.message}`,
      ).catch(() => {});
    }
  }
});

client.on("error", (error) => {
  console.error("❌ Discord client error:", error);
});

process.on("unhandledRejection", (error) => {
  console.error("❌ Unhandled promise rejection:", error);
});

process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught exception:", error);
});

client.login(TOKEN).catch((error) => {
  console.error("❌ Discord login failed:", error.message);
  process.exit(1);
});const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  PermissionFlagsBits,
  REST,
  Routes,
  SlashCommandBuilder,
} = require("discord.js");

const TOKEN = process.env.DISCORD_TOKEN;

const GUILD_ID = "PUT_YOUR_SERVER_ID_HERE";
const WELCOME_CHANNEL_ID = "1541163863641300992";

if (!TOKEN) {
  console.error("❌ DISCORD_TOKEN is missing.");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ],
});

const testWelcomeCommand = new SlashCommandBuilder()
  .setName("testwelcome")
  .setDescription("Test the Welcome System");

function createWelcomeEmbed(member) {
  return new EmbedBuilder()
    .setColor(0x7c3aed)
    .setTitle("👋 Welcome to 𝙑𝙖𝙚𝙡𝙞𝙭!")
    .setDescription(
      [
        `Welcome ${member}!`,
        "",
        "✨ We're happy to have you here!",
        "",
        `👥 You are member #${member.guild.memberCount}`,
        "",
        "🎉 Enjoy your stay!",
      ].join("\n"),
    )
    .setThumbnail(
      member.user.displayAvatarURL({
        extension: "png",
        size: 256,
      }),
    )
    .setTimestamp()
    .setFooter({
      text: "𝙑𝙖𝙚𝙡𝙞𝙭 • Welcome System",
    });
}

async function sendWelcome(member) {
  const channel = await member.guild.channels
    .fetch(WELCOME_CHANNEL_ID)
    .catch((error) => {
      console.error("❌ Failed to fetch Welcome channel:", error.message);
      return null;
    });

  if (!channel) {
    throw new Error(
      `Welcome channel ${WELCOME_CHANNEL_ID} was not found.`,
    );
  }

  if (!channel.isTextBased() || !channel.isSendable()) {
    throw new Error(
      `Channel ${WELCOME_CHANNEL_ID} is not a sendable text channel.`,
    );
  }

  const permissions = channel.permissionsFor(client.user);

  if (!permissions?.has(PermissionFlagsBits.ViewChannel)) {
    throw new Error("Bot does not have View Channel permission.");
  }

  if (!permissions?.has(PermissionFlagsBits.SendMessages)) {
    throw new Error("Bot does not have Send Messages permission.");
  }

  if (!permissions?.has(PermissionFlagsBits.EmbedLinks)) {
    throw new Error("Bot does not have Embed Links permission.");
  }

  await channel.send({
    embeds: [createWelcomeEmbed(member)],
  });

  console.log(`✅ Welcome message sent for ${member.user.tag}`);
}

// Bot online
client.once("ready", async () => {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`🟢 ${client.user.tag} is ONLINE!`);
  console.log(`🆔 Bot ID: ${client.user.id}`);
  console.log(`🏠 Servers: ${client.guilds.cache.size}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {
    const rest = new REST({ version: "10" }).setToken(TOKEN);

    await rest.put(
      Routes.applicationGuildCommands(
        client.user.id,
        GUILD_ID,
      ),
      {
        body: [testWelcomeCommand.toJSON()],
      },
    );

    console.log("✅ /testwelcome registered.");
  } catch (error) {
    console.error(
      "❌ Failed to register /testwelcome:",
      error.message,
    );
  }
});

// Automatic Welcome
client.on("guildMemberAdd", async (member) => {
  if (member.guild.id !== GUILD_ID) return;

  try {
    await sendWelcome(member);
  } catch (error) {
    console.error(
      `❌ Welcome failed for ${member.user.tag}:`,
      error.message,
    );
  }
});

// Slash commands
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName !== "testwelcome") return;

  if (interaction.guild?.id !== GUILD_ID) {
    await interaction.reply({
      content: "❌ This command is not configured for this server.",
      ephemeral: true,
    });
    return;
  }

  if (
    !interaction.memberPermissions?.has(
      PermissionFlagsBits.ManageGuild,
    )
  ) {
    await interaction.reply({
      content: "❌ You need the Manage Server permission.",
      ephemeral: true,
    });
    return;
  }

  try {
    await interaction.deferReply({
      ephemeral: true,
    });

    await sendWelcome(interaction.member);

    await interaction.editReply(
      "✅ Welcome test sent successfully!",
    );
  } catch (error) {
    console.error(
      "❌ Test welcome failed:",
      error,
    );

    if (interaction.deferred) {
      await interaction.editReply(
        `❌ Failed to send the welcome message.\n\nReason: ${error.message}`,
      ).catch(() => {});
    }
  }
});

client.on("error", (error) => {
  console.error("❌ Discord client error:", error);
});

process.on("unhandledRejection", (error) => {
  console.error("❌ Unhandled promise rejection:", error);
});

process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught exception:", error);
});

client.login(TOKEN).catch((error) => {
  console.error("❌ Discord login failed:", error.message);
  process.exit(1);
});
