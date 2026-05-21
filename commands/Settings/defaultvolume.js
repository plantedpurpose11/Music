const { MessageEmbed } = require("discord.js");
  const ee = require("../../botconfig/embed.json");
  module.exports = {
    name: "defaultvolume",
    category: "Settings",
    aliases: ["setvolume","defvol"],
    usage: "defaultvolume <1-150>",
    cooldown: 1,
    description: "Sets the default volume (1-150)",
    memberpermissions: ["MANAGE_GUILD"],
    requiredroles: [],
    alloweduserids: [],
    run: async (client, message, args) => {
      try {
        const volume = parseInt(args[0]);
        if (!args[0] || isNaN(volume) || volume < 1 || volume > 150)
          return message.reply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setFooter({ text: ee.footertext, iconURL: ee.footericon }).setTitle(`${client.allEmojis.x} **Volume must be between \`1\` and \`150\`!**`)] });
        client.settings.set(message.guild.id, volume, "defaultvolume");
        return message.reply({ embeds: [new MessageEmbed().setColor(ee.color).setFooter({ text: ee.footertext, iconURL: ee.footericon }).setTitle(`${client.allEmojis.check_mark} **Default volume set to \`${volume}\`!**`)] });
      } catch (e) { console.log(String(e.stack).bgRed); }
    }
  };