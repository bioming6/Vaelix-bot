const {
  Client,
  GatewayIntentBits,
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  REST,
  Routes
} = require("discord.js");

// =====================================================
// CONFIG
// =====================================================

const TOKEN = process.env.DISCORD_TOKEN;

const GUILD_ID = "1541124583606714491";

// Your two IDs
const TICKET_CATEGORY_ID = "1541250932610965644";
const SUPPORT_CHANNEL_ID = "1541660720280895508";

// Welcome channel from your previous setup
const WELCOME_CHANNEL_ID = "1541163863641300992";

// =====================================================
// CLIENT
// =====================================================

if (!TOKEN) {
  console.error("❌ DISCORD_TOKEN is missing.");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

// =====================================================
// WELCOME
// =====================================================

// This only prevents duplicates inside THIS process.
// GitHub Actions concurrency below is also required.
const welcomeLock = new Set();

function createWelcomeEmbed(member) {
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

client.on("guildMemberAdd", async member => {
  if (member.guild.id !== GUILD_ID) return;

  if (welcomeLock.has(member.id)) {
    console.log(
      `⚠️ Duplicate welcome blocked: ${member.user.tag}`
    );
    return;
  }

  welcomeLock.add(member.id);

  setTimeout(() => {
    welcomeLock.delete(member.id);
  }, 10 * 60 * 1000);

  try {
    const channel =
      await member.guild.channels.fetch(
        WELCOME_CHANNEL_ID
      );

    if (
      !channel ||
      !channel.isTextBased() ||
      !channel.isSendable()
    ) {
      console.error(
        "❌ Welcome channel unavailable."
      );
      return;
    }

    await channel.send({
      embeds: [
        createWelcomeEmbed(member)
      ]
    });

    console.log(
      `✅ Welcome sent to ${member.user.tag}`
    );

  } catch (error) {
    console.error(
      "❌ Welcome error:",
      error.message
    );
  }
});

// =====================================================
// FIND / CREATE TICKET PANEL CHANNEL
// =====================================================

async function getTicketPanelChannel(guild) {

  // Find existing panel channel
  let panel =
    guild.channels.cache.find(
      channel =>
        channel.parentId === TICKET_CATEGORY_ID &&
        channel.name === "🎫・create-ticket" &&
        channel.type === ChannelType.GuildText
    );

  if (panel) {
    return panel;
  }

  console.log(
    "ℹ️ Ticket panel channel does not exist. Creating it..."
  );

  panel = await guild.channels.create({
    name: "🎫・create-ticket",
    type: ChannelType.GuildText,
    parent: TICKET_CATEGORY_ID,

    permissionOverwrites: [
      {
        id: guild.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.ReadMessageHistory
        ],
        deny: [
          PermissionFlagsBits.SendMessages
        ]
      },

      {
        id: client.user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.EmbedLinks,
          PermissionFlagsBits.ManageMessages
        ]
      }
    ]
  });

  console.log(
    `✅ Created ticket panel channel: ${panel.name}`
  );

  return panel;
}

// =====================================================
// TICKET GUI
// =====================================================

async function setupTicketPanel(guild) {

  const category =
    await guild.channels.fetch(
      TICKET_CATEGORY_ID
    );

  if (
    !category ||
    category.type !== ChannelType.GuildCategory
  ) {
    console.error(
      "❌ TICKET_CATEGORY_ID is not a Category!"
    );
    return;
  }

  const panel =
    await getTicketPanelChannel(guild);

  const messages =
    await panel.messages.fetch({
      limit: 50
    });

  const alreadyExists =
    messages.some(message =>
      message.author.id === client.user.id &&
      message.components?.some(row =>
        row.components?.some(
          component =>
            component.customId ===
            "vaelix_create_ticket"
        )
      )
    );

  if (alreadyExists) {
    console.log(
      "✅ Ticket GUI already exists."
    );
    return;
  }

  const embed =
    new EmbedBuilder()
      .setColor(0x7c3aed)
      .setTitle("🎫 Vaelix Support")
      .setDescription(
        "Need help?\n\n" +
        "Click **Create Ticket** below.\n\n" +
        "📝 Describe your problem\n" +
        "🔒 Your ticket will be private\n" +
        "🤖 Vaelix will acknowledge your request"
      )
      .setFooter({
        text: "Vaelix Support System"
      })
      .setTimestamp();

  const button =
    new ButtonBuilder()
      .setCustomId(
        "vaelix_create_ticket"
      )
      .setLabel("Create Ticket")
      .setEmoji("🎫")
      .setStyle(ButtonStyle.Primary);

  const row =
    new ActionRowBuilder()
      .addComponents(button);

  await panel.send({
    embeds: [embed],
    components: [row]
  });

  console.log(
    "✅ Ticket GUI created successfully."
  );
}

