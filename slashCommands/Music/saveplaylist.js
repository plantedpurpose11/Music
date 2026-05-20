const { MessageEmbed } = require("discord.js");
const ee = require("../../botconfig/embed.json");
const { getOrCreatePlayer, searchTrack, trackTitle, trackUri } = require("../../handlers/playerHelpers");

module.exports = {
  name: "saveplaylist",
  description: "Save the current queue as a playlist",
  cooldown: 10,
  usage: "saveplaylist <name>",
  requiredroles: [],
  alloweduserids: [],
  options: [
    { "String": { name: "name", description: "What name do you want to give this playlist?", required: true } }
  ],
  run: async (client, interaction) => {
    try {
      const { member, guildId } = interaction;
      const playlistName = interaction.options.getString("name").trim();
      
      if (!playlistName || playlistName.length < 1) {
        return interaction.reply({ 
          embeds: [new MessageEmbed()
            .setColor(ee.wrongcolor)
            .setTitle(`${client.allEmojis.x} **Please provide a playlist name!**`)
          ], 
          ephemeral: true 
        });
      }
      
      if (playlistName.length > 50) {
        return interaction.reply({ 
          embeds: [new MessageEmbed()
            .setColor(ee.wrongcolor)
            .setTitle(`${client.allEmojis.x} **Playlist name is too long! (max 50 characters)**`)
          ], 
          ephemeral: true 
        });
      }
      
      // Get the player
      const player = client.manager?.players?.get(guildId);
      
      if (!player || !player.queue || player.queue.tracks.length === 0) {
        return interaction.reply({ 
          embeds: [new MessageEmbed()
            .setColor(ee.wrongcolor)
            .setTitle(`${client.allEmojis.x} **Nothing in the queue to save!**`)
            .setDescription(`Add some songs first using \`/play\``)
          ], 
          ephemeral: true 
        });
      }
      
      // Get all tracks from the queue
      const tracks = player.queue.tracks.map(track => {
        return {
          info: {
            identifier: track.info.identifier,
            uri: track.info.uri,
            title: track.info.title,
            author: track.info.author,
            length: track.info.length,
            isStream: track.info.isLive,
            position: track.info.position || 0
          },
          requester: {
            id: track.requester?.id,
            tag: track.requester?.user?.tag || track.requester?.tag
          }
        };
      });
      
      if (tracks.length === 0) {
        return interaction.reply({ 
          embeds: [new MessageEmbed()
            .setColor(ee.wrongcolor)
            .setTitle(`${client.allEmojis.x} **Queue is empty!**`)
          ], 
          ephemeral: true 
        });
      }
      
      // Save to database - use playlists key in infos enmap
      const playlistKey = `playlist_${guildId}_${playlistName.toLowerCase().replace(/\s+/g, '_')}`;
      
      // Check if playlist already exists
      const existingPlaylists = client.infos.get(guildId, "playlists") || {};
      if (existingPlaylists[playlistName.toLowerCase()]) {
        return interaction.reply({ 
          embeds: [new MessageEmbed()
            .setColor(ee.wrongcolor)
            .setTitle(`${client.allEmojis.x} **A playlist with that name already exists!**`)
            .setDescription(`Use \`/ deletplaylist ${playlistName}\` first to delete it, or use a different name.`)
          ], 
          ephemeral: true 
        });
      }
      
      // Save the playlist
      const playlistData = {
        name: playlistName,
        tracks: tracks,
        author: {
          id: member.id,
          tag: member.user.tag
        },
        createdAt: Date.now()
      };
      
      // Store in infos enmap
      const allPlaylists = client.infos.get(guildId, "playlists") || {};
      allPlaylists[playlistName.toLowerCase()] = playlistData;
      client.infos.set(guildId, allPlaylists, "playlists");
      
      return interaction.reply({ 
        embeds: [new MessageEmbed()
          .setColor(ee.color)
          .setTitle(`${client.allEmojis.check_mark} **Playlist Saved!**`)
          .setDescription(`**${playlistName}** with \`${tracks.length}\` songs has been saved!`)
          .addField("Songs:", tracks.map((t, i) => `${i + 1}. ${t.info.title.substring(0, 40)}`).join("\n").substring(0, 1000))
          .setFooter({ text: `By: ${member.user.tag}`, iconURL: member.user.displayAvatarURL({ dynamic: true }) })
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