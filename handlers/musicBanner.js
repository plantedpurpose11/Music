const https = require('https');
const { MessageAttachment, MessageEmbed } = require('discord.js');

const DEFAULT_BANNER = 'https://raw.githubusercontent.com/plantedpurpose11/Music/main/assets/forge-music-banner.png';
const MAX_BANNER_BYTES = 5 * 1024 * 1024;

function imageType(bytes) {
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'png';
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'jpg';
  if (/^GIF8[79]a$/.test(bytes.toString('ascii', 0, 6))) return 'gif';
  if (bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  return null;
}

async function storeBanner(client, guildId, attachment) {
  if (attachment.size > MAX_BANNER_BYTES) throw new Error('Please upload an image no larger than 5 MiB.');
  const url = new URL(attachment.url);
  if (url.protocol !== 'https:' || !['cdn.discordapp.com', 'media.discordapp.net'].includes(url.hostname)) {
    throw new Error('Please attach the image directly to your Discord message.');
  }
  const bytes = await new Promise((resolve, reject) => {
    const request = https.get(url, response => {
      if (response.statusCode !== 200) {
        response.resume();
        return reject(new Error('Could not download that attachment. Please upload it again.'));
      }
      let size = 0;
      const chunks = [];
      response.on('data', chunk => {
        size += chunk.length;
        if (size > MAX_BANNER_BYTES) {
          request.destroy(new Error('Please upload an image no larger than 5 MiB.'));
        } else chunks.push(chunk);
      });
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
      response.on('aborted', () => reject(new Error('The image download was interrupted. Please try again.')));
    });
    // A total deadline also bounds slow responses that never finish.
    const timeout = setTimeout(() => request.destroy(new Error('Image download timed out. Please try again.')), 15000);
    request.on('close', () => clearTimeout(timeout));
    request.on('error', reject);
  });
  const type = imageType(bytes);
  if (!type) throw new Error('Please upload a PNG, JPEG, GIF, or WebP image.');
  // Persist the image itself in Enmap, not Discord's expiring attachment URL.
  client.settings.set(guildId, { type, data: bytes.toString('base64') }, 'musicBanner');
}

function musicBanner(client, guildId) {
  const saved = client.settings.get(guildId, 'musicBanner');
  if (saved?.data && ['png', 'jpg', 'gif', 'webp'].includes(saved.type)) {
    const name = `music-banner.${saved.type}`;
    return { image: `attachment://${name}`, files: [new MessageAttachment(Buffer.from(saved.data, 'base64'), name)] };
  }
  return { image: typeof saved === 'string' ? saved : DEFAULT_BANNER, files: [] };
}

async function refreshMusicBanner(client, guildId) {
  if (client.manager?.players?.get(guildId)?.queue?.current) return;
  const panel = client.settings.get(guildId, 'music');
  const channel = client.channels?.cache.get(panel?.channel);
  if (!channel || !panel?.message) return;
  const message = await channel.messages.fetch(panel.message);
  if (message.embeds.length < 2) return;
  const banner = musicBanner(client, guildId);
  const embeds = message.embeds.map(embed => new MessageEmbed(embed));
  embeds[1].setImage(banner.image);
  await message.edit({ embeds, attachments: [], files: banner.files });
}

module.exports = { storeBanner, musicBanner, refreshMusicBanner };
