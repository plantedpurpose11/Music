const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { LavalinkManager } = require('lavalink-client');
const { waitForPlayerReady, getOrCreatePlayer } = require('../handlers/playerHelpers');
const createVoiceForwarder = require('../handlers/lavalinkVoice');

const botId = '123456789012345678';
const guildId = '234567890123456789';
const voiceId = '345678901234567890';
const textId = '456789012345678901';

test('connected Lavalink players are ready without a nonexistent state property', async () => {
  assert.equal(await waitForPlayerReady({ connected: true }), true);
});

test('readiness waits for Lavalink acknowledgement and returns false on a real timeout', async () => {
  const player = { connected: false };
  setTimeout(() => { player.connected = true; }, 10);
  assert.equal(await waitForPlayerReady(player, 1000), true);
  assert.equal(await waitForPlayerReady({ connected: false }, 5), false);
});

test('new players request unmuted voice and existing disconnected players reconnect', async () => {
  const player = { connected: false, connect: async () => { player.connected = true; } };
  let options;
  const client = { manager: { getPlayer: () => null, createPlayer: opts => { options = opts; return player; } } };
  assert.equal(await getOrCreatePlayer(client, guildId, voiceId, textId), player);
  assert.equal(options.selfMute, false);
  assert.equal(options.selfDeaf, true);
  player.connected = false;
  client.manager.getPlayer = () => player;
  client.manager.createPlayer = () => assert.fail('must reuse player');
  assert.equal(await getOrCreatePlayer(client, guildId, voiceId, 'new-text-channel'), player);
  assert.equal(player.connected, true);
  assert.equal(player.textChannelId, 'new-text-channel');
});

test('a timed-out new connection is rejected and removed instead of continuing to playback', async t => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 100000 });
  let destroyed = false;
  const player = { connected: false, connect: async () => {}, destroy: async () => { destroyed = true; } };
  const client = { manager: { getPlayer: () => null, createPlayer: () => player } };
  const connection = getOrCreatePlayer(client, guildId, voiceId, textId);
  const rejection = assert.rejects(connection, /did not establish/);
  await Promise.resolve();
  t.mock.timers.tick(15000);
  await rejection;
  assert.equal(destroyed, true);
});

test('existing-player connection errors preserve the queue and reach the caller', async () => {
  let destroyed = false;
  const player = { connected: false, queue: { tracks: ['queued-song'] }, connect: async () => { throw new Error('Synthetic voice failure'); }, destroy: async () => { destroyed = true; } };
  await assert.rejects(getOrCreatePlayer({ manager: { getPlayer: () => player } }, guildId, voiceId, textId), /Synthetic voice failure/);
  assert.deepEqual(player.queue.tracks, ['queued-song']);
  assert.equal(destroyed, false);
});

function voiceFixture() {
  // Real lavalink-client packet processing; only the remote node transport is stubbed.
  const requests = [];
  const manager = new LavalinkManager({ nodes: [], client: { id: botId }, sendToShard: () => {} });
  manager.initiated = true;
  const player = { guildId, voiceChannelId: voiceId, voice: { sessionId: null, channelId: null }, voiceState: {}, options: {},
    getData: () => false, node: { sessionId: 'synthetic-node-session', updatePlayer: async data => requests.push(data) } };
  manager.players.set(guildId, player);
  const forward = createVoiceForwarder({ manager, user: { id: botId } });
  const server = { t: 'VOICE_SERVER_UPDATE', d: { guild_id: guildId, token: 'synthetic-token', endpoint: 'synthetic-voice.invalid' } };
  const state = { t: 'VOICE_STATE_UPDATE', d: { guild_id: guildId, user_id: botId, channel_id: voiceId, session_id: 'synthetic-voice-session', self_mute: false } };
  return { requests, manager, player, forward, server, state };
}

for (const serverFirst of [true, false]) {
  test(`Discord voice handshake reaches Lavalink when ${serverFirst ? 'server' : 'state'} packet arrives first`, async () => {
    const { requests, forward, server, state } = voiceFixture();
    await forward(serverFirst ? server : state);
    await forward(serverFirst ? state : server);
    assert.equal(requests.length, 1);
    assert.deepEqual(requests[0].playerOptions.voice, { token: 'synthetic-token', endpoint: 'synthetic-voice.invalid', sessionId: 'synthetic-voice-session', channelId: voiceId });
  });
}

