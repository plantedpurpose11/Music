const { MessageEmbed } = require("discord.js");
  const ee = require("../../botconfig/embed.json");
  module.exports = {
    name: "playlistcreate",
    category: "Playlist",
    aliases: ["plcreate","createplaylist"],
    usage: "playlistcreate <name>",
    cooldown: 10,
    description: "Saves the current queue as a new playlist",
    memberpermissions: [],
    requiredroles: [],
    alloweduserids: [],
    run: async (client, message, args) => {
      try {
        const { guild, member } = message;
        const playlistName = args.join(" ").trim();
        if (!playlistName) return message.reply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} **Please provide a playlist name!**`)] });
        if (playlistName.length > 50) return message.reply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} **Name too long! (max 50 chars)**`)] });
        const player = client.manager?.players?.get(guild.id);
        const hasCurrent = player?.queue?.current;
        const hasQueued  = player?.queue?.tracks?.length > 0;
        if (!player || (!hasCurrent && !hasQueued)) return message.reply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} **Nothing playing or queued to save!**`)] });
        const mapTrack = t => { if (!t?.info) return null; return { info: { identifier: t.info.identifier||"", uri: t.info.uri||"", title: t.info.title||"Unknown", author: t.info.author||"Unknown", length: t.info.length||0, isStream: t.info.isStream||false }, requester: { id: t.requester?.id, tag: t.requester?.user?.tag||t.requester?.tag } }; };
        const tracks = [...(hasCurrent ? [mapTrack(player.queue.current)].filter(Boolean) : []), ...(player.queue.tracks||[]).map(mapTrack).filter(Boolean)];
        if (!tracks.length) return message.reply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} **Queue is empty!**`)] });
        client.infos.ensure(guild.id, {});

        const allPlaylists = client.infos.get(guild.id, "playlists") || {};
        if (allPlaylists[playlistName.toLowerCase()]) return message.reply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} **A playlist named "${playlistName}" already exists!**`)] });
        allPlaylists[playlistName.toLowerCase()] = { name: playlistName, tracks, author: { id: member.id, tag: member.user.tag }, createdAt: Date.now() };
        client.infos.set(guild.id, allPlaylists, "playlists");
        return message.reply({ embeds: [new MessageEmbed().setColor(ee.color).setTitle(`${client.allEmojis.check_mark} **Playlist Created!**`).setDescription(`**${playlistName}** saved with \`${tracks.length}\` song(s)!`).setFooter({ text: `By: ${member.user.tag}`, iconURL: member.user.displayAvatarURL({ dynamic: true }) })] });
      } catch (e) { console.log(String(e.stack).bgRed); }
    }
  };