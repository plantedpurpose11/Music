const { MessageEmbed } = require("discord.js");
const ee = require("../../botconfig/embed.json");
const { getOrCreatePlayer, searchTrack, trackTitle, trackUri } = require("../../handlers/playerHelpers");

module.exports = {
  name: "loadplaylist",
  description: "Load a saved playlist",
  cooldown: 10,
  usage: "loadplaylist <name>",
  requiredroles: [],
  alloweduserids: [],
  options: [
    { "String": { name: "name", description: "Which playlist do you want to load?", required: true } }
  ],
  run: async (client, interaction) => {
    try {
      const { member, channelId, guildId } = interaction;
      const { channel } = member.voice;
      const playlistName = interaction.options.getString("name").trim().toLowerCase();
      
      // Check if in voice channel
      if (!channel) {
        return interaction.reply({ 
          embeds: [new MessageEmbed()
            .setColor(ee.wrongcolor)
            .setTitle(`${client.allEmojis.x} **Please join a Voice Channel first!**`)
          ], 
          ephemeral: true 
        });
      }
      
      if (channel.userLimit != 0 && channel.full) {
        return interaction.reply({ 
          embeds: [new MessageEmbed()
            .setColor(ee.wrongcolor)
            .setTitle(`${client.allEmojis.x} **Your Voice Channel is full!**`)
          ], 
          ephemeral: true 
        });
      }
      
      if (channel.guild.members.me.voice.channel && channel.guild.members.me.voice.channel.id != channel.id) {
        return interaction.reply({ 
          embeds: [new MessageEmbed()
            .setColor(ee.wrongcolor)
            .setTitle(`${client.allEmojis.x} **I'm already in another voice channel!**`)
          ], 
          ephemeral: true 
        });
      }
      
      // Get saved playlists
      const allPlaylists = client.infos.get(guildId, "playlists") || {};
      const playlist = allPlaylists[playlistName];
      
      if (!playlist || !playlist.tracks || playlist.tracks.length === 0) {
        return interaction.reply({ 
          embeds: [new MessageEmbed()
            .setColor(ee.wrongcolor)
            .setTitle(`${client.allEmojis.x} **Playlist not found!**`)
            .setDescription(`Available playlists: \`${Object.keys(allPlaylists).join(", ") || "None"}\``)
          ], 
          ephemeral: true 
        });
      }
      
      await interaction.reply({ 
        content: `🎵 Loading playlist **${playlist.name}** with ${playlist.tracks.length} songs...`, 
        ephemeral: true 
      });
      
      // Create/get player first
      const player = await getOrCreatePlayer(client, guildId, channel.id, channelId, member);
      
      // Add all tracks from the playlist by searching for each one
      let addedCount = 0;
      let failedCount = 0;
      
      for (const savedTrack of playlist.tracks) {
        try {
          const trackUri = savedTrack.info.uri || savedTrack.info.title;
          
          // Search for the track using its URI or title
          const { track } = await searchTrack(player, trackUri, member);
          
          if (track) {
            // Preserve original requester
            track.requester = member;
            await player.queue.add(track);
            addedCount++;
          } else {
            failedCount++;
          }
        } catch (e) {
          console.log(`Error loading track:`, savedTrack.info.title, e.message);
          failedCount++;
        }
      }
      
      if (addedCount === 0) {
        return interaction.editReply({ 
          content: `${client.allEmojis.x} Failed to load tracks from the playlist!`, 
          ephemeral: true 
        });
      }
      
      // Start playing if not already
      if (!player.playing && !player.paused) {
        await player.play();
      }
      
      return interaction.editReply({ 
        embeds: [new MessageEmbed()
          .setColor(ee.color)
          .setTitle(`${client.allEmojis.check_mark} **Playlist Loaded!**`)
          .setDescription(`**${playlist.name}** - \`${addedCount}\` songs added to queue${failedCount > 0 ? ` (\`${failedCount}\` failed)` : ""}`)
          .setFooter({ text: `By: ${playlist.author?.tag || "Unknown"}` })
        ], 
        ephemeral: true 
      });
      
        } catch (e) {
        console.log(e.stack ? e.stack : e);
        const replyFn = interaction.replied || interaction.deferred
          ? interaction.editReply.bind(interaction)
          : interaction.reply.bind(interaction);
        replyFn({ 
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
