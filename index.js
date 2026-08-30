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
  Routes,
  MessageFlags
} = require("discord.js");

// =====================================================
// CONFIG
// =====================================================

const TOKEN = process.env.DISCORD_TOKEN;

const GUILD_ID = "1541124583606714491";

// 🎫 Ticket channel
const TICKET_CHANNEL_ID = "1541250932610965644";

// 🛠️ Support channel
const SUPPORT_CHANNEL_ID = "1541660720280895508";

// 👋 Welcome channel
const WELCOME_CHANNEL_ID = "1541163863641300992";

// =====================================================
// TOKEN
// =====================================================

if (!TOKEN) {
  console.error("❌ DISCORD_TOKEN is missing.");
  process.exit(1);
}

// =====================================================
// CLIENT
// =====================================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

// =====================================================
// WELCOME
// =====================================================

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

  try {
    const channel = await client.channels.fetch(
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
      `✅ Welcome sent: ${member.user.tag}`
    );

  } catch (error) {
    console.error(
      "❌ Welcome error:",
      error.message
    );

  } finally {
    setTimeout(() => {
      welcomeLock.delete(member.id);
    }, 10 * 60 * 1000);
  }
});

// =====================================================
// TICKET PANEL
// =====================================================

async function setupTicketPanel() {

  const channel = await client.channels.fetch(
    TICKET_CHANNEL_ID
  );

  if (
    !channel ||
    channel.type !== ChannelType.GuildText
  ) {
    throw new Error(
      "TICKET_CHANNEL_ID must be a text channel."
    );
  }

  const messages = await channel.messages.fetch({
    limit: 100
  });

  const existingPanel = messages.find(message =>
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
      "✅ Ticket GUI already exists."
    );
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0x7c3aed)
    .setTitle("🎫 Vaelix Support")
    .setDescription(
      "**Need help?**\n\n" +
      "Click **Create Ticket** below.\n\n" +
      "📝 Describe your problem\n" +
      "🔒 Your ticket will be private\n" +
      "🤖 Vaelix Support will receive your request"
    )
    .setFooter({
      text: "Vaelix Support System"
    })
    .setTimestamp();

  const button = new ButtonBuilder()
    .setCustomId(
      "vaelix_create_ticket"
    )
    .setLabel("Create Ticket")
    .setEmoji("🎫")
    .setStyle(ButtonStyle.Primary);

  const row = new ActionRowBuilder()
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

  const active =
    await channel.threads.fetchActive();

  for (const thread of active.threads.values()) {

    if (
      thread.type === ChannelType.PrivateThread &&
      thread.name.endsWith(`-${userId}`)
    ) {
      return thread;
    }
  }

  return null;
}

// =====================================================
// SUPPORT NOTIFICATION
// =====================================================

