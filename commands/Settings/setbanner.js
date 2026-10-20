const discord = require('discord.js');

module.exports = {
    name: 'setbanner',
    description: 'Sets a custom banner image for the music setup channel in this server.',
    category: 'Settings',
    run: async (client, message, args) => {
        // Check for administrator permissions
        if (!message.member.permissions.has(discord.Permissions.FLAGS.ADMINISTRATOR)) {
            return message.reply('You need Administrator permissions to use this command.');
        }

        const bannerUrl = args[0];
        
        // Allow clearing the custom banner by typing "!setbanner none"
        if (bannerUrl === 'none') {
            client.settings.set(message.guild.id, null, 'musicBanner');
            return message.reply('Successfully cleared the custom server music banner! It will now use the default.');
        }

        if (!bannerUrl || (!bannerUrl.startsWith('http://') && !bannerUrl.startsWith('https://'))) {
            return message.reply('Please provide a valid image URL (starting with http:// or https://), or type `!setbanner none` to reset.');
        }

        // Save the banner URL to the server's database settings (Enmap)
        client.settings.set(message.guild.id, bannerUrl, 'musicBanner');
        
        await message.reply(`Successfully updated the music setup banner for this server!`);
    }
};
