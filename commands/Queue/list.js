const { MessageEmbed, MessageSelectMenu, MessageActionRow } = require("discord.js");
const ee = require("../../botconfig/embed.json");
const { getPlayer, currentTrack, trackTitle, trackUri, trackDuration } = require("../../handlers/playerHelpers");
module.exports = {
	name: "list",
	category: "Queue",
	aliases: ["list", "queue", "queuelist"],
	usage: "list",
	description: "Lists the current Queue",
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

				let embeds = [];
				let k = 10;
				const tracks = player.queue.tracks;
				
				let currentInfo = `**(0) Currently Playing:**\n> [\`${trackTitle(cur).replace(/\[/g, "{").replace(/\]/g, "}")}\`](${trackUri(cur)})\n`;
				
				if (tracks.length === 0) {
					const embed = new MessageEmbed().setColor(ee.color)
						.setTitle(`📑 **Queue of ${guild.name}**`)
						.setDescription(`${currentInfo}\n*No more songs in the queue*`)
						.setFooter({ text: ee.footertext, iconURL: ee.footericon });
					return message.reply({ embeds: [embed] });
				}
				
				for (let i = 0; i < tracks.length; i += 10) {
					const current = tracks.slice(i, i + 10);
					let j = i;
					const info = current.map((track) => `**${j++ + 1} -** [\`${trackTitle(track).replace(/\[/g, "{").replace(/\]/g, "}").substr(0, 60)}\`](${trackUri(track)}) - \`${client.formatDuration(trackDuration(track))}\``).join("\n");
					const embed = new MessageEmbed().setColor(ee.color).setDescription(info);
					if (i < 10) {
						embed.setTitle(`📑 **Top ${tracks.length > 50 ? 50 : tracks.length} | Queue of ${guild.name}**`);
						embed.setDescription(`${currentInfo}\n${info}`);
					}
					embeds.push(embed);
					k += 10;
				}
				
				let totalDuration = tracks.reduce((acc, track) => acc + (trackDuration(track) || 0), 0);
				embeds[embeds.length - 1].setFooter({ text: `${ee.footertext}\n${tracks.length} Songs in the Queue | Duration: ${client.formatDuration(totalDuration)}`, iconURL: ee.footericon });
				
				let pages = [];
				for (let i = 0; i < embeds.length; i += 3) {
					pages.push(embeds.slice(i, i + 3));
				}
				pages = pages.slice(0, 24);
				
				if (pages.length > 1) {
					const Menu = new MessageSelectMenu()
						.setCustomId("QUEUEPAGES")
						.setPlaceholder("Select a Page")
						.addOptions(pages.map((page, index) => ({
							label: `Page ${index + 1}`,
							value: `${index}`,
							description: `Shows page ${index + 1}/${pages.length}`
						})));
					const row = new MessageActionRow().addComponents([Menu]);
					message.reply({ embeds: [embeds[0]], components: [row] });
					
					client.on('interactionCreate', (i) => {
						if (!i.isSelectMenu()) return;
						if (i.customId === "QUEUEPAGES" && i.applicationId == client.user.id) {
							i.reply({ embeds: pages[Number(i.values[0])] }).catch(() => {});
						}
					});
				} else {
					message.reply({ embeds: [embeds[0]] });
				}
			} catch (e) {
				console.log(e.stack ? e.stack : e)
				message.reply({ content: `${client.allEmojis.x} | Error: `, embeds: [new MessageEmbed().setColor(ee.wrongcolor).setDescription(`\`\`\`${e}\`\`\``)] })
			}
		} catch (e) { console.log(String(e.stack).bgRed) }
	}
}
