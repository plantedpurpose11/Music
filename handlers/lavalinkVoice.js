/**
 * lavalink-client 2.10 needs the bot's voice session before its server token.
 * Discord can deliver the two gateway events in either order.
 */
module.exports = function createVoiceForwarder(client) {
  const pendingServers = new WeakMap();
  return async function forwardVoicePacket(packet) {
    const manager = client.manager;
    const update = packet.d;
    const player = manager.getPlayer(update.guild_id);
    if (!player) return;

    if (packet.t === 'VOICE_SERVER_UPDATE') {
      if (!player.voice?.sessionId || !player.voice?.channelId) {
        pendingServers.set(player, packet);
        return;
      }
      pendingServers.delete(player);
      return manager.sendRawData(packet);
    }

    const botState = update.user_id === client.user.id;
    if (botState && !update.channel_id) pendingServers.delete(player);
    await manager.sendRawData(packet);
    if (botState && update.channel_id && pendingServers.has(player)) {
      const serverPacket = pendingServers.get(player);
      pendingServers.delete(player);
      await manager.sendRawData(serverPacket);
    }
  };
};
