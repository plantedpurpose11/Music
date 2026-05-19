const { MessageEmbed } = require("discord.js");
const ee = require("../../botconfig/embed.json");
const { getPlayer, currentTrack, trackTitle, trackThumbnail } = require("../../handlers/playerHelpers");
module.exports = {
	name: "lyrics", description: "Shows Lyrics of the current Song", cooldown: 10, requiredroles: [], alloweduserids: [],
	options: [{ "String": { name: "song", description: "Song name to search lyrics for", required: false } }],
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
				const songName = interaction.options.getString("song") || trackTitle(cur);
				await interaction.deferReply();
				let lyrics;
				try {
					const fetch = require("node-fetch");
					const res = await fetch(`https://some-random-api.com/lyrics?title=${encodeURIComponent(songName)}`);
					const data = await res.json();
					lyrics = data.lyrics;
				} catch (e) { lyrics = null; }
				if (!lyrics) return interaction.editReply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} **No lyrics found for \`${songName}\`!**`)] });
				if (lyrics.length > 4096) lyrics = lyrics.substr(0, 4093) + "...";
				interaction.editReply({ embeds: [new MessageEmbed().setColor(ee.color).setTitle(`📝 Lyrics for: ${songName}`).setDescription(lyrics).setThumbnail(trackThumbnail(cur)).setFooter({ text: ee.footertext, iconURL: ee.footericon })] })
			} catch (e) { console.log(e.stack ? e.stack : e); interaction.reply({ content: `${client.allEmojis.x} | Error: `, embeds: [new MessageEmbed().setColor(ee.wrongcolor).setDescription(`\`\`\`${e}\`\`\``)], ephemeral: true }).catch(() => {}) }
		} catch (e) { console.log(String(e.stack).bgRed) }
	}
}
