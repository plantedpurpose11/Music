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
	name: "volume", //the command name for the Slash Command

	category: "Queue",
	aliases: ["vol"],
	usage: "volume <newVolume>",

	description: "Adjusts the Volume of the Music", //the command description for Slash Command Overview
	cooldown: 10,
	requiredroles: [], //Only allow specific Users with a Role to execute a Command [OPTIONAL]
	alloweduserids: [], //Only allow specific Users to execute a Command [OPTIONAL]

	run: async (client, message, args) => {
		try {
			const { member, channelId, guildId } = message;
			const { guild } = member;
			const { channel } = member.voice;

			if (!channel) return message.reply({
				embeds: [
					new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} **Please join ${guild.members.me.voice.channel ? "__my__" : "a"} VoiceChannel First!**`)
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
				
				if (!args[0]) {
					return message.reply({
						embeds: [new MessageEmbed()
							.setColor(ee.wrongcolor)
							.setFooter({ text: ee.footertext, iconURL: ee.footericon })
							.setTitle(`${client.allEmojis.x} **Please add a Volume!**`)
							.setDescription(`**Usage:**\n> \`${client.settings.get(message.guild.id, "prefix")}volume <Percentage>\``)
						],
					});
				}
				let volume = Number(args[0])
				if (volume > 150 || volume < 0) return message.reply({
					embeds: [
						new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} **The Volume must be between \`0\` and \`150\`!**`)
					],
				})
				
				await player.setVolume(volume);
				
				message.reply({
					embeds: [new MessageEmbed()
					  .setColor(ee.color)
					  .setTimestamp()
					  .setTitle(`🔊 **Changed the Volume to \`${volume}\`!**`)
					  .setFooter({ text: `💢 Action by: ${member.user.tag}`, iconURL: member.user.displayAvatarURL({dynamic: true}) })]
				})
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