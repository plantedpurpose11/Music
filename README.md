# Musicium

*An advanced Discord Music Bot with a Dashboard, using distube.js.org having an interactive button & menu system and many features!*
**Supported Features:** *Spotify • YouTube • SoundCloud • Live Stream • Audio Filtering • DJ Roles • Autoplay • Autoresume • Dashboard • ...*

***

### [**DISCORD SUPPORT SERVER INVITE**](https://discord.gg/dcdev)

> 🦾 [Replit Hosting Tutorial](https://www.youtube.com/watch?v=Mv4QbxSv59M)

> 💪 [General Hosting Tutorial (VPS)](https://www.youtube.com/watch?v=yPBo2Gbp9VY) + **Hosting-Bug Fixes**

***

## Features:
> ✓ Dashboard with Live Queue Control System
> 
> ✓ Auto resume
> 
> ✓ Setupable Music Request System-Channel
> 
> ✓ Crips and High Quality, thanks to FFMPEG based Audio streaming
> 
> ✓ A ton of Music-based Commands, including over 30 Filters!
> 
> ✓ Default Music values like: `volume`, `filter`, `equalizer`, `autoplay`, ...
> 
> ✓ DJ-System
> 
> ✓ Stable & Up to date with discord.js v13
> 
> ✓ Suport 1700 music sources + Stage & Thread Channels
> 
> ✓ Works on Replit.com and any vps

## Installation Guide (Hosting)

> 🖖 [**Repl.it Fork**](https://replit.com/@OxyTomato/Musicium)
> 
> - ` 0. ` have **Node.js 22.12 or higher in the Node 22 release line**
> 
> - ` 1. ` have **ffmpeg and at least 100mb Ram**
> 
> - ` 2. ` in `./botconfig/config.json` Adjust the BOT TOKEN and PREFIX **NOTE:** You __don't__ need the `ksoftapi`! It's disabled!
> 
> - ` 3. ` in `./botconfig/settings.json` Adjust the DEFAULT MESSAGES AND OTHER SETTINGS
> 
> - ` 4. ` in `./botconfig/embed.json` Adjust the EMBED SETTINGS
> 
> - ` 5. ` in `./dashboard/settings.json` Adjust the parameters!
> 
> - ` 6. ` `npm install` to Install the depedences If you get **PYTHON ERRORS** Try this: `npm install --python=python2.7`
> 
> - ` 7. ` `node .` to start the Bot

***

## Slash Commands Information

> To add a Subcommand create a Folder in `./slashCommands`

> Make sure to add it's Settings in `./botconfig/config.json`

> You can't have more folder then 1 Layer

> If u want to create "normal" Slash commands create the files just in `./slashCommands`

***

## [Discord Server 😎](https://discord.gg/milrato) | [Website](https://milrato.dev)
<a href="https://discord.gg/milrato"><img src="https://discord.com/api/guilds/773668217163218944/widget.png?style=banner2"></a>

***

## SUPPORT ME AND MILRATO DEVELOPMENT

> You can always Support me by inviting one of my **own Discord Bots**

[![2021's best Music Bot | Lava Music](https://cdn.discordapp.com/attachments/748533465972080670/817088638780440579/test3.png)](https://lava.milrato.dev)
[![Musicium Music Bot](https://cdn.discordapp.com/attachments/742446682381221938/770055673965707264/test1.png)](https://musicium.musicium.dev)
[![Milrato Multi Bot](https://cdn.discordapp.com/attachments/742446682381221938/770056826724679680/test1.png)](https://milrato.milrato.dev)

# Credits

> If consider using this Bot, make sure to credit me!


## Prefix music features (Discord.js v13)

Use your server's configured prefix (default `~`) in a text channel outside the music request panel:

- `~nodes`: lists every configured Lavalink node, its connection status, and how many of this bot's servers it is actively playing for. Paused players are excluded.
- `~setbanner` with an image attached: administrators can save a PNG, JPEG, GIF, or WebP up to 5 MiB. The image bytes are kept in the existing Enmap settings database, so Discord attachment URL expiration does not affect saved banners. Keep `databases/` on persistent storage and include it in backups. The banner appears on the idle panel and new `~setupmusic #channel` panels. `~setbanner none` resets it; image URLs remain supported but depend on the external host.
- `~lyrics [song name]`: gets lyrics from the player's Lavalink node. The panel and now-playing **Lyrics** buttons show the current track's lyrics privately to listeners in the bot's voice channel. Long lyrics include a text attachment.

Lyrics require a compatible plugin on Lavalink, such as LavaLyrics with a configured lyrics provider (LavaSrc or java-lyrics-plugin). Missing lyrics or unavailable plugins produce a helpful message. No external lyrics API key is used by the bot.

Song searches prefer original recordings over unsolicited karaoke, remix, cover, instrumental, and similar versions. Explicit requests such as “song remix” retain those versions. Direct links and playlist order are preserved.

### Feature checks

With Node 22 and dependencies installed, run `node --test tests/*.test.js`. These tests use synthetic Discord/Lavalink responses and temporary database fixtures.

Voice connections wait for Lavalink's `connected` acknowledgement, and handle Discord's voice-state and voice-server packets in either arrival order. Failed connections stop the request instead of queueing into an unready player. Playback source errors and Discord voice closures are reported in the request channel; the bot console also logs connection, mute/suppression, and volume status without dumping voice tokens.

If YouTube finds a song but its clients cannot load the stream, queued songs continue normally. When the failure would end the queue, the bot tries SoundCloud and then Bandcamp on the same Lavalink node, at most once each. Backups must match the original title, artist, and approximate duration; unsolicited covers, karaoke, and remixes are rejected. A new request or Stop cancels pending recovery. Discord shows a short error if no suitable backup is available; the bot console keeps the source error details.

This recovery does not repair the Lavalink YouTube plugin. On managed Lavalink hosting, contact your provider with the YouTube plugin version and the client errors from the bot console. A source marked "Enabled" can still fail to supply audio; the provider manages plugin updates, client configuration, and authentication. If you manage Lavalink yourself, review `plugins.youtube` against the [official YouTube source configuration](https://github.com/lavalink-devs/youtube-source#configuration). Backup playback also depends on the node's enabled providers and their available recordings. Failure notices identify the source that failed and any backup lookup errors.
