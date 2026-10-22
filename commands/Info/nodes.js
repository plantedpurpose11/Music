const { MessageEmbed } = require('discord.js');
const ee = require('../../botconfig/embed.json');

module.exports = {
  name: 'nodes',
  category: 'Info',
  usage: 'nodes',
  description: 'Shows Lavalink node status and the number of servers playing on each node.',
  cooldown: 5,
  run: async (client, message) => {
    const nodes = [...(client.manager?.nodeManager?.nodes?.values() || [])];
    if (!nodes.length) return message.reply('No Lavalink nodes are configured.');
    const lines = nodes.map((node, index) => {
      const online = node.connected;
      const players = [...(client.manager?.players?.values() || [])]
        .filter(player => player.node === node && player.playing && !player.paused).length;
      // Count this bot's guilds rather than other bots sharing the Lavalink server.
      const name = node.id || node.options?.id || `Node ${index + 1}`;
      return `**${String(name).slice(0, 100)}** — ${online ? '🟢 Online' : '🔴 Offline'} — playing for **${online ? players : 0}** server(s)`;
    });
    // Keep each response within Discord's embed description limit.
    for (let i = 0; i < lines.length; i += 20) {
      await message.reply({ embeds: [new MessageEmbed().setColor(ee.color)
        .setTitle('Lavalink Server Health').setDescription(lines.slice(i, i + 20).join('\n'))],
      allowedMentions: { parse: [], repliedUser: false } });
    }
  },
};
