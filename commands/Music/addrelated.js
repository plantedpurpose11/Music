const { MessageEmbed } = require("discord.js");
  const ee = require("../../botconfig/embed.json");
  const { getPlayer, currentTrack, trackTitle, trackAuthor } = require("../../handlers/playerHelpers");
  module.exports = {
    name: "addrelated",
    category: "Music",
    aliases: ["related","addrel"],
    usage: "addrelated",
    cooldown: 5,
    description: "Adds a related song to the queue",
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
        const result = await player.search({ query: `ytsearch:${trackAuthor(cur)} ${trackTitle(cur)}` }, member);
        if (!result?.tracks || result.tracks.length < 2) return message.reply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} **No related songs found!**`)] });
        const relatedTrack = result.tracks[1]; relatedTrack.requester = member;
        await player.queue.add(relatedTrack);
        if (!player.playing && !player.paused) await player.play();
        return message.reply({ embeds: [new MessageEmbed().setColor(ee.color).setTimestamp().setTitle(`👍 **Added related: \`${relatedTrack.info?.title || "Unknown"}\`**`).setFooter({ text: `By: ${member.user.tag}`, iconURL: member.user.displayAvatarURL({ dynamic: true }) })] });
      } catch (e) { console.log(String(e.stack).bgRed); }
    }
  };