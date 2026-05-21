const { MessageEmbed } = require("discord.js");
  const ee = require("../../botconfig/embed.json");

  module.exports = {
    name: "remove",
    description: "Remove a song from a playlist by its position number",
    cooldown: 5,
    requiredroles: [],
    alloweduserids: [],
    options: [
      { "String": { name: "name", description: "Which playlist?", required: true } },
      { "Integer": { name: "position", description: "Song number to remove (use /playlist list to see numbers)", required: true } }
    ],
    run: async (client, interaction) => {
      await interaction.deferReply({ ephemeral: true });
      try {
        const { guildId } = interaction;
        const playlistName = interaction.options.getString("name").trim().toLowerCase();
        const position     = interaction.options.getInteger("position");

        client.infos.ensure(guildId, {});


        const allPlaylists = client.infos.get(guildId, "playlists") || {};
        const playlist = allPlaylists[playlistName];

        if (!playlist)
          return interaction.editReply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} Playlist not found!`).setDescription(`Available: \`${Object.keys(allPlaylists).join(", ") || "None"}\``)] });

        if (position < 1 || position > playlist.tracks.length)
          return interaction.editReply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} Invalid position!`).setDescription(`Playlist has \`${playlist.tracks.length}\` songs. Use a number between 1 and ${playlist.tracks.length}.`)] });

        const [removed] = playlist.tracks.splice(position - 1, 1);
        client.infos.set(guildId, allPlaylists, "playlists");

        return interaction.editReply({ embeds: [new MessageEmbed()
          .setColor(ee.color)
          .setTitle(`${client.allEmojis.check_mark} Song Removed!`)
          .setDescription(`Removed **${removed.info.title}** from **${playlist.name}** (\`${playlist.tracks.length}\` songs left)`)
        ]});
      } catch (e) {
        console.log(e.stack || e);
        interaction.editReply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} Error`).setDescription(`\`\`\`${e.message || e}\`\`\``)] }).catch(() => {});
      }
    }
  };