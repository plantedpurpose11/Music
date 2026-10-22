const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { PassThrough } = require('node:stream');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const https = require('node:https');
const Enmap = require('enmap');
const { MessageEmbed } = require('discord.js');
const { searchTrack } = require('../handlers/playerHelpers');
const { storeBanner, musicBanner, refreshMusicBanner } = require('../handlers/musicBanner');
const { lyricsPayload, replyWithLyrics } = require('../handlers/lyrics');
const nodesCommand = require('../commands/Info/nodes');
const bannerCommand = require('../commands/Settings/setbanner');

const track = title => ({ encoded: 'synthetic-track', info: { title, author: 'Artist' } });
const results = tracks => ({ tracks, loadType: 'search' });

test('search chooses a lower original result over karaoke, remix and cover', async () => {
  const original = track('Artist Song (Official Audio)');
  const player = { search: async () => results([track('Song Karaoke'), track('Song Remix'), track('Song Cover'), original]) };
  assert.equal((await searchTrack(player, 'Artist Song', 'listener')).track, original);
});

test('backup search continues across unavailable and alternate-only providers', async () => {
  const original = track('Song');
  const queries = [];
  const requester = { id: 'listener' };
  const player = { search: async ({ query }, user) => {
    queries.push(query);
    assert.equal(user, requester);
    if (query.startsWith('ytm')) throw new Error('Synthetic node source failure');
    return results([query.startsWith('ytsearch') ? track('Song Karaoke') : original]);
  } };
  assert.equal((await searchTrack(player, 'Song', requester)).track, original);
  assert.deepEqual(queries, ['ytmsearch:Song', 'ytsearch:Song', 'scsearch:Song']);
});

test('explicit remix requests rank by relevance and retain the remix', async () => {
  const remix = track('Song Remix');
  assert.equal((await searchTrack({ search: async () => results([track('Song'), remix]) }, 'Song Remix')).track, remix);
});

test('unrelated originals do not replace matching alternates; alternates remain a last resort', async () => {
  const karaoke = track('Song Karaoke');
  const player = { search: async () => results([karaoke, track('Unrelated title')]) };
  assert.equal((await searchTrack(player, 'Song')).track, karaoke);
  assert.equal((await searchTrack({ search: async () => results([]) }, 'Song')).track, null);
});

test('URLs and playlists preserve their first track and playlist data', async () => {
  const tracks = [track('Song Remix'), track('Song')];
  const player = { search: async ({ query }) => {
    assert.equal(query, 'https://example.test/playlist');
    return { tracks, loadType: 'playlist' };
  } };
  const match = await searchTrack(player, 'https://example.test/playlist', null, 'youtube');
  assert.equal(match.track, tracks[0]);
  assert.equal(match.tracks, tracks);
  assert.equal(match.loadType, 'playlist');
});

test('explicit sources do not spill into other providers', async () => {
  const queries = [];
  await searchTrack({ search: async ({ query }) => { queries.push(query); return results([track('Song Cover')]); } }, 'Song', null, 'soundcloud');
  assert.deepEqual(queries, ['scsearch:Song']);
});

function mockDownload(t, bytes, statusCode = 200) {
  const original = https.get;
  https.get = (url, callback) => {
    const request = new EventEmitter();
    request.destroy = error => { request.emit('error', error); request.emit('close'); };
    process.nextTick(() => {
      const response = new PassThrough();
      response.statusCode = statusCode;
      callback(response);
      response.end(bytes);
      response.on('end', () => request.emit('close'));
    });
    return request;
  };
  t.after(() => { https.get = original; });
}
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
const attachment = { url: 'https://cdn.discordapp.com/attachments/synthetic/banner.png?ex=expired-later', size: png.length };

test('banner image bytes survive database close/reopen and are attached without the CDN URL', async t => {
  mockDownload(t, png);
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'music-banner-test-'));
  let settings = new Enmap({ name: 'settings', dataDir: directory });
  t.after(() => { settings.close(); fs.rmSync(directory, { recursive: true, force: true }); });
  settings.set('guild', {});
  await storeBanner({ settings }, 'guild', attachment);
  settings.close();
  settings = new Enmap({ name: 'settings', dataDir: directory });
  const banner = musicBanner({ settings }, 'guild');
  assert.equal(banner.image, 'attachment://music-banner.png');
  assert.deepEqual(banner.files[0].attachment, png);
  assert.equal(settings.get('guild', 'musicBanner').data.includes('discordapp'), false);
  assert.equal(settings.get('guild', 'musicBanner').type, 'png');
});

