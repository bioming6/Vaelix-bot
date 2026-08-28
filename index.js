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

const TICKET_CATEGORY_ID = "1541250932610965644";
const SUPPORT_CHANNEL_ID = "1541660720280895508";
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

// =====================================================
// WELCOME EVENT
// =====================================================

client.on("guildMemberAdd", async member => {
  if (member.guild.id !== GUILD_ID) return;

  try {
    const channel = await member.guild.channels.fetch(
      WELCOME_CHANNEL_ID
    );

    if (
      !channel ||
      channel.type !== ChannelType.GuildText ||
      !channel.isSendable()
    ) {
      console.error(
        "❌ Welcome channel is unavailable."
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
      error
    );
  }
});

// =====================================================
// TICKET PANEL CHANNEL
// =====================================================

async function getTicketPanelChannel(guild) {

  const category = await guild.channels.fetch(
    TICKET_CATEGORY_ID
  );

  if (
    !category ||
    category.type !== ChannelType.GuildCategory
  ) {
    throw new Error(
      `ID ${TICKET_CATEGORY_ID} is not a Category.`
    );
  }

  let panel = guild.channels.cache.find(
    channel =>
      channel.parentId === TICKET_CATEGORY_ID &&
      channel.name === "🎫・create-ticket" &&
      channel.type === ChannelType.GuildText
  );

  if (panel) {
    return panel;
  }

  panel = await guild.channels.create({
    name: "🎫・create-ticket",
    type: ChannelType.GuildText,
    parent: TICKET_CATEGORY_ID,

    permissionOverwrites: [
      {
        id: guild.roles.everyone.id,
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
          PermissionFlagsBits.EmbedLinks
        ]
      }
    ]
  });

  console.log(
    "✅ Created #🎫・create-ticket"
  );

  return panel;
}

// =====================================================
// TICKET PANEL
// =====================================================

async function setupTicketPanel(guild) {

  const panel =
    await getTicketPanelChannel(guild);

  const messages =
    await panel.messages.fetch({
      limit: 50
    });

  const exists =
    messages.some(message =>
      message.author.id === client.user.id &&
      message.components?.some(row =>
        row.components?.some(component =>
          component.customId ===
          "vaelix_create_ticket"
        )
      )
    );

  if (exists) {
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
        "🤖 Vaelix Support will receive your request"
      )
      .setTimestamp()
      .setFooter({
        text: "Vaelix Support System"
      });

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
    "✅ Ticket GUI created."
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

  const guild = interaction.guild;

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

        {
          id: guild.roles.everyone.id,
          deny: [
            PermissionFlagsBits.ViewChannel
          ]
        },

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

        {
          id: client.user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.EmbedLinks
          ]
        }
      ]
    });

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
        `Your ticket has been created successfully.\n\n` +
        `📝 **Problem**\n${problem}\n\n` +
        `🤖 **Vaelix Support**\n` +
        `Your request has been received. ` +
        `Please wait while we process it.`
      )
      .setTimestamp()
      .setFooter({
        text: "Vaelix Support System"
      });

  await ticket.send({
    content: `${interaction.user}`,
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
    support.type === ChannelType.GuildText &&
    support.isSendable()
  ) {

    const supportEmbed =
      new EmbedBuilder()
        .setColor(0x7c3aed)
        .setTitle("🎫 New Support Ticket")
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
      "✅ Ticket sent to Support."
    );
  } else {
    console.error(
      "❌ Support channel unavailable."
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

    // =================================================
    // CREATE TICKET
    // =================================================

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

      await interaction.showModal(modal);

      return;
    }

    // =================================================
    // MODAL
    // =================================================

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
          interaction.fields.getTextInputValue(
            "ticket_problem"
          );

        const result =
          await createTicket(
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

    // =================================================
    // CLOSE
    // =================================================

    if (
      interaction.isButton() &&
      interaction.customId ===
        "vaelix_close_ticket"
    ) {

      const channel =
        interaction.channel;

      if (
        !channel ||
        channel.type !== ChannelType.GuildText ||
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

    // =================================================
    // /welcometest
    // =================================================

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
          channel.type !== ChannelType.GuildText ||
          !channel.isSendable()
        ) {
          throw new Error(
            "Welcome channel unavailable."
          );
        }

        // FIXED:
        // createWelcomeEmbed, not welcomeEmbed
        await channel.send({
          embeds: [
            createWelcomeEmbed(
              interaction.member
            )
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
          error
        );

        if (!interaction.replied) {
          await interaction.reply({
            content:
              "❌ Failed to send welcome.",
            ephemeral: true
          });
        }
      }

      return;
    }
  }
);

// =====================================================
// READY
// =====================================================

client.once("ready", async () => {

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

    // Verify category
    const category =
      await guild.channels.fetch(
        TICKET_CATEGORY_ID
      );

    if (
      !category ||
      category.type !== ChannelType.GuildCategory
    ) {
      throw new Error(
        `TICKET_CATEGORY_ID ${TICKET_CATEGORY_ID} is not a Category.`
      );
    }

    // Verify support
    const support =
      await guild.channels.fetch(
        SUPPORT_CHANNEL_ID
      );

    if (
      !support ||
      support.type !== ChannelType.GuildText
    ) {
      throw new Error(
        `SUPPORT_CHANNEL_ID ${SUPPORT_CHANNEL_ID} is not a text channel.`
      );
    }

    await setupTicketPanel(guild);

    console.log(
      "✅ Ticket system ready."
    );

  } catch (error) {

    console.error(
      "❌ Ticket system setup failed:",
      error.message
    );
  }

  // ===================================================
  // REGISTER /welcometest
  // ===================================================

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
      "❌ Slash command registration failed:",
      error.message
    );
  }
});

// =====================================================
// ERRORS
// =====================================================

client.on("error", error => {
  console.error(
    "❌ Discord Client Error:",
    error
  );
});

process.on(
  "unhandledRejection",
  error => {
    console.error(
      "❌ Unhandled Rejection:",
      error
    );
  }
);

process.on(
  "uncaughtException",
  error => {
    console.error(
      "❌ Uncaught Exception:",
      error
    );
  }
);

// =====================================================
// LOGIN
// =====================================================

client.login(TOKEN).catch(error => {

  console.error(
    "❌ Discord login failed:",
    error
  );

  process.exit(1);
});