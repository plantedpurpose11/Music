const { MessageEmbed } = require("discord.js");
const ee = require("../../botconfig/embed.json");
const { check_if_dj } = require("../../handlers/functions");
const { getPlayer, currentTrack } = require("../../handlers/playerHelpers");
module.exports = {
	name: "custombassboost", description: "Sets a custom bass boost level", cooldown: 5, requiredroles: [], alloweduserids: [],
	options: [{ "Integer": { name: "gain", description: "Bass boost gain (0-20)", required: true } }],
	run: async (client, interaction) => {
		try {
			const { member, channelId, guildId } = interaction;
			const { guild } = member; const { channel } = member.voice;
			if (!channel) return interaction.reply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} **Please join ${guild.members.me.voice.channel ? "__my__" : "a"} VoiceChannel First!**`)], ephemeral: true })
			if (channel.guild.members.me.voice.channel && channel.guild.members.me.voice.channel.id != channel.id)
				return interaction.reply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setFooter({ text: ee.footertext, iconURL: ee.footericon }).setTitle(`${client.allEmojis.x} Join __my__ Voice Channel!`).setDescription(`<#${guild.members.me.voice.channel.id}>`)], ephemeral: true });
			try {
				let player = getPlayer(client, guildId); const cur = currentTrack(player);
				if (!player || !cur) return interaction.reply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} **I am nothing Playing right now!**`)], ephemeral: true })
				if (check_if_dj(client, member, cur)) return interaction.reply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setFooter({ text: ee.footertext, iconURL: ee.footericon }).setTitle(`${client.allEmojis.x} **You are not a DJ and not the Song Requester!**`).setDescription(`**DJ-ROLES:**\n> ${check_if_dj(client, member, cur)}`)], ephemeral: true });
				const gain = interaction.options.getInteger("gain");
				if (gain < 0 || gain > 20) return interaction.reply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} **Gain must be between 0 and 20!**`)], ephemeral: true });
				const eqGain = gain / 20;
				await player.filterManager.setEqualizer([
					{band:0,gain:eqGain},{band:1,gain:eqGain*0.9},{band:2,gain:eqGain*0.8},{band:3,gain:eqGain*0.55},
					{band:4,gain:eqGain*0.25},{band:5,gain:0},{band:6,gain:-eqGain*0.25},{band:7,gain:-eqGain*0.45},
					{band:8,gain:-eqGain*0.55},{band:9,gain:-eqGain*0.7},{band:10,gain:-eqGain*0.3},{band:11,gain:-eqGain*0.25},
					{band:12,gain:0},{band:13,gain:0}
				]);
				const activeFilters = player.get("activeFilters") || [];
				if (!activeFilters.includes("bassboost")) { activeFilters.push("bassboost"); player.set("activeFilters", activeFilters); }
				interaction.reply({ embeds: [new MessageEmbed().setColor(ee.color).setTimestamp().setTitle(`🎛 **Custom Bass Boost set to \`${gain}\`!**`).setFooter({ text: `Action by: ${member.user.tag}`, iconURL: member.user.displayAvatarURL({dynamic: true}) })] })
			} catch (e) { console.log(e.stack ? e.stack : e); interaction.reply({ content: `${client.allEmojis.x} | Error: `, embeds: [new MessageEmbed().setColor(ee.wrongcolor).setDescription(`\`\`\`${e}\`\`\``)], ephemeral: true }) }
		} catch (e) { console.log(String(e.stack).bgRed) }
	}
}
