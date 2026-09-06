const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    Guild,
    time,
    AuditLogEvent
} = require("discord.js");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

const mediaSpam = new Map();

const BOT_MANAGER_ROLE_ID = "1514997940270403903";
const MENTION_ROLE_ID = "1515316995086880841";
const CHANNEL_LOG_ID = "1529493624440623215";

// =======================
// תמונות/סרטונים
// =======================

client.on("messageCreate", async (message) => {
    if (message.author.bot) return;

    const userID = message.author.id;
    const attachments = message.attachments.size;

    // =======================
    // 3 תמונות/סרטונים באותה הודעה
    // =======================

    if (attachments >= 3) {
        await message.delete().catch(() => {});

        const member = message.member;
        if (!member) return;

        await member.timeout(10 * 60 * 1000);

        const embed = new EmbedBuilder()
            .setTitle("הגנה מספאם תמונות 🛡️")
            .setColor("Red")
            .addFields({
                name: " ",
                value: `המשתמש: ${message.author} קיבל מיוט.\nסיבה: שלח ${attachments} תמונות/סרטונים בהודעה אחת`
            });

        await message.channel.send({
            embeds: [embed]
        });

        const logChannel = client.channels.cache.get(CHANNEL_LOG_ID);

        if (logChannel) {
            await logChannel.send({
                embeds: [embed]
            });
        }

        return;
    }

    // =======================
    // תמונות/סרטונים ברצף
    // =======================

    if (attachments > 0) {
        if (!mediaSpam.has(userID)) {
            mediaSpam.set(userID, []);
        }

        mediaSpam.get(userID).push({
            message: message,
            time: Date.now()
        });

        const mediaNow = Date.now();

        const mediaMessages = mediaSpam
            .get(userID)
            .filter(msg => mediaNow - msg.time < 5000);

        mediaSpam.set(userID, mediaMessages);

        if (mediaMessages.length >= 3) {
            for (const msg of mediaMessages) {
                await msg.message.delete().catch(() => {});
            }

            mediaSpam.delete(userID);

            const member = message.member;
            if (!member) return;

            await member.timeout(10 * 60 * 1000);

            const embed = new EmbedBuilder()
                .setTitle("הגנה מספאם תמונות 🛡️")
                .setColor("Red")
                .addFields({
                    name: " ",
                    value: `המשתמש: ${message.author} קיבל מיוט.\nסיבה: שלח ${mediaMessages.length} תמונות/סרטונים ברצף`
                });

            await message.channel.send({
                embeds: [embed]
            });

            const logChannel = client.channels.cache.get(CHANNEL_LOG_ID);

            if (logChannel) {
                await logChannel.send({
                    embeds: [embed]
                });
            }
        }
    }
});

// =======================
// הגנת קישורי Discord
// =======================

client.on("messageCreate", async (message) => {
    if (message.author.bot) return;

    const inviteLink = /discord\.gg\/|discord\.com\/invite\//i;

    if (inviteLink.test(message.content)) {
        await message.delete().catch(() => {});

        const member = message.member;
        if (!member) return;

        await member.timeout(10 * 60 * 1000);

        const embed = new EmbedBuilder()
            .setTitle("הגנת קישורים 🛡️")
            .setColor("Red")
            .addFields({
                name: " ",
                value: `המשתמש: ${message.author} קיבל מיוט.\nסיבה: פרסם/שלח קישור לשרת אחר`
            });

        await message.channel.send({
            embeds: [embed]
        });

        const logChannel = client.channels.cache.get(CHANNEL_LOG_ID);

        if (logChannel) {
            await logChannel.send({
                embeds: [embed]
            });
        }
    }
});

// =======================
// הגנת בוטים
// =======================

client.on("guildMemberAdd", async (member) => {
    if (!member.user.bot) return;

    const logs = await member.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.BotAdd
    });

    const entry = logs.entries.first();

    if (!entry) return;

    if (entry.target.id !== member.id) return;

    const executor = entry.executor;

    if (!executor) return;

    const executorMember = await member.guild.members
        .fetch(executor.id)
        .catch(() => null);

    if (!executorMember) return;

    if (!executorMember.roles.cache.has(BOT_MANAGER_ROLE_ID)) {
        await member.kick("הבוט נוסף ללא הרשאה❌").catch(() => {});

        const embed = new EmbedBuilder()
            .setTitle("הגנת בוטים 🛡️")
            .setColor("Red")
            .addFields(
                {
                    name: "מי הוסיף:",
                    value: `${executor}`,
                    inline: true
                },
                {
                    name: "הבוט",
                    value: `${member.user}`,
                    inline: true
                },
                {
                    name: "פעולה",
                    value: "הבוט הוסר מהשרת (קיק)",
                    inline: false
                }
            );

        const logChannel = client.channels.cache.get(CHANNEL_LOG_ID);

        if (logChannel) {
            await logChannel.send({
                embeds: [embed]
            });
        }
    }
});

client.login("MTU0NjE3NDAyNTU1Mjg5NjEyMQ.GiZry7.FVMaaEq8xrJB9NqMQaJVE6Bm_jC9SKArz_eVU4");