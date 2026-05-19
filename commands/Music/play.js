const {
	MessageEmbed,
	Message
} = require("discord.js");
const config = require("../../botconfig/config.json");
const ee = require("../../botconfig/embed.json");
const settings = require("../../botconfig/settings.json");
const { getOrCreatePlayer, searchTrack, trackTitle } = require("../../handlers/playerHelpers");
module.exports = {
	name: "play",
	category: "Music",
	aliases: ["p", "paly", "pley"],
	usage: "play <Search/link>",
	description: "Plays a Song/Playlist in your VoiceChannel",
	cooldown: 2,
	requiredroles: [],
	alloweduserids: [],
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
			
			if (channel.userLimit != 0 && channel.full)
				return message.reply({
					embeds: [new MessageEmbed()
						.setColor(ee.wrongcolor)
						.setFooter({ text: ee.footertext, iconURL: ee.footericon })
						.setTitle(`${client.allEmojis.x} Your Voice Channel is full, I can't join!`)
					],
				});
				
			if (channel.guild.members.me.voice.channel && channel.guild.members.me.voice.channel.id != channel.id) {
				return message.reply({
					embeds: [new MessageEmbed()
						.setColor(ee.wrongcolor)
						.setFooter({ text: ee.footertext, iconURL: ee.footericon })
						.setTitle(`${client.allEmojis.x} I am already connected somewhere else`)
					],
				});
			}
			
			if (!args[0]) {
				return message.reply({
					embeds: [new MessageEmbed()
						.setColor(ee.wrongcolor)
						.setFooter({ text: ee.footertext, iconURL: ee.footericon })
						.setTitle(`${client.allEmojis.x} **Please add a Search Query!**`)
						.setDescription(`**Usage:**\n> \`${client.settings.get(message.guild.id, "prefix")}play <Search/Link>\``)
					],
				});
			}

			const Text = args.join(" ");
			let newmsg = await message.reply({
				content: `🔍 Searching... \`\`\`${Text}\`\`\``,
			}).catch(e => { console.log(e) })

			try {
				let player = getOrCreatePlayer(client, guildId, channel.id, channelId);
				
				const { track } = await searchTrack(player, Text, member);
				
				if (!track) {
					return newmsg.edit({
						content: `${client.allEmojis.x} No tracks found!`,
					}).catch(() => {});
				}

				track.requester = member;
				
				await player.queue.add(track);
				
				if (!player.playing && !player.paused) {
					await player.play();
				}
				
				newmsg.edit({
					content: `${player.queue.tracks.length > 0 ? "👍 Added to queue" : "🎶 Now Playing"}: **${trackTitle(track)}**`,
				}).catch(() => {})
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
