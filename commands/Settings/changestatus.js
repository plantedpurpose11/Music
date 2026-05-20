const {
  MessageEmbed
} = require("discord.js");
const config = require("../../botconfig/config.json");
const ee = require("../../botconfig/embed.json");
const settings = require("../../botconfig/settings.json");

// Your Discord ID
const OWNER_ID = "1281693669749030922";

module.exports = {
  name: `changestatus`,
  category: `Settings`,
  aliases: [`setstatus`, `status`],
  usage: `changestatus <online|idle|dnd>`,
  cooldown: 5,
  description: `Change the Bot's status (Bot Owner Only)`,
  type: "bot",
  memberpermissions: [],
  requiredroles: [],
  alloweduserids: [],

  run: async (client, message, args) => {
    try {
      // Check if user is the bot owner
      if (message.author.id !== OWNER_ID && message.author.id !== "442355791412854784") {
        return message.reply({
          embeds: [new MessageEmbed()
            .setColor(ee.wrongcolor)
            .setFooter({ text: ee.footertext, iconURL: ee.footericon })
            .setTitle(`${client.allEmojis.x} **You are not the Bot Owner!**`)
            .setDescription(`Only the bot owner can use this command.`)
          ]
        });
      }

      if (!args[0]) {
        return message.reply({
          embeds: [new MessageEmbed()
            .setColor(ee.wrongcolor)
            .setFooter({ text: ee.footertext, iconURL: ee.footericon })
            .setTitle(`${client.allEmojis.x} **Please add a status!**`)
            .setDescription(`**Usage:**\n> \`${settings.prefix}changestatus <online|idle|dnd>\``)
          ]
        });
      }

      const status = args[0].toLowerCase();
      const validStatuses = ["online", "idle", "dnd"];
      
      if (!validStatuses.includes(status)) {
        return message.reply({
          embeds: [new MessageEmbed()
            .setColor(ee.wrongcolor)
            .setFooter({ text: ee.footertext, iconURL: ee.footericon })
            .setTitle(`${client.allEmojis.x} **Invalid status!**`)
            .setDescription(`Valid statuses: \`online\`, \`idle\`, \`dnd\``)
          ]
        });
      }

      // Update the bot's status
      client.user.setStatus(status);
      
      client.settings.set(message.guild.id, status, "botstatus");
      
      return message.reply({
        embeds: [new MessageEmbed()
          .setColor(ee.color)
          .setFooter({ text: ee.footertext, iconURL: ee.footericon })
          .setTitle(`${client.allEmojis.check_mark} **Status changed to:** \`${status}\``)
        ]
      });
    } catch (e) {
      console.log(String(e.stack).bgRed);
    }
  }
}
/**
 * @INFO
 * Bot Coded by Tomato#6966 | https://github.com/Tomato6966/Discord-Js-Handler-Template
 * @INFO
 * Work for Milrato Development | https://milrato.eu
 * @INFO
 * Please mention Him / Milrato Development, when using this Code!
 * @INFO
 */