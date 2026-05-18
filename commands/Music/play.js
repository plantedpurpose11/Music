const {
	MessageEmbed,
	Message
} = require("discord.js");
const config = require("../../botconfig/config.json");
const ee = require("../../botconfig/embed.json");
const settings = require("../../botconfig/settings.json");
module.exports = {
	name: "play", //the command name for the Slash Command

	category: "Music",
	aliases: ["p", "paly", "pley"],
	usage: "play <Search/link>",

	description: "Plays a Song/Playlist in your VoiceChannel", //the command description for Slash Command Overview
	cooldown: 2,
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
			}).catch(e => {
				console.log(e)
			})

			try {
				// Get or create player
				let player = client.manager?.players?.get(guildId);
				
				if (!player) {
					player = client.manager.createPlayer(guildId, { voiceChannelId: channel.id });
					player.connect({ deafen: true });
				}
				
				// Search for tracks using Lavalink node
				const node = [...client.manager?.nodeManager?.nodes?.values()][0];
				if (!node) {
					return message.reply({
						content: `${client.allEmojis.x} No Lavalink node available!`,
						embeds: []
					});
				}
				
				// Search for the track
				const result = await node.search(Text, message.author?.id); console.log("Search:", JSON.stringify(result));
				
				if (!result.tracks || result.tracks.length === 0) {
					return message.reply({
						content: `${client.allEmojis.x} No tracks found!`,
						embeds: []
					});
				}
				
				const track = result.tracks[0];
				track.requester = member;
				
				// Add to queue
				player.queue.push(track);
				
				// Store text channel for now playing messages
				player.textChannel = channelId;
				
				// If not playing, start playing
				if (!player.playing) {
					player.play(track);
				}
				
				// Update the message
				newmsg.edit({
					content: `${player.queue.length > 1 ? "👍 Added" : "🎶 Now Playing"}: \`\`\`css\n${Text}\n\`\`\``,
				}).catch(e => {
					console.log(e)
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