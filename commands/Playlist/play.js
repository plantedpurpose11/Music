const { MessageEmbed } = require("discord.js");
  const ee = require("../../botconfig/embed.json");
  const { getOrCreatePlayer, searchTrack } = require("../../handlers/playerHelpers");
  module.exports = {
    name: "playlistplay",
    category: "Playlist",
    aliases: ["plplay","loadplaylist"],
    usage: "playlistplay <playlist name>",
    cooldown: 10,
    description: "Loads and plays a saved playlist",
    memberpermissions: [],
    requiredroles: [],
    alloweduserids: [],
    run: async (client, message, args) => {
      try {
        const { guild, member, channel } = message;
        const voiceChannel = member.voice?.channel;
        const playlistName = args.join(" ").toLowerCase();
        if (!playlistName) return message.reply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} **Please provide a playlist name!**`)] });
        if (!voiceChannel) return message.reply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} **Please join a voice channel first!**`)] });
        if (guild.members.me.voice.channel && guild.members.me.voice.channel.id !== voiceChannel.id)
          return message.reply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} **I'm already in another voice channel!**`)] });
        client.infos.ensure(guild\.id, {});

        const allPlaylists = client.infos.get(guild.id, "playlists") || {};
        const playlist = allPlaylists[playlistName];
        if (!playlist?.tracks?.length) return message.reply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} **Playlist not found!**`).setDescription(`Available: \`${Object.keys(allPlaylists).join(", ")||"None"}\``)] });
        const loading = await message.reply({ content: `🎵 Loading **${playlist.name}** (${playlist.tracks.length} songs)...` });
        const player = await getOrCreatePlayer(client, guild.id, voiceChannel.id, channel.id, member);
        let added = 0, failed = 0;
        for (const t of playlist.tracks) {
          try { const { track } = await searchTrack(player, t.info.uri||t.info.title, member); if (track) { track.requester = member; await player.queue.add(track); added++; } else failed++; }
          catch { failed++; }
        }
        if (!added) return loading.edit({ content: `${client.allEmojis.x} Failed to load any tracks!` });
        if (!player.playing && !player.paused) await player.play();
        return loading.edit({ embeds: [new MessageEmbed().setColor(ee.color).setTitle(`${client.allEmojis.check_mark} **Playlist Loaded!**`).setDescription(`**${playlist.name}** — \`${added}\` songs added${failed ? ` (\`${failed}\` failed)` : ""}`).setFooter({ text: `By: ${playlist.author?.tag||"Unknown"}` })], content: null });
      } catch (e) { console.log(String(e.stack).bgRed); }
    }
  };