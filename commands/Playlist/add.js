const { MessageEmbed } = require("discord.js");
  const ee = require("../../botconfig/embed.json");
  const { searchTrack } = require("../../handlers/playerHelpers");
  module.exports = {
    name: "playlistadd",
    category: "Playlist",
    aliases: ["pladd","addtoplaylist"],
    usage: "playlistadd <playlist name> | <song>",
    cooldown: 5,
    description: "Adds a song to an existing playlist",
    memberpermissions: [],
    requiredroles: [],
    alloweduserids: [],
    run: async (client, message, args) => {
      try {
        const { guild, member } = message;
        const combined = args.join(" ");
        const parts = combined.split("|");
        if (parts.length < 2) return message.reply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} **Usage: \`playlistadd <playlist name> | <song>\`**`)] });
        const playlistName = parts[0].trim().toLowerCase();
        const songQuery    = parts.slice(1).join("|").trim();
        client.infos.ensure(guild.id, {});

        const allPlaylists = client.infos.get(guild.id, "playlists") || {};
        const playlist = allPlaylists[playlistName];
        if (!playlist) return message.reply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} **Playlist not found!**`).setDescription(`Available: \`${Object.keys(allPlaylists).join(", ")||"None"}\``)] });
        const guildPlayer = client.manager?.players?.get(guild.id);
        if (!guildPlayer) return message.reply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} **Bot must be in a voice channel to search!**`)] });
        const { track } = await searchTrack(guildPlayer, songQuery, member);
        if (!track) return message.reply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} **Could not find: ${songQuery}**`)] });
        playlist.tracks.push({ info: { identifier: track.info.identifier||"", uri: track.info.uri||"", title: track.info.title||"Unknown", author: track.info.author||"Unknown", length: track.info.length||0, isStream: track.info.isStream||false }, requester: { id: member.id, tag: member.user.tag } });
        client.infos.set(guild.id, allPlaylists, "playlists");
        return message.reply({ embeds: [new MessageEmbed().setColor(ee.color).setTitle(`${client.allEmojis.check_mark} **Song Added!**`).setDescription(`**${track.info.title}** added to **${playlist.name}** (now \`${playlist.tracks.length}\` songs)`)] });
      } catch (e) { console.log(String(e.stack).bgRed); }
    }
  };