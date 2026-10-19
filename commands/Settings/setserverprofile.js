const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

// Example command definition (using Slash Commands)
module.exports = {
    data: new SlashCommandBuilder()
        .setName('setserverprofile')
        .setDescription('Updates the bot\'s server-specific profile in this guild.')
        .addStringOption(option => 
            option.setName('nick').setDescription('New server nickname').setRequired(false))
        .addStringOption(option => 
            option.setName('bio').setDescription('New server bio').setRequired(false))
        .addAttachmentOption(option => 
            option.setName('avatar').setDescription('New server-specific avatar image').setRequired(false))
        .addAttachmentOption(option => 
            option.setName('banner').setDescription('New server-specific banner image').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const nick = interaction.options.getString('nick');
        const bio = interaction.options.getString('bio');
        const avatarAttachment = interaction.options.getAttachment('avatar');
        const bannerAttachment = interaction.options.getAttachment('banner');

        const editOptions = {};

        if (nick !== null) editOptions.nick = nick;
        if (bio !== null) editOptions.bio = bio;
        
        // discord.js accepts image URLs or buffers for guild member edits
        if (avatarAttachment) {
            editOptions.avatar = avatarAttachment.url;
        }
        if (bannerAttachment) {
            editOptions.banner = bannerAttachment.url;
        }

        try {
            // Edits the bot's own member profile for THIS specific guild
            await interaction.guild.members.me.edit(editOptions);
            await interaction.editReply('Successfully updated the bot\'s server profile for this guild!');
        } catch (error) {
            console.error(error);
            await interaction.editReply(`Failed to update profile: ${error.message}`);
        }
    },
};
