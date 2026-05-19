const { MessageEmbed } = require("discord.js");
const ee = require("../../botconfig/embed.json");
const { check_if_dj } = require("../../handlers/functions");
const { getPlayer, currentTrack } = require("../../handlers/playerHelpers");
const AVAILABLE_FILTERS = ["nightcore", "vaporwave", "karaoke", "tremolo", "vibrato", "rotation", "lowpass", "8d", "bassboost"];
module.exports = {
	name: "addfilter", description: "Adds a Filter", cooldown: 5, requiredroles: [], alloweduserids: [],
	options: [{ "StringChoices": { name: "filter", description: "Filter to add", required: true, choices: AVAILABLE_FILTERS.map(f => [f, f]) } }],
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
				const filterName = interaction.options.getString("filter");
				const activeFilters = player.get("activeFilters") || [];
				if (activeFilters.includes(filterName)) return interaction.reply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} **Filter \`${filterName}\` is already active!**`)], ephemeral: true });
				const fm = player.filterManager;
				switch (filterName) {
					case "nightcore": await fm.toggleNightcore(); break;
					case "vaporwave": await fm.toggleVaporwave(); break;
					case "karaoke": await fm.toggleKaraoke(); break;
					case "tremolo": await fm.toggleTremolo(); break;
					case "vibrato": await fm.toggleVibrato(); break;
					case "rotation": case "8d": await fm.toggleRotation(); break;
					case "lowpass": await fm.toggleLowPass(); break;
					case "bassboost": await fm.setEqualizer([{band:0,gain:0.6},{band:1,gain:0.7},{band:2,gain:0.8},{band:3,gain:0.55},{band:4,gain:0.25},{band:5,gain:0},{band:6,gain:-0.25},{band:7,gain:-0.45},{band:8,gain:-0.55},{band:9,gain:-0.7},{band:10,gain:-0.3},{band:11,gain:-0.25},{band:12,gain:0},{band:13,gain:0}]); break;
				}
				activeFilters.push(filterName);
				player.set("activeFilters", activeFilters);
				interaction.reply({ embeds: [new MessageEmbed().setColor(ee.color).setTimestamp().setTitle(`🎛 **Added filter \`${filterName}\`!**`).setDescription(`Active: ${activeFilters.map(f => `\`${f}\``).join(", ")}`).setFooter({ text: `Action by: ${member.user.tag}`, iconURL: member.user.displayAvatarURL({dynamic: true}) })] })
			} catch (e) { console.log(e.stack ? e.stack : e); interaction.reply({ content: `${client.allEmojis.x} | Error: `, embeds: [new MessageEmbed().setColor(ee.wrongcolor).setDescription(`\`\`\`${e}\`\`\``)], ephemeral: true }) }
		} catch (e) { console.log(String(e.stack).bgRed) }
	}
}
