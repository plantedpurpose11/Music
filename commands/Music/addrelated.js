const {
        MessageEmbed,
        Message
} = require("discord.js");
const config = require("../../botconfig/config.json");
const ee = require("../../botconfig/embed.json");
const settings = require("../../botconfig/settings.json");
module.exports = {
        name: "addrelated", //the command name for the Slash Command

        category: "Music",
        usage: "addrelated",

        description: "Add a similar/related song to the current Song!", //the command description for Slash Command Overview
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

                        try {
                                let player = client.manager?.players?.get(guildId);
                                if (!player || !player.queue || player.queue.length == 0) {
                                        return message.reply({
                                                embeds: [
                                                        new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} **I am nothing Playing right now!**`)
                                                ],
                                        })
                                }

                                // Get current song
                                const currentSong = player.queue[0];
                                
                                //update it without a response!
                                let thenewmsg = await message.reply({
                                        content: `🔍 Searching Related Song for... **${currentSong.title}**`,
                                }).catch(e => {
                                        console.log(e)
                                })

                                // Search for related tracks using the current song's info
                                const node = [...client.manager?.nodeManager?.nodes?.values()][0];
                                if (!node) {
                                        return message.reply({
                                                content: `${client.allEmojis.x} No Lavalink node available!`,
                                                embeds: []
                                        });
                                }

                                // Search with the current song name to find related tracks
                                const result = await node.search(`${currentSong.author} ${currentSong.title}`);
                                
                                if (!result.tracks || result.tracks.length <= 1) {
                                        return thenewmsg.edit({
                                                content: `${client.allEmojis.x} No related songs found!`,
                                        }).catch(e => {})
                                }

                                // Get a different track from the results (skip the first one since it's the current song)
                                let relatedTrack = result.tracks[1];
                                let attempts = 1;
                                while (relatedTrack.uri === currentSong.uri && attempts < result.tracks.length) {
                                        relatedTrack = result.tracks[attempts++];
                                }
                                
                                if (attempts >= result.tracks.length) {
                                        return thenewmsg.edit({
                                                content: `${client.allEmojis.x} No different related songs found!`,
                                        }).catch(e => {})
                                }

                                // Add the related track to queue
                                relatedTrack.requester = member;
                                player.queue.push(relatedTrack);
                                
                                // If not playing, start playing
                                if (!player.playing) {
                                        player.play(relatedTrack);
                                }

                                await thenewmsg.edit({
                                        content: `👍 Added: **${relatedTrack.title}**`,
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