const { MessageEmbed } = require("discord.js");
const ee = require("../../botconfig/embed.json");

module.exports = {
  name: "deleteplaylist",
  description: "Delete a saved playlist",
  cooldown: 5,
  usage: "deleteplaylist <name>",
  requiredroles: [],
  alloweduserids: [],
  options: [
    { "String": { name: "name", description: "Which playlist do you want to delete?", required: true } }
  ],
  run: async (client, interaction) => {
    try {
      const { member, guildId } = interaction;
      const playlistName = interaction.options.getString("name").trim().toLowerCase();
      
      // Get saved playlists
      const allPlaylists = client.infos.get(guildId, "playlists") || {};
      const playlist = allPlaylists[playlistName];
      
      if (!playlist) {
        return interaction.reply({ 
          embeds: [new MessageEmbed()
            .setColor(ee.wrongcolor)
            .setTitle(`${client.allEmojis.x} **Playlist not found!**`)
            .setDescription(`Available playlists: \`${Object.keys(allPlaylists).join(", ") || "None"}\``)
          ], 
          ephemeral: true 
        });
      }
      
      // Delete the playlist
      delete allPlaylists[playlistName];
      client.infos.set(guildId, allPlaylists, "playlists");
      
      return interaction.reply({ 
        embeds: [new MessageEmbed()
          .setColor(ee.color)
          .setTitle(`${client.allEmojis.check_mark} **Playlist Deleted!**`)
          .setDescription(`**${playlist.name}** has been removed.`)
        ], 
        ephemeral: true 
      });
      
    } catch (e) {
      console.log(e.stack ? e.stack : e);
      interaction.reply({ 
        embeds: [new MessageEmbed()
          .setColor(ee.wrongcolor)
          .setTitle(`${client.allEmojis.x} Error`)
          .setDescription(`\`\`\`${e}\`\`\``)
        ], 
        ephemeral: true 
      });
    }
  }
};