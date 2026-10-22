const { getPlayer, currentTrack, searchTrack } = require('../../handlers/playerHelpers');
const { lyricsPayload } = require('../../handlers/lyrics');

module.exports = {
  name: 'lyrics',
  category: 'Song',
  usage: 'lyrics [SongName]',
  description: 'Shows lyrics for the current or specified song from Lavalink.',
  cooldown: 10,
  requiredroles: [],
  alloweduserids: [],
  run: async (client, message, args) => {
    const player = getPlayer(client, message.guildId);
    if (!message.member.voice.channelId) return message.reply('Please join a voice channel first.');
    if (!player || !currentTrack(player)) return message.reply('No music is playing right now.');
    if (message.member.voice.channelId !== player.voiceChannelId) return message.reply('Please join my voice channel first.');
    try {
      let track = currentTrack(player);
      if (args.length) {
        ({ track } = await searchTrack(player, args.join(' '), message.author));
        if (!track) return message.reply('No song was found for that search.');
      }
      return message.reply(await lyricsPayload(player, track));
    } catch (error) {
      console.error('Lyrics command failed:', error.message);
      return message.reply('Could not retrieve lyrics. Please try again later.');
    }
  },
};
