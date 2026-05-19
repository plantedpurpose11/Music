const { MessageEmbed } = require("discord.js");
const ee = require("../../botconfig/embed.json");
const { getOrCreatePlayer, searchTrack, trackTitle } = require("../../handlers/playerHelpers");
module.exports = {
	name: "play",
	description: "Plays a Song/Playlist in your VoiceChannel",
	cooldown: 2,
	requiredroles: [],
	alloweduserids: [],
	options: [
		{ "String": { name: "song", description: "Which Song do you want to play", required: true } },
		{ "String": { name: "source", description: "Where to search (default: auto)", required: false, choices: [
			["YouTube", "youtube"],
			["YouTube Music", "youtubemusic"],
			["SoundCloud", "soundcloud"],
			["Bandcamp", "bandcamp"],
		] } }
	],
	run: async (client, interaction) => {
		try {
			const { member, channelId, guildId } = interaction;
			const { guild } = member;
			const { channel } = member.voice;
			if (!channel) return interaction.reply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} **Please join ${guild.members.me.voice.channel ? "__my__" : "a"} VoiceChannel!**`)] });
			if (channel.userLimit != 0 && channel.full) return interaction.reply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setFooter({ text: ee.footertext, iconURL: ee.footericon }).setTitle(`${client.allEmojis.x} **The VoiceChannel is full!**`)] });
			if (channel.guild.members.me.voice.channel && channel.guild.members.me.voice.channel.id != channel.id)
				return interaction.reply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setFooter({ text: ee.footertext, iconURL: ee.footericon }).setTitle(`${client.allEmojis.x} I am already connected to another channel!**`)] });
			const Text = interaction.options.getString("song");
			const source = interaction.options.getString("source") || null;
			const sourceLabel = source ? ` (${source})` : "";
			await interaction.reply({ content: `🔍 Searching${sourceLabel}... \`\`\`${Text}\`\`\``, ephemeral: true });
			try {
				const player = await getOrCreatePlayer(client, guildId, channel.id, channelId, member);
				
				// Debug logging
				console.log(`[PLAY] Player created, manager initiated:`, client.manager?.initiated);
				console.log(`[PLAY] Player playing:`, player.playing, "paused:", player.paused);
				
				const { track, result } = await searchTrack(player, Text, member, source);
				if (!track)
					return interaction.editReply({ content: `${client.allEmojis.x} No results found!`, ephemeral: true });
				
				if (result && (result.loadType === "playlist" || result.loadType === "PLAYLIST_LOADED")) {
					for (const t of result.tracks) { t.requester = member; await player.queue.add(t); }
				} else {
					track.requester = member; await player.queue.add(track);
				}
				
				// FIX: Always call play() if the player isn't already playing
				if (!player.playing) {
					console.log(`[PLAY] Calling player.play()`);
					await player.play();
				}
				
				interaction.editReply({ content: `${player.queue.tracks.length > 0 ? "👍 Added" : "🎶 Now Playing"}${sourceLabel}: \`\`\`css\n${trackTitle(track)}\n\`\`\``, ephemeral: true });
			} catch (e) {
				console.log(e.stack ? e.stack : e)
				interaction.editReply({ content: `${client.allEmojis.x} | Error: `, embeds: [new MessageEmbed().setColor(ee.wrongcolor).setDescription(`\`\`\`${e}\`\`\``)], ephemeral: true })
			}
		} catch (e) { console.log(String(e.stack).bgRed) }
	}
}
