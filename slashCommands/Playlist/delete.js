const { MessageEmbed } = require("discord.js");
  const ee = require("../../botconfig/embed.json");

  module.exports = {
    name: "delete",
    description: "Delete a saved playlist",
    cooldown: 5,
    requiredroles: [],
    alloweduserids: [],
    options: [
      { "String": { name: "name", description: "Which playlist do you want to delete?", required: true } }
    ],
    run: async (client, interaction) => {
      await interaction.deferReply({ ephemeral: true });
      try {
        const { guildId } = interaction;
        const playlistName = interaction.options.getString("name").trim().toLowerCase();
        const allPlaylists = client.infos.get(guildId, "playlists") || {};
        const playlist = allPlaylists[playlistName];

        if (!playlist)
          return interaction.editReply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} Playlist not found!`).setDescription(`Available: \`${Object.keys(allPlaylists).join(", ") || "None"}\``)] });

        delete allPlaylists[playlistName];
        client.infos.set(guildId, allPlaylists, "playlists");

        return interaction.editReply({ embeds: [new MessageEmbed()
          .setColor(ee.color)
          .setTitle(`${client.allEmojis.check_mark} Playlist Deleted!`)
          .setDescription(`**${playlist.name}** has been removed.`)
        ]});
      } catch (e) {
        console.log(e.stack || e);
        interaction.editReply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} Error`).setDescription(`\`\`\`${e.message || e}\`\`\``)] }).catch(() => {});
      }
    }
  };