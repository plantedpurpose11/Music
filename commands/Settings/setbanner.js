const discord = require('discord.js');
const { storeBanner, refreshMusicBanner } = require('../../handlers/musicBanner');

module.exports = {
    name: 'setbanner',
    description: 'Sets a custom banner image for the music setup channel in this server.',
    category: 'Settings',
    usage: 'setbanner [image attachment | URL | none]',
    memberpermissions: ['ADMINISTRATOR'],
    cooldown: 5,
    run: async (client, message, args) => {
        // Check for administrator permissions
        if (!message.member.permissions.has(discord.Permissions.FLAGS.ADMINISTRATOR)) {
            return message.reply('You need Administrator permissions to use this command.');
        }

        const bannerUrl = args[0];
        const prefix = client.settings.get(message.guild.id, 'prefix');
        const attachment = message.attachments.first();
        if (attachment && bannerUrl !== 'none') {
            try {
                await storeBanner(client, message.guild.id, attachment);
                await refreshMusicBanner(client, message.guild.id).catch(error => console.error('Banner panel refresh failed:', error.message));
                return message.reply('Banner image saved in the bot database! It will be used whenever the music panel is idle.');
            } catch (error) {
                return message.reply({ content: error.message, allowedMentions: { parse: [] } });
            }
        }
        
        // Allow clearing the custom banner by typing "setbanner none"
        if (bannerUrl === 'none') {
            client.settings.set(message.guild.id, null, 'musicBanner');
            await refreshMusicBanner(client, message.guild.id).catch(error => console.error('Banner panel refresh failed:', error.message));
            return message.reply('Successfully cleared the custom server music banner! It will now use the default.');
        }

        if (!bannerUrl || (!bannerUrl.startsWith('http://') && !bannerUrl.startsWith('https://'))) {
            return message.reply(`Attach a PNG, JPEG, GIF, or WebP image (up to 5 MiB) to \`${prefix}setbanner\`, provide an image URL, or use \`${prefix}setbanner none\` to reset.`);
        }

        // Save the banner URL to the server's database settings (Enmap)
        client.settings.set(message.guild.id, bannerUrl, 'musicBanner');
        
        await refreshMusicBanner(client, message.guild.id).catch(error => console.error('Banner panel refresh failed:', error.message));
        await message.reply(`Successfully updated the music setup banner for this server!`);
    }
};
