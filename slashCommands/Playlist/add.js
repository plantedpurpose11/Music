const { MessageEmbed } = require("discord.js");
  const ee = require("../../botconfig/embed.json");
  const { searchTrack } = require("../../handlers/playerHelpers");

  module.exports = {
    name: "add",
    description: "Add a song to an existing playlist",
    cooldown: 5,
    requiredroles: [],
    alloweduserids: [],
    options: [
      { "String": { name: "name", description: "Which playlist?", required: true } },
      { "String": { name: "song", description: "Song name or URL to add", required: true } }
    ],
    run: async (client, interaction) => {
      await interaction.deferReply({ ephemeral: true });
      try {
        const { member, guildId } = interaction;
        const playlistName = interaction.options.getString("name").trim().toLowerCase();
        const songQuery    = interaction.options.getString("song").trim();

        const allPlaylists = client.infos.get(guildId, "playlists") || {};
        const playlist = allPlaylists[playlistName];

        if (!playlist)
          return interaction.editReply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} Playlist not found!`).setDescription(`Available: \`${Object.keys(allPlaylists).join(", ") || "None"}\``)] });

        // Need a temp player or just search without player
        const guildPlayer = client.manager?.players?.get(guildId);
        if (!guildPlayer)
          return interaction.editReply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} Bot must be in a voice channel to search!`).setDescription("Join a voice channel and use `/music play` first, then add to playlist.")] });

        const { track } = await searchTrack(guildPlayer, songQuery, member);
        if (!track)
          return interaction.editReply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} Could not find: ${songQuery}`)] });

        playlist.tracks.push({
          info: {
            identifier: track.info.identifier || "",
            uri: track.info.uri || "",
            title: track.info.title || "Unknown",
            author: track.info.author || "Unknown",
            length: track.info.length || 0,
            isStream: track.info.isStream || false,
          },
          requester: { id: member.id, tag: member.user.tag }
        });
        client.infos.set(guildId, allPlaylists, "playlists");

        return interaction.editReply({ embeds: [new MessageEmbed()
          .setColor(ee.color)
          .setTitle(`${client.allEmojis.check_mark} Song Added!`)
          .setDescription(`**${track.info.title}** added to **${playlist.name}** (now \`${playlist.tracks.length}\` songs)`)
        ]});
      } catch (e) {
        console.log(e.stack || e);
        interaction.editReply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} Error`).setDescription(`\`\`\`${e.message || e}\`\`\``)] }).catch(() => {});
      }
    }
  };