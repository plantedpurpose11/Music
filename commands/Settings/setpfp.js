const discord = require('discord.js');
const { downloadDiscordImage } = require('../../handlers/musicBanner');

module.exports = {
    name: 'setpfp',
    description: 'Changes the bot\'s avatar for this specific server only.',
    category: 'Settings',
    usage: 'setpfp [image attachment]',
    memberpermissions: ['ADMINISTRATOR'],
    cooldown: 5,
    run: async (client, message, args) => {
        if (!message.guild) return message.reply('Use this command in a server.');
        // Check if user has administrator permissions
        if (!message.member.permissions.has(discord.Permissions.FLAGS.ADMINISTRATOR)) {
            return message.reply('You need Administrator permissions to use this command.');
        }

        if (message.attachments.size === 0) {
            return message.reply('Please attach an image file to use as the server-specific profile picture.');
        }

        const attachment = message.attachments.first();

        try {
            const image = await downloadDiscordImage(attachment);
            const mime = image.type === 'jpg' ? 'jpeg' : image.type;
            // v13's member.edit uses /members/:id and does not encode avatar URLs.
            // Discord accepts server avatars on Modify Current Member instead.
            const updated = await client.api.guilds(message.guild.id).members('@me').patch({
                data: { avatar: `data:image/${mime};base64,${image.data}` }
            });
            if (!updated?.avatar) {
                throw new Error('Discord did not confirm a server avatar change. Please try again.');
            }
            if (message.guild.members.me) message.guild.members.me.avatar = updated.avatar;
            await message.reply('Successfully updated the bot\'s avatar for this server only!');
        } catch (error) {
            console.error(error);
            await message.reply({
                content: `Failed to update server avatar: ${error.message}`.slice(0, 1900),
                allowedMentions: { parse: [] }
            });
        }
    }
};