// =====================================================
// FIND USER TICKET
// =====================================================

function findUserTicket(guild, userId) {

  return guild.channels.cache.find(
    channel =>
      channel.type === ChannelType.GuildText &&
      channel.parentId === TICKET_CATEGORY_ID &&
      channel.topic ===
        `vaelix-ticket:${userId}`
  );
}

// =====================================================
// CREATE TICKET
// =====================================================

async function createTicket(
  interaction,
  problem
) {

  const guild =
    interaction.guild;

  const existing =
    findUserTicket(
      guild,
      interaction.user.id
    );

  if (existing) {

    return {
      error:
        `❌ You already have an open ticket: ${existing}`
    };
  }

  let username =
    interaction.user.username
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 18);

  if (!username) {
    username = "user";
  }

  const ticket =
    await guild.channels.create({
      name: `ticket-${username}`,

      type: ChannelType.GuildText,

      parent: TICKET_CATEGORY_ID,

      topic:
        `vaelix-ticket:${interaction.user.id}`,

      permissionOverwrites: [

        // Everyone cannot see ticket
        {
          id: guild.id,
          deny: [
            PermissionFlagsBits.ViewChannel
          ]
        },

        // Ticket owner
        {
          id: interaction.user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.EmbedLinks
          ]
        },

        // Bot
        {
          id: client.user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.ManageMessages,
            PermissionFlagsBits.EmbedLinks
          ]
        }
      ]
    });

  // ===================================================
  // TICKET MESSAGE
  // ===================================================

  const closeButton =
    new ButtonBuilder()
      .setCustomId(
        "vaelix_close_ticket"
      )
      .setLabel("Close Ticket")
      .setEmoji("🔒")
      .setStyle(ButtonStyle.Danger);

  const row =
    new ActionRowBuilder()
      .addComponents(closeButton);

  const embed =
    new EmbedBuilder()
      .setColor(0x7c3aed)
      .setTitle("🎫 Support Ticket")
      .setDescription(
        `Hello ${interaction.user}! 👋\n\n` +

        `Your ticket has been created.\n\n` +

        `📝 **Problem**\n` +
        `${problem}\n\n` +

        `🤖 **Vaelix Support**\n` +
        `Thank you for contacting Vaelix Support! ` +
        `Your issue has been received successfully. ` +
        `Please wait while we process your request.`
      )
      .setTimestamp()
      .setFooter({
        text: "Vaelix Support System"
      });

  await ticket.send({
    content:
      `${interaction.user}`,
    embeds: [embed],
    components: [row]
  });

  // ===================================================
  // SUPPORT CHANNEL
  // ===================================================

  const support =
    await guild.channels.fetch(
      SUPPORT_CHANNEL_ID
    );

  if (
    support &&
    support.isTextBased() &&
    support.isSendable()
  ) {

    const supportEmbed =
      new EmbedBuilder()
        .setColor(0x7c3aed)
        .setTitle("🎫 New Ticket")
        .addFields(
          {
            name: "👤 User",
            value:
              `${interaction.user}\n` +
              `ID: \`${interaction.user.id}\``
          },
          {
            name: "🎫 Ticket",
            value: `${ticket}`
          },
          {
            name: "📝 Problem",
            value: problem.slice(0, 1024)
          }
        )
        .setTimestamp()
        .setFooter({
          text: "Vaelix Support"
        });

    await support.send({
      embeds: [supportEmbed]
    });

    console.log(
      "✅ Ticket sent to support channel."
    );
  }

  return {
    channel: ticket
  };
}

// =====================================================
// INTERACTIONS
// =====================================================

