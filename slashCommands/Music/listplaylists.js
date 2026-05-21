const { MessageEmbed } = require("discord.js");
const ee = require("../../botconfig/embed.json");

module.exports = {
  name: "listplaylists",
  description: "List all saved playlists",
  cooldown: 5,
  usage: "listplaylists",
  requiredroles: [],
  alloweduserids: [],
  run: async (client, interaction) => {
    try {
      const { member, guildId } = interaction;
      
      // Get all playlists
      client.infos.ensure(guildId, {});

      const allPlaylists = client.infos.get(guildId, "playlists") || {};
      const playlistNames = Object.keys(allPlaylists);
      
      if (playlistNames.length === 0) {
        return interaction.reply({ 
          embeds: [new MessageEmbed()
            .setColor(ee.color)
            .setTitle(`📋 No Playlists Saved Yet`)
            .setDescription(`Use \`/saveplaylist <name>\` to save the current queue as a playlist!\nThen use \`/loadplaylist <name>\` to load it.`)
          ], 
          ephemeral: true 
        });
      }
      
      // Build embed with playlist info
      const embed = new MessageEmbed()
        .setColor(ee.color)
        .setTitle(`📋 Saved Playlists (${playlistNames.length})`)
        .setDescription(`Use \`/loadplaylist <name>\` to load a playlist!`);
      
      for (const name of playlistNames) {
        const playlist = allPlaylists[name];
        embed.addField(
          `🎵 ${playlist.name}`, 
          `\`${playlist.tracks?.length || 0}\` songs • Created by: ${playlist.author?.tag || "Unknown"}\nCreated: <t:${Math.floor(playlist.createdAt / 1000)}:R>`,
          false
        );
      }
      
      return interaction.reply({ embeds: [embed], ephemeral: true });
      
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