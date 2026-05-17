const {
	MessageEmbed,
	Message
} = require("discord.js");
const config = require("../../botconfig/config.json");
const ee = require("../../botconfig/embed.json");
const settings = require("../../botconfig/settings.json");
const {
	check_if_dj
} = require("../../handlers/functions")
module.exports = {
	name: "status", //the command name for the Slash Command
	description: "Shows the Queue Status", //the command description for Slash Command Overview
	cooldown: 10,
	requiredroles: [], //Only allow specific Users with a Role to execute a Command [OPTIONAL]
	alloweduserids: [], //Only allow specific Users to execute a Command [OPTIONAL]
	run: async (client, interaction) => {
		try {
			//things u can directly access in an interaction!
			const {
				member,
				channelId,
				guildId,
				applicationId,
				commandName,
				deferred,
				replied,
				ephemeral,
				options,
				id,
				createdTimestamp
			} = interaction;
			const {
				guild
			} = member;
			const {
				channel
			} = member.voice;
			if (!channel) return interaction.reply({
				embeds: [
					new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} **Please join ${guild.members.me.voice.channel ? "__my__" : "a"} VoiceChannel First!**`)
				],
				ephemeral: true
			})
			if (channel.guild.members.me.voice.channel && channel.guild.members.me.voice.channel.id != channel.id) {
				return interaction.reply({
					embeds: [new MessageEmbed()
						.setColor(ee.wrongcolor)
						.setFooter({ text: ee.footertext, iconURL: ee.footericon })
						.setTitle(`${client.allEmojis.x} Join __my__ Voice Channel!`)
						.setDescription(`<#${guild.members.me.voice.channel.id}>`)
					],
					ephemeral: true
				});
			}
			try {
				let newQueue = client.distube.getQueue(guildId);
				if (!newQueue || !newQueue.songs || newQueue.songs.length == 0) return interaction.reply({
					embeds: [
						new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} **I am nothing Playing right now!**`)
					],
					ephemeral: true
				})
				var djs = client.settings.get(newQueue.id, `djroles`);
				if(!djs || !Array.isArray(djs)) djs = [];
				else djs = djs.map(r => `<@&${r}>`);
				if(djs.length == 0 ) djs = "`not setup`";
				else djs.slice(0, 15).join(", ");
				let newTrack = newQueue.songs[0];
				let embed = new MessageEmbed().setColor(ee.color)
					.setDescription(`See the [Queue on the **DASHBOARD** Live!](http://dashboard.musicium.eu/queue/${newQueue.id})`)
					.addFields({ name: `💡 Requested by:`, value: `>>> ${newTrack.user}`, inline: true })
					.addFields({ name: `⏱ Duration:`, value: `>>> \`${newQueue.formattedCurrentTime} / ${newTrack.formattedDuration}\``, inline: true })
					.addFields({ name: `🌀 Queue:`, value: `>>> \`${newQueue.songs.length} song(s)\`\n\`${newQueue.formattedDuration}\``, inline: true })
					.addFields({ name: `🔊 Volume:`, value: `>>> \`${newQueue.volume} %\``, inline: true })
					.addFields({ name: `♾ Loop:`, value: `>>> ${newQueue.repeatMode ? newQueue.repeatMode === 2 ? `${client.allEmojis.check_mark} \`Queue\`` : `${client.allEmojis.check_mark} \`Song\`` : `${client.allEmojis.x}`}`, inline: true })
					.addFields({ name: `↪️ Autoplay:`, value: `>>> ${newQueue.autoplay ? `${client.allEmojis.check_mark}` : `${client.allEmojis.x}`}`, inline: true })
					.addFields({ name: `❔ Download Song:`, value: `>>> [\`Click here\`](${newTrack.streamURL})`, inline: true })
					.addFields({ name: `❔ Filter${newQueue.filters.length > 0 ? "s": ""}:`, value: `>>> ${newQueue.filters && newQueue.filters.length > 0 ? `${newQueue.filters.map(f=>`\`${f}\``).join(`, `)}` : `${client.allEmojis.x}`}`, inline: newQueue.filters.length > 1 ? false : true })
					.addFields({ name: `🎧 DJ-Role${djs.length > 1 ? "s": ""}:`, value: `>>> ${djs}`, inline: djs.length > 1 ? false : true })
					.setAuthor(`${newTrack.name}`, `https://images-ext-1.discordapp.net/external/DkPCBVBHBDJC8xHHCF2G7-rJXnTwj_qs78udThL8Cy0/%3Fv%3D1/https/cdn.discordapp.com/emojis/859459305152708630.gif`, newTrack.url)
					.setThumbnail(`https://img.youtube.com/vi/${newTrack.id}/mqdefault.jpg`)
					.setFooter({ text: `💯 ${newTrack.user.tag}`, iconURL: newTrack.user.displayAvatarURL({
						dynamic: true
					}) });
				interaction.reply({
					embeds: [embed]
				})
			} catch (e) {
				console.log(e.stack ? e.stack : e)
				interaction.editReply({
					content: `${client.allEmojis.x} | Error: `,
					embeds: [
						new MessageEmbed().setColor(ee.wrongcolor)
						.setDescription(`\`\`\`${e}\`\`\``)
					],
					ephemeral: true
				})
			}
		} catch (e) {
			console.log(String(e.stack).bgRed)
		}
	}
}
/**
 * @INFO
 * Bot Coded by Tomato#6966 | https://github.com/Tomato6966/Discord-Js-Handler-Template
 * @INFO
 * Work for Milrato Development | https://milrato.eu
 * @INFO
 * Please mention Him / Milrato Development, when using this Code!
 * @INFO
 */
