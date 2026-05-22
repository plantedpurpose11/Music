const { MessageEmbed } = require("discord.js");
  const ee = require("../../botconfig/embed.json");
  module.exports = {
    name: "playlistlist",
    category: "Playlist",
    aliases: ["pllist","showplaylist"],
    usage: "playlistlist [playlist name]",
    cooldown: 5,
    description: "Lists all playlists or songs inside one",
    memberpermissions: [],
    requiredroles: [],
    alloweduserids: [],
    run: async (client, message, args) => {
      try {
        const { guild } = message;
        client.infos.ensure(guild.id, {});

        const allPlaylists = client.infos.get(guild.id, "playlists") || {};
        if (!args[0]) {
          const keys = Object.keys(allPlaylists);
          if (!keys.length) return message.reply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle("📋 No playlists saved yet!").setDescription("Use `playlistcreate <name>` to make one.")] });
          return message.reply({ embeds: [new MessageEmbed().setColor(ee.color).setTitle("🎵 Saved Playlists").setDescription(keys.map((k, i) => `${i+1}. **${allPlaylists[k].name}** — \`${allPlaylists[k].tracks.length}\` songs · by ${allPlaylists[k].author?.tag||"Unknown"}`).join("\n"))] });
        }
        const playlist = allPlaylists[args.join(" ").toLowerCase()];
        if (!playlist) return message.reply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} **Playlist not found!**`).setDescription(`Available: \`${Object.keys(allPlaylists).join(", ")||"None"}\``)] });
        const songList = playlist.tracks.map((t, i) => `${i+1}. ${(t.info.title||"Unknown").substring(0,45)}`).join("\n").substring(0,3900);
        return message.reply({ embeds: [new MessageEmbed().setColor(ee.color).setTitle(`🎵 ${playlist.name} (${playlist.tracks.length} songs)`).setDescription(songList||"Empty").setFooter({ text: `By ${playlist.author?.tag||"Unknown"}` })] });
      } catch (e) { console.log(String(e.stack).bgRed); }
    }
  };