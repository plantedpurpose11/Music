const { MessageEmbed } = require("discord.js");
const ee = require("../../botconfig/embed.json");
const { getOrCreatePlayer, searchTrack, trackTitle } = require("../../handlers/playerHelpers");
module.exports = {
	name: "play",
	description: "Plays a Song/Playlist in your VoiceChannel",
	cooldown: 2,
	requiredroles: [],
	alloweduserids: [],
	options: [{ "String": { name: "song", description: "Which Song do you want to play", required: true } }],
	run: async (client, interaction) => {
		try {
			const { member, channelId, guildId } = interaction;
			const { guild } = member;
			const { channel } = member.voice;
			if (!channel) return interaction.reply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} **Please join ${guild.members.me.voice.channel ? "__my__" : "a"} VoiceChannel First!**`)], ephemeral: true })
			if (channel.userLimit != 0 && channel.full) return interaction.reply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setFooter({ text: ee.footertext, iconURL: ee.footericon }).setTitle(`${client.allEmojis.x} Your Voice Channel is full, I can't join!`)], ephemeral: true });
			if (channel.guild.members.me.voice.channel && channel.guild.members.me.voice.channel.id != channel.id)
				return interaction.reply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setFooter({ text: ee.footertext, iconURL: ee.footericon }).setTitle(`${client.allEmojis.x} I am already connected somewhere else`)], ephemeral: true });
			const Text = interaction.options.getString("song");
			await interaction.reply({ content: `🔍 Searching... \`\`\`${Text}\`\`\``, ephemeral: true });
			try {
				const player = await getOrCreatePlayer(client, guildId, channel.id, channelId, member);
				const result = await player.search({ query: Text }, member);
				if (!result || !result.tracks || result.tracks.length === 0)
					return interaction.editReply({ content: `${client.allEmojis.x} No results found!`, ephemeral: true });
				if (result.loadType === "playlist" || result.loadType === "PLAYLIST_LOADED") {
					for (const track of result.tracks) { track.requester = member; await player.queue.add(track); }
				} else {
					const track = result.tracks[0]; track.requester = member; await player.queue.add(track);
				}
				if (!player.playing && !player.paused) await player.play();
				interaction.editReply({ content: `${player.queue.tracks.length > 0 ? "👍 Added" : "🎶 Now Playing"}: \`\`\`css\n${Text}\n\`\`\``, ephemeral: true });
			} catch (e) {
				console.log(e.stack ? e.stack : e)
				interaction.editReply({ content: `${client.allEmojis.x} | Error: `, embeds: [new MessageEmbed().setColor(ee.wrongcolor).setDescription(`\`\`\`${e}\`\`\``)], ephemeral: true })
			}
		} catch (e) { console.log(String(e.stack).bgRed) }
	}
}