async function sendSupportNotification(
  embed
) {

  try {

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
      return;
    }

    await support.send({
      embeds: [embed]
    });

  } catch (error) {

    console.error(
      "❌ Support notification error:",
      error.message
    );
  }
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

    console.log(
      `⚠️ ${interaction.user.tag} already has a ticket.`
    );

    return null;
  }

  // ===================================================
  // CREATE PRIVATE THREAD
  // ===================================================

  const username =
    interaction.user.username
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 18) || "user";

  const thread =
    await channel.threads.create({
      name:
        `ticket-${username}-${interaction.user.id}`,

      type:
        ChannelType.PrivateThread,

      invitable: false,

      autoArchiveDuration: 10080,

      reason:
        `Vaelix ticket for ${interaction.user.tag}`
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

  const ticketEmbed =
    new EmbedBuilder()
      .setColor(0x7c3aed)
      .setTitle("🎫 Support Ticket")
      .setDescription(
        `Hello ${interaction.user}! 👋\n\n` +
        `Your private support ticket has been created.\n\n` +
        `📝 **Problem**\n` +
        `${problem}\n\n` +
        `🤖 **Vaelix Support**\n` +
        `Your request has been received.`
      )
      .setTimestamp()
      .setFooter({
        text: "Vaelix Support System"
      });

  await thread.send({
    content: `${interaction.user}`,
    embeds: [ticketEmbed],
    components: [row]
  });

  // ===================================================
  // SUPPORT NOTIFICATION
  // ===================================================

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

  await sendSupportNotification(
    supportEmbed
  );

  console.log(
    `🎫 Ticket created: ${thread.name}`
  );

  return thread;
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

      try {

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

      } catch (error) {

        console.error(
          "❌ Modal error:",
          error.message
        );
      }

      return;
    }

    // =================================================
    // MODAL SUBMIT
    // =================================================

    if (
      interaction.isModalSubmit() &&
      interaction.customId ===
        "vaelix_ticket_modal"
    ) {

      try {

        // Acknowledge interaction without
        // sending a visible channel message.
        await interaction.deferReply({
          flags: MessageFlags.Ephemeral
        });

        const problem =
          interaction.fields.getTextInputValue(
            "ticket_problem"
          );

        await createTicket(
          interaction,
          problem
        );

        // Remove ephemeral acknowledgement
        // immediately.
        await interaction.deleteReply()
          .catch(() => {});

      } catch (error) {

        console.error(
          "❌ Ticket creation error:",
          error
        );

        await interaction.deleteReply()
          .catch(() => {});
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
        return;
      }

      // Acknowledge button silently
      await interaction.deferUpdate()
        .catch(() => {});

      const ticketName =
        thread.name;

      const match =
        ticketName.match(
          /-(\d{17,20})$/
        );

      const ownerId =
        match ? match[1] : null;

      const ownerText =
        ownerId
          ? `<@${ownerId}>`
          : "Unknown User";

      // =================================================
      // IMPORTANT SUPPORT NOTIFICATION
      // =================================================

      const closeEmbed =
        new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle("🔒 Ticket Closed")
          .addFields(
            {
              name: "👤 User",
              value:
                `${ownerText}\n` +
                (
                  ownerId
                    ? `ID: \`${ownerId}\``
                    : "ID: Unknown"
                )
            },
            {
              name: "🎫 Ticket",
              value:
                `\`${ticketName}\``
            }
          )
          .setTimestamp()
          .setFooter({
            text: "Vaelix Support"
          });

      await sendSupportNotification(
        closeEmbed
      );

      // =================================================
      // DELETE TICKET
      // =================================================

      setTimeout(async () => {

        try {

          await thread.delete(
            "Ticket closed"
          );

          console.log(
            `🗑️ Ticket deleted: ${ticketName}`
          );

        } catch (error) {

          console.error(
            "❌ Ticket deletion error:",
            error.message
          );
        }

      }, 1000);

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
          return;
        }

        await channel.send({
          embeds: [
            createWelcomeEmbed(
              interaction.member
            )
          ]
        });

        // No visible response.

      } catch (error) {

        console.error(
          "❌ Welcome test error:",
          error.message
        );
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
    // CHANNEL CHECK
    // =================================================

    try {

      const guild =
        await client.guilds.fetch(
          GUILD_ID
        );

      const ticket =
        await client.channels.fetch(
          TICKET_CHANNEL_ID
        );

      const support =
        await client.channels.fetch(
          SUPPORT_CHANNEL_ID
        );

      const welcome =
        await client.channels.fetch(
          WELCOME_CHANNEL_ID
        );

      if (
        !ticket ||
        ticket.type !== ChannelType.GuildText
      ) {
        throw new Error(
          "Ticket channel is invalid."
        );
      }

      if (
        !support ||
        support.type !== ChannelType.GuildText
      ) {
        throw new Error(
          "Support channel is invalid."
        );
      }

      if (
        !welcome ||
        welcome.type !== ChannelType.GuildText
      ) {
        throw new Error(
          "Welcome channel is invalid."
        );
      }

      console.log(
        `🏠 Connected to: ${guild.name}`
      );

      console.log(
        `🎫 Ticket: ${ticket.name}`
      );

      console.log(
        `🛠️ Support: ${support.name}`
      );

      console.log(
        `👋 Welcome: ${welcome.name}`
      );

      await setupTicketPanel();

      console.log(
        "✅ Ticket system ready."
      );

    } catch (error) {

      console.error(
        "❌ Setup error:",
        error.message
      );
    }

    // =================================================
    // REGISTER COMMAND
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
    error.message
  );

  process.exit(1);
});