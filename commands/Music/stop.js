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
	name: "stop", //the command name for the Slash Command

	category: "Music",
	aliases: ["leave", "break", "destroy", "dis", "disconnect"],
	usage: "stop",

	description: "Stops playing and leaves the Channel!", //the command description for Slash Command Overview
	cooldown: 5,
	requiredroles: [], //Only allow specific Users with a Role to execute a Command [OPTIONAL]
	alloweduserids: [], //Only allow specific Users to execute a Command [OPTIONAL]
	run: async (client, message, args) => {
		try {
			const { member, channelId, guildId } = message;
			const { guild } = member;
			const { channel } = member.voice;

			if (!channel) return message.reply({
				embeds: [
					new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} **Please join ${guild.members.me.voice.channel ? "my" : "a"} VoiceChannel First!**`)
				],
			})
			
			if (channel.guild.members.me.voice.channel && channel.guild.members.me.voice.channel.id != channel.id) {
				return message.reply({
					embeds: [new MessageEmbed()
						.setColor(ee.wrongcolor)
						.setFooter({ text: ee.footertext, iconURL: ee.footericon })
						.setTitle(`${client.allEmojis.x} Join __my__ Voice Channel!`)
						.setDescription(`<#${guild.members.me.voice.channel.id}>`)
					],
				});
			}
			
			try {
				let player = client.manager?.players?.get(guildId);
				if (!player || !player.queue || player.queue.length == 0) {
					return message.reply({
						embeds: [
							new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} **I am nothing Playing right now!**`)
						],
					})
				}
				
				// Destroy the player (stops and leaves)
				player.destroy();
				
				//Reply with a Message
				message.reply({
					embeds: [new MessageEmbed()
					  .setColor(ee.color)
					  .setTimestamp()
					  .setTitle(`⏹ **Stopped playing and left the Channel!**`)
					  .setFooter({ text: `💢 Action by: ${member.user.tag}`, iconURL: member.user.displayAvatarURL({dynamic: true}) })]
				})
				return
			} catch (e) {
				console.log(e.stack ? e.stack : e)
				message.reply({
					content: `${client.allEmojis.x} | Error: `,
					embeds: [
						new MessageEmbed().setColor(ee.wrongcolor)
						.setDescription(`\`\`\`${e}\`\`\``)
					],
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
 * Migrated to use Lavalink
 * @INFO
 */