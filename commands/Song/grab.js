const { MessageEmbed } = require("discord.js");
const ee = require("../../botconfig/embed.json");
const { getPlayer, currentTrack, trackTitle, trackUri, trackDuration, trackThumbnail, trackRequester } = require("../../handlers/playerHelpers");
module.exports = {
	name: "grab",
	category: "Song",
	aliases: ["save"],
	usage: "grab",
	description: "Saves the current Song to your DMs",
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
					.setURL(trackUri(cur))
					.addFields({ name: `⏱ Duration:`, value: `>>> \`${client.formatDuration(player.position)} / ${client.formatDuration(trackDuration(cur))}\``, inline: true })
					.addFields({ name: `🌀 Queue:`, value: `>>> \`${player.queue.tracks.length} song(s)\``, inline: true })
					.addFields({ name: `🔊 Volume:`, value: `>>> \`${player.volume} %\``, inline: true })
					.addFields({ name: `♾ Loop:`, value: `>>> ${player.repeatMode !== "off" ? player.repeatMode === "queue" ? `${client.allEmojis.check_mark} \`Queue\`` : `${client.allEmojis.check_mark} \`Song\`` : `${client.allEmojis.x}`}`, inline: true })
					.addFields({ name: `↪️ Autoplay:`, value: `>>> ${autoplay ? `${client.allEmojis.check_mark}` : `${client.allEmojis.x}`}`, inline: true })
					.addFields({ name: `🔗 Link:`, value: `>>> [Click here](${trackUri(cur)})`, inline: true })
					.setFooter({ text: ee.footertext, iconURL: ee.footericon });
				
				member.user.send({ embeds: [embed] }).then(() => {
					message.reply({ embeds: [new MessageEmbed().setColor(ee.color).setTitle(`📨 **Song info sent to your DMs!**`)] })
				}).catch(() => {
					message.reply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} **I can't send you a DM!**`)] })
				});
			} catch (e) {
				console.log(e.stack ? e.stack : e)
				message.reply({ content: `${client.allEmojis.x} | Error: `, embeds: [new MessageEmbed().setColor(ee.wrongcolor).setDescription(`\`\`\`${e}\`\`\``)] })
			}
		} catch (e) { console.log(String(e.stack).bgRed) }
	}
}
