/**
 * Shared helpers for lavalink-client player operations.
 * All commands should use these instead of calling DisTube APIs.
 */

/**
 * Get a player for the guild, or null.
 */
function getPlayer(client, guildId) {
  return client.manager?.getPlayer(guildId) || client.manager?.players?.get(guildId) || null;
}

/**
 * Get or create a player for the guild + voice channel.
 * Returns the player (already connected to voice).
 */
async function getOrCreatePlayer(client, guildId, voiceChannelId, textChannelId) {
  let player = getPlayer(client, guildId);
  if (!player) {
    player = client.manager.createPlayer({
      guildId,
      voiceChannelId,
      textChannelId,
      selfDeaf: true,
      selfMute: false,
    });
    await player.connect();
  }
  return player;
}

/**
 * Valid source prefixes for Lavalink search.
 */
const SOURCES = {
  youtube: 'ytsearch',
  youtubemusic: 'ytmsearch',
  soundcloud: 'scsearch',
  bandcamp: 'bcsearch',
};

/**
 * Search for tracks using the player.
 * @param {object} player - lavalink-client player
 * @param {string} query - search query or URL
 * @param {object} requesterId - the member/user who requested
 * @param {string} [source] - force a specific source: 'youtube', 'youtubemusic', 'soundcloud', 'bandcamp'
 * Returns { track, result } or { track: null }.
 */
async function searchTrack(player, query, requesterId, source) {
  // If a specific source is requested, search only that source
  if (source && SOURCES[source]) {
    try {
      const result = await player.search({ query: `${SOURCES[source]}:${query}` }, requesterId);
      if (result.tracks && result.tracks.length > 0) {
        return { track: result.tracks[0], result };
      }
    } catch (e) {
      console.log(`[Search] ${source} failed for "${query}":`, e.message || e);
    }
    return { track: null, result: null };
  }

  // If query is a URL, search directly without source prefix
  if (/^https?:\/\//.test(query)) {
    try {
      const result = await player.search({ query }, requesterId);
      if (result.tracks && result.tracks.length > 0) {
        return { track: result.tracks[0], result };
      }
    } catch (e) {
      console.log(`[Search] URL failed for "${query}":`, e.message || e);
    }
    return { track: null, result: null };
  }

  // Default: try multiple sources
  const sources = ['ytmsearch', 'ytsearch', 'scsearch'];
  for (const src of sources) {
    try {
      const result = await player.search({ query: `${src}:${query}` }, requesterId);
      if (result.tracks && result.tracks.length > 0) {
        return { track: result.tracks[0], result };
      }
    } catch (e) {
      console.log(`[Search] ${src} failed for "${query}":`, e.message || e);
    }
  }
  return { track: null, result: null };
}

/**
 * Check if a player is actively playing or has a current track.
 */
function isPlaying(player) {
  return player && (player.playing || player.queue?.current);
}

/**
 * Get the total queue length (current + upcoming).
 */
function queueLength(player) {
  if (!player) return 0;
  let count = player.queue?.tracks?.length || 0;
  if (player.queue?.current) count++;
  return count;
}

/**
 * Get the current track (the one playing now).
 * In lavalink-client: player.queue.current
 */
function currentTrack(player) {
  return player?.queue?.current || null;
}

/**
 * Get track title (handles both lavalink-client track formats).
 */
function trackTitle(track) {
  if (!track) return "Unknown";
  return track.info?.title || track.title || "Unknown";
}

/**
 * Get track URI.
 */
function trackUri(track) {
  if (!track) return "";
  return track.info?.uri || track.uri || "";
}

/**
 * Get track duration in ms.
 */
function trackDuration(track) {
  if (!track) return 0;
  return track.info?.length || track.info?.duration || track.duration || 0;
}

/**
 * Get track author.
 */
function trackAuthor(track) {
  if (!track) return "Unknown";
  return track.info?.author || track.author || "Unknown";
}

/**
 * Get track artwork URL.
 */
function trackThumbnail(track) {
  if (!track) return null;
  return track.info?.artworkUrl || track.thumbnail || null;
}

/**
 * Get track requester (the user/member who requested).
 */
function trackRequester(track) {
  return track?.requester || null;
}

module.exports = {
  SOURCES,
  getPlayer,
  getOrCreatePlayer,
  searchTrack,
  isPlaying,
  queueLength,
  currentTrack,
  trackTitle,
  trackUri,
  trackDuration,
  trackAuthor,
  trackThumbnail,
  trackRequester,
};
