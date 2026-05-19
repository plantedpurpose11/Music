const { MessageEmbed } = require("discord.js");
const ee = require("../../botconfig/embed.json");
const { check_if_dj } = require("../../handlers/functions");
const { getPlayer, currentTrack } = require("../../handlers/playerHelpers");
module.exports = {
	name: "loop",
	category: "Queue",
	aliases: ["repeat"],
	usage: "loop <off/song/queue>",
	description: "Toggles the Loop Mode",
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
				
				const loopArg = args[0]?.toLowerCase();
				let mode;
				if (loopArg === "off" || loopArg === "0" || loopArg === "none") mode = "off";
				else if (loopArg === "song" || loopArg === "track" || loopArg === "1") mode = "track";
				else if (loopArg === "queue" || loopArg === "all" || loopArg === "2") mode = "queue";
				else {
					// Cycle through modes
					if (player.repeatMode === "off") mode = "track";
					else if (player.repeatMode === "track") mode = "queue";
					else mode = "off";
				}
				
				await player.setRepeatMode(mode);
				
				let title;
				if (mode === "off") title = `${client.allEmojis.x} **Disabled** Loop!`;
				else if (mode === "track") title = `🔂 **Enabled Song** Loop!`;
				else title = `🔁 **Enabled Queue** Loop!`;
				
				message.reply({ embeds: [new MessageEmbed().setColor(ee.color).setTimestamp().setTitle(title).setFooter({ text: `Action by: ${member.user.tag}`, iconURL: member.user.displayAvatarURL({dynamic: true}) })] })
			} catch (e) {
				console.log(e.stack ? e.stack : e)
				message.reply({ content: `${client.allEmojis.x} | Error: `, embeds: [new MessageEmbed().setColor(ee.wrongcolor).setDescription(`\`\`\`${e}\`\`\``)] })
			}
		} catch (e) { console.log(String(e.stack).bgRed) }
	}
}
