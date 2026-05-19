const { MessageEmbed } = require("discord.js");
const ee = require("../../botconfig/embed.json");
const { check_if_dj } = require("../../handlers/functions");
const { getPlayer, currentTrack } = require("../../handlers/playerHelpers");
module.exports = {
	name: "customspeed", description: "Sets a custom playback speed", cooldown: 5, requiredroles: [], alloweduserids: [],
	options: [{ "String": { name: "speed", description: "Playback speed (0.5 - 2.0)", required: true } }],
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
				const speed = Number(interaction.options.getString("speed"));
				if (isNaN(speed) || speed < 0.5 || speed > 2.0) return interaction.reply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} **Speed must be between 0.5 and 2.0!**`)], ephemeral: true });
				await player.filterManager.setSpeed(speed);
				interaction.reply({ embeds: [new MessageEmbed().setColor(ee.color).setTimestamp().setTitle(`🎛 **Playback speed set to \`${speed}x\`!**`).setFooter({ text: `Action by: ${member.user.tag}`, iconURL: member.user.displayAvatarURL({dynamic: true}) })] })
			} catch (e) { console.log(e.stack ? e.stack : e); interaction.reply({ content: `${client.allEmojis.x} | Error: `, embeds: [new MessageEmbed().setColor(ee.wrongcolor).setDescription(`\`\`\`${e}\`\`\``)], ephemeral: true }) }
		} catch (e) { console.log(String(e.stack).bgRed) }
	}
}
