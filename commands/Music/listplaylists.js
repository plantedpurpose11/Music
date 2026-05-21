const { MessageEmbed } = require("discord.js");
  const ee = require("../../botconfig/embed.json");
  module.exports = {
    name: "listplaylists",
    category: "Music",
    aliases: ["playlists","myplaylists"],
    usage: "listplaylists",
    cooldown: 5,
    description: "Lists all saved playlists",
    memberpermissions: [],
    requiredroles: [],
    alloweduserids: [],
    run: async (client, message, args) => {
      try {
        const allPlaylists = client.infos.get(message.guild.id, "playlists") || {};
        const keys = Object.keys(allPlaylists);
        if (keys.length === 0) return message.reply({ embeds: [new MessageEmbed().setColor(ee.color).setTitle("📋 No Playlists Saved Yet").setDescription("Use `/playlist create <name>` to save the current queue!")] });
        const embed = new MessageEmbed().setColor(ee.color).setTitle(`📋 Saved Playlists (${keys.length})`);
        for (const k of keys) {
          const pl = allPlaylists[k];
          embed.addField(`🎵 ${pl.name}`, `\`${pl.tracks?.length || 0}\` songs • by ${pl.author?.tag || "Unknown"}`, false);
        }
        return message.reply({ embeds: [embed] });
      } catch (e) { console.log(String(e.stack).bgRed); }
    }
  };