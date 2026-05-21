const { MessageEmbed } = require("discord.js");
  const ee = require("../../botconfig/embed.json");

  module.exports = {
    name: "create",
    description: "Save the current song and queue as a new playlist",
    cooldown: 10,
    requiredroles: [],
    alloweduserids: [],
    options: [
      { "String": { name: "name", description: "Name for your new playlist", required: true } }
    ],
    run: async (client, interaction) => {
      await interaction.deferReply({ ephemeral: true });
      try {
        const { member, guildId } = interaction;
        const playlistName = (interaction.options.getString("name") || "").trim();

        if (!playlistName || playlistName.length < 1)
          return interaction.editReply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} Please provide a playlist name!`)] });

        if (playlistName.length > 50)
          return interaction.editReply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} Name too long! (max 50 chars)`)] });

        const player = client.manager?.players?.get(guildId);
        const hasCurrent = player?.queue?.current;
        const hasQueued  = player?.queue?.tracks?.length > 0;

        if (!player || (!hasCurrent && !hasQueued))
          return interaction.editReply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} Nothing playing or queued to save!`).setDescription("Add some songs first using `/music play`")] });

        const mapTrack = t => {
          if (!t || !t.info) return null;
          return {
            info: {
              identifier: t.info.identifier || "",
              uri: t.info.uri || "",
              title: t.info.title || "Unknown",
              author: t.info.author || "Unknown",
              length: t.info.length || 0,
              isStream: t.info.isStream || false,
            },
            requester: { id: t.requester?.id, tag: t.requester?.user?.tag || t.requester?.tag }
          };
        };

        const tracks = [
          ...(hasCurrent ? [mapTrack(player.queue.current)].filter(Boolean) : []),
          ...(player.queue.tracks || []).map(mapTrack).filter(Boolean)
        ];

        if (tracks.length === 0)
          return interaction.editReply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} Queue is empty!`)] });

        client.infos.ensure(guildId, {});


        const allPlaylists = client.infos.get(guildId, "playlists") || {};
        if (allPlaylists[playlistName.toLowerCase()])
          return interaction.editReply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} A playlist named "${playlistName}" already exists!`).setDescription("Use `/playlist delete` first, or choose a different name.")] });

        allPlaylists[playlistName.toLowerCase()] = {
          name: playlistName,
          tracks,
          author: { id: member.id, tag: member.user.tag },
          createdAt: Date.now()
        };
        client.infos.set(guildId, allPlaylists, "playlists");

        return interaction.editReply({ embeds: [new MessageEmbed()
          .setColor(ee.color)
          .setTitle(`${client.allEmojis.check_mark} Playlist Created!`)
          .setDescription(`**${playlistName}** saved with \`${tracks.length}\` song(s)!`)
          .addField("Songs:", tracks.map((t, i) => `${i + 1}. ${(t.info.title || "Unknown").substring(0, 40)}`).join("\n").substring(0, 1000))
          .setFooter({ text: `By: ${member.user.tag}`, iconURL: member.user.displayAvatarURL({ dynamic: true }) })
        ]});
      } catch (e) {
        console.log(e.stack || e);
        interaction.editReply({ embeds: [new MessageEmbed().setColor(ee.wrongcolor).setTitle(`${client.allEmojis.x} Error`).setDescription(`\`\`\`${e.message || e}\`\`\``)] }).catch(() => {});
      }
    }
  };