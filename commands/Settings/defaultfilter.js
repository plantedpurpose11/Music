const { MessageEmbed } = require("discord.js");
  const ee = require("../../botconfig/embed.json");
  const filters = require("../../botconfig/filters.json");
  module.exports = {
    name: "defaultfilter",
    category: "Settings",
    aliases: ["setfilter","defaultfilters"],
    usage: "defaultfilter <filter1> [filter2] ...",
    cooldown: 10,
    description: "Sets the default filter(s) for the bot",
    memberpermissions: ["MANAGE_GUILD"],
    requiredroles: [],
    alloweduserids: [],
    run: async (client, message, args) => {
      try {
        if (!args[0]) return message.reply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setFooter({ text: ee.footertext, iconURL: ee.footericon }).setTitle(`${client.allEmojis.x} **Please provide at least one filter!**`).addFields({ name: "**All Valid Filters:**", value: Object.keys(filters).map(f => `\`${f}\``).join(", ") })] });
        if (args.some(a => !filters[a])) return message.reply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setFooter({ text: ee.footertext, iconURL: ee.footericon }).setTitle(`${client.allEmojis.x} **At least one filter is invalid!**`).addFields({ name: "**All Valid Filters:**", value: Object.keys(filters).map(f => `\`${f}\``).join(", ") })] });
        client.settings.set(message.guild.id, args, "defaultfilters");
        return message.reply({ embeds: [new MessageEmbed().setColor(ee.color).setFooter({ text: ee.footertext, iconURL: ee.footericon }).setTitle(`${client.allEmojis.check_mark} **Default filter${args.length > 1 ? "s" : ""} set to: ${args.map(a => `\`${a}\``).join(", ")}**`)] });
      } catch (e) { console.log(String(e.stack).bgRed); }
    }
  };