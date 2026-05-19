const { MessageEmbed } = require("discord.js");
const ee = require("../../botconfig/embed.json");
const { getPlayer, currentTrack } = require("../../handlers/playerHelpers");

const AVAILABLE_FILTERS = ["nightcore", "vaporwave", "karaoke", "tremolo", "vibrato", "rotation", "lowpass", "8d", "bassboost"];

module.exports = {
	name: "list",
	category: "Filter",
	aliases: ["filterlist", "filters"],
	usage: "list",
	description: "Lists all available Filters",
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
				
				const activeFilters = player.get("activeFilters") || [];
				
				message.reply({ embeds: [new MessageEmbed().setColor(ee.color)
					.setTitle(`🎛 **Available Filters**`)
					.setDescription(AVAILABLE_FILTERS.map(f => `${activeFilters.includes(f) ? `${client.allEmojis.check_mark}` : `${client.allEmojis.x}`} \`${f}\``).join("\n"))
					.addFields({ name: "**Active Filters:**", value: activeFilters.length > 0 ? activeFilters.map(f => `\`${f}\``).join(", ") : "None" })
					.addFields({ name: "**Custom Filters:**", value: `\`custombassboost <gain>\` | \`customspeed <speed>\`` })
					.setFooter({ text: ee.footertext, iconURL: ee.footericon })] })
			} catch (e) {
				console.log(e.stack ? e.stack : e)
				message.reply({ content: `${client.allEmojis.x} | Error: `, embeds: [new MessageEmbed().setColor(ee.wrongcolor).setDescription(`\`\`\`${e}\`\`\``)] })
			}
		} catch (e) { console.log(String(e.stack).bgRed) }
	}
}
