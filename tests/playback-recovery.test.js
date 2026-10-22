const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { LavalinkManager } = require('lavalink-client');
const createRecovery = require('../handlers/playbackRecovery');

const song = (sourceName = 'youtube', title = 'In My Head', author = 'Artist', duration = 180000) => ({
  encoded: `${sourceName}:${title}:${author}:${duration}`,
  info: { title, author, duration, sourceName, uri: `https://${sourceName}.test/song` },
  requester: { id: 'synthetic-listener' }, userData: {},
});

function fixture(search) {
  const notices = [];
  const played = [];
  const player = { guildId: 'g', queue: { current: null, tracks: [] }, node: { info: { sourceManagers: ['soundcloud', 'bandcamp'] } }, search,
    play: async options => { played.push(options); player.queue.current = options.clientTrack; } };
  const players = new Map([['g', player]]);
  const client = { manager: { getPlayer: id => players.get(id) } };
  return { player, players, played, notices, recovery: createRecovery(client, (p, detail) => notices.push(detail)) };
}

test('failed YouTube stream retries a matching original and preserves requester', async () => {
  const original = song();
  const candidate = song('soundcloud');
  const queries = [];
  const f = fixture(async ({ query }, requester) => {
    queries.push(query);
    assert.equal(requester, original.requester);
    return { tracks: [song('soundcloud', 'In My Head Karaoke'), song('soundcloud', 'In My Head Remix'), candidate] };
  });
  assert.equal(await f.recovery.recover(f.player, original), true);
  assert.deepEqual(queries, ['scsearch:artist in my head']);
  assert.equal(f.played[0].clientTrack, candidate);
  assert.equal(candidate.requester, original.requester);
  assert.equal(f.played[0].noReplace, true);
  assert.deepEqual(candidate.userData.musicFallback.attempted, ['soundcloud']);
});

test('backup search rejects wrong artists, titles, long mixes, covers and preview clips', async () => {
  const queries = [];
  const candidate = song('bandcamp');
  const f = fixture(async ({ query }) => {
    queries.push(query);
    return { tracks: query.startsWith('bcsearch:') ? [candidate] : [
      song('soundcloud', 'In My Head', 'Another Singer'),
      song('soundcloud', 'Different Song'),
      song('soundcloud', 'In My Head Mix', 'Artist', 3600000),
      song('soundcloud', 'In My Head Cover'),
      song('soundcloud', 'In My Head', 'Artist', 30000),
    ] };
  });
  assert.equal(await f.recovery.recover(f.player, song()), true);
  assert.equal(f.played[0].clientTrack, candidate);
  assert.equal(queries.length, 2);
  assert.deepEqual(candidate.userData.musicFallback.attempted, ['soundcloud', 'bandcamp']);
});

test('each backup provider is tried once across repeated stream failures', async () => {
  const queries = [];
  const f = fixture(async ({ query }) => {
    queries.push(query);
    return { tracks: [song(query.startsWith('scsearch:') ? 'soundcloud' : 'bandcamp')] };
  });
  await f.recovery.recover(f.player, song());
  let failed = f.player.queue.current;
  f.player.queue.current = null;
  await f.recovery.recover(f.player, failed);
  failed = f.player.queue.current;
  f.player.queue.current = null;
  assert.equal(await f.recovery.recover(f.player, failed), false);
  assert.equal(queries.length, 2);
  assert.equal(f.played.length, 2);
  assert.equal(f.notices.length, 1);
  assert.match(f.notices[0], /no suitable backup/);
});

test('provider errors are bounded and do not trigger another YouTube lookup', async () => {
  const queries = [];
  const f = fixture(async ({ query }) => { queries.push(query); throw new Error('Synthetic provider error'); });
  assert.equal(await f.recovery.recover(f.player, song()), false);
  assert.equal(queries.length, 2);
  assert.equal(f.played.length, 0);
  assert.equal(f.notices.length, 1);
});

