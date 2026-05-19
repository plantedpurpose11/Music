const { MessageEmbed } = require("discord.js");
const ee = require("../../botconfig/embed.json");
const { check_if_dj } = require("../../handlers/functions");
const { getPlayer, currentTrack } = require("../../handlers/playerHelpers");

const AVAILABLE_FILTERS = ["nightcore", "vaporwave", "karaoke", "tremolo", "vibrato", "rotation", "lowpass", "8d", "bassboost"];

module.exports = {
	name: "remove",
	category: "Filter",
	usage: "remove <Filter>",
	description: "Removes a Filter from the Music",
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
				
				if (!args[0]) return message.reply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} **Please provide a Filter to remove!**`).setDescription(`**Available:** ${AVAILABLE_FILTERS.map(f => `\`${f}\``).join(", ")}`)] });
				
				const filterName = args[0].toLowerCase();
				const fm = player.filterManager;
				
				switch (filterName) {
					case "nightcore": await fm.toggleNightcore(); break;
					case "vaporwave": await fm.toggleVaporwave(); break;
					case "karaoke": await fm.toggleKaraoke(); break;
					case "tremolo": await fm.toggleTremolo(); break;
					case "vibrato": await fm.toggleVibrato(); break;
					case "rotation": case "8d": await fm.toggleRotation(); break;
					case "lowpass": await fm.toggleLowPass(); break;
					case "bassboost": await fm.setEqualizer([]); break;
					default: return message.reply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} **Invalid Filter!**`).setDescription(`**Available:** ${AVAILABLE_FILTERS.map(f => `\`${f}\``).join(", ")}`)] });
				}
				
				let activeFilters = player.get("activeFilters") || [];
				activeFilters = activeFilters.filter(f => f !== filterName);
				player.set("activeFilters", activeFilters);
				
				message.reply({ embeds: [new MessageEmbed().setColor(ee.color).setTimestamp().setTitle(`🗑 **Removed Filter: \`${filterName}\`!**`).addFields({ name: "**Active Filters:**", value: activeFilters.length > 0 ? activeFilters.map(f => `\`${f}\``).join(", ") : "None" }).setFooter({ text: `Action by: ${member.user.tag}`, iconURL: member.user.displayAvatarURL({dynamic: true}) })] })
			} catch (e) {
				console.log(e.stack ? e.stack : e)
				message.reply({ content: `${client.allEmojis.x} | Error: `, embeds: [new MessageEmbed().setColor(ee.wrongcolor).setDescription(`\`\`\`${e}\`\`\``)] })
			}
		} catch (e) { console.log(String(e.stack).bgRed) }
	}
}
