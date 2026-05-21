const { MessageEmbed } = require("discord.js");
  const ee = require("../../botconfig/embed.json");
  const config = require("../../botconfig/config.json");
  module.exports = {
    name: "prefix",
    category: "Settings",
    aliases: ["setprefix","changeprefix"],
    usage: "prefix <new prefix>",
    cooldown: 1,
    description: "Changes the bot prefix for this server",
    memberpermissions: ["MANAGE_GUILD"],
    requiredroles: [],
    alloweduserids: [],
    run: async (client, message, args) => {
      try {
        if (!args[0]) return message.reply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setFooter({ text: ee.footertext, iconURL: ee.footericon }).setTitle(`${client.allEmojis.x} **Please provide a new prefix!**`)] });
        const newPrefix = args[0];
        client.settings.ensure(message.guild.id, { prefix: config.prefix });
        client.settings.set(message.guild.id, newPrefix, "prefix");
        return message.reply({ embeds: [new MessageEmbed().setColor(ee.color).setFooter({ text: ee.footertext, iconURL: ee.footericon }).setTitle(`${client.allEmojis.check_mark} **New prefix is now: \`${newPrefix}\`**`)] });
      } catch (e) { console.log(String(e.stack).bgRed); }
    }
  };