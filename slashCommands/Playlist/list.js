const { MessageEmbed } = require("discord.js");
  const ee = require("../../botconfig/embed.json");

  module.exports = {
    name: "list",
    description: "List all saved playlists, or view songs inside one",
    cooldown: 5,
    requiredroles: [],
    alloweduserids: [],
    options: [
      { "String": { name: "name", description: "Playlist name to inspect (leave empty to see all playlists)", required: false } }
    ],
    run: async (client, interaction) => {
      await interaction.deferReply({ ephemeral: true });
      try {
        const { guildId } = interaction;
        const nameArg = interaction.options.getString("name");
        client.infos.ensure(guildId, {});

        const allPlaylists = client.infos.get(guildId, "playlists") || {};

        if (!nameArg) {
          // List all playlists
          const keys = Object.keys(allPlaylists);
          if (keys.length === 0)
            return interaction.editReply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} No playlists saved yet!`).setDescription("Use `/playlist create` to make one.")] });

          const embed = new MessageEmbed()
            .setColor(ee.color)
            .setTitle("🎵 Saved Playlists")
            .setDescription(keys.map((k, i) => {
              const pl = allPlaylists[k];
              return `${i + 1}. **${pl.name}** — \`${pl.tracks.length}\` songs · by ${pl.author?.tag || "Unknown"}`;
            }).join("\n"));

          return interaction.editReply({ embeds: [embed] });
        }

        // Show songs in a specific playlist
        const playlist = allPlaylists[nameArg.trim().toLowerCase()];
        if (!playlist)
          return interaction.editReply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} Playlist not found!`).setDescription(`Available: \`${Object.keys(allPlaylists).join(", ") || "None"}\``)] });

        const songList = playlist.tracks
          .map((t, i) => `${i + 1}. ${(t.info.title || "Unknown").substring(0, 45)}`)
          .join("\n")
          .substring(0, 3900);

        const embed = new MessageEmbed()
          .setColor(ee.color)
          .setTitle(`🎵 ${playlist.name} (${playlist.tracks.length} songs)`)
          .setDescription(songList || "Empty")
          .setFooter({ text: `Created by ${playlist.author?.tag || "Unknown"}` });

        return interaction.editReply({ embeds: [embed] });
      } catch (e) {
        console.log(e.stack || e);
        interaction.editReply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} Error`).setDescription(`\`\`\`${e.message || e}\`\`\``)] }).catch(() => {});
      }
    }
  };