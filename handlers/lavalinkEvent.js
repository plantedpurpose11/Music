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
        updateMusicSystem(player);
        var data = receiveQueueData(player, track)
        
        const textChannelId = player.textChannelId;
        if(!textChannelId) return;
        
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

    // Track end event
    client.manager?.on("trackEnd", async (player) => {
      try {
        updateMusicSystem(player);
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

    /**
     * Update music system message
     */
    function updateMusicSystem(player) {
      // Implementation for dashboard live queue update
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
        .addFields({ name: `Duration:`, value: `>>> \`${client.formatDuration(player.position)} / ${client.formatDuration(duration)}\``, inline: true })
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
