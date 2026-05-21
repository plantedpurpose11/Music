const {
    MessageEmbed
  } = require("discord.js");
  const config = require("../../botconfig/config.json");
  const ee = require("../../botconfig/embed.json");
  const settings = require("../../botconfig/settings.json");

  // Your Discord ID
  const OWNER_ID = "1281693669749030922";

  module.exports = {
    name: `changemessage`,
    category: `Settings`,
    aliases: [`setmessage`, `botmessage`],
    usage: `changemessage <status message>`,
    cooldown: 5,
    description: `Change the Bot's status message (Bot Owner Only)`,
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
              .setTitle(`${client.allEmojis.x} **Please add a message!**`)
              .setDescription(`**Usage:**\n> \`${config.prefix}changemessage <status message>\``)
            ]
          });
        }

        const newMessage = args.join(" ");

        // Use setActivity — simpler and reliable in discord.js v13
        await client.user.setActivity(newMessage, { type: "PLAYING" });

        client.settings.set(message.guild.id, newMessage, "botmessage");

        return message.reply({
          embeds: [new MessageEmbed()
            .setColor(ee.color)
            .setFooter({ text: ee.footertext, iconURL: ee.footericon })
            .setTitle(`${client.allEmojis.check_mark} **Status message changed to:** \`${newMessage}\``)
          ]
        });
      } catch (e) {
        console.log(String(e.stack || e).bgRed);
        message.reply({
          embeds: [new MessageEmbed()
            .setColor(ee.wrongcolor)
            .setFooter({ text: ee.footertext, iconURL: ee.footericon })
            .setTitle(`${client.allEmojis.x} **Error**`)
            .setDescription(`\`\`\`${e.message || e}\`\`\``)
          ]
        }).catch(() => {});
      }
    }
  }