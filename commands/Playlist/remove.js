const { MessageEmbed } = require("discord.js");
  const ee = require("../../botconfig/embed.json");
  module.exports = {
    name: "playlistremove",
    category: "Playlist",
    aliases: ["plremove","removefromplaylist"],
    usage: "playlistremove <playlist name> <position>",
    cooldown: 5,
    description: "Removes a song from a playlist by position number",
    memberpermissions: [],
    requiredroles: [],
    alloweduserids: [],
    run: async (client, message, args) => {
      try {
        const { guild } = message;
        const playlistName = args[0]?.toLowerCase();
        const position     = parseInt(args[1]);
        if (!playlistName || isNaN(position)) return message.reply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} **Usage: \`playlistremove <name> <position>\`**`)] });
        client.infos.ensure(guild\.id, {});

        const allPlaylists = client.infos.get(guild.id, "playlists") || {};
        const playlist = allPlaylists[playlistName];
        if (!playlist) return message.reply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} **Playlist not found!**`).setDescription(`Available: \`${Object.keys(allPlaylists).join(", ")||"None"}\``)] });
        if (position < 1 || position > playlist.tracks.length) return message.reply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} **Invalid position! (1–${playlist.tracks.length})**`)] });
        const [removed] = playlist.tracks.splice(position - 1, 1);
        client.infos.set(guild.id, allPlaylists, "playlists");
        return message.reply({ embeds: [new MessageEmbed().setColor(ee.color).setTitle(`${client.allEmojis.check_mark} **Removed!**`).setDescription(`**${removed.info.title}** removed from **${playlist.name}** (\`${playlist.tracks.length}\` songs left)`)] });
      } catch (e) { console.log(String(e.stack).bgRed); }
    }
  };