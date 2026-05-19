const { MessageEmbed } = require("discord.js");
const ee = require("../../botconfig/embed.json");
const { getPlayer, currentTrack, trackTitle, trackAuthor } = require("../../handlers/playerHelpers");
module.exports = {
	name: "addrelated",
	description: "Adds a related Song to the Queue",
	cooldown: 5,
	requiredroles: [],
	alloweduserids: [],
	options: [],
	run: async (client, interaction) => {
		try {
			const { member, channelId, guildId } = interaction;
			const { guild } = member;
			const { channel } = member.voice;
			if (!channel) return interaction.reply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} **Please join ${guild.members.me.voice.channel ? "__my__" : "a"} VoiceChannel First!**`)], ephemeral: true })
			if (channel.guild.members.me.voice.channel && channel.guild.members.me.voice.channel.id != channel.id)
				return interaction.reply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setFooter({ text: ee.footertext, iconURL: ee.footericon }).setTitle(`${client.allEmojis.x} Join __my__ Voice Channel!`).setDescription(`<#${guild.members.me.voice.channel.id}>`)], ephemeral: true });
			try {
				let player = getPlayer(client, guildId);
				const cur = currentTrack(player);
				if (!player || !cur) return interaction.reply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} **I am nothing Playing right now!**`)], ephemeral: true })
				const result = await player.search({ query: `ytsearch:${trackAuthor(cur)} ${trackTitle(cur)}` }, member);
				if (!result || !result.tracks || result.tracks.length < 2)
					return interaction.reply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} **No related Songs found!**`)], ephemeral: true });
				const relatedTrack = result.tracks[1];
				relatedTrack.requester = member;
				await player.queue.add(relatedTrack);
				const relatedTitle = relatedTrack.info?.title || relatedTrack.title || "Unknown";
				if (!player.playing && !player.paused) await player.play();
				interaction.reply({ embeds: [new MessageEmbed().setColor(ee.color).setTimestamp().setTitle(`👍 **Added related: \`${relatedTitle}\`**`).setFooter({ text: `Action by: ${member.user.tag}`, iconURL: member.user.displayAvatarURL({dynamic: true}) })] })
			} catch (e) {
				console.log(e.stack ? e.stack : e)
				interaction.reply({ content: `${client.allEmojis.x} | Error: `, embeds: [new MessageEmbed().setColor(ee.wrongcolor).setDescription(`\`\`\`${e}\`\`\``)], ephemeral: true })
			}
		} catch (e) { console.log(String(e.stack).bgRed) }
	}
}