for (const action of ['stop', 'new request']) {
  test(`a ${action} cancels pending fallback without replacing playback`, async () => {
    let finishSearch;
    const f = fixture(() => new Promise(resolve => { finishSearch = resolve; }));
    const result = f.recovery.recover(f.player, song());
    const newSong = song('http', 'New request');
    if (action === 'stop') f.players.delete('g');
    else f.player.queue.current = newSong;
    finishSearch({ tracks: [song('soundcloud')] });
    assert.equal(await result, true);
    assert.equal(f.played.length, 0);
    assert.equal(f.notices.length, 0);
    if (action === 'new request') assert.equal(f.player.queue.current, newSong);
  });
}

test('duplicate recovery events share one backup search', async () => {
  let finishSearch;
  let calls = 0;
  const f = fixture(() => { calls++; return new Promise(resolve => { finishSearch = resolve; }); });
  const failed = song();
  const first = f.recovery.recover(f.player, failed);
  const duplicate = f.recovery.recover(f.player, failed);
  finishSearch({ tracks: [song('soundcloud')] });
  assert.deepEqual(await Promise.all([first, duplicate]), [true, true]);
  assert.equal(calls, 1);
  assert.equal(f.played.length, 1);
});

test('unrelated provider failures do not trigger YouTube recovery', async () => {
  const f = fixture(() => assert.fail('must not search'));
  assert.equal(await f.recovery.recover(f.player, song('http')), false);
  f.player.queue.current = song('http', 'Queued song');
  assert.equal(await f.recovery.recover(f.player, song()), true);
  assert.equal(f.played.length, 0);
});

test('explicit remix requests remain eligible for matching remix backups', async () => {
  const candidate = song('soundcloud', 'In My Head Remix');
  const f = fixture(async () => ({ tracks: [song('soundcloud'), candidate] }));
  await f.recovery.recover(f.player, song('youtube', 'In My Head Remix'));
  assert.equal(f.played[0].clientTrack, candidate);
});

function integration(t, queued = [], search) {
  require('colors');
  const tasks = [];
  const notices = [];
  const updates = [];
  const manager = new LavalinkManager({ nodes: [{ id: 'synthetic-node', host: '127.0.0.1', port: 2333, authorization: 'synthetic-password' }], sendToShard: () => {} });
  const node = manager.nodeManager.nodes.get('synthetic-node');
  node.info = { sourceManagers: ['soundcloud', 'bandcamp'] };
  node.updatePlayer = async data => { updates.push(data); };
  const player = manager.createPlayer({ guildId: 'g', voiceChannelId: 'v', textChannelId: 'c', node });
  player.connected = true;
  player.search = search;
  player.queue.current = song();
  player.queue.tracks.push(...queued);
  player.destroy = async () => { manager.players.delete('g'); };
  const client = new EventEmitter();
  client.manager = manager;
  client.guilds = { cache: new Map() };
  client.channels = { cache: new Map([['c', { send: async payload => { notices.push(payload); return {}; } }]]) };
  client.settings = { get: () => '' };
  const on = manager.on;
  manager.on = function(event, listener) {
    return on.call(this, event, (...args) => {
      const result = listener(...args);
      if (result?.then) tasks.push(result);
      return result;
    });
  };
  const interval = global.setInterval;
  const oldIdle = global.idleCheckInterval;
  global.setInterval = () => 0;
  try { require('../handlers/lavalinkEvent')(client); } finally { global.setInterval = interval; }
  t.after(() => { if (oldIdle === undefined) delete global.idleCheckInterval; else global.idleCheckInterval = oldIdle; });
  const failed = player.queue.current;
  const fail = async () => {
    await node.trackError(player, failed, { exception: { message: '(yts.version: 1.18.1) All clients failed to load the item.\nClient [TVHTML5] failed\n\tat Java.trace()' } });
    await node.trackEnd(player, failed, { type: 'TrackEndEvent', reason: 'loadFailed' });
    await Promise.all(tasks);
  };
  return { player, manager, node, failed, fail, notices, updates };
}