client.on(
  "interactionCreate",
  async interaction => {

    // ================================================
    // CREATE TICKET BUTTON
    // ================================================

    if (
      interaction.isButton() &&
      interaction.customId ===
        "vaelix_create_ticket"
    ) {

      const modal =
        new ModalBuilder()
          .setCustomId(
            "vaelix_ticket_modal"
          )
          .setTitle(
            "Create a Ticket"
          );

      const input =
        new TextInputBuilder()
          .setCustomId(
            "ticket_problem"
          )
          .setLabel(
            "Describe your problem"
          )
          .setPlaceholder(
            "Explain your problem..."
          )
          .setStyle(
            TextInputStyle.Paragraph
          )
          .setRequired(true)
          .setMinLength(5)
          .setMaxLength(1000);

      modal.addComponents(
        new ActionRowBuilder()
          .addComponents(input)
      );

      await interaction.showModal(
        modal
      );

      return;
    }

    // ================================================
    // MODAL
    // ================================================

    if (
      interaction.isModalSubmit() &&
      interaction.customId ===
        "vaelix_ticket_modal"
    ) {

      await interaction.deferReply({
        ephemeral: true
      });

      try {

        const problem =
          interaction.fields
            .getTextInputValue(
              "ticket_problem"
            );

        const result =
          await createTicket(
            interaction,
            problem
          );

        if (result.error) {

          await interaction.editReply({
            content:
              result.error
          });

          return;
        }

        await interaction.editReply({
          content:
            `✅ Ticket created: ${result.channel}`
        });

      } catch (error) {

        console.error(
          "❌ Ticket creation error:",
          error
        );

        await interaction.editReply({
          content:
            "❌ Failed to create the ticket."
        });
      }

      return;
    }

    // ================================================
    // CLOSE
    // ================================================

    if (
      interaction.isButton() &&
      interaction.customId ===
        "vaelix_close_ticket"
    ) {

      const channel =
        interaction.channel;

      if (
        !channel ||
        channel.type !==
          ChannelType.GuildText ||
        !channel.topic?.startsWith(
          "vaelix-ticket:"
        )
      ) {

        await interaction.reply({
          content:
            "❌ This is not a ticket.",
          ephemeral: true
        });

        return;
      }

      await interaction.reply({
        content:
          "🔒 Closing ticket in 5 seconds..."
      });

      setTimeout(() => {
        channel.delete().catch(() => {});
      }, 5000);

      return;
    }

    // ================================================
    // WELCOME TEST
    // ================================================

    if (
      interaction.isChatInputCommand() &&
      interaction.commandName ===
        "welcometest"
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
            welcomeEmbed(
              interaction.member
            )
          ]
        });

        await interaction.reply({
          content:
            "✅ Welcome test sent!",
          ephemeral: true
        });

      } catch (error) {

        console.error(
          "❌ Welcome test error:",
          error.message
        );

        await interaction.reply({
          content:
            "❌ Failed to send welcome.",
          ephemeral: true
        });
      }
    }
  }
);

// =====================================================
// READY
// =====================================================

client.once(
  "ready",
  async () => {

    console.log(
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    );

    console.log(
      `🟢 ${client.user.tag} ONLINE`
    );

    console.log(
      `🆔 ${client.user.id}`
    );

    console.log(
      `🏠 Servers: ${client.guilds.cache.size}`
    );

    console.log(
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    );

    try {

      const guild =
        await client.guilds.fetch(
          GUILD_ID
        );

      await setupTicketPanel(
        guild
      );

      console.log(
        "✅ Ticket system ready."
      );

    } catch (error) {

      console.error(
        "❌ Ticket setup failed:",
        error.message
      );
    }

    // ================================================
    // SLASH COMMAND
    // ================================================

    try {

      const rest =
        new REST({
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
        "✅ /welcometest registered."
      );

    } catch (error) {

      console.error(
        "❌ Slash command error:",
        error.message
      );
    }
  }
);

// =====================================================
// ERRORS
// =====================================================

client.on(
  "error",
  error => {
    console.error(
      "❌ Discord error:",
      error
    );
  }
);

process.on(
  "unhandledRejection",
  error => {
    console.error(
      "❌ Unhandled rejection:",
      error
    );
  }
);

process.on(
  "uncaughtException",
  error => {
    console.error(
      "❌ Uncaught exception:",
      error
    );
  }
);

// =====================================================
// LOGIN
// =====================================================

client.login(TOKEN);