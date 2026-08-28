const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelType,
  PermissionFlagsBits,
  REST,
  Routes
} = require("discord.js");

// ======================================================
// CONFIG
// ======================================================

const TOKEN = process.env.DISCORD_TOKEN;

const GUILD_ID = "1541124583606714491";

const WELCOME_CHANNEL_ID = "1541163863641300992";
const TICKET_PANEL_CHANNEL_ID = "1541250932610965644";
const SUPPORT_CHANNEL_ID = "1541660720280895508";

if (!TOKEN) {
  console.error("❌ DISCORD_TOKEN is missing.");
  process.exit(1);
}

// ======================================================
// CLIENT
// ======================================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

// ======================================================
// WELCOME
// ======================================================

function welcomeEmbed(member) {
  return new EmbedBuilder()
    .setColor(0x7c3aed)
    .setTitle("👋 Welcome!")
    .setDescription(
      `Welcome ${member} to **${member.guild.name}**! 🎉\n\n` +
      `✨ We're happy to have you here!\n\n` +
      `👥 Member #${member.guild.memberCount}\n\n` +
      `Enjoy your stay!`
    )
    .setThumbnail(
      member.user.displayAvatarURL({
        extension: "png",
        size: 256
      })
    )
    .setTimestamp()
    .setFooter({
      text: "Vaelix • Welcome System"
    });
}

// Prevent duplicate welcome events while this process is running.
const welcomedUsers = new Set();

client.on("guildMemberAdd", async (member) => {
  if (member.guild.id !== GUILD_ID) return;

  if (welcomedUsers.has(member.id)) {
    console.log(`⚠️ Duplicate welcome blocked: ${member.user.tag}`);
    return;
  }

  welcomedUsers.add(member.id);

  // Keep memory clean.
  setTimeout(() => {
    welcomedUsers.delete(member.id);
  }, 10 * 60 * 1000);

  try {
    const channel = await member.guild.channels
      .fetch(WELCOME_CHANNEL_ID)
      .catch(() => null);

    if (!channel || !channel.isTextBased() || !channel.isSendable()) {
      console.error("❌ Welcome channel is unavailable.");
      return;
    }

    await channel.send({
      embeds: [welcomeEmbed(member)]
    });

    console.log(`✅ Welcome sent to ${member.user.tag}`);
  } catch (error) {
    console.error("❌ Welcome error:", error.message);
  }
});

// ======================================================
// TICKET PANEL
// ======================================================

async function setupTicketPanel() {
  try {
    const channel = await client.channels
      .fetch(TICKET_PANEL_CHANNEL_ID)
      .catch(() => null);

    if (!channel || !channel.isTextBased() || !channel.isSendable()) {
      console.error("❌ Ticket panel channel is unavailable.");
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x7c3aed)
      .setTitle("🎫 Vaelix Support")
      .setDescription(
        "Need help?\n\n" +
        "Click **Create Ticket** below and describe your problem.\n\n" +
        "🔒 Your ticket will be private.\n" +
        "🤖 Vaelix Support will automatically acknowledge your request."
      )
      .setFooter({
        text: "Vaelix Support System"
      });

    const button = new ButtonBuilder()
      .setCustomId("vaelix_create_ticket")
      .setLabel("Create Ticket")
      .setEmoji("🎫")
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder()
      .addComponents(button);

    const messages = await channel.messages.fetch({
      limit: 50
    });

    const exists = messages.some(message =>
      message.author.id === client.user.id &&
      message.components?.some(messageRow =>
        messageRow.components?.some(
          component =>
            component.customId === "vaelix_create_ticket"
        )
      )
    );

    if (exists) {
      console.log("✅ Ticket GUI already exists.");
      return;
    }

    await channel.send({
      embeds: [embed],
      components: [row]
    });

    console.log("✅ Ticket GUI created.");
  } catch (error) {
    console.error("❌ Ticket GUI error:", error.message);
  }
}

// ======================================================
// SUPPORT CHANNEL
// ======================================================

