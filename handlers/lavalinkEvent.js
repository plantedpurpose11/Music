console.log(`Lavalink Event Handler loaded`.yellow);
const config = require(`../botconfig/config.json`);
const settings = require(`../botconfig/settings.json`);
const ee = require(`../botconfig/embed.json`);
const {
  MessageButton,
  MessageActionRow,
  MessageEmbed,
  Permissions,
  MessageSelectMenu
} = require(`discord.js`);
const { 
  check_if_dj, delay, createBar
} = require(`./functions`);
const {
  currentTrack, trackTitle, trackUri, trackDuration, trackThumbnail, trackRequester
} = require(`./playerHelpers`);

let songEditInterval = null;

module.exports = (client) => {
  try {
    /**
     * MESSAGE CLEANUP - Delete bot messages in music channel after 20 seconds
     */
    const messageCleanup = (message, client) => {
      if (!message || !message.channel) return;
      
      // Only cleanup in music panel channels
      const musicChannelId = client.settings.get(message.guildId, `music.channel`);
      if (musicChannelId && message.channelId === musicChannelId) {
        setTimeout(() => {
          message.delete().catch(() => {});
        }, 20000); // 20 seconds
      }
    };

    /**
     * IDLE CHECK - Leave voice channel when bot is alone
     * Only runs after music has been playing for 30+ seconds
     */
    const idleCheck = () => {
      try {
        if (!client.manager || !client.manager.players) return;
        
        // Iterate over players directly
        for (const [guildId, player] of client.manager.players) {
          if (!player || !player.voiceChannelId) continue;
          
          // NEW: Don't leave if still loading/trying to play - wait for actual playback
          // Give user time to add more songs before we check
          if (!player.playing && !player.paused && player.queue.tracks.length === 0) {
            continue; // Still loading, don't check yet
          }
          
          const guild = client.guilds.cache.get(guildId);
          if (!guild) continue;
          
          // Get the voice channel
          const voiceChannel = guild.channels.cache.get(player.voiceChannelId);
          if (!voiceChannel) continue;
          
          // Get members in voice channel (excluding bots)
          const members = voiceChannel.members.filter(m => !m.user.bot);
          const listeningMembers = voiceChannel.members.filter(m => 
            !m.user.bot && !m.voice.deaf && !m.voice.selfDeaf
          );
          
          // Only leave if there are truly no humans in the channel at all
          // (self-deafened users still want to listen — don't boot them)
          if (members.size === 0) {
            console.log(`Idle Check`.brightYellow + ` - Bot truly alone in ${guild.name}, leaving...`);
            player.destroy();
          }
        }
      } catch (e) {
        // Silently ignore errors in idle check
      }
    };

    // Start idle check interval (every 30 seconds - increased from 10 to give time to add songs)
    idleCheckInterval = setInterval(idleCheck, 30000);

    /**
     * AUTO-RESUME-FUNCTION
     */
    const autoconnect = async () => {
      let guilds = client.autoresume.keyArray();
      console.log(`Autoresume`.brightCyan + ` - All Guilds, to autoresume:`, guilds)
      if (!guilds || guilds.length == 0) return;
      for (const gId of guilds) {
        try {
          let guild = client.guilds.cache.get(gId);
          if (!guild) {
            client.autoresume.delete(gId);
            console.log(`Autoresume`.brightCyan + ` - Bot got Kicked out of the Guild`)
            continue;
          }
          let data = client.autoresume.get(gId);

          let voiceChannel = guild.channels.cache.get(data.voiceChannel);
          if (!voiceChannel && data.voiceChannel) voiceChannel = await guild.channels.fetch(data.voiceChannel).catch(() => {}) || false;
          if (!voiceChannel || !voiceChannel.members || voiceChannel.members.filter(m => !m.user.bot && !m.voice.deaf && !m.voice.selfDeaf).size < 1) {
            client.autoresume.delete(gId);
            console.log(`Autoresume`.brightCyan + ` - Voice Channel is either Empty / no Listeners / got deleted`)
            continue;
          }

          let textChannel = guild.channels.cache.get(data.textChannel);
          if (!textChannel) textChannel = await guild.channels.fetch(data.textChannel).catch(() => {}) || false;
          if (!textChannel) {
            client.autoresume.delete(gId);
            console.log(`Autoresume`.brightCyan + ` - Text Channel got deleted`)
            continue;
          }
          
          let player = client.manager?.players?.get(guild.id);
          if (!player) {
            client.autoresume.delete(gId);
            continue;
          }
          
          let tracks = data.songs;
          if(!tracks || !tracks[0]){
            console.log(`Autoresume`.brightCyan + ` - Destroyed the player, because there are no tracks available`);
            continue;
          }
          
          for(const track of tracks.slice(1)){
            await player.queue.add(track);
          }
          
          console.log(`Autoresume`.brightCyan + ` - Added ${player.queue.tracks.length} Tracks on the QUEUE in ${guild.name}`);
          
          await player.setVolume(data.volume);
          
          client.autoresume.delete(player.guildId)
          console.log(`Autoresume`.brightCyan + " - Restored queue settings + deleted the database entry")
          
          if (data.currentTime > 0) {
            await player.seek(data.currentTime);
          }
          
          if (!data.playing) {
            await player.pause();
          }
          
          await delay(settings["auto-resume-delay"] || 1000)
        } catch (e) {
          console.log(e)
        }
      }
    }

    client.on("ready", () => {
      if (client.manager) {
        setTimeout(() => autoconnect(), 2 * client.ws.ping)
      }
    })

    // Track start event - send now playing message
    client.manager?.on("trackStart", async (player, track) => {
      try {
        const guild = client.guilds.cache.get(player.guildId);
        if (guild && guild.members.me && guild.members.me.voice && !guild.members.me.voice.deaf)
          guild.members.me.voice.setDeaf(true).catch(() => {})
      } catch (error) {
        console.log(error)
      }
      try {
        const textChannelId = player.textChannelId;
        if(!textChannelId) return;
        
        // Check if triggered from the setupmusic panel channel - don't create Now Playing popup
        const musicChannelSetting = client.settings.get(player.guildId, `music.channel`);
        if(musicChannelSetting && textChannelId === musicChannelSetting) {
          console.log(`Music Panel Update`.brightCyan + ` - Updated panel, skipped Now Playing popup`);
          // Still update the music panel
          updateMusicPanel(player.guildId, client);
          return;
        }
        
        // Update the music panel if exists
        updateMusicPanel(player.guildId, client);
        
        var data = receiveQueueData(player, track)
        
        let textChannel = client.channels.cache.get(textChannelId);
        if (!textChannel) return;
        
        let currentSongPlayMsg = await textChannel.send(data).then(msg => {
          return msg;
        });
        
        var collector = currentSongPlayMsg.createMessageComponentCollector({
          filter: (i) => i.isButton() && i.user && i.message.author.id == client.user.id,
          time: trackDuration(track) > 0 ? trackDuration(track) : 600000
        });

        let lastEdited = false;

        try{clearInterval(songEditInterval)}catch(e){}
        songEditInterval = setInterval(async () => {
          if (!lastEdited) {
            try{
              const cur = currentTrack(player);
              var newData = receiveQueueData(player, cur || track)
              await currentSongPlayMsg.edit(newData).catch(() => {})
            }catch (e){
              clearInterval(songEditInterval)
            }
          }
        }, 10000)

        collector.on('collect', async i => {
          const cur = currentTrack(player);
          if(i.customId != `10` && check_if_dj(client, i.member, cur)) {
            return i.reply({embeds: [new MessageEmbed()
              .setColor(ee.wrongcolor)
              .setFooter({ text: ee.footertext, iconURL: ee.footericon })
              .setTitle(`${client.allEmojis.x} **You are not a DJ and not the Song Requester!**`)
              .setDescription(`**DJ-ROLES:**\n${check_if_dj(client, i.member, cur)}`)
            ],
            ephemeral: true})
          }
          lastEdited = true;
          setTimeout(() => { lastEdited = false }, 10000)
          
          switch(i.customId){
            case "1": // Skip
              await player.skip();
              break;
            case "2": // Stop
              await player.destroy();
              break;
            case "3": // Pause/Resume
              if(player.paused) {
                await player.resume();
              } else {
                await player.pause();
              }
              break;
            case "4": // Autoplay
              const autoplay = !player.get("autoplay");
              player.set("autoplay", autoplay);
              break;
            case "5": // Shuffle
              if(player.queue && player.queue.tracks.length > 1) {
                await player.queue.shuffle();
              }
              break;
            case "6": // Song Loop
              await player.setRepeatMode(player.repeatMode === "track" ? "off" : "track");
              break;
            case "7": // Queue Loop  
              await player.setRepeatMode(player.repeatMode === "queue" ? "off" : "queue");
              break;
            case "8": // Forward +10s
              await player.seek(player.position + 10000);
              break;
            case "9": // Rewind -10s
              await player.seek(Math.max(0, player.position - 10000));
              break;
          }
          
          try {
            const curAfter = currentTrack(player);
            var newData = receiveQueueData(player, curAfter)
            await i.message.edit(newData).catch(() => {})
            i.reply({ embeds: [new MessageEmbed().setColor(ee.color).setTitle(`Action performed!`)] }).then(msg => {
              setTimeout(() => {
                try {
                  i.deleteReply().catch(console.log);
                }catch(e){}
              }, 3000)
            })
          } catch (e) {
            console.log(e)
          }
        })
      } catch (error) {
        console.log(error)
      }
    });

    // Track end event - revert music panel when song finishes
    client.manager?.on("trackEnd", async (player) => {
      try {
        // Only revert when there are no more songs — prevents flicker between tracks
        if (!player.queue?.tracks?.length) {
          updateMusicPanelRevert(player.guildId, client);
        }
      } catch (error) {
        console.log(error)
      }
    });

    // Queue end event
    client.manager?.on("queueEnd", async (player) => {
      try {
        // Handle autoplay
        const autoplay = player.get("autoplay");
        if (autoplay) {
          const cur = currentTrack(player) || player.queue.previous;
          if (cur) {
            const title = cur?.info?.title || cur?.title || "";
            const author = cur?.info?.author || cur?.author || "";
            try {
              const result = await player.search({ query: `ytsearch:${author} ${title}` }, null);
              if (result && result.tracks && result.tracks.length > 1) {
                const nextTrack = result.tracks[Math.floor(Math.random() * Math.min(5, result.tracks.length))];
                await player.queue.add(nextTrack);
                await player.play();
                return;
              }
            } catch(e) { console.log("Autoplay search failed:", e); }
          }
        }
        // Queue is empty and autoplay didn't save us — reset the panel to idle
        updateMusicPanelRevert(player.guildId, client);
        if (settings.leaveOnFinish) {
          await player.destroy();
        }
      } catch (error) {
        console.log(error)
      }
    });

    // Player destroy event
    client.manager?.on("playerDestroy", async (player) => {
      try {
        const guildId = player.guildId;
        let guild = client.guilds.cache.get(guildId);
        if (!guild) return;
        
        // Reset the music panel to idle state when the player is destroyed
        updateMusicPanelRevert(guildId, client);
        
        const cur = currentTrack(player);
        const queueTracks = player.queue?.tracks || [];
        const songs = [];
        if (cur) songs.push(cur);
        songs.push(...queueTracks);
        
        client.autoresume.set(guildId, {
          voiceChannel: player.voiceChannelId,
          textChannel: player.textChannelId,
          songs: songs,
          volume: player.volume,
          repeatMode: player.repeatMode,
          playing: player.playing,
          currentTime: player.position,
          filters: player.get("activeFilters") || []
        });
      } catch (error) {
        console.log(error)
      }
    });

    // Panel interaction handler - buttons and select menus
    client.on(`interactionCreate`, async (interaction) => {
      try {
        if (!interaction.isButton() && !interaction.isSelectMenu()) return;
        
        const { guild, message, channel, member, user } = interaction;
        if (!guild) return;
        
        // Check if this is the music panel
        const data = client.settings.get(guild.id, `music`);
        if (!data || data.channel !== channel?.id || data.message !== message?.id) return;
        
        // Member must be in voice channel
        if (!member?.voice?.channel) {
          return interaction.reply({ 
            content: `${client.allEmojis.x} **Please join a Voice Channel first!**`,
            ephemeral: true 
          });
        }
        
        // Handle select menu for playlists
        if (interaction.isSelectMenu()) {
          const playlistValue = interaction.values?.[0];
          let playlistUrl = '';
          
          // Map playlist names to YouTube URLs (Spotify requires a plugin — using YouTube instead)
            switch (playlistValue?.toLowerCase()) {
              case 'pop': playlistUrl = 'https://www.youtube.com/playlist?list=PLDfKAXSB8WA8FpDilTg6RBnNh_bvXIbXR'; break;
              case 'strange-fruits': playlistUrl = 'https://www.youtube.com/playlist?list=PL3PUigHACEnEuhZ2BHk-AavVkFx9i9FS6'; break;
              case 'gaming': playlistUrl = 'https://www.youtube.com/playlist?list=PLBTkdvSeZcVtoK-zVE7TnFHLRjIQ6d4LC'; break;
              case 'chill': playlistUrl = 'https://www.youtube.com/playlist?list=PLyORnIW1xT6xL7lVBSCsEoI0NPlpcwzj2'; break;
              case 'rock': playlistUrl = 'https://www.youtube.com/playlist?list=PLSrnH36IP8QMh8B2BQ_nd0qKyO_Dm3vSh'; break;
              case 'jazz': playlistUrl = 'https://www.youtube.com/playlist?list=PL8F6B0753B2CCA128'; break;
              case 'blues': playlistUrl = 'https://www.youtube.com/playlist?list=PLFjmckBbDlzSE47xD0FivigDOARiLJl61'; break;
              case 'metal': playlistUrl = 'https://www.youtube.com/playlist?list=PLmXxqSJJq-yUwqtbp8MHBoTDoDULMoViq'; break;
              case 'magic-release': playlistUrl = 'https://www.youtube.com/playlist?list=PLYUn4Yaogdagvwe69dczceHTNm0K_ZG3P'; break;
              case 'ncs | no copyright music': playlistUrl = 'https://www.youtube.com/playlist?list=PLRBp0Fe2GpgnIh0AiYKh7o7HnYAej-5ph'; break;
              case 'default': playlistUrl = 'https://www.youtube.com/playlist?list=PL8IGHPIdGnykbWFdt2xy1calQPV_Akoxb'; break;
              default: playlistUrl = '';
            }
          
          if (!playlistUrl) {
            return interaction.reply({ 
              content: `${client.allEmojis.x} Unknown playlist selection`,
              ephemeral: true 
            });
          }
          
          await interaction.reply({ 
            content: `🎵 Loading **${playlistValue}** playlist...`,
            ephemeral: true 
          });
          
          try {
            // Use getOrCreatePlayer from playerHelpers
            const { getOrCreatePlayer, searchTrack } = require('./playerHelpers');
            const player = await getOrCreatePlayer(client, guild.id, member.voice.channel.id, channel.id, member);
            
            // Search and add the playlist
            const { track, result } = await searchTrack(player, playlistUrl, member);
            
            if (result && result.loadType === 'playlist') {
              // It's a playlist - add all tracks
              for (const t of result.tracks) {
                t.requester = member;
                await player.queue.add(t);
              }
            } else if (track) {
              // Single track
              track.requester = member;
              await player.queue.add(track);
            }
            
            // Start playing if not already
            if (!player.playing && !player.paused) {
              await player.play();
            }
            
            await interaction.editReply({ 
              content: `✅ Loaded: **${playlistValue}**`,
              ephemeral: true 
            });
            
          } catch (e) {
            console.log('Playlist load error:', e);
            await interaction.editReply({ 
              content: `${client.allEmojis.x} Error loading playlist: ${e.message}`,
              ephemeral: true 
            });
          }
          
          return;
        }
        
        // Handle buttons - Skip, Stop, Pause, etc.
        if (interaction.isButton()) {
          const player = client.manager?.players?.get(guild.id);
          if (!player) {
            return interaction.reply({ 
              content: `${client.allEmojis.x} No music playing`,
              ephemeral: true 
            });
          }
          
          switch (interaction.customId) {
            case '1': // Skip
              await player.skip();
              break;
            case '2': // Stop
              await player.destroy();
              break;
            case '3': // Pause/Resume
              if (player.paused) {
                await player.resume();
              } else {
                await player.pause();
              }
              break;
            case '4': // Autoplay toggle
              {
                const autoplay = !player.get('autoplay');
                player.set('autoplay', autoplay);
              }
              break;
            case '5': // Shuffle
              if (player.queue && player.queue.tracks.length > 1) {
                await player.queue.shuffle();
              }
              break;
            case '6': // Song Loop
              await player.setRepeatMode(player.repeatMode === 'track' ? 'off' : 'track');
              break;
            case '7': // Queue Loop
              await player.setRepeatMode(player.repeatMode === 'queue' ? 'off' : 'queue');
              break;
            case '8': // Forward +10s
              await player.seek(player.position + 10000);
              break;
            case '9': // Rewind -10s
              await player.seek(Math.max(0, player.position - 10000));
              break;
            default:
              return;
          }
          
          await interaction.reply({ 
            content: `✅ Action performed!`,
            ephemeral: true 
          });
        }
        
      } catch (e) {
        console.log('Interaction error:', e);
      }
    });

    /**
     * Update music panel when song starts playing
     * Updates the queue at top and shows now playing info
     */
    function updateMusicPanel(guildId, client) {
      try {
        const channelId = client.settings.get(guildId, `music.channel`);
        const messageId = client.settings.get(guildId, `music.message`);
        
        if (!channelId || !messageId) return;
        
        const guild = client.guilds.cache.get(guildId);
        if (!guild) return;
        
        const channel = guild.channels.cache.get(channelId);
        if (!channel) return;
        
        // Get the player
        const player = client.manager?.players?.get(guildId);
        const queue = player?.queue;
        
        // Build embed with current playing info
        var embeds = [
          new MessageEmbed()
            .setColor(ee.color)
            .setTitle(`📃 Queue of __${guild.name}__`)
            .setDescription(`**Currently there are __${queue?.tracks?.length || 0} Songs__ in the Queue**`)
            .setThumbnail(guild.iconURL({ dynamic: true })),
          new MessageEmbed()
            .setColor(ee.color)
            .setFooter({ text: guild.name, iconURL: guild.iconURL({ dynamic: true }) })
            .setImage(`https://raw.githubusercontent.com/plantedpurpose11/Music/main/assets/forge-music-banner.png`)
            .setTitle(`Start Listening to Music, by connecting to a Voice Channel and sending either the **SONG LINK** or **SONG NAME** in this Channel!`)
            .setDescription(`> *I support <:yt:1506798187422421153> Youtube, <:soundcloud:1506798096229732382> Soundcloud, 🎧 Bandcamp, and direct MP3 Links!*`)
        ];
        
        // If playing, show current song info
        if (player && queue && queue.current) {
          const current = queue.current;
          const trackTitle = current?.info?.title || current?.title || "Unknown";
          const thumbnail = current?.info?.artworkUrl || current?.thumbnail || null;
          const uri = current?.info?.uri || current?.url || null;
          const requester = current?.requester;
          
          embeds[1].setImage(`https://img.youtube.com/vi/${current?.info?.identifier || ''}/mqdefault.jpg`)
            .setFooter({ text: `Requested by: ${requester?.user?.tag || requester?.username || "Unknown"}`, iconURL: requester?.user?.displayAvatarURL?.({ dynamic: true }) })
            .addFields({ name: `🎵 Now Playing:`, value: `>>> [${trackTitle.substring(0, 60)}](${uri})`, inline: true })
            .addFields({ name: `🔊 Volume:`, value: `>>> \`${player.volume} %\``, inline: true })
            .addFields({ name: `🔄 Queue:`, value: `>>> \`${queue.tracks.length} song(s)\``, inline: true })
            .setAuthor(trackTitle, thumbnail, uri);
        }
        
        // Buttons - enable/disable based on whether playing
        var components = [];
        if (player && queue && queue.current) {
          components = [
            new MessageActionRow().addComponents([
              new MessageButton().setStyle('PRIMARY').setCustomId('1').setEmoji('⏭').setLabel('Skip'),
              new MessageButton().setStyle('DANGER').setCustomId('2').setEmoji('🏠').setLabel('Stop'),
              new MessageButton().setStyle('SECONDARY').setCustomId('3').setEmoji(player.paused ? '▶️' : '⏸').setLabel(player.paused ? 'Resume' : 'Pause'),
              new MessageButton().setStyle('SUCCESS').setCustomId('4').setEmoji('🔁').setLabel('Autoplay'),
              new MessageButton().setStyle('PRIMARY').setCustomId('5').setEmoji('🔀').setLabel('Shuffle'),
            ]),
            new MessageActionRow().addComponents([
              new MessageButton().setStyle('SUCCESS').setCustomId('6').setEmoji('🔁').setLabel('Song'),
              new MessageButton().setStyle('SUCCESS').setCustomId('7').setEmoji('🔂').setLabel('Queue'),
              new MessageButton().setStyle('PRIMARY').setCustomId('8').setEmoji('⏩').setLabel('+10 Sec'),
              new MessageButton().setStyle('PRIMARY').setCustomId('9').setEmoji('⏪').setLabel('-10 Sec'),
            ]),
          ];
        } else {
          components = [
            new MessageActionRow().addComponents([
              new MessageButton().setStyle('PRIMARY').setCustomId('1').setEmoji('⏭').setLabel('Skip').setDisabled(),
              new MessageButton().setStyle('DANGER').setCustomId('2').setEmoji('⏹').setLabel('Stop').setDisabled(),
              new MessageButton().setStyle('SECONDARY').setCustomId('3').setEmoji('⏸').setLabel('Pause').setDisabled(),
              new MessageButton().setStyle('SUCCESS').setCustomId('4').setEmoji('🔁').setLabel('Autoplay').setDisabled(),
              new MessageButton().setStyle('PRIMARY').setCustomId('5').setEmoji('🔀').setLabel('Shuffle').setDisabled(),
            ])
          ];
        }
        
        channel.messages.fetch(messageId).then(msg => {
          msg.edit({ embeds, components }).catch(() => {});
        }).catch(() => {});
        
      } catch (e) {
        console.log(`Music Panel Update Error: ${e.message}`);
      }
    }

    /**
     * Revert music panel when song finishes
     * Shows queue at top with idle state (no current song)
     */
    function updateMusicPanelRevert(guildId, client) {
      try {
        const channelId = client.settings.get(guildId, `music.channel`);
        const messageId = client.settings.get(guildId, `music.message`);
        
        if (!channelId || !messageId) return;
        
        const guild = client.guilds.cache.get(guildId);
        if (!guild) return;
        
        const channel = guild.channels.cache.get(channelId);
        if (!channel) return;
        
        // Check if there's still a queue
        const player = client.manager?.players?.get(guildId);
        const hasQueue = player && player.queue && player.queue.tracks && player.queue.tracks.length > 0;
        
        // Idle embeds (same as initial setupmusic panel)
        var embeds = [
          new MessageEmbed()
            .setColor(ee.color)
            .setTitle(`📃 Queue of __${guild.name}__`)
            .setDescription(`**Currently there are __${player?.queue?.tracks?.length || 0} Songs__ in the Queue**`)
            .setThumbnail(guild.iconURL({ dynamic: true })),
          new MessageEmbed()
            .setColor(ee.color)
            .setFooter({ text: guild.name, iconURL: guild.iconURL({ dynamic: true }) })
            .setImage(`https://raw.githubusercontent.com/plantedpurpose11/Music/main/assets/forge-music-banner.png`)
            .setTitle(`Start Listening to Music, by connecting to a Voice Channel and sending either the **SONG LINK** or **SONG NAME** in this Channel!`)
            .setDescription(`> *I support <:yt:1506798187422421153> Youtube, <:soundcloud:1506798096229732382> Soundcloud, 🎧 Bandcamp, and direct MP3 Links!*`)
        ];
        
        // All disabled — mirrors the original setupmusic panel layout exactly
          var components = [
            new MessageActionRow().addComponents([
              new MessageSelectMenu()
                .setCustomId(`MessageSelectMenu`)
                .addOptions([`Pop`, `Strange-Fruits`, `Gaming`, `Chill`, `Rock`, `Jazz`, `Blues`, `Metal`, `Magic-Release`, `NCS | No Copyright Music`, `Default`].map((t, index) => ({
                  label: t.substr(0, 25),
                  value: t.substr(0, 25),
                  description: `Load a Music-Playlist: '${t}'`.substr(0, 50),
                  emoji: [`0️⃣`,`1️⃣`,`2️⃣`,`3️⃣`,`4️⃣`,`5️⃣`,`6️⃣`,`7️⃣`,`8️⃣`,`9️⃣`,`🔟`][index]
                })))
            ]),
            new MessageActionRow().addComponents([
              new MessageButton().setStyle('PRIMARY').setCustomId('Skip').setEmoji('⏭').setLabel('Skip').setDisabled(),
              new MessageButton().setStyle('DANGER').setCustomId('Stop').setEmoji('🏠').setLabel('Stop').setDisabled(),
              new MessageButton().setStyle('SECONDARY').setCustomId('Pause').setEmoji('⏸').setLabel('Pause').setDisabled(),
              new MessageButton().setStyle('SUCCESS').setCustomId('Autoplay').setEmoji('🔁').setLabel('Autoplay').setDisabled(),
              new MessageButton().setStyle('PRIMARY').setCustomId('Shuffle').setEmoji('🔀').setLabel('Shuffle').setDisabled(),
            ]),
            new MessageActionRow().addComponents([
              new MessageButton().setStyle('SUCCESS').setCustomId('Song').setEmoji('🔁').setLabel('Song').setDisabled(),
              new MessageButton().setStyle('SUCCESS').setCustomId('Queue').setEmoji('🔂').setLabel('Queue').setDisabled(),
              new MessageButton().setStyle('PRIMARY').setCustomId('Forward').setEmoji('⏩').setLabel('+10 Sec').setDisabled(),
              new MessageButton().setStyle('PRIMARY').setCustomId('Rewind').setEmoji('⏪').setLabel('-10 Sec').setDisabled(),
              new MessageButton().setStyle('PRIMARY').setCustomId('Lyrics').setEmoji('📝').setLabel('Lyrics').setDisabled(),
            ]),
          ];
        
        channel.messages.fetch(messageId).then(msg => {
          msg.edit({ embeds, components }).catch(() => {});
        }).catch(() => {});
        
      } catch (e) {
        console.log(`Music Panel Revert Error: ${e.message}`);
      }
    }

    /**
     * Creates the data for the queue/now playing message
     */
    function receiveQueueData(player, newTrack) {
      if(!player) return { embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`NO SONG FOUND?!?!`)] }
      
      const guildId = player.guildId;
      var djs = client.settings.get(guildId, `djroles`);
      if(!djs || !Array.isArray(djs)) djs = [];
      else djs = djs.map(r => `<@&${r}>`);
      if(djs.length == 0 ) djs = `\`not setup\``;
      else djs.slice(0, 15).join(`, `);
      
      if(!newTrack) return { embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`NO SONG FOUND?!?!`)] }
      
      const title = newTrack?.info?.title || newTrack?.title || "Unknown";
      const thumbnail = newTrack?.info?.artworkUrl || newTrack?.thumbnail || null;
      const uri = newTrack?.info?.uri || newTrack?.url || null;
      const duration = newTrack?.info?.duration || newTrack?.duration || 0;
      const requester = newTrack?.requester;
      const activeFilters = player.get("activeFilters") || [];
      const autoplay = player.get("autoplay");
      const queueLength = player.queue?.tracks?.length || 0;

      let dashboardUrl;
      try { dashboardUrl = require(`../dashboard/settings.json`).website.domain; } catch(e) { dashboardUrl = ""; }
      
      var embed = new MessageEmbed().setColor(ee.color)
        .addFields({ name: `Requested by:`, value: `>>> ${requester || "Unknown"}`, inline: true })
        .addFields({ name: `Duration:`, value: `>>> \`${player.position ? client.formatDuration(player.position) : '0:00'} / ${duration ? client.formatDuration(duration) : '0:00'}\``, inline: true })
        .addFields({ name: `Queue:`, value: `>>> \`${queueLength} song(s)\``, inline: true })
        .addFields({ name: `Volume:`, value: `>>> \`${player.volume} %\``, inline: true })
        .addFields({ name: `Loop:`, value: `>>> ${player.repeatMode !== "off" ? player.repeatMode === "queue" ? `${client.allEmojis.check_mark} \`Queue\`` : `${client.allEmojis.check_mark} \`Song\`` : `${client.allEmojis.x}`}`, inline: true })
        .addFields({ name: `Filter${activeFilters.length > 0 ? `s`: ``}:`, value: `>>> ${activeFilters.length > 0 ? activeFilters.map(f => `\`${f}\``).join(`, `) : `${client.allEmojis.x}`}`, inline: true })
        .setAuthor(title, thumbnail, uri)
        .setThumbnail(thumbnail)
        .setFooter({ text: `Requested by ${requester?.user?.username || requester?.username || "Unknown"}`, iconURL: requester?.user?.displayAvatarURL?.({ dynamic: true }) || requester?.displayAvatarURL?.({ dynamic: true }) });
      
      if (dashboardUrl) {
        embed.setDescription(`See the [Queue on the **DASHBOARD** Live!](${dashboardUrl}/queue/${guildId})`);
      }

      let skip = new MessageButton().setStyle('PRIMARY').setCustomId('1').setEmoji('⏭').setLabel(`Skip`)
      let stop = new MessageButton().setStyle('DANGER').setCustomId('2').setEmoji('⏹').setLabel(`Stop`)
      let pause = new MessageButton().setStyle('SECONDARY').setCustomId('3').setEmoji('⏸').setLabel(`Pause`)
      let autoplayBtn = new MessageButton().setStyle(autoplay ? 'SUCCESS' : 'SECONDARY').setCustomId('4').setEmoji('🔁').setLabel(`Autoplay`)
      let shuffle = new MessageButton().setStyle('PRIMARY').setCustomId('5').setEmoji('🔀').setLabel(`Shuffle`)
      let songloop = new MessageButton().setStyle('SUCCESS').setCustomId('6').setEmoji('🔂').setLabel(`Song`)
      let queueloop = new MessageButton().setStyle('SUCCESS').setCustomId('7').setEmoji('🔁').setLabel(`Queue`)
      let forward = new MessageButton().setStyle('PRIMARY').setCustomId('8').setEmoji('⏩').setLabel(`+10 Sec`)
      let rewind = new MessageButton().setStyle('PRIMARY').setCustomId('9').setEmoji('⏪').setLabel(`-10 Sec`)
      let lyrics = new MessageButton().setStyle('PRIMARY').setCustomId('10').setEmoji('🎤').setLabel(`Lyrics`).setDisabled();

      if (!player.playing) {
        pause = pause.setStyle('SUCCESS').setEmoji('▶️').setLabel(`Resume`)
      }
      if (player.repeatMode === "track") {
        songloop = songloop.setStyle('SECONDARY')
        queueloop = queueloop.setStyle('SUCCESS')
      }
      if (player.repeatMode === "queue") {
        songloop = songloop.setStyle('SUCCESS')
        queueloop = queueloop.setStyle('SECONDARY')
      }
      if (queueLength < 2) {
        shuffle = shuffle.setDisabled()
      }
      
      const row = new MessageActionRow().addComponents([skip, stop, pause, autoplayBtn, shuffle]);
      const row2 = new MessageActionRow().addComponents([songloop, queueloop, forward, rewind, lyrics]);
      
      return {
        embeds: [embed],
        components: [row, row2]
      };
    }

  } catch (e) {
    console.log(e)
  }
};
