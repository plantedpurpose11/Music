const { MessageEmbed } = require("discord.js");
const ee = require("../../botconfig/embed.json");
const { check_if_dj } = require("../../handlers/functions");
const { getPlayer, currentTrack } = require("../../handlers/playerHelpers");
module.exports = {
	name: "custombassboost",
	category: "Filter",
	aliases: ["cbb"],
	usage: "custombassboost <gain (1-20)>",
	description: "Sets a custom bass boost level",
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
				
				const gain = Number(args[0]);
				if (isNaN(gain) || gain < 0 || gain > 20) return message.reply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} **Please provide a gain between \`0\` and \`20\`!**`)] });
				
				// Map gain (0-20) to equalizer gain (0 to 1.0)
				const eqGain = gain / 20;
				await player.filterManager.setEqualizer([
					{ band: 0, gain: eqGain }, { band: 1, gain: eqGain * 0.9 }, { band: 2, gain: eqGain * 0.8 },
					{ band: 3, gain: eqGain * 0.5 }, { band: 4, gain: 0 }, { band: 5, gain: -0.1 },
					{ band: 6, gain: 0 }, { band: 7, gain: 0 }, { band: 8, gain: 0 },
					{ band: 9, gain: 0 }, { band: 10, gain: 0 }, { band: 11, gain: 0 },
					{ band: 12, gain: 0 }, { band: 13, gain: 0 }
				]);
				
				let activeFilters = player.get("activeFilters") || [];
				activeFilters = activeFilters.filter(f => f !== "bassboost" && f !== "custombassboost");
				if (gain > 0) activeFilters.push("custombassboost");
				player.set("activeFilters", activeFilters);
				
				message.reply({ embeds: [new MessageEmbed().setColor(ee.color).setTimestamp().setTitle(`🎛 **Custom Bass Boost set to \`${gain}\`!**`).setFooter({ text: `Action by: ${member.user.tag}`, iconURL: member.user.displayAvatarURL({dynamic: true}) })] })
			} catch (e) {
				console.log(e.stack ? e.stack : e)
				message.reply({ content: `${client.allEmojis.x} | Error: `, embeds: [new MessageEmbed().setColor(ee.wrongcolor).setDescription(`\`\`\`${e}\`\`\``)] })
			}
		} catch (e) { console.log(String(e.stack).bgRed) }
	}
}
