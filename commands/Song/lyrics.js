const { MessageEmbed } = require("discord.js");
const ee = require("../../botconfig/embed.json");
const { getPlayer, currentTrack, trackTitle, trackAuthor, trackThumbnail } = require("../../handlers/playerHelpers");
module.exports = {
	name: "lyrics",
	category: "Song",
	usage: "lyrics [SongName]",
	description: "Shows the Lyrics of the current/specified Song",
	cooldown: 10,
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
				
				const songName = args.length > 0 ? args.join(" ") : trackTitle(cur);
				
				let lyrics;
				try {
					const fetch = require("node-fetch");
					const res = await fetch(`https://some-random-api.com/lyrics?title=${encodeURIComponent(songName)}`);
					const data = await res.json();
					lyrics = data.lyrics;
				} catch (e) {
					lyrics = null;
				}
				
				if (!lyrics) {
					return message.reply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} **No lyrics found for \`${songName}\`!**`)] })
				}
				
				// Split lyrics into chunks if too long
				if (lyrics.length > 4096) lyrics = lyrics.substr(0, 4093) + "...";
				
				message.reply({ embeds: [new MessageEmbed().setColor(ee.color).setTitle(`📝 Lyrics for: ${songName}`).setDescription(lyrics).setThumbnail(trackThumbnail(cur)).setFooter({ text: ee.footertext, iconURL: ee.footericon })] })
			} catch (e) {
				console.log(e.stack ? e.stack : e)
				message.reply({ content: `${client.allEmojis.x} | Error: `, embeds: [new MessageEmbed().setColor(ee.wrongcolor).setDescription(`\`\`\`${e}\`\`\``)] })
			}
		} catch (e) { console.log(String(e.stack).bgRed) }
	}
}
