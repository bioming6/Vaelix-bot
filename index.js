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

// 🎫 Ticket panel channel
const TICKET_CHANNEL_ID = "1541250932610965644";

// 🛠️ Support channel
const SUPPORT_CHANNEL_ID = "1541660720280895508";

// 👋 Welcome channel
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

// Prevent duplicate welcome messages inside one process
const welcomeSent = new Set();

client.on("guildMemberAdd", async member => {
  if (member.guild.id !== GUILD_ID) return;

  // Prevent duplicate event handling
  if (welcomeSent.has(member.id)) return;

  welcomeSent.add(member.id);

  // Automatically remove lock after 10 minutes
  setTimeout(() => {
    welcomeSent.delete(member.id);
  }, 10 * 60 * 1000);

  try {
    const channel =
      await member.guild.channels.fetch(
        WELCOME_CHANNEL_ID
      );

    if (
      !channel ||
      channel.type !== ChannelType.GuildText ||
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
// TICKET PANEL
// =====================================================

async function setupTicketPanel() {

  const channel =
    await client.channels.fetch(
      TICKET_CHANNEL_ID
    );

  if (
    !channel ||
    channel.type !== ChannelType.GuildText
  ) {
    throw new Error(
      "TICKET_CHANNEL_ID must be a normal text channel."
    );
  }

  const messages =
    await channel.messages.fetch({
      limit: 100
    });

  // Don't create multiple panels
  const existingPanel =
    messages.find(message =>
      message.author.id === client.user.id &&
      message.components?.some(row =>
        row.components?.some(component =>
          component.customId ===
          "vaelix_create_ticket"
        )
      )
    );

  if (existingPanel) {
    console.log(
      "✅ Ticket panel already exists."
    );
    return;
  }

  const embed =
    new EmbedBuilder()
      .setColor(0x7c3aed)
      .setTitle("🎫 Vaelix Support")
      .setDescription(
        "**Need help?**\n\n" +
        "Click **Create Ticket** below.\n\n" +
        "📝 Describe your problem\n" +
        "🔒 Your ticket will be private\n" +
        "🤖 Vaelix will send your request to Support"
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

  await channel.send({
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

async function findUserTicket(
  channel,
  userId
) {

  const activeThreads =
    await channel.threads.fetchActive();

  const archivedThreads =
    await channel.threads.fetchArchived({
      type: "private",
      limit: 100
    }).catch(() => null);

  const threads = [];

  for (const thread of activeThreads.threads.values()) {
    threads.push(thread);
  }

  if (archivedThreads) {
    for (const thread of archivedThreads.threads.values()) {
      threads.push(thread);
    }
  }

  return threads.find(thread =>
    thread.type === ChannelType.PrivateThread &&
    thread.name.endsWith(`-${userId}`)
  );
}

// =====================================================
// CREATE TICKET
// =====================================================

async function createTicket(
  interaction,
  problem
) {

  const channel =
    await client.channels.fetch(
      TICKET_CHANNEL_ID
    );

  if (
    !channel ||
    channel.type !== ChannelType.GuildText
  ) {
    throw new Error(
      "Ticket channel unavailable."
    );
  }

  // ===================================================
  // CHECK EXISTING TICKET
  // ===================================================

  const existing =
    await findUserTicket(
      channel,
      interaction.user.id
    );

  if (existing) {

    // Re-open archived ticket if necessary
    if (existing.archived) {
      await existing.setArchived(false);
    }

    return {
      error:
        `❌ You already have an open ticket: ${existing}`
    };
  }

  // ===================================================
  // CREATE PRIVATE THREAD
  // ===================================================

  const safeUsername =
    interaction.user.username
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 30) || "user";

  const thread =
    await channel.threads.create({
      name:
        `ticket-${safeUsername}-${interaction.user.id}`,

      type: ChannelType.PrivateThread,

      reason:
        `Vaelix ticket created by ${interaction.user.tag}`,

      autoArchiveDuration: 10080
    });

  // Add ticket owner
  await thread.members.add(
    interaction.user.id
  );

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
        `Your private support ticket has been created.\n\n` +
        `📝 **Problem**\n` +
        `${problem}\n\n` +
        `🤖 **Vaelix Support**\n` +
        `Your request has been sent to the Support team.`
      )
      .setTimestamp()
      .setFooter({
        text: "Vaelix Support System"
      });

  await thread.send({
    content:
      `${interaction.user}`,
    embeds: [embed],
    components: [row]
  });

  // ===================================================
  // SUPPORT NOTIFICATION
  // ===================================================

  const support =
    await client.channels.fetch(
      SUPPORT_CHANNEL_ID
    );

  if (
    !support ||
    support.type !== ChannelType.GuildText ||
    !support.isSendable()
  ) {
    console.error(
      "❌ Support channel unavailable."
    );

    return {
      channel: thread,
      warning:
        "Ticket created, but Support notification failed."
    };
  }

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
          value: `${thread}`
        },
        {
          name: "📝 Problem",
          value:
            problem.slice(0, 1024)
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
    `✅ Ticket created for ${interaction.user.tag}`
  );

  return {
    channel: thread
  };
}

// =====================================================
// INTERACTIONS
// =====================================================

client.on(
  "interactionCreate",
  async interaction => {

    // =================================================
    // CREATE TICKET BUTTON
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

      await interaction.showModal(
        modal
      );

      return;
    }

    // =================================================
    // TICKET MODAL
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
            content:
              result.error
          });

          return;
        }

        let message =
          `✅ Ticket created: ${result.channel}`;

        if (result.warning) {
          message +=
            `\n\n⚠️ ${result.warning}`;
        }

        await interaction.editReply({
          content: message
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
    // CLOSE TICKET
    // =================================================

    if (
      interaction.isButton() &&
      interaction.customId ===
        "vaelix_close_ticket"
    ) {

      const thread =
        interaction.channel;

      if (
        !thread ||
        thread.type !==
          ChannelType.PrivateThread
      ) {

        await interaction.reply({
          content:
            "❌ This is not a Vaelix ticket.",
          ephemeral: true
        });

        return;
      }

      await interaction.reply({
        content:
          "🔒 Closing ticket in 5 seconds..."
      });

      setTimeout(async () => {

        try {

          await thread.delete();

          console.log(
            `🗑️ Ticket deleted: ${thread.name}`
          );

        } catch (error) {

          console.error(
            "❌ Failed to delete ticket:",
            error.message
          );
        }

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
          await client.channels.fetch(
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

        await channel.send({
          embeds: [
            createWelcomeEmbed(
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
          error
        );

        await interaction.reply({
          content:
            "❌ Failed to send welcome.",
          ephemeral: true
        });
      }

      return;
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

    // =================================================
    // VERIFY CHANNELS
    // =================================================

    try {

      const ticketChannel =
        await client.channels.fetch(
          TICKET_CHANNEL_ID
        );

      const supportChannel =
        await client.channels.fetch(
          SUPPORT_CHANNEL_ID
        );

      if (
        !ticketChannel ||
        ticketChannel.type !==
          ChannelType.GuildText
      ) {
        throw new Error(
          `Ticket ID ${TICKET_CHANNEL_ID} is not a text channel.`
        );
      }

      if (
        !supportChannel ||
        supportChannel.type !==
          ChannelType.GuildText
      ) {
        throw new Error(
          `Support ID ${SUPPORT_CHANNEL_ID} is not a text channel.`
        );
      }

      console.log(
        "✅ Ticket channel verified."
      );

      console.log(
        "✅ Support channel verified."
      );

      await setupTicketPanel();

      console.log(
        "✅ Ticket system ready."
      );

    } catch (error) {

      console.error(
        "❌ Ticket system error:",
        error.message
      );
    }

    // =================================================
    // REGISTER SLASH COMMAND
    // =================================================

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
  }
);

// =====================================================
// ERROR HANDLING
// =====================================================

client.on(
  "error",
  error => {
    console.error(
      "❌ Discord Client Error:",
      error
    );
  }
);

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