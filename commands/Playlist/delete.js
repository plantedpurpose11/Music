const { MessageEmbed } = require("discord.js");
  const ee = require("../../botconfig/embed.json");
  module.exports = {
    name: "playlistdelete",
    category: "Playlist",
    aliases: ["pldelete","deleteplaylist"],
    usage: "playlistdelete <playlist name>",
    cooldown: 5,
    description: "Deletes a saved playlist",
    memberpermissions: [],
    requiredroles: [],
    alloweduserids: [],
    run: async (client, message, args) => {
      try {
        const { guild } = message;
        const playlistName = args.join(" ").toLowerCase();
        if (!playlistName) return message.reply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} **Please provide a playlist name!**`)] });
        const allPlaylists = client.infos.get(guild.id, "playlists") || {};
        const playlist = allPlaylists[playlistName];
        if (!playlist) return message.reply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} **Playlist not found!**`).setDescription(`Available: \`${Object.keys(allPlaylists).join(", ")||"None"}\``)] });
        delete allPlaylists[playlistName];
        client.infos.set(guild.id, allPlaylists, "playlists");
        return message.reply({ embeds: [new MessageEmbed().setColor(ee.color).setTitle(`${client.allEmojis.check_mark} **Playlist Deleted!**`).setDescription(`**${playlist.name}** removed.`)] });
      } catch (e) { console.log(String(e.stack).bgRed); }
    }
  };