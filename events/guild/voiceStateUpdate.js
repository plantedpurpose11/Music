module.exports = async (client, oldState, newState) => {
    // Handle various voice state changes (mute, deaf, video, etc.)
    if (
        (!oldState.streaming && newState.streaming)   ||
        (oldState.streaming && !newState.streaming)   ||
        (!oldState.serverDeaf && newState.serverDeaf) ||
        (oldState.serverDeaf && !newState.serverDeaf) ||
        (!oldState.serverMute && newState.serverMute) ||
        (oldState.serverMute && !newState.serverMute) || 
        (!oldState.selfDeaf && newState.selfDeaf)     ||
        (oldState.selfDeaf && !newState.selfDeaf)     ||
        (!oldState.selfMute && newState.selfMute)     ||
        (oldState.selfMute && !newState.selfMute)     ||
        (!oldState.selfVideo && newState.selfVideo)   ||
        (oldState.selfVideo && !newState.selfVideo) 
     )
    // User joined a voice channel
    if (!oldState.channelId && newState.channelId) {
        if(newState.channel.type == "GUILD_STAGE_VOICE" && newState.guild.members.me.voice.suppress){
          try{
            await newState.guild.members.me.voice.setSuppressed(false);
          }catch (e){
            console.log(String(e).grey)
          }
        }
        return
    }
    // User left a voice channel - clean up recent bot messages in music channel
    if (oldState.channelId && !newState.channelId) {
        // Get the music channel for this guild
        const musicChannelId = client.settings.get(oldState.guild.id, "music.channel");
        const panelMessageId = client.settings.get(oldState.guild.id, "music.message");
        const panelTimestamp = client.settings.get(oldState.guild.id, "music.panelTime");
        
        if (musicChannelId && panelMessageId && panelTimestamp) {
            // Check if there are still users in the voice channel
            const voiceChannel = await oldState.guild.channels.fetch(oldState.channelId);
            const membersInChannel = voiceChannel?.members.filter(m => !m.user.bot);
            
            // Only delete if voice channel is now empty of users (everyone left)
            if (!membersInChannel || membersInChannel.size === 0) {
                try {
                    const musicChannel = await client.channels.fetch(musicChannelId);
                    if (!musicChannel) return;
                    
                    // Fetch recent messages (last 50 messages should cover recent ones)
                    const messages = await musicChannel.messages.fetch({ limit: 50 });
                    
                    // Delete bot messages that:
                    // 1. Are from the bot
                    // 2. Are NOT the panel message
                    // 3. Were sent AFTER the panel was set up
                    for (const [msgId, msg] of messages) {
                        // Skip if message is from user (not bot)
                        if (!msg.author.bot) continue;
                        
                        // Skip the panel message
                        if (msgId === panelMessageId) continue;
                        
                        // Only delete messages sent after the panel
                        if (msg.createdTimestamp > panelTimestamp) {
                            try {
                                await msg.delete();
                            } catch (e) {
                                // Message might already be deleted, ignore
                            }
                        }
                    }
                } catch (e) {
                    console.log(String(e).grey);
                }
            }
        }
        return
    }
    // User switched voice channels
    if (oldState.channelId && newState.channelId) {
        if(newState.channel.type == "GUILD_STAGE_VOICE" && newState.guild.members.me.voice.suppress){
          try{
            await newState.guild.members.me.voice.setSuppressed(false);
          }catch (e){
            console.log(String(e).grey)
          }
        }
        return;
    }
}
/**
 * @INFO
 * Bot Coded by Tomato#6966 | https://discord.gg/milrato
 * @INFO
 * Work for Milrato Development | https://milrato.eu
 * @INFO
 * Please mention Him / Milrato Development, when using this Code!
 * @INFO
 */