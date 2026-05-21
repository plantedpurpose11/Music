const { MessageEmbed } = require("discord.js");
  const ee = require("../../botconfig/embed.json");
  const { getOrCreatePlayer } = require("../../handlers/playerHelpers");
  module.exports = {
    name: "mix",
    category: "Music",
    aliases: ["ytmix","youtuberadio"],
    usage: "mix <song name>",
    cooldown: 2,
    description: "Plays a YouTube mix for a song",
    memberpermissions: [],
    requiredroles: [],
    alloweduserids: [],
    run: async (client, message, args) => {
      try {
        const { guild, member, channel } = message;
        const voiceChannel = member.voice?.channel;
        if (!voiceChannel) return message.reply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} **Please join a voice channel first!**`)] });
        if (guild.members.me.voice.channel && guild.members.me.voice.channel.id !== voiceChannel.id)
          return message.reply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} **I'm already connected somewhere else!**`)] });
        if (!args[0]) return message.reply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} **Please provide a song name!**`)] });
        const query = args.join(" ");
        const searching = await message.reply({ content: `🔍 Searching... \`${query}\`` });
        const player = await getOrCreatePlayer(client, guild.id, voiceChannel.id, channel.id, member);
        const result = await player.search({ query }, member);
        if (!result?.tracks?.length) return searching.edit({ content: `${client.allEmojis.x} No results found!` });
        for (const track of result.tracks) { track.requester = member; await player.queue.add(track); }
        if (!player.playing && !player.paused) await player.play();
        return searching.edit({ content: `🎶 Added ${result.tracks.length} tracks for: \`${query}\`` });
      } catch (e) { console.log(String(e.stack).bgRed); }
    }
  };