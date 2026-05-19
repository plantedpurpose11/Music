const { MessageEmbed } = require("discord.js");
const ee = require("../../botconfig/embed.json");
const { check_if_dj } = require("../../handlers/functions");
const { getPlayer, currentTrack } = require("../../handlers/playerHelpers");
module.exports = {
	name: "unshuffle",
	category: "Queue",
	usage: "unshuffle",
	description: "Restores the Queue order before shuffling",
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
				if (check_if_dj(client, member, cur))
					return message.reply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setFooter({ text: ee.footertext, iconURL: ee.footericon }).setTitle(`${client.allEmojis.x} **You are not a DJ and not the Song Requester!**`).setDescription(`**DJ-ROLES:**\n> ${check_if_dj(client, member, cur)}`)] });
				
				const savedOrder = client.maps.get(`beforeshuffle-${guildId}`);
				if (!savedOrder) return message.reply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} **No shuffle history found!**`)] });
				
				// Clear current queue and restore saved order
				if (player.queue.tracks.length > 0) await player.queue.splice(0, player.queue.tracks.length);
				for (const track of savedOrder) {
					await player.queue.add(track);
				}
				client.maps.delete(`beforeshuffle-${guildId}`);
				
				message.reply({ embeds: [new MessageEmbed().setColor(ee.color).setTimestamp().setTitle(`🔀 **Unshuffled the Queue!**`).setFooter({ text: `Action by: ${member.user.tag}`, iconURL: member.user.displayAvatarURL({dynamic: true}) })] })
			} catch (e) {
				console.log(e.stack ? e.stack : e)
				message.reply({ content: `${client.allEmojis.x} | Error: `, embeds: [new MessageEmbed().setColor(ee.wrongcolor).setDescription(`\`\`\`${e}\`\`\``)] })
			}
		} catch (e) { console.log(String(e.stack).bgRed) }
	}
}
