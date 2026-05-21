const { MessageEmbed } = require("discord.js");
  const ee = require("../../botconfig/embed.json");
  const { getOrCreatePlayer, searchTrack } = require("../../handlers/playerHelpers");

  module.exports = {
    name: "play",
    description: "Load and play a saved playlist",
    cooldown: 10,
    requiredroles: [],
    alloweduserids: [],
    options: [
      { "String": { name: "name", description: "Which playlist do you want to play?", required: true } }
    ],
    run: async (client, interaction) => {
      await interaction.deferReply({ ephemeral: true });
      try {
        const { member, channelId, guildId } = interaction;
        const { channel } = member.voice;
        const playlistName = interaction.options.getString("name").trim().toLowerCase();

        if (!channel)
          return interaction.editReply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} Please join a Voice Channel first!`)] });

        if (channel.userLimit !== 0 && channel.full)
          return interaction.editReply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} Your Voice Channel is full!`)] });

        if (channel.guild.members.me.voice.channel && channel.guild.members.me.voice.channel.id !== channel.id)
          return interaction.editReply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} I'm already in another voice channel!`)] });

        const allPlaylists = client.infos.get(guildId, "playlists") || {};
        const playlist = allPlaylists[playlistName];

        if (!playlist || !playlist.tracks || playlist.tracks.length === 0)
          return interaction.editReply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} Playlist not found!`).setDescription(`Available: \`${Object.keys(allPlaylists).join(", ") || "None"}\``)] });

        const player = await getOrCreatePlayer(client, guildId, channel.id, channelId, member);

        let addedCount = 0, failedCount = 0;
        for (const savedTrack of playlist.tracks) {
          try {
            const query = savedTrack.info.uri || savedTrack.info.title;
            const { track } = await searchTrack(player, query, member);
            if (track) {
              track.requester = member;
              await player.queue.add(track);
              addedCount++;
            } else {
              failedCount++;
            }
          } catch (err) {
            console.log("Error loading track:", savedTrack.info?.title, err.message);
            failedCount++;
          }
        }

        if (addedCount === 0)
          return interaction.editReply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} Failed to load any tracks from the playlist!`)] });

        if (!player.playing && !player.paused) await player.play();

        return interaction.editReply({ embeds: [new MessageEmbed()
          .setColor(ee.color)
          .setTitle(`${client.allEmojis.check_mark} Playlist Loaded!`)
          .setDescription(`**${playlist.name}** — \`${addedCount}\` song(s) added to queue${failedCount > 0 ? ` (\`${failedCount}\` failed)` : ""}`)
          .setFooter({ text: `By: ${playlist.author?.tag || "Unknown"}` })
        ]});
      } catch (e) {
        console.log(e.stack || e);
        interaction.editReply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} Error`).setDescription(`\`\`\`${e.message || e}\`\`\``)] }).catch(() => {});
      }
    }
  };