const { MessageEmbed } = require("discord.js");
  const ee = require("../../botconfig/embed.json");
  module.exports = {
    name: "dj",
    category: "Settings",
    aliases: ["djrole","setdj"],
    usage: "dj <add|remove> <@role>",
    cooldown: 1,
    description: "Adds or removes a DJ role",
    memberpermissions: ["MANAGE_GUILD"],
    requiredroles: [],
    alloweduserids: [],
    run: async (client, message, args) => {
      try {
        const action = args[0]?.toLowerCase();
        const role = message.mentions.roles.first();
        if (!action || !["add","remove"].includes(action) || !role)
          return message.reply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setFooter({ text: ee.footertext, iconURL: ee.footericon }).setTitle(`${client.allEmojis.x} **Usage: \`dj <add|remove> @role\`**`)] });
        client.settings.ensure(message.guild.id, { djroles: [] });
        const djroles = client.settings.get(message.guild.id, "djroles");
        if (action === "add") {
          if (djroles.includes(role.id)) return message.reply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setFooter({ text: ee.footertext, iconURL: ee.footericon }).setTitle(`${client.allEmojis.x} **That role is already a DJ role!**`)] });
          client.settings.push(message.guild.id, role.id, "djroles");
          const updated = client.settings.get(message.guild.id, "djroles").map(r => `<@&${r}>`).join(", ") || "`none`";
          return message.reply({ embeds: [new MessageEmbed().setColor(ee.color).setFooter({ text: ee.footertext, iconURL: ee.footericon }).setTitle(`${client.allEmojis.check_mark} **Added \`${role.name}\` as a DJ role!**`).addFields({ name: "🎧 DJ Roles:", value: updated })] });
        } else {
          if (!djroles.includes(role.id)) return message.reply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setFooter({ text: ee.footertext, iconURL: ee.footericon }).setTitle(`${client.allEmojis.x} **That role is not a DJ role!**`)] });
          client.settings.remove(message.guild.id, role.id, "djroles");
          const updated = client.settings.get(message.guild.id, "djroles").map(r => `<@&${r}>`).join(", ") || "`none`";
          return message.reply({ embeds: [new MessageEmbed().setColor(ee.color).setFooter({ text: ee.footertext, iconURL: ee.footericon }).setTitle(`${client.allEmojis.check_mark} **Removed \`${role.name}\` from DJ roles!**`).addFields({ name: "🎧 DJ Roles:", value: updated })] });
        }
      } catch (e) { console.log(String(e.stack).bgRed); }
    }
  };