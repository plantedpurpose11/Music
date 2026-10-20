const discord = require('discord.js');

module.exports = {
    name: 'setpfp',
    description: 'Changes the bot\'s avatar for this specific server only.',
    category: 'Settings',
    run: async (client, message, args) => {
        // Check if user has administrator permissions
        if (!message.member.permissions.has(discord.Permissions.FLAGS.ADMINISTRATOR)) {
            return message.reply('You need Administrator permissions to use this command.');
        }

        if (message.attachments.size === 0) {
            return message.reply('Please attach an image file to use as the server-specific profile picture.');
        }

        const attachment = message.attachments.first();

        try {
            // Edits the bot's member profile specifically for THIS guild
            await message.guild.members.me.edit({
                avatar: attachment.url
            });
            await message.reply('Successfully updated the bot\'s avatar for this server only!');
        } catch (error) {
            console.error(error);
            await message.reply(`Failed to update server avatar: ${error.message}`);
        }
    }
};
