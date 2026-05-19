const { MessageEmbed } = require("discord.js");
const ee = require("../../botconfig/embed.json");
const { check_if_dj } = require("../../handlers/functions");
const { getPlayer, currentTrack } = require("../../handlers/playerHelpers");

const AVAILABLE_FILTERS = ["nightcore", "vaporwave", "karaoke", "tremolo", "vibrato", "rotation", "lowpass", "8d", "bassboost"];

module.exports = {
	name: "set",
	category: "Filter",
	usage: "set <Filter1> [Filter2] ...",
	description: "Sets specific Filters (replaces current filters)",
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
				
				if (!args[0]) return message.reply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} **Please provide Filter(s)!**`).setDescription(`**Available:** ${AVAILABLE_FILTERS.map(f => `\`${f}\``).join(", ")}`)] });
				
				const fm = player.filterManager;
				// Reset everything first
				await fm.resetFilters();
				
				const filters = args.map(f => f.toLowerCase()).filter(f => AVAILABLE_FILTERS.includes(f));
				if (filters.length === 0) return message.reply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} **No valid Filters provided!**`).setDescription(`**Available:** ${AVAILABLE_FILTERS.map(f => `\`${f}\``).join(", ")}`)] });
				
				for (const filterName of filters) {
					switch (filterName) {
						case "nightcore": await fm.toggleNightcore(); break;
						case "vaporwave": await fm.toggleVaporwave(); break;
						case "karaoke": await fm.toggleKaraoke(); break;
						case "tremolo": await fm.toggleTremolo(); break;
						case "vibrato": await fm.toggleVibrato(); break;
						case "rotation": case "8d": await fm.toggleRotation(); break;
						case "lowpass": await fm.toggleLowPass(); break;
						case "bassboost": await fm.setEqualizer([
							{ band: 0, gain: 0.6 }, { band: 1, gain: 0.67 }, { band: 2, gain: 0.67 },
							{ band: 3, gain: 0 }, { band: 4, gain: -0.5 }, { band: 5, gain: 0.15 },
							{ band: 6, gain: -0.45 }, { band: 7, gain: 0.23 }, { band: 8, gain: 0.35 },
							{ band: 9, gain: 0.45 }, { band: 10, gain: 0.55 }, { band: 11, gain: 0.6 },
							{ band: 12, gain: 0.55 }, { band: 13, gain: 0 }
						]); break;
					}
				}
				
				player.set("activeFilters", filters);
				
				message.reply({ embeds: [new MessageEmbed().setColor(ee.color).setTimestamp().setTitle(`🎛 **Set Filters!**`).addFields({ name: "**Active Filters:**", value: filters.map(f => `\`${f}\``).join(", ") }).setFooter({ text: `Action by: ${member.user.tag}`, iconURL: member.user.displayAvatarURL({dynamic: true}) })] })
			} catch (e) {
				console.log(e.stack ? e.stack : e)
				message.reply({ content: `${client.allEmojis.x} | Error: `, embeds: [new MessageEmbed().setColor(ee.wrongcolor).setDescription(`\`\`\`${e}\`\`\``)] })
			}
		} catch (e) { console.log(String(e.stack).bgRed) }
	}
}
