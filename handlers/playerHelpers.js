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
 * Wait for player to be ready (voice connection established)
 */
async function waitForPlayerReady(player, maxWaitTime = 5000) {
  const startTime = Date.now();
  while (Date.now() - startTime < maxWaitTime) {
    if (player.connected && player.state !== undefined) {
      console.log(`[PlayerHelper] Player ready! connected: ${player.connected}, state: ${player.state}`);
      return true;
    }
    console.log(`[PlayerHelper] Waiting for player to be ready... connected: ${player.connected}, state: ${player.state}`);
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  console.warn(`[PlayerHelper] Timeout waiting for player to be ready. connected: ${player.connected}, state: ${player.state}`);
  return false;
}

/**
 * Get or create a player for the guild + voice channel.
 * Returns the player (already connected to voice).
 */
async function getOrCreatePlayer(client, guildId, voiceChannelId, textChannelId) {
  let player = getPlayer(client, guildId);
  if (!player) {
    console.log(`[PlayerHelper] Creating new player for guild: ${guildId}, voice: ${voiceChannelId}`);
    player = await client.manager.createPlayer({
      guildId,
      voiceChannelId,
      textChannelId,
      selfDeaf: true,
      selfMute: false,
    });
    console.log(`[PlayerHelper] Player created, now connecting...`);
    try {
      await player.connect();
      console.log(`[PlayerHelper] player.connect() returned`);
      console.log(`[PlayerHelper] Immediate state - connected: ${player.connected}, state: ${player.state}`);
      
      // Wait for the player to be fully ready
      const isReady = await waitForPlayerReady(player);
      if (!isReady) {
        console.warn(`[PlayerHelper] Player may not be fully ready, but proceeding anyway`);
      }
    } catch (e) {
      console.error(`[PlayerHelper] Failed to connect player:`, e);
      throw e;
    }
  } else {
    console.log(`[PlayerHelper] Player already exists for guild: ${guildId}`);
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

// Only penalize versions the listener did not explicitly request.
const ALTERNATE_VERSIONS = [
  /\bkaraoke\b/i, /\bremix(?:es)?\b/i, /\bcover(?:s)?\b/i,
  /\binstrumental\b/i, /\bnightcore\b/i, /\bslowed\b/i,
  /\bsped[ -]?up\b/i, /\btribute\b/i, /\blive\b/i,
];

function rankSearchTracks(tracks, query) {
  const words = text => String(text).toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
  const requested = words(query);
  const ranked = tracks.map((track, index) => {
    const title = trackTitle(track);
    const label = `${title} ${trackAuthor(track)}`;
    const penalty = ALTERNATE_VERSIONS.filter(pattern => pattern.test(label) && !pattern.test(query)).length;
    const tokens = new Set(words(label));
    const relevance = requested.length ? requested.filter(word => tokens.has(word)).length / requested.length : 0;
    return { track, penalty, relevance, score: relevance - penalty * 2, index };
  });
  // Do not replace a matching alternate with an unrelated title.
  const minimumRelevance = Math.max(...ranked.map(item => item.relevance)) * 0.65;
  return ranked.filter(item => item.relevance >= minimumRelevance)
    .sort((a, b) => b.score - a.score || a.index - b.index);
}

/**
 * Search for tracks using the player.
 * @param {object} player - lavalink-client player
 * @param {string} query - search query or URL
 * @param {object} requesterId - the member/user who requested
 * @param {string} [source] - force a specific source: 'youtube', 'youtubemusic', 'soundcloud', 'bandcamp'
 * Returns { track, result } or { track: null }.
 */
async function searchTrack(player, query, requesterId, source) {
  const direct = /^https?:\/\//i.test(query);
  const sources = direct ? [null] : source && SOURCES[source]
    ? [SOURCES[source]] : ['ytmsearch', 'ytsearch', 'scsearch', null];
  let fallback = null;
  let fallbackScore = -Infinity;
  for (const src of sources) {
    try {
      const result = await player.search({ query: src ? `${src}:${query}` : query }, requesterId);
      if (!result?.tracks?.length) continue;
      // Preserve explicit links and playlist order.
      if (direct || result.loadType === 'playlist' || result.loadType === 'PLAYLIST_LOADED') {
        return { track: result.tracks[0], result, tracks: result.tracks, loadType: result.loadType };
      }
      const best = rankSearchTracks(result.tracks, query)[0];
      const match = { track: best.track, result, tracks: result.tracks, loadType: result.loadType };
      if (best.penalty === 0) return match;
      // Keep searching other providers for an original before accepting an alternate version.
      if (best.score > fallbackScore) {
        fallback = match;
        fallbackScore = best.score;
      }
    } catch (error) {
      console.log(`[Search] ${src || 'raw query'} failed:`, error.message || error);
    }
  }
  return fallback || { track: null, result: null };
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
