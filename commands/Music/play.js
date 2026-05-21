const { MessageEmbed } = require("discord.js");
  const ee = require("../../botconfig/embed.json");
  const { getOrCreatePlayer, searchTrack, trackTitle } = require("../../handlers/playerHelpers");
  module.exports = {
    name: "play",
    category: "Music",
    aliases: ["p","pl","add"],
    usage: "play <song name or URL>",
    cooldown: 2,
    description: "Plays or queues a song",
    memberpermissions: [],
    requiredroles: [],
    alloweduserids: [],
    run: async (client, message, args) => {
      try {
        const { guild, member, channel } = message;
        const voiceChannel = member.voice?.channel;
        if (!voiceChannel) return message.reply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} **Please join a voice channel first!**`)] });
        if (voiceChannel.userLimit !== 0 && voiceChannel.full) return message.reply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} **Your voice channel is full!**`)] });
        if (guild.members.me.voice.channel && guild.members.me.voice.channel.id !== voiceChannel.id)
          return message.reply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} **I'm already in another voice channel!**`)] });
        if (!args[0]) return message.reply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} **Please provide a song name or URL!**`)] });
        const query = args.join(" ");
        const searching = await message.reply({ content: `🔍 Searching... \`${query}\`` });
        const player = await getOrCreatePlayer(client, guild.id, voiceChannel.id, channel.id, member);
        const { track, tracks, loadType } = await searchTrack(player, query, member);
        if (!track && (!tracks || tracks.length === 0)) return searching.edit({ content: `${client.allEmojis.x} No results found for: \`${query}\`` });
        if (loadType === "playlist" && tracks?.length) {
          for (const t of tracks) { t.requester = member; await player.queue.add(t); }
          if (!player.playing && !player.paused) await player.play();
          return searching.edit({ embeds: [new MessageEmbed().setColor(ee.color).setTitle(`${client.allEmojis.check_mark} **Playlist queued!**`).setDescription(`Added \`${tracks.length}\` songs to the queue..`).setFooter({ text: `By: ${member.user.tag}`, iconURL: member.user.displayAvatarURL({ dynamic: true }) })], content: null });
        }
        track.requester = member;
        await player.queue.add(track);
        if (!player.playing && !player.paused) await player.play();
        return searching.edit({ embeds: [new MessageEmbed().setColor(ee.color).setTimestamp().setTitle(`${client.allEmojis.check_mark} **Queued: \`${trackTitle(track)}\`**`).setFooter({ text: `By: ${member.user.tag}`, iconURL: member.user.displayAvatarURL({ dynamic: true }) })], content: null });
      } catch (e) { console.log(String(e.stack).bgRed); }
    }
  };