test('real Lavalink loadFailed lifecycle retries the last track before queue cleanup', async t => {
  const candidate = song('soundcloud');
  const f = integration(t, [], async () => ({ tracks: [candidate] }));
  await f.fail();
  assert.equal(f.manager.options.autoSkip, true);
  assert.equal(f.player.queue.current, candidate);
  assert.equal(f.updates.length, 1);
  assert.equal(f.updates[0].playerOptions.track.encoded, candidate.encoded);
  assert.equal(f.notices.length, 0);
  assert.equal(f.manager.getPlayer('g'), f.player);
});

test('real Lavalink keeps queued songs advancing and reports concise YouTube errors', async t => {
  const next = song('http', 'Next queued song');
  const f = integration(t, [next], () => assert.fail('must not interrupt queued playback with backup search'));
  await f.fail();
  assert.equal(f.player.queue.current, next);
  assert.equal(f.updates.length, 1);
  assert.equal(f.updates[0].playerOptions.track.encoded, next.encoded);
  assert.equal(f.notices.length, 1);
  assert.match(f.notices[0].content, /Continuing with the queued songs/);
  assert.doesNotMatch(f.notices[0].content, /Java|TVHTML5|\nat/);
  assert.ok(f.notices[0].content.length <= 450);
});

test('exhausted backups do not restart YouTube autoplay in a failure loop', async t => {
  const queries = [];
  const f = integration(t, [], async ({ query }) => { queries.push(query); return { tracks: [] }; });
  f.player.set('autoplay', true);
  await f.fail();
  assert.equal(queries.length, 2);
  assert.ok(queries.every(query => /^(scsearch|bcsearch):/.test(query)));
  assert.equal(f.notices.length, 1);
  assert.match(f.notices[0].content, /Check the YouTube plugin/);
  assert.equal(f.updates.length, 0);
});

test('a fast failure of the backup is serialized after the in-flight attempt', async () => {
  const queries = [];
  const f = fixture(async ({ query }) => {
    queries.push(query);
    return { tracks: [song(query.startsWith('scsearch:') ? 'soundcloud' : 'bandcamp')] };
  });
  let followup;
  f.player.play = async options => {
    f.played.push(options);
    f.player.queue.current = options.clientTrack;
    if (options.clientTrack.info.sourceName === 'soundcloud') {
      f.player.queue.current = null;
      followup = f.recovery.recover(f.player, options.clientTrack);
    }
  };
  await f.recovery.recover(f.player, song());
  await followup;
  assert.equal(queries.length, 2);
  assert.equal(f.played.length, 2);
  assert.equal(f.player.queue.current.info.sourceName, 'bandcamp');
});

test('a rejected lookup after Stop does not send a stale failure notice', async () => {
  let rejectSearch;
  const f = fixture(() => new Promise((resolve, reject) => { rejectSearch = reject; }));
  const attempt = f.recovery.recover(f.player, song());
  f.players.delete('g');
  rejectSearch(new Error('Synthetic cancellation race'));
  assert.equal(await attempt, true);
  assert.equal(f.notices.length, 0);
});

test('missing artist metadata cannot select a same-title recording by a different artist', async () => {
  const f = fixture(async () => ({ tracks: [song('soundcloud')] }));
  assert.equal(await f.recovery.recover(f.player, song('youtube', 'In My Head', 'Unknown')), false);
  assert.equal(f.played.length, 0);
});

test('YouTube metadata decorations do not prevent matching the original recording', async () => {
  const candidate = song('soundcloud');
  const f = fixture(async () => ({ tracks: [candidate] }));
  assert.equal(await f.recovery.recover(f.player, song('youtube', 'In My Head (Official Music Video)', 'Artist - Topic')), true);
  assert.equal(f.played[0].clientTrack, candidate);
});