async function setupSupportChannel() {
  try {
    const channel = await client.channels
      .fetch(SUPPORT_CHANNEL_ID)
      .catch(() => null);

    if (!channel || channel.type !== ChannelType.GuildText) {
      console.error("❌ Support channel is unavailable.");
      return;
    }

    // Hide it from @everyone.
    await channel.permissionOverwrites.edit(
      channel.guild.roles.everyone,
      {
        ViewChannel: false
      }
    );

    // Allow the bot to use it.
    await channel.permissionOverwrites.edit(
      client.user.id,
      {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
        EmbedLinks: true
      }
    );

    console.log("✅ Support channel configured.");
  } catch (error) {
    console.error("❌ Support channel error:", error.message);
  }
}

// ======================================================
// FIND EXISTING TICKET
// ======================================================

function findTicket(guild, userId) {
  return guild.channels.cache.find(
    channel =>
      channel.type === ChannelType.GuildText &&
      channel.topic === `vaelix-ticket:${userId}`
  );
}

// ======================================================
// CREATE TICKET
// ======================================================

async function createTicket(interaction, problem) {
  const guild = interaction.guild;

  const existing = findTicket(
    guild,
    interaction.user.id
  );

  if (existing) {
    return {
      error:
        `❌ You already have an open ticket: ${existing}`
    };
  }

  let username = interaction.user.username
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 18);

  if (!username) username = "user";

  const ticketChannel = await guild.channels.create({
    name: `ticket-${username}`,
    type: ChannelType.GuildText,

    topic: `vaelix-ticket:${interaction.user.id}`,

    permissionOverwrites: [
      {
        id: guild.id,
        deny: [
          PermissionFlagsBits.ViewChannel
        ]
      },
      {
        id: interaction.user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory
        ]
      },
      {
        id: client.user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.ManageChannels,
          PermissionFlagsBits.ManageMessages
        ]
      }
    ]
  });

  const closeButton = new ButtonBuilder()
    .setCustomId("vaelix_close_ticket")
    .setLabel("Close Ticket")
    .setEmoji("🔒")
    .setStyle(ButtonStyle.Danger);

  const row = new ActionRowBuilder()
    .addComponents(closeButton);

  const ticketEmbed = new EmbedBuilder()
    .setColor(0x7c3aed)
    .setTitle("🎫 Vaelix Support Ticket")
    .setDescription(
      `Hello ${interaction.user}! 👋\n\n` +
      `Your ticket has been created successfully.\n\n` +
      `📝 **Your Problem**\n` +
      `${problem}\n\n` +
      `🤖 **Support Response**\n` +
      `Thank you for contacting Vaelix Support! ` +
      `Your issue has been received successfully. ` +
      `Please wait while we process your request.\n\n` +
      `🔒 This ticket is private.`
    )
    .setTimestamp()
    .setFooter({
      text: "Vaelix Support System"
    });

  await ticketChannel.send({
    embeds: [ticketEmbed],
    components: [row]
  });

  // Send the problem to the hidden support channel.
  const supportChannel = await guild.channels
    .fetch(SUPPORT_CHANNEL_ID)
    .catch(() => null);

  if (
    supportChannel &&
    supportChannel.isTextBased() &&
    supportChannel.isSendable()
  ) {
    const supportEmbed = new EmbedBuilder()
      .setColor(0x7c3aed)
      .setTitle("🎫 New Support Ticket")
      .addFields(
        {
          name: "👤 User",
          value: `${interaction.user}\n\`${interaction.user.id}\``
        },
        {
          name: "🎫 Ticket",
          value: `${ticketChannel}`
        },
        {
          name: "📝 Problem",
          value: problem.slice(0, 1024)
        }
      )
      .setTimestamp()
      .setFooter({
        text: "Vaelix Support Logs"
      });

    await supportChannel.send({
      embeds: [supportEmbed]
    });
  }

  return {
    channel: ticketChannel
  };
}

// ======================================================
// INTERACTIONS
// ======================================================

