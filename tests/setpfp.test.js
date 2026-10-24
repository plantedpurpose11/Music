const test = require('node:test');
const assert = require('node:assert/strict');
const https = require('node:https');
const { EventEmitter } = require('node:events');
const { PassThrough } = require('node:stream');
const { Client, Collection } = require('discord.js');
const command = require('../commands/Settings/setpfp');
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
const attachment = { url: 'https://cdn.discordapp.com/attachments/synthetic/avatar.png', size: png.length };

function download(t, bytes = png, status = 200) {
  t.mock.method(https, 'get', (url, callback) => {
    const request = new EventEmitter();
    request.destroy = error => { request.emit('error', error); request.emit('close'); };
    process.nextTick(() => {
      const response = new PassThrough();
      response.statusCode = status;
      callback(response);
      response.on('end', () => request.emit('close'));
      response.end(bytes);
    });
    return request;
  });
}

function fixture(t, response = { avatar: 'confirmed-guild-avatar' }) {
  // Use v13's real route builder. Only replace the HTTP transport.
  const client = new Client({ intents: [] });
  const calls = [];
  t.mock.method(client.rest, 'request', async (...args) => {
    calls.push(args);
    if (response instanceof Error) throw response;
    return response;
  });
  t.after(() => client.destroy());
  const replies = [];
  const me = { avatar: null };
  const message = {
    guild: { id: 'guild-one', members: { me } },
    member: { permissions: { has: () => true } },
    attachments: new Collection([['image', attachment]]),
    reply: async payload => { replies.push(payload); },
  };
  return { client, message, replies, calls, me };
}

test('prefix setpfp sends image bytes to v13 current member endpoint for only the requested guild', async t => {
  download(t);
  const f = fixture(t);
  f.client.user = { avatar: 'global-avatar' };
  await command.run(f.client, f.message, []);
  assert.equal(f.calls.length, 1);
  const [method, route, options] = f.calls[0];
  assert.equal(method, 'patch');
  assert.equal(route, '/guilds/guild-one/members/@me');
  assert.deepEqual(options.data, { avatar: `data:image/png;base64,${png.toString('base64')}` });
  assert.equal(f.me.avatar, 'confirmed-guild-avatar');
  assert.equal(f.client.user.avatar, 'global-avatar');
  assert.match(f.replies[0], /Successfully updated/);
});

test('setpfp rejects non-admins and missing attachments before making a request', async t => {
  const f = fixture(t);
  f.message.member.permissions.has = () => false;
  await command.run(f.client, f.message, []);
  assert.match(f.replies[0], /Administrator/);
  f.message.member.permissions.has = () => true;
  f.message.attachments.clear();
  await command.run(f.client, f.message, []);
  assert.match(f.replies[1], /attach an image/);
  assert.equal(f.calls.length, 0);
});

for (const response of [{ avatar: null }, {}, new Error('Synthetic Discord rejection')]) {
  test(`setpfp does not report success for ${JSON.stringify(response)} ${response.message || ''}`, async t => {
    download(t);
    const f = fixture(t, response);
    t.mock.method(console, 'error', () => {});
    await command.run(f.client, f.message, []);
    assert.equal(f.replies.length, 1);
    assert.match(f.replies[0].content, /Failed to update server avatar/);
    assert.deepEqual(f.replies[0].allowedMentions, { parse: [] });
    assert.equal(f.me.avatar, null);
  });
}

for (const [label, bytes, status] of [
  ['invalid image bytes', Buffer.from('not an image'), 200],
  ['download failure', png, 404],
  ['oversized download', Buffer.alloc(5 * 1024 * 1024 + 1), 200],
]) {
  test(`setpfp rejects ${label} before calling Discord`, async t => {
    download(t, bytes, status);
    const f = fixture(t);
    t.mock.method(console, 'error', () => {});
    await command.run(f.client, f.message, []);
    assert.equal(f.calls.length, 0);
    assert.match(f.replies[0].content, /Failed to update/);
  });
}
