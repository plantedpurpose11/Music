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
      
      // Get all tracks — currently playing song first, then the queued tracks
        const mapTrack = t => ({
          info: {
            identifier: t.info.identifier,
            uri: t.info.uri,
            title: t.info.title,
            author: t.info.author,
            length: t.info.length,
            isStream: t.info.isStream,
            position: t.info.position || 0
          },
          requester: {
            id: t.requester?.id,
            tag: t.requester?.user?.tag || t.requester?.tag
          }
        });
        const currentTrackData = player.queue.current ? [mapTrack(player.queue.current)] : [];
        const tracks = [...currentTrackData, ...player.queue.tracks.map(mapTrack)];
      
      if (tracks.length === 0) {
        return interaction.reply({ 
          embeds: [new MessageEmbed()
            .setColor(ee.wrongcolor)
            .setTitle(`${client.allEmojis.x} **Queue is empty!**`)
          ], 
          ephemeral: true 
        });
      }
      
      // Check if playlist already existsexists
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