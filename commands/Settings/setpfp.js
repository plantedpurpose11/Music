const discord = require('discord.js');

module.exports = {
    name: 'setpfp',
    description: 'Changes the bot\'s global profile picture.',
    category: 'Settings',
    run: async (client, message, args) => {
        // Restrict to the bot owner or admins for security
        if (message.author.id !== '1281693669749030922') {
            return message.reply('Only the bot owner can use this command.');
        }

        if (message.attachments.size === 0) {
            return message.reply('Please attach an image file to use as the new profile picture.');
        }

        const attachment = message.attachments.first();

        try {
            await client.user.setAvatar(attachment.url);
            await message.reply('Successfully updated the bot\'s global profile picture!');
        } catch (error) {
            console.error(error);
            await message.reply(`Failed to update profile picture: ${error.message} (Note: Discord rate-limits global profile updates to a few times per hour).`);
        }
    }
};