test('invalid, oversized, and non-Discord attachments cannot replace the saved banner', async t => {
  let saved = false;
  const client = { settings: { set: () => { saved = true; } } };
  await assert.rejects(storeBanner(client, 'g', { ...attachment, size: 6 * 1024 * 1024 }), /5 MiB/);
  await assert.rejects(storeBanner(client, 'g', { ...attachment, url: 'https://localhost/private' }), /attach/);
  mockDownload(t, Buffer.from('<svg>not supported</svg>'));
  await assert.rejects(storeBanner(client, 'g', attachment), /PNG/);
  assert.equal(saved, false);
});

test('banner download enforces the size limit even if attachment metadata lies', async t => {
  mockDownload(t, Buffer.alloc(5 * 1024 * 1024 + 1));
  await assert.rejects(storeBanner({ settings: { set: () => assert.fail('must not save') } }, 'g', attachment), /5 MiB/);
});

test('idle panel refresh uploads saved image and replaces old attachments', async () => {
  let edited;
  const message = { embeds: [new MessageEmbed().setTitle('Queue'), new MessageEmbed().setTitle('Panel')], edit: async payload => { edited = payload; } };
  const client = { settings: { get: (id, key) => key === 'music' ? { channel: 'c', message: 'm' } : { type: 'png', data: png.toString('base64') } },
    channels: { cache: new Map([['c', { messages: { fetch: async () => message } }]]) } };
  await refreshMusicBanner(client, 'g');
  assert.deepEqual(edited.attachments, []);
  assert.equal(edited.embeds[1].image.url, 'attachment://music-banner.png');
  assert.deepEqual(edited.files[0].attachment, png);
  client.manager = { players: new Map([['g', { queue: { current: track('Song') } }]]) };
  edited = null;
  await refreshMusicBanner(client, 'g');
  assert.equal(edited, null);
});

test('banner command requires admin and supports reset and legacy URLs', async () => {
  const writes = [];
  const client = { settings: { get: () => '~', set: (...args) => writes.push(args) } };
  const message = { guild: { id: 'g' }, member: { permissions: { has: () => false } }, reply: async content => content, attachments: { first: () => null } };
  assert.match(await bannerCommand.run(client, message, []), /Administrator/);
  assert.equal(writes.length, 0);
  message.member.permissions.has = () => true;
  await bannerCommand.run(client, message, ['none']);
  assert.deepEqual(writes[0], ['g', null, 'musicBanner']);
  await bannerCommand.run(client, message, ['https://example.test/banner.png']);
  assert.equal(writes[1][1], 'https://example.test/banner.png');
  assert.equal(musicBanner({ settings: { get: () => writes[1][1] } }, 'g').image, writes[1][1]);
});

test('node health includes offline nodes and counts only this bot\'s active guilds', async () => {
  const online = { id: 'Online', connected: true, stats: { playingPlayers: 999 } };
  const offline = { id: 'Offline', connected: false };
  const players = [{ node: online, playing: true }, { node: online, playing: true, paused: true }, { node: online, playing: false }, { node: offline, playing: true }];
  let payload;
  await nodesCommand.run({ manager: { nodeManager: { nodes: new Map([['a', online], ['b', offline]]) }, players: new Map(players.map((p, i) => [i, p])) } }, { reply: async p => { payload = p; } });
  assert.match(payload.embeds[0].description, /Online.*playing for \*\*1\*\*/);
  assert.match(payload.embeds[0].description, /Offline.*playing for \*\*0\*\*/);
  assert.doesNotMatch(payload.embeds[0].description, /999/);
});

test('lyrics calls Lavalink for the actual track, supports timed lines and attaches full long text', async () => {
  const song = track('Song');
  const player = { queue: { current: song }, getLyrics: async requested => {
    assert.equal(requested, song);
    return { text: null, lines: [{ line: 'First line' }, { line: 'Second line' }] };
  } };
  assert.equal((await lyricsPayload(player)).embeds[0].description, 'First line\nSecond line');
  const text = 'Full lyrics\n'.repeat(500);
  player.getLyrics = async () => ({ text });
  const payload = await lyricsPayload(player);
  assert.ok(payload.embeds[0].description.length <= 4096);
  assert.equal(payload.files[0].attachment.toString(), text);
  player.getLyrics = async () => null;
  assert.match((await lyricsPayload(player)).content, /No lyrics/);
  player.getLyrics = async () => { throw new Error('Synthetic missing lyrics plugin'); };
  assert.match((await lyricsPayload(player)).content, /LavaLyrics/);
  assert.match((await lyricsPayload(null)).content, /No music/);
});

