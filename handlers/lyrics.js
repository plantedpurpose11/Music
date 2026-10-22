const { MessageEmbed, MessageAttachment } = require('discord.js');
const ee = require('../botconfig/embed.json');
const { currentTrack, trackTitle, trackThumbnail } = require('./playerHelpers');

async function lyricsPayload(player, track = currentTrack(player)) {
  if (!track) return { content: 'No music is playing right now.' };
  try {
    // lavalink-client uses the player's own node and its configured lyrics plugins.
    const data = await player.getLyrics(track);
    const text = data?.text || data?.lines?.map(line => line.line).join('\n');
    if (!text?.trim()) return { content: 'No lyrics were found for this song on the Lavalink server.' };
    const embed = new MessageEmbed().setColor(ee.color)
      .setTitle(`📝 Lyrics: ${trackTitle(track)}`.slice(0, 256))
      .setDescription(text.length > 4096 ? `${text.slice(0, 4000)}\n\nFull lyrics attached.` : text)
      .setThumbnail(trackThumbnail(track));
    return {
      embeds: [embed],
      files: text.length > 4096 ? [new MessageAttachment(Buffer.from(text, 'utf8'), 'lyrics.txt')] : [],
      allowedMentions: { parse: [] },
    };
  } catch (error) {
    console.error('Lavalink lyrics lookup failed:', error.message);
    return { content: 'Lyrics are unavailable on this Lavalink node. It needs LavaLyrics and a configured lyrics provider (such as LavaSrc), or a compatible lyrics plugin.' };
  }
}

async function replyWithLyrics(interaction, player) {
  if (!interaction.member?.voice?.channelId || interaction.member.voice.channelId !== player?.voiceChannelId) {
    return interaction.reply({ content: 'Join my voice channel to view lyrics.', ephemeral: true });
  }
  await interaction.deferReply({ ephemeral: true });
  return interaction.editReply(await lyricsPayload(player));
}

module.exports = { lyricsPayload, replyWithLyrics };
