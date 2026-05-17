const {
	MessageEmbed,
	MessageSelectMenu,
	MessageActionRow
} = require("discord.js");
const config = require("../../botconfig/config.json");
const ee = require("../../botconfig/embed.json");
const settings = require("../../botconfig/settings.json");
const {
	check_if_dj
} = require("../../handlers/functions")
module.exports = {
	name: "list", //the command name for the Slash Command

	category: "Queue",
	aliases: ["list", "queue", "queuelist"],
	usage: "list",

	description: "Lists the current Queue", //the command description for Slash Command Overview
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

				let embeds = [];
				let k = 10;
				let theSongs = player.queue;
				
				// Current playing track
				let currentInfo = "";
				if (player.queue[0]) {
					currentInfo = `**(0) Current Song:**\n> [\`${player.queue[0].title.replace(/\[/igu, "{").replace(/\]/igu, "}")}\`](${player.queue[0].uri})\n`;
				}
				
				//defining each Pages
				for (let i = 0; i < theSongs.length; i += 10) {
					let qus = theSongs;
					const current = qus.slice(i, k)
					let j = i;
					const info = current.map((track) => `**${j++} -** [\`${String(track.title).replace(/\[/igu, "{").replace(/\]/igu, "}").substr(0, 60)}\`](${track.uri}) - \`${client.formatDuration(track.duration)}\``).join("\n")
					const embed = new MessageEmbed()
						.setColor(ee.color)
						.setDescription(`${info}`)
					if (i < 10) {
						embed.setTitle(`📑 **Top ${theSongs.length > 50 ? 50 : theSongs.length} | Queue of ${guild.name}**`)
						embed.setDescription(`${currentInfo}\n${info}`)
					}
					embeds.push(embed);
					k += 10;
				}
				
				// Total duration
				let totalDuration = theSongs.reduce((acc, track) => acc + (track.duration || 0), 0);
				
				embeds[embeds.length - 1] = embeds[embeds.length - 1]
					.setFooter({ text: ee.footertext + `\n${theSongs.length} Songs in the Queue | Duration: ${client.formatDuration(totalDuration)}`, iconURL: ee.footericon })
				
				let pages = []
				for (let i = 0; i < embeds.length; i += 3) {
					pages.push(embeds.slice(i, i + 3));
				}
				pages = pages.slice(0, 24)
				
				const Menu = new MessageSelectMenu()
					.setCustomId("QUEUEPAGES")
					.setPlaceholder("Select a Page")
					.addOptions([
						pages.map((page, index) => {
							let Obj = {};
							Obj.label = `Page ${index}`
							Obj.value = `${index}`;
							Obj.description = `Shows the ${index}/${pages.length - 1} Page!`
							return Obj;
						})
					])
				const row = new MessageActionRow().addComponents([Menu])
				message.reply({
					embeds: [embeds[0]],
					components: [row],
				});
				
				//Event
				client.on('interactionCreate', (i) => {
					if (!i.isSelectMenu()) return;
					if (i.customId === "QUEUEPAGES" && i.applicationId == client.user.id) {
						i.reply({
							embeds: pages[Number(i.values[0])],
						}).catch(e => {})
					}
				});
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