test('lyrics buttons defer before fetching and restrict access to listeners in the same voice channel', async () => {
  const calls = [];
  const player = { voiceChannelId: 'v', queue: { current: track('Song') }, getLyrics: async () => { calls.push('fetch'); return { text: 'Lyrics' }; } };
  const interaction = { member: { voice: { channelId: 'v' } }, deferReply: async p => { assert.equal(p.ephemeral, true); calls.push('defer'); }, editReply: async () => calls.push('edit'), reply: async () => calls.push('deny') };
  await replyWithLyrics(interaction, player);
  assert.deepEqual(calls, ['defer', 'fetch', 'edit']);
  interaction.member.voice.channelId = 'other';
  await replyWithLyrics(interaction, player);
  assert.equal(calls.at(-1), 'deny');
});

test('active Lavalink panel enables Lyrics, routes clicks, and restores stored banners on idle', async t => {
  require('colors');
  const register = require('../handlers/lavalinkEvent');
  const interval = global.setInterval;
  global.setInterval = () => 0;
  const previousIdleInterval = global.idleCheckInterval;
  t.after(() => {
    if (previousIdleInterval === undefined) delete global.idleCheckInterval;
    else global.idleCheckInterval = previousIdleInterval;
  });
  const edits = [];
  const banner = { type: 'png', data: png.toString('base64') };
  const channel = { id: 'c', messages: { fetch: async () => ({ edit: async payload => { edits.push(payload); } }) } };
  const guild = { id: 'g', name: 'Test guild', iconURL: () => null, members: { me: { voice: { deaf: true } } }, channels: { cache: new Map([['c', channel]]) } };
  const client = new EventEmitter();
  client.manager = new EventEmitter();
  client.allEmojis = { x: '❌' };
  client.guilds = { cache: new Map([['g', guild]]) };
  client.channels = { cache: new Map([['c', channel]]) };
  const settings = { music: { channel: 'c', message: 'm' }, musicBanner: banner, 'music.channel': 'c', 'music.message': 'm' };
  client.settings = { get: (id, key) => settings[key], set: () => {} };
  const song = track('Song');
  song.info.uri = 'https://example.test/song';
  const player = { guildId: 'g', textChannelId: 'c', voiceChannelId: 'v', queue: { current: song, tracks: [] }, volume: 50, getLyrics: async () => ({ text: 'Panel lyrics' }) };
  client.manager.players = new Map([['g', player]]);
  try { register(client); } finally { global.setInterval = interval; }
  await client.manager.listeners('trackStart')[0](player, song);
  const button = edits[0].components.flatMap(row => row.components).find(component => component.customId === '10');
  assert.ok(button);
  assert.equal(button.disabled, false);
  const replies = [];
  const interaction = { guild, channel, message: { id: 'm' }, member: { voice: { channelId: 'v', channel: { id: 'v' } } }, customId: '10', isButton: () => true, isSelectMenu: () => false,
    deferReply: async () => replies.push('deferred'), editReply: async payload => replies.push(payload) };
  await client.listeners('interactionCreate')[0](interaction);
  assert.equal(replies[0], 'deferred');
  assert.equal(replies[1].embeds[0].description, 'Panel lyrics');
  player.queue.current = null;
  await client.manager.listeners('trackEnd')[0](player);
  assert.equal(edits.at(-1).embeds[1].image.url, 'attachment://music-banner.png');
  assert.deepEqual(edits.at(-1).files[0].attachment, png);
});


test('prefix setupmusic creates a panel with uploaded banner bytes and persists panel IDs', async () => {
  const command = require('../commands/Settings/setupmusic');
  let sent;
  const writes = [];
  const channel = { id: 'c', send: async payload => { sent = payload; return { id: 'm', createdTimestamp: 1 }; } };
  const guild = { id: 'g', name: 'Test guild', iconURL: () => null };
  const client = { allEmojis: { check_mark: '✅' }, settings: { get: () => ({ type: 'png', data: png.toString('base64') }), set: (...args) => writes.push(args) } };
  const message = { guild, member: { guild }, mentions: { channels: { first: () => channel } }, reply: async content => content };
  assert.match(await command.run(client, message, []), /Successfully/);
  assert.deepEqual(sent.files[0].attachment, png);
  assert.equal(sent.embeds[1].image.url, 'attachment://music-banner.png');
  assert.deepEqual(writes, [['g', 'c', 'music.channel'], ['g', 'm', 'music.message'], ['g', 1, 'music.panelTime']]);
});
