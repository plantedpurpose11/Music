const {
    MessageEmbed
  } = require("discord.js");
  const config = require("../botconfig/config.json");
  const ee = require("../botconfig/embed.json");
  const settings = require("../botconfig/settings.json");
  const websiteSettings = require("../dashboard/settings.json");

  module.exports = {
    name: "help",
    description: "Returns all commands, or details about one specific command",
    cooldown: 1,
    memberpermissions: [],
    requiredroles: [],
    alloweduserids: [],
    options: [
      {
        "String": {
          name: "specific_cmd",
          description: "Want details of a specific command?",
          required: false
        }
      }
    ],
    run: async (client, interaction) => {
      try {
        const { member, options } = interaction;
        const { guild } = member;
        const prefix = client.settings.get(guild.id, "prefix") || config.prefix;
        const args = options.getString("specific_cmd");

        if (args && args.length > 0) {
          const embed = new MessageEmbed();
          const cmd = client.commands.get(args.toLowerCase()) || client.commands.get(client.aliases.get(args.toLowerCase()));
          if (!cmd) {
            return interaction.reply({
              ephemeral: true,
              embeds: [embed.setColor(ee.wrongcolor).setDescription(`No information found for command **${args.toLowerCase()}**`)]
            });
          }
          if (cmd.name) embed.addFields({ name: "**Command name**", value: `\`${cmd.name}\`` });
          if (cmd.name) embed.setTitle(`Detailed information about: \`${cmd.name}\``);
          if (cmd.description) embed.addFields({ name: "**Description**", value: `\`${cmd.description}\`` });
          if (cmd.aliases && cmd.aliases.length > 0) embed.addFields({ name: "**Aliases**", value: `\`${cmd.aliases.join("\`, \`")}\`` });
          if (cmd.cooldown) embed.addFields({ name: "**Cooldown**", value: `\`${cmd.cooldown} Seconds\`` });
          if (cmd.usage) {
            embed.addFields({ name: "**Usage**", value: `\`${prefix}${cmd.usage}\`` });
            embed.setFooter({ text: "Syntax: <> = required, [] = optional" });
          }
          return interaction.reply({ ephemeral: true, embeds: [embed.setColor(ee.color)] });
        }

        // Full help menu
        const embed = new MessageEmbed()
          .setColor(ee.color)
          .setThumbnail(client.user.displayAvatarURL())
          .setTitle("HELP MENU 🔰 Commands")
          .setDescription(
            `**[Invite me](https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands)** — all commands are available as Slash Commands!`
          )
          .setFooter({ text: `Prefix commands: ${prefix}help [cmd name]`, iconURL: client.user.displayAvatarURL() });

        const commands = (category) => {
          const cmds      = client.commands.filter(c => c.category === category).map(c => `\`${c.name}\``);
          const slashcmds = client.slashCommands.filter(c => c.category === category).map(c => `/${c.name}`);
          const unique    = [...new Set([...cmds, ...slashcmds])];
          return unique;
        };

        for (const category of client.categories) {
          const items = commands(category);
          if (items.length > 0) {
            embed.addFields({ name: `**${category.toUpperCase()} [${items.length}]**`, value: `> ${items.join(", ")}` });
          }
        }

        return interaction.reply({ ephemeral: true, embeds: [embed] });

      } catch (e) {
        console.log(String(e.stack || e).bgRed);
        return interaction.reply({
          ephemeral: true,
          embeds: [new MessageEmbed()
            .setColor(ee.wrongcolor)
            .setFooter({ text: ee.footertext, iconURL: ee.footericon })
            .setTitle(`${client.allEmojis.x} ERROR`)
            .setDescription(`\`\`\`${e.message || e}\`\`\``)
          ]
        }).catch(() => {});
      }
    }
  };