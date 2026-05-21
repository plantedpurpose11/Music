const { MessageEmbed } = require("discord.js");
  const ee = require("../../botconfig/embed.json");
  const { check_if_dj } = require("../../handlers/functions");
  const { getPlayer, currentTrack, trackTitle } = require("../../handlers/playerHelpers");
  module.exports = {
    name: "skip",
    category: "Music",
    aliases: ["s","next"],
    usage: "skip",
    cooldown: 2,
    description: "Skips the current song",
    memberpermissions: [],
    requiredroles: [],
    alloweduserids: [],
    run: async (client, message, args) => {
      try {
        const { guild, member } = message;
        const { channel } = member.voice;
        if (!channel) return message.reply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} **Please join a voice channel first!**`)] });
        if (guild.members.me.voice.channel && guild.members.me.voice.channel.id !== channel.id)
          return message.reply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} **Join my voice channel!**`).setDescription(`<#${guild.members.me.voice.channel.id}>`)] });
        const player = getPlayer(client, guild.id);
        const cur = currentTrack(player);
        if (!player || !cur) return message.reply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} **Nothing is playing right now!**`)] });
        if (check_if_dj(client, member, cur))
          return message.reply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} **You are not a DJ and not the requester!**`).setDescription(`**DJ Roles:**\n> ${check_if_dj(client, member, cur)}`)] });
        const title = trackTitle(cur);
        await player.skip();
        return message.reply({ embeds: [new MessageEmbed().setColor(ee.color).setTimestamp().setTitle(`⏭ **Skipped \`${title}\`!**`).setFooter({ text: `By: ${member.user.tag}`, iconURL: member.user.displayAvatarURL({ dynamic: true }) })] });
      } catch (e) { console.log(String(e.stack).bgRed); }
    }
  };