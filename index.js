const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const express = require('express');
require('dotenv').config();

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMembers, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent
    ]
});

const ROLE_NAME = "ForestNEARian"; 
const VERCEL_URL = "https://near-verify-web.vercel.app/"; 

client.once('ready', () => {
    console.log(`🎉 Success! Bot logged in as ${client.user.tag}!`);
    console.log(`📊 Connected to ${client.guilds.cache.size} Discord servers.`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.content.trim() === '!setup') {
        try {
            const embed = new EmbedBuilder()
                .setTitle("🔒 NFT Wallet Verification")
                .setDescription("Click the button below to link your NEAR wallet and unlock your exclusive holder role!")
                .setColor("#00ec5b");

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel("Verify Wallet")
                    .setStyle(ButtonStyle.Link)
                    .setURL(VERCEL_URL)
            );

            await message.channel.send({ embeds: [embed], components: [row] });
            console.log("📤 Sent verification card successfully!");
        } catch (error) {
            console.error("❌ Failed to send message:", error);
        }
    }
});

const app = express();
app.use(express.json());
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.post('/verify', async (req, res) => {
    const { discordId, hasNft } = req.body;
    if (!discordId || !hasNft) return res.status(400).json({ error: "Missing parameters" });

    console.log(`\n=== 📡 Incoming Verification Request ===`);
    console.log(`Target User ID: ${discordId}`);
    console.log(`Bot is currently sitting in ${client.guilds.cache.size} servers.`);

    try {
        let memberFound = false;
        for (const guild of client.guilds.cache.values()) {
            console.log(`Checking Server: "${guild.name}" (${guild.id})`);
            try {
                const member = await guild.members.fetch(discordId);
                if (member) {
                    console.log(`🎯 User matched inside server: ${member.user.tag}`);
                    let role = guild.roles.cache.find(r => r.name === ROLE_NAME);
                    if (!role) {
                        role = await guild.roles.create({ name: ROLE_NAME, color: '#00ec5b' });
                        console.log(`✨ Created new role: ${ROLE_NAME}`);
                    }
                    await member.roles.add(role);
                    console.log(`✅ Successfully assigned role to user!`);
                    memberFound = true;
                }
            } catch (fetchError) {
                console.error(`❌ Discord API rejected lookup in "${guild.name}":`, fetchError.message);
            }
        }
        if (memberFound) return res.json({ success: true });
        return res.status(444).json({ error: "User not found" });
    } catch (err) {
        console.error("❌ Global server error:", err);
        return res.status(500).json({ error: "Server error" });
    }
});

app.listen(3000, () => console.log("📡 Webserver online on port 3000"));
client.login(process.env.DISCORD_TOKEN);
