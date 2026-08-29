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

const TICKET_CHANNEL_ID = "1541250932610965644";
const SUPPORT_CHANNEL_ID = "1541660720280895508";
const WELCOME_CHANNEL_ID = "1541163863641300992";

// =====================================================
// TOKEN CHECK
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
    const channel =
      await member.guild.channels.fetch(
        WELCOME_CHANNEL_ID
      );

    if (
      !channel ||
      channel.type !== ChannelType.GuildText ||
      !channel.isSendable()
    ) {
      throw new Error(
        "Welcome channel unavailable or not sendable."
      );
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

  const channel =
    await client.channels.fetch(
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

  if (!channel.isSendable()) {
    throw new Error(
      "Bot cannot send messages in ticket channel."
    );
  }

  const messages =
    await channel.messages.fetch({
      limit: 100
    });

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
      "✅ Ticket GUI already exists."
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
        "🤖 Vaelix Support will receive your request"
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
// FIND EXISTING TICKET
// =====================================================

async function findUserTicket(
  channel,
  userId
) {

  // Check active threads
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

  // Check archived private threads
  try {

    const archived =
      await channel.threads.fetchArchived({
        type: "private",
        limit: 100
      });

    for (const thread of archived.threads.values()) {

      if (
        thread.type === ChannelType.PrivateThread &&
        thread.name.endsWith(`-${userId}`)
      ) {
        return thread;
      }
    }

  } catch (error) {

    console.error(
      "⚠️ Could not check archived tickets:",
      error.message
    );
  }

  return null;
}

// =====================================================
// SEND SUPPORT NOTIFICATION
// =====================================================

async function sendSupportNotification(embed) {

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
      throw new Error(
        "Support channel unavailable."
      );
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

  if (!channel.isSendable()) {
    throw new Error(
      "Bot cannot send messages in ticket channel."
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
    return {
      error: true,
      thread: existing
    };
  }

  // ===================================================
  // CREATE PRIVATE THREAD
  // ===================================================

  const username =
    interaction.user.username
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 20) || "user";

  const thread =
    await channel.threads.create({
      name:
        `ticket-${username}-${interaction.user.id}`,

      type:
        ChannelType.PrivateThread,

      autoArchiveDuration: 10080,

      invitable: false,

      reason:
        `Vaelix ticket created by ${interaction.user.tag}`
    });

  // ===================================================
  // ADD OWNER
  // ===================================================

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
          value: problem.slice(0, 1024)
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
    `🎫 Ticket created: ${interaction.user.tag}`
  );

  return {
    thread
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

        if (!interaction.replied && !interaction.deferred) {
          try {
            await interaction.reply({
              content: "❌ Unable to open the ticket form.",
              ephemeral: true
            });
          } catch {}
        }
      }

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

      /*
       * IMPORTANT:
       * Discord requires every interaction to be
       * acknowledged within a few seconds.
       *
       * We acknowledge silently with deferReply.
       * No visible message is sent.
       */

      try {

        await interaction.deferReply({
          ephemeral: true
        });

        const problem =
          interaction.fields.getTextInputValue(
            "ticket_problem"
          ).trim();

        if (!problem || problem.length < 5) {
          await interaction.deleteReply().catch(() => {});
          return;
        }

        const result =
          await createTicket(
            interaction,
            problem
          );

        if (result.error) {

          console.log(
            `⚠️ ${interaction.user.tag} already has a ticket.`
          );

          await interaction.deleteReply().catch(() => {});
          return;
        }

        /*
         * Delete the acknowledgement immediately.
         * The user gets no "Ticket created" message.
         */

        await interaction.deleteReply().catch(() => {});

      } catch (error) {

        console.error(
          "❌ Ticket creation error:",
          error
        );

        try {
          await interaction.deleteReply().catch(() => {});
        } catch {}
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

      // Only allow members of the ticket to close it
      const isMember =
        thread.members.cache.has(
          interaction.user.id
        );

      if (!isMember) {
        return;
      }

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
      // SUPPORT CLOSE NOTIFICATION
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
            },
            {
              name: "🔒 Closed By",
              value:
                `${interaction.user}\n` +
                `ID: \`${interaction.user.id}\``
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

          await thread.delete();

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

        /*
         * ACK the slash command silently.
         * Then remove the acknowledgement.
         */

        await interaction.deferReply({
          ephemeral: true
        });

        await interaction.deleteReply()
          .catch(() => {});

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
    // VERIFY + SETUP
    // =================================================

    try {

      const guild =
        await client.guilds.fetch(
          GUILD_ID
        );

      const ticketChannel =
        await client.channels.fetch(
          TICKET_CHANNEL_ID
        );

      const supportChannel =
        await client.channels.fetch(
          SUPPORT_CHANNEL_ID
        );

      const welcomeChannel =
        await client.channels.fetch(
          WELCOME_CHANNEL_ID
        );

      if (
        !ticketChannel ||
        ticketChannel.type !==
          ChannelType.GuildText
      ) {
        throw new Error(
          "Ticket channel is invalid."
        );
      }

      if (
        !supportChannel ||
        supportChannel.type !==
          ChannelType.GuildText
      ) {
        throw new Error(
          "Support channel is invalid."
        );
      }

      if (
        !welcomeChannel ||
        welcomeChannel.type !==
          ChannelType.GuildText
      ) {
        throw new Error(
          "Welcome channel is invalid."
        );
      }

      console.log(
        `🏠 Connected to: ${guild.name}`
      );

      console.log(
        "✅ Ticket channel verified."
      );

      console.log(
        "✅ Support channel verified."
      );

      console.log(
        "✅ Welcome channel verified."
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
        "❌ Slash command registration error:",
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
    error.message
  );

  process.exit(1);
});