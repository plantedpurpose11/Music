const { MessageEmbed } = require("discord.js");
const ee = require("../../botconfig/embed.json");
const { getPlayer, currentTrack, trackTitle, trackAuthor } = require("../../handlers/playerHelpers");
module.exports = {
	name: "addrelated",
	category: "Music",
	usage: "addrelated",
	description: "Add a similar/related song to the current Song!",
	cooldown: 2,
	requiredroles: [],
	alloweduserids: [],
	run: async (client, message, args) => {
		try {
			const { member, channelId, guildId } = message;
			const { guild } = member;
			const { channel } = member.voice;

			if (!channel) return message.reply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} **Please join ${guild.members.me.voice.channel ? "__my__" : "a"} VoiceChannel First!**`)] })
			if (channel.userLimit != 0 && channel.full)
				return message.reply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setFooter({ text: ee.footertext, iconURL: ee.footericon }).setTitle(`${client.allEmojis.x} Your Voice Channel is full, I can't join!`)] });
			if (channel.guild.members.me.voice.channel && channel.guild.members.me.voice.channel.id != channel.id)
				return message.reply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setFooter({ text: ee.footertext, iconURL: ee.footericon }).setTitle(`${client.allEmojis.x} I am already connected somewhere else`)] });

			try {
				let player = getPlayer(client, guildId);
				const cur = currentTrack(player);
				if (!player || !cur) {
					return message.reply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} **I am nothing Playing right now!**`)] })
				}

				let thenewmsg = await message.reply({
					content: `🔍 Searching Related Song for... **${trackTitle(cur)}**`,
				}).catch(e => { console.log(e) })

				const result = await player.search({ query: `ytsearch:${trackAuthor(cur)} ${trackTitle(cur)}` }, member);
				
				if (!result.tracks || result.tracks.length <= 1) {
					return thenewmsg.edit({ content: `${client.allEmojis.x} No related songs found!` }).catch(() => {})
				}

				const curUri = cur.info?.uri || "";
				let relatedTrack = null;
				for (let i = 1; i < result.tracks.length; i++) {
					if ((result.tracks[i].info?.uri || "") !== curUri) {
						relatedTrack = result.tracks[i];
						break;
					}
				}
				
				if (!relatedTrack) {
					return thenewmsg.edit({ content: `${client.allEmojis.x} No different related songs found!` }).catch(() => {})
				}

				relatedTrack.requester = member;
				await player.queue.add(relatedTrack);
				
				if (!player.playing && !player.paused) {
					await player.play();
				}

				await thenewmsg.edit({ content: `👍 Added: **${trackTitle(relatedTrack)}**` }).catch(() => {})
			} catch (e) {
				console.log(e.stack ? e.stack : e)
				message.reply({ content: `${client.allEmojis.x} | Error: `, embeds: [new MessageEmbed().setColor(ee.wrongcolor).setDescription(`\`\`\`${e}\`\`\``)] })
			}
		} catch (e) {
			console.log(String(e.stack).bgRed)
		}
	}
}