test('other members cannot flush a pending bot handshake; latest server credentials win', async () => {
  const { requests, forward, server, state } = voiceFixture();
  await forward(server);
  await forward({ ...server, d: { ...server.d, token: 'new-synthetic-token' } });
  await forward({ ...state, d: { ...state.d, user_id: '999999999999999999' } });
  assert.equal(requests.length, 0);
  await forward(state);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].playerOptions.voice.token, 'new-synthetic-token');
  await forward({ ...state, d: { ...state.d, self_deaf: true } });
  assert.equal(requests.length, 1);
});

test('pending server packets are discarded when their player is replaced', async () => {
  const { requests, manager, player, forward, server, state } = voiceFixture();
  await forward(server);
  manager.players.set(guildId, { ...player, voice: { sessionId: null, channelId: null } });
  await forward(state);
  assert.equal(requests.length, 0);
});

test('voice transport errors propagate without logging raw voice credentials', async () => {
  const { player, forward, server, state } = voiceFixture();
  await forward(server);
  player.node.updatePlayer = async () => { throw new Error('Synthetic Lavalink voice transport failure'); };
  await assert.rejects(forward(state), /voice transport failure/);
});

function requestFixture() {
  const replies = [];
  const player = { connected: true, playing: false, paused: false, voiceChannelId: voiceId, queue: { add: async () => {} },
    search: async () => ({ tracks: [{ encoded: 'synthetic-track', info: { title: 'Song', author: 'Artist' } }], loadType: 'search' }),
    play: async () => { throw new Error('Synthetic playback rejection'); } };
  const client = { user: { id: botId }, allEmojis: { x: '❌' }, manager: { getPlayer: () => player }, settings: { ensure: () => {}, get: (id, key) => key === 'prefix' ? '~' : textId } };
  const voiceChannel = { id: voiceId, userLimit: 0 };
  const guild = { id: guildId, members: { me: { voice: { channel: voiceChannel } } } };
  const message = { guildId, guild, channel: { id: textId }, author: { bot: false }, content: 'Song', member: { voice: { channelId: voiceId, channel: voiceChannel } },
    delete: async () => {}, reply: async payload => { replies.push(payload); return { edit: async edit => { replies.push(edit); } }; } };
  return { client, message, replies };
}

test('music request panel catches rejected playback instead of leaving an unhandled promise', async () => {
  const { client, message, replies } = requestFixture();
  await require('../events/guild/messageCreate')(client, message);
  assert.equal(replies.length, 1);
  assert.match(replies[0], /Synthetic playback rejection/);
});

test('prefix play replaces Searching with the actual playback failure', async () => {
  const { client, message, replies } = requestFixture();
  await require('../commands/Music/play').run(client, message, ['Song']);
  assert.equal(replies.length, 2);
  assert.match(replies[0].content, /Searching/);
  assert.match(replies[1].content, /Could not start playback.*Synthetic playback rejection/);
});

test('Lavalink track and socket failures reach the channel with mentions disabled', async t => {
  require('colors');
  const register = require('../handlers/lavalinkEvent');
  const interval = global.setInterval;
  const previousIdle = global.idleCheckInterval;
  global.setInterval = () => 0;
  const notices = [];
  const client = new EventEmitter();
  client.manager = new EventEmitter();
  client.channels = { cache: new Map([[textId, { send: async payload => { notices.push(payload); return {}; } }]]) };
  client.settings = { get: () => '' };
  try { register(client); } finally { global.setInterval = interval; }
  t.after(() => { if (previousIdle === undefined) delete global.idleCheckInterval; else global.idleCheckInterval = previousIdle; });
  const player = () => ({ guildId, textChannelId: textId, node: { id: 'synthetic-node' } });
  const song = { info: { title: 'Song' } };
  client.manager.emit('trackError', player(), song, { exception: { message: 'Synthetic provider blocked stream' } });
  client.manager.emit('trackStuck', player(), song, {});
  client.manager.emit('playerSocketClosed', player(), { code: 4006, reason: 'Synthetic session failure' });
  assert.equal(notices.length, 3);
  assert.match(notices[0].content, /provider blocked stream/);
  assert.match(notices[1].content, /stopped supplying audio/);
  assert.match(notices[2].content, /4006/);
  for (const notice of notices) assert.deepEqual(notice.allowedMentions, { parse: [] });
});
