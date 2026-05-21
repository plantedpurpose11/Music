const { MessageEmbed } = require("discord.js");
  const ee = require("../../botconfig/embed.json");
  const { check_if_dj } = require("../../handlers/functions");
  const { getPlayer, currentTrack } = require("../../handlers/playerHelpers");
  module.exports = {
    name: "stop",
    category: "Music",
    aliases: ["disconnect","dc","leave"],
    usage: "stop",
    cooldown: 2,
    description: "Stops the music and clears the queue",
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
        await player.destroy();
        return message.reply({ embeds: [new MessageEmbed().setColor(ee.color).setTimestamp().setTitle(`⏹ **Stopped the music!**`).setFooter({ text: `By: ${member.user.tag}`, iconURL: member.user.displayAvatarURL({ dynamic: true }) })] });
      } catch (e) { console.log(String(e.stack).bgRed); }
    }
  };