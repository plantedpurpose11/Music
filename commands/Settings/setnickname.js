const discord = require('discord.js');

module.exports = {
    name: 'setnickname',
    description: 'Updates the bot\'s server-specific nickname in this guild only.',
    category: 'Settings',
    run: async (client, message, args) => {
        // Check if user has administrator permissions
        if (!message.member.permissions.has(discord.Permissions.FLAGS.ADMINISTRATOR)) {
            return message.reply('You need Administrator permissions to use this command.');
        }

        const nick = args[0] !== 'none' ? args.join(' ') : null;

        const editOptions = {};
        if (nick) editOptions.nick = nick;

        try {
            // Edits the bot's member nickname exclusively for THIS specific server
            await message.guild.members.me.edit(editOptions);
            await message.reply(nick ? `Successfully updated the bot's nickname to **${nick}** for this server only!` : 'Successfully cleared the bot\'s server nickname!');
        } catch (error) {
            console.error(error);
            await message.reply(`Failed to update nickname: ${error.message}`);
        }
    }
};