client.on("interactionCreate", async (interaction) => {

  // ====================================================
  // CREATE TICKET BUTTON
  // ====================================================

  if (
    interaction.isButton() &&
    interaction.customId === "vaelix_create_ticket"
  ) {
    const modal = new ModalBuilder()
      .setCustomId("vaelix_ticket_modal")
      .setTitle("Create a Ticket");

    const problem = new TextInputBuilder()
      .setCustomId("ticket_problem")
      .setLabel("Describe your problem")
      .setPlaceholder(
        "Please explain your issue in detail..."
      )
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setMinLength(5)
      .setMaxLength(1000);

    modal.addComponents(
      new ActionRowBuilder().addComponents(problem)
    );

    await interaction.showModal(modal);
    return;
  }

  // ====================================================
  // TICKET MODAL
  // ====================================================

  if (
    interaction.isModalSubmit() &&
    interaction.customId === "vaelix_ticket_modal"
  ) {
    await interaction.deferReply({
      ephemeral: true
    });

    try {
      const problem =
        interaction.fields.getTextInputValue(
          "ticket_problem"
        );

      const result = await createTicket(
        interaction,
        problem
      );

      if (result.error) {
        await interaction.editReply({
          content: result.error
        });
        return;
      }

      await interaction.editReply({
        content:
          `✅ Your ticket has been created: ${result.channel}`
      });

    } catch (error) {
      console.error(
        "❌ Ticket creation error:",
        error
      );

      await interaction.editReply({
        content:
          "❌ Failed to create your ticket. Please try again later."
      });
    }

    return;
  }

  // ====================================================
  // CLOSE TICKET
  // ====================================================

  if (
    interaction.isButton() &&
    interaction.customId === "vaelix_close_ticket"
  ) {
    const channel = interaction.channel;

    if (
      !channel ||
      channel.type !== ChannelType.GuildText ||
      !channel.topic?.startsWith("vaelix-ticket:")
    ) {
      await interaction.reply({
        content: "❌ This is not a Vaelix ticket.",
        ephemeral: true
      });
      return;
    }

    await interaction.reply({
      content:
        "🔒 This ticket will be deleted in 5 seconds..."
    });

    setTimeout(() => {
      channel.delete().catch(() => {});
    }, 5000);

    return;
  }

  // ====================================================
  // /welcometest
  // ====================================================

  if (
    interaction.isChatInputCommand() &&
    interaction.commandName === "welcometest"
  ) {
    if (
      !interaction.memberPermissions?.has(
        PermissionFlagsBits.ManageGuild
      )
    ) {
      await interaction.reply({
        content:
          "❌ You need Manage Server permission.",
        ephemeral: true
      });
      return;
    }

    try {
      const channel =
        await interaction.guild.channels.fetch(
          WELCOME_CHANNEL_ID
        );

      if (
        !channel ||
        !channel.isTextBased() ||
        !channel.isSendable()
      ) {
        throw new Error(
          "Welcome channel unavailable."
        );
      }

      await channel.send({
        embeds: [
          welcomeEmbed(interaction.member)
        ]
      });

      await interaction.reply({
        content:
          "✅ Welcome test sent successfully!",
        ephemeral: true
      });

    } catch (error) {
      console.error(
        "❌ /welcometest error:",
        error.message
      );

      await interaction.reply({
        content:
          "❌ Failed to send the welcome message.",
        ephemeral: true
      });
    }
  }
});

// ======================================================
// READY
// ======================================================

client.once("ready", async () => {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`🟢 ${client.user.tag} is ONLINE!`);
  console.log(`🆔 ${client.user.id}`);
  console.log(
    `🏠 Servers: ${client.guilds.cache.size}`
  );
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  await setupTicketPanel();
  await setupSupportChannel();

  // Register /welcometest
  try {
    const rest = new REST({
      version: "10"
    }).setToken(TOKEN);

    await rest.put(
      Routes.applicationGuildCommands(
        client.user.id,
        GUILD_ID
      ),
      {
        body: [
          {
            name: "welcometest",
            description:
              "Test the Welcome System"
          }
        ]
      }
    );

    console.log(
      "✅ /welcometest registered!"
    );

  } catch (error) {
    console.error(
      "❌ Command registration error:",
      error.message
    );
  }
});

// ======================================================
// ERROR HANDLING
// ======================================================

client.on("error", error => {
  console.error(
    "❌ Discord Client Error:",
    error
  );
});

process.on("unhandledRejection", error => {
  console.error(
    "❌ Unhandled Rejection:",
    error
  );
});

process.on("uncaughtException", error => {
  console.error(
    "❌ Uncaught Exception:",
    error
  );
});

// ======================================================
// LOGIN
// ======================================================

client.login(TOKEN).catch(error => {
  console.error(
    "❌ Discord login failed:",
    error.message
  );

  process.exit(1);
});