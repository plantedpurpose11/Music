const { MessageEmbed } = require("discord.js");
const ee = require("../../botconfig/embed.json");
const { getPlayer, currentTrack, trackTitle, trackDuration } = require("../../handlers/playerHelpers");
module.exports = {
	name: "list", description: "Shows the Queue", cooldown: 5, requiredroles: [], alloweduserids: [], options: [],
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
				const tracks = player.queue.tracks;
				const curTitle = trackTitle(cur);
				let desc = `**Now Playing:**\n\`${curTitle}\`\n\n`;
				if (tracks.length === 0) { desc += "Queue is empty."; }
				else {
					const pageSize = 10;
					const list = tracks.slice(0, pageSize).map((t, i) => {
						const title = t.info?.title || t.title || "Unknown";
						return `\`${i + 1}.\` ${title}`;
					}).join("\n");
					desc += `**Up Next:**\n${list}`;
					if (tracks.length > pageSize) desc += `\n\n...and ${tracks.length - pageSize} more`;
				}
				interaction.reply({ embeds: [new MessageEmbed().setColor(ee.color).setTitle(`📜 Queue — ${tracks.length} song(s)`).setDescription(desc).setFooter({ text: ee.footertext, iconURL: ee.footericon })] })
			} catch (e) { console.log(e.stack ? e.stack : e); interaction.reply({ content: `${client.allEmojis.x} | Error: `, embeds: [new MessageEmbed().setColor(ee.wrongcolor).setDescription(`\`\`\`${e}\`\`\``)], ephemeral: true }) }
		} catch (e) { console.log(String(e.stack).bgRed) }
	}
}
