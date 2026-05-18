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

let songEditInterval = null;

module.exports = (client) => {
  try {
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
          
          // Get the player and add tracks
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
          
          // Add remaining tracks to queue
          for(const track of tracks.slice(1)){
            player.queue.push({
              title: track.title,
              ident: track.ident,
              duration: track.duration,
              thumbnail: track.thumbnail,
              author: track.author,
              url: track.url,
              requester: track.requester
            });
          }
          
          console.log(`Autoresume`.brightCyan + ` - Added ${player.queue.length} Tracks on the QUEUE in ${guild.name}`);
          
          // Restore volume and other settings
          await player.setVolume(data.volume);
          
          if(data.filters && data.filters.length > 0){
            for (const filter of data.filters) {
              await player.setFilters({ name: filter });
            }
          }
          
          client.autoresume.delete(player.guild)
          console.log(`Autoresume`.brightCyan + " - Restored queue settings + deleted the database entry")
          
          if (data.currentTime > 0) {
            await player.seek(data.currentTime);
          }
          
          if (!data.playing) {
            player.pause();
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
        // Deafen the bot
        if(!player.guildObj.me.voice.deaf)
          player.guildObj.me.voice.setDeaf(true).catch((e) => {})
      } catch (error) {
        console.log(error)
      }
      try {
        updateMusicSystem(player);
        var data = receiveQueueData(player, track)
        
        if(!player.textChannel) return;
        
        let textChannel = client.channels.cache.get(player.textChannel);
        if (!textChannel) return;
        
        // Send now playing message
        let currentSongPlayMsg = await textChannel.send(data).then(msg => {
          return msg;
        });
        
        // Create a collector for buttons
        var collector = currentSongPlayMsg.createMessageComponentCollector({
          filter: (i) => i.isButton() && i.user && i.message.author.id == client.user.id,
          time: track.duration > 0 ? track.duration : 600000
        });

        let lastEdited = false;

        // Edit the song message every 10 seconds
        try{clearInterval(songEditInterval)}catch(e){}
        songEditInterval = setInterval(async () => {
          if (!lastEdited) {
            try{
              var newData = receiveQueueData(player, (player.queue && player.queue[0]) ? player.queue[0] : track)
              await currentSongPlayMsg.edit(newData).catch((e) => {})
            }catch (e){
              clearInterval(songEditInterval)
            }
          }
        }, 10000)

        collector.on('collect', async i => {
          if(!player.queue || (i.customId != `10` && check_if_dj(client, i.member, player.queue ? player.queue[0] : null))) {
            return i.reply({embeds: [new MessageEmbed()
              .setColor(ee.wrongcolor)
              .setFooter({ text: ee.footertext, iconURL: ee.footericon })
              .setTitle(`${client.allEmojis.x} **You are not a DJ and not the Song Requester!**`)
              .setDescription(`**DJ-ROLES:**\n${check_if_dj(client, i.member, player.queue ? player.queue[0] : null)}`)
            ],
            ephemeral: true})
          }
          lastEdited = true;
          setTimeout(() => { lastEdited = false }, 10000)
          
          switch(i.customId){
            case "1": // Skip
              player.stop();
              break;
            case "2": // Stop
              player.destroy();
              break;
            case "3": // Pause/Resume
              if(player.paused) {
                player.pause(false);
              } else {
                player.pause(true);
              }
              break;
            case "4": // Autoplay
              // Toggle autoplay logic
              break;
            case "5": // Shuffle
              if(player.queue && player.queue.length > 1) {
                for (let i = player.queue.length - 1; i > 0; i--) {
                  const j = Math.floor(Math.random() * (i + 1));
                  [player.queue[i], player.queue[j]] = [player.queue[j], player.queue[i]];
                }
              }
              break;
            case "6": // Song Loop
              player.setRepeatMode(player.repeatMode === "track" ? 0 : "track");
              break;
            case "7": // Queue Loop  
              player.setRepeatMode(player.repeatMode === "queue" ? 0 : "queue");
              break;
            case "8": // Forward +10s
              player.seek(player.position + 10000);
              break;
            case "9": // Rewind -10s
              player.seek(Math.max(0, player.position - 10000));
              break;
          }
          
          try {
            var newData = receiveQueueData(player, player.queue ? player.queue[0] : null)
            await i.message.edit(newData).catch((e) => {})
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

    // Track end event
    client.manager?.on("trackEnd", async (player) => {
      try {
        var newQueue = client.manager.players.get(player.guild);
        updateMusicSystem(newQueue);
      } catch (error) {
        console.log(error)
      }
    });

    // Queue end event
    client.manager?.on("queueEnd", async (player) => {
      try {
        // Auto leave when queue ends
        if (settings.leaveOnFinish) {
          player.destroy();
        }
      } catch (error) {
        console.log(error)
      }
    });

    // Player moved/left event
    client.manager?.on("playerDestroy", async (player) => {
      try {
        let guild = client.guilds.cache.get(player.guild);
        if (!guild) return;
        
        // Save autoresume data
        client.autoresume.set(player.guild, {
          voiceChannel: player.voiceChannel,
          textChannel: player.textChannel,
          songs: player.queue || [],
          volume: player.volume,
          repeatMode: player.repeatMode,
          playing: player.playing,
          currentTime: player.position,
          filters: player.equalizer?.bands?.map(b => b.name).filter(Boolean) || []
        });
      } catch (error) {
        console.log(error)
      }
    });

    /**
     * @INFO - Update music system message - using dashboard
     */
    function updateMusicSystem(player) {
      // Implementation for dashboard live queue update
    }

    /**
     * @INFO - Creates the data for the queue/now playing message
     */
    function receiveQueueData(player, newTrack) {
      if(!player) return new MessageEmbed().setColor(ee.wrongcolor).setTitle(`NO SONG FOUND?!?!`)
      
      var djs = client.settings.get(player.guild, `djroles`);
      if(!djs || !Array.isArray(djs)) djs = [];
      else djs = djs.map(r => `<@&${r}>`);
      if(djs.length == 0 ) djs = `\`not setup\``;
      else djs.slice(0, 15).join(`, `);
      
      if(!newTrack) return new MessageEmbed().setColor(ee.wrongcolor).setTitle(`NO SONG FOUND?!?!`)
      
      var embed = new MessageEmbed().setColor(ee.color)
        .setDescription(`See the [Queue on the **DASHBOARD** Live!](${require(`../dashboard/settings.json`).website.domain}/queue/${player.guild})`)
        .addFields({ name: `Requested by:`, value: `>>> ${newTrack.requester || "Unknown"}`, inline: true })
        .addFields({ name: `Duration:`, value: `>>> \`${client.formatDuration(player.position)} / ${client.formatDuration(newTrack.duration)}\``, inline: true })
        .addFields({ name: `Queue:`, value: `>>> \`${player.queue ? player.queue.length : 0} song(s)\``, inline: true })
        .addFields({ name: `Volume:`, value: `>>> \`${player.volume} %\``, inline: true })
        .addFields({ name: `Loop:`, value: `>>> ${player.repeatMode ? player.repeatMode === "queue" ? `${client.allEmojis.check_mark}\` Queue\`` : `${client.allEmojis.check_mark} \`Song\`` : `${client.allEmojis.x}`}`, inline: true })
        .addFields({ name: `Filter${player.equalizer?.active?.length > 0 ? `s`: ``}:`, value: `>>> ${player.equalizer?.active?.length > 0 ? player.equalizer.active.map(f => String(f)).join(`, `) : `${client.allEmojis.x}`}`, inline: true })
        .setAuthor(`${newTrack.title}`, newTrack.thumbnail || null, newTrack.url || null)
        .setThumbnail(newTrack.thumbnail || null)
        .setFooter({ text: `Requested by ${newTrack.requester?.username || "Unknown"}`, iconURL: newTrack.requester?.displayAvatarURL({ dynamic: true }) });
      
      let skip = new MessageButton().setStyle('PRIMARY').setCustomId('1').setEmoji('⏭').setLabel(`Skip`)
      let stop = new MessageButton().setStyle('DANGER').setCustomId('2').setEmoji('⏹').setLabel(`Stop`)
      let pause = new MessageButton().setStyle('SECONDARY').setCustomId('3').setEmoji('⏸').setLabel(`Pause`)
      let autoplay = new MessageButton().setStyle('SUCCESS').setCustomId('4').setEmoji('🔁').setLabel(`Autoplay`)
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
      if (!player.queue || player.queue.length < 2) {
        shuffle = shuffle.setDisabled()
      }
      
      // Buttons
      const row = new MessageActionRow().addComponents([skip, stop, pause, autoplay, shuffle]);
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

/**
 * @INFO
 * Bot Coded by Tomato#6966 | https://discord.gg/milrato
 * Migrated to use Lavalink
 * @INFO
 */