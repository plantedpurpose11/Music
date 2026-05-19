const { MessageEmbed } = require("discord.js");
const ee = require("../../botconfig/embed.json");
const { getPlayer, currentTrack, trackTitle, trackUri, trackDuration, trackThumbnail, trackRequester } = require("../../handlers/playerHelpers");
module.exports = {
	name: "nowplaying",
	category: "Song",
	aliases: ["np", "song"],
	usage: "nowplaying",
	description: "Shows the current Song",
	cooldown: 5,
	requiredroles: [],
	alloweduserids: [],
	run: async (client, message, args) => {
		try {
			const { member, channelId, guildId } = message;
			const { guild } = member;
			const { channel } = member.voice;
			if (!channel) return message.reply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} **Please join ${guild.members.me.voice.channel ? "my" : "a"} VoiceChannel First!**`)] })
			if (channel.guild.members.me.voice.channel && channel.guild.members.me.voice.channel.id != channel.id)
				return message.reply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setFooter({ text: ee.footertext, iconURL: ee.footericon }).setTitle(`${client.allEmojis.x} Join __my__ Voice Channel!`).setDescription(`<#${guild.members.me.voice.channel.id}>`)] });
			try {
				let player = getPlayer(client, guildId);
				const cur = currentTrack(player);
				if (!player || !cur) return message.reply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} **I am nothing Playing right now!**`)] })
				
				const reqUser = trackRequester(cur);
				const autoplay = player.get("autoplay");
				
				let embed = new MessageEmbed().setColor(ee.color)
					.setAuthor(`${trackTitle(cur)}`, trackThumbnail(cur), trackUri(cur))
					.setThumbnail(trackThumbnail(cur))
					.addFields({ name: `⏱ Duration:`, value: `>>> \`${client.formatDuration(player.position)} / ${client.formatDuration(trackDuration(cur))}\``, inline: true })
					.addFields({ name: `🌀 Queue:`, value: `>>> \`${player.queue.tracks.length} song(s)\``, inline: true })
					.addFields({ name: `🔊 Volume:`, value: `>>> \`${player.volume} %\``, inline: true })
					.addFields({ name: `♾ Loop:`, value: `>>> ${player.repeatMode !== "off" ? player.repeatMode === "queue" ? `${client.allEmojis.check_mark} \`Queue\`` : `${client.allEmojis.check_mark} \`Song\`` : `${client.allEmojis.x}`}`, inline: true })
					.addFields({ name: `↪️ Autoplay:`, value: `>>> ${autoplay ? `${client.allEmojis.check_mark}` : `${client.allEmojis.x}`}`, inline: true })
					.addFields({ name: `🎤 Requested by:`, value: `>>> ${reqUser || "Unknown"}`, inline: true })
					.setFooter({ text: ee.footertext, iconURL: ee.footericon });
				
				message.reply({ embeds: [embed] })
			} catch (e) {
				console.log(e.stack ? e.stack : e)
				message.reply({ content: `${client.allEmojis.x} | Error: `, embeds: [new MessageEmbed().setColor(ee.wrongcolor).setDescription(`\`\`\`${e}\`\`\``)] })
			}
		} catch (e) { console.log(String(e.stack).bgRed) }
	}
}
