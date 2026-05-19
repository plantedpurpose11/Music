const { MessageEmbed } = require("discord.js");
const ee = require("../../botconfig/embed.json");
const { getPlayer, currentTrack, trackTitle, trackThumbnail } = require("../../handlers/playerHelpers");
module.exports = {
	name: "status", description: "Shows the Queue status", cooldown: 5, requiredroles: [], alloweduserids: [], options: [],
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
				const autoplay = player.get("autoplay");
				interaction.reply({ embeds: [new MessageEmbed().setColor(ee.color)
					.setTitle(`📊 Queue Status`)
					.setThumbnail(trackThumbnail(cur))
					.addFields({ name: "🎶 Now Playing:", value: `\`${trackTitle(cur)}\``, inline: false })
					.addFields({ name: "🌀 Queue Length:", value: `\`${player.queue.tracks.length} song(s)\``, inline: true })
					.addFields({ name: "🔊 Volume:", value: `\`${player.volume}%\``, inline: true })
					.addFields({ name: "♾ Loop:", value: `\`${player.repeatMode}\``, inline: true })
					.addFields({ name: "↪️ Autoplay:", value: `\`${autoplay ? "ON" : "OFF"}\``, inline: true })
					.setFooter({ text: ee.footertext, iconURL: ee.footericon })] })
			} catch (e) { console.log(e.stack ? e.stack : e); interaction.reply({ content: `${client.allEmojis.x} | Error: `, embeds: [new MessageEmbed().setColor(ee.wrongcolor).setDescription(`\`\`\`${e}\`\`\``)], ephemeral: true }) }
		} catch (e) { console.log(String(e.stack).bgRed) }
	}
}
