const { rankSearchTracks, trackTitle, trackAuthor, trackDuration, trackUri } = require('./playerHelpers');

const BACKUP_SOURCES = ['soundcloud', 'bandcamp'];
const PREFIXES = { soundcloud: 'scsearch', bandcamp: 'bcsearch' };
const SOURCE_NAMES = { youtube: 'YouTube', soundcloud: 'SoundCloud', bandcamp: 'Bandcamp' };

function isYoutube(track) {
  return track?.info?.sourceName === 'youtube' || /(?:youtube\.com|youtu\.be)\//i.test(trackUri(track));
}

function sourceLabel(track) {
  return SOURCE_NAMES[track?.info?.sourceName] || (isYoutube(track) ? 'YouTube' : 'Lavalink');
}

function recording(track) {
  return track.userData?.musicFallback?.original || {
    title: trackTitle(track), author: trackAuthor(track), duration: trackDuration(track),
  };
}

function clean(text) {
  return String(text).replace(/\b(?:official\s+(?:music\s+)?(?:video|audio)|lyrics?\s+video)\b/gi, '')
    .replace(/\s*-?\s*Topic$/i, '').replace(/VEVO$/i, '').toLowerCase();
}

function words(text) {
  return clean(text).match(/[\p{L}\p{N}]+/gu) || [];
}

function suitable(track, original) {
  const titleWords = words(original.title);
  const authorWords = words(original.author);
  if (!titleWords.length || !authorWords.length || original.author === 'Unknown') return false;
  const title = new Set(words(trackTitle(track)));
  const label = new Set(words(`${trackTitle(track)} ${trackAuthor(track)}`));
  if (titleWords.filter(word => title.has(word)).length / titleWords.length < 0.8) return false;
  if (authorWords.filter(word => label.has(word)).length / authorWords.length < 0.6) return false;
  const duration = trackDuration(track);
  return !original.duration || !duration || Math.abs(duration - original.duration) <= Math.max(15000, original.duration * 0.1);
}

function canRecover(track) {
  return !!track && (isYoutube(track) || !!track.userData?.musicFallback);
}

module.exports = function createPlaybackRecovery(client, reportError) {
  const pending = new WeakMap();

  async function recover(player, failed) {
    if (!canRecover(failed)) return false;
    if (pending.has(player)) {
      const state = pending.get(player);
      return state.failed === failed ? state.promise : state.promise.then(() => recover(player, failed));
    }
    // Retry only when the queue has ended. Lavalink keeps its normal queue
    // advancement, and recovery must never replace a queued or newly requested song.
    if (player.queue.current) return true;
    const state = { failed };
    pending.set(player, state);
    const active = () => client.manager.getPlayer(player.guildId) === player && player.queue.current === null;
    state.promise = (async () => {
      const original = recording(failed);
      const attempted = new Set(failed.userData?.musicFallback?.attempted || []);
      const lookupErrors = [];
      const startErrors = [];
      const query = `${clean(original.author)} ${clean(original.title)}`.trim();
      for (const source of BACKUP_SOURCES) {
        if (attempted.has(source)) continue;
        attempted.add(source);
        if (player.node.info?.sourceManagers && !player.node.info.sourceManagers.includes(source)) continue;
        let candidate;
        try {
          const result = await player.search({ query: `${PREFIXES[source]}:${query}` }, failed.requester);
          if (!active()) return true; // Stop, Skip, or a new request took over.
          if (result?.loadType === 'error') {
            throw new Error(result.exception?.message || 'Provider lookup failed');
          }
          candidate = rankSearchTracks(result?.tracks || [], query).find(item =>
            item.penalty === 0 && item.track.info?.sourceName === source && suitable(item.track, original)
          )?.track;
          if (!candidate) continue;
          candidate.requester = failed.requester;
          candidate.userData = { ...candidate.userData, musicFallback: { original, attempted: [...attempted] } };
          await player.play({ clientTrack: candidate, noReplace: true, position: 0, paused: player.paused });
          console.log(`[Lavalink Recovery] guild=${player.guildId}: retrying ${original.title} on ${source}`);
          return true;
        } catch (error) {
          console.error(`[Lavalink Recovery] ${source}: ${error.message}`);
          if (client.manager.getPlayer(player.guildId) !== player) return true;
          if (player.queue.current !== null) {
            if (player.queue.current === candidate) {
              reportError(player, `${sourceLabel(candidate)} backup could not be started. Contact your Lavalink host if this persists.`);
            }
            return true;
          }
          (candidate ? startErrors : lookupErrors).push(SOURCE_NAMES[source]);
        }
      }
      if (!active()) return true;
      const lookupDetail = lookupErrors.length ? ` Backup lookup failed on ${lookupErrors.join(' and ')}.` : '';
      const startDetail = startErrors.length ? ` Backup playback could not start on ${startErrors.join(' and ')}.` : '';
      const backup = failed.userData?.musicFallback ? ' backup' : '';
      reportError(player, `${sourceLabel(failed)}${backup} could not supply audio. No playable matching backup was available.${lookupDetail}${startDetail} Contact your Lavalink host about these source errors.`);
      return false;
    })();
    try { return await state.promise; } finally { pending.delete(player); }
  }

  return { canRecover, recover, sourceLabel };
};
