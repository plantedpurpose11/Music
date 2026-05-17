// Polyfill Web API globals for Node.js < 18/19
// Required by undici (used by @distube/ytdl-core) and serialize-javascript
(function() {
    // crypto (global since Node 19)
    if (typeof globalThis.crypto === 'undefined') {
        try { globalThis.crypto = require('crypto').webcrypto; } catch {}
    }
    // Web Streams (global since Node 18)
    if (typeof globalThis.ReadableStream === 'undefined') {
        try {
            const streams = require('stream/web');
            globalThis.ReadableStream = streams.ReadableStream;
            globalThis.WritableStream = streams.WritableStream;
            globalThis.TransformStream = streams.TransformStream;
        } catch {}
    }
    // Blob (global since Node 18)
    if (typeof globalThis.Blob === 'undefined') {
        try { globalThis.Blob = require('buffer').Blob; } catch {}
    }
    // File (global since Node 20)
    if (typeof globalThis.File === 'undefined') {
        try { globalThis.File = require('buffer').File; } catch {
            // Node < 20: minimal shim
            if (typeof globalThis.Blob !== 'undefined') {
                globalThis.File = class File extends globalThis.Blob {
                    constructor(parts, name, opts = {}) {
                        super(parts, opts);
                        this.name = name;
                        this.lastModified = opts.lastModified || Date.now();
                    }
                };
            }
        }
    }
    // DOMException (global since Node 17)
    if (typeof globalThis.DOMException === 'undefined') {
        try { globalThis.DOMException = require('domexception'); } catch {
            globalThis.DOMException = class DOMException extends Error {
                constructor(message, name) {
                    super(message);
                    this.name = name || 'DOMException';
                    this.code = 0;
                }
            };
        }
    }
    // structuredClone (global since Node 17)
    if (typeof globalThis.structuredClone === 'undefined') {
        try {
            const { deserialize, serialize } = require('v8');
            globalThis.structuredClone = (val) => deserialize(serialize(val));
        } catch {}
    }
    // fetch, Headers, Request, Response, FormData (global since Node 18)
    if (typeof globalThis.fetch === 'undefined') {
        try {
            const undici = require('undici');
            globalThis.fetch = undici.fetch;
            globalThis.Headers = undici.Headers;
            globalThis.Request = undici.Request;
            globalThis.Response = undici.Response;
            globalThis.FormData = undici.FormData;
        } catch {}
    }
})();

const Discord = require("discord.js");
const config = require(`./botconfig/config.json`);
const settings = require(`./botconfig/settings.json`);
const filters = require(`./botconfig/filters.json`);
const colors = require("colors");
const Enmap = require("enmap");
const libsodium = require("libsodium-wrappers");
const ffmpeg = require("ffmpeg-static");
const voice = require("@discordjs/voice");
const DisTube = require("distube").default;
const { HttpsProxyAgent } = require('https-proxy-agent');
const client = new Discord.Client({
    fetchAllMembers: false,
    //restTimeOffset: 0,
    //restWsBridgetimeout: 100,
    shards: "auto",
    //shardCount: 5,
    allowedMentions: {
      parse: [ ],
      repliedUser: false,
    },
    failIfNotExists: false,
    partials: ['MESSAGE', 'CHANNEL', 'REACTION'],
    intents: [ 
        Discord.Intents.FLAGS.GUILDS,
        //Discord.Intents.FLAGS.GUILD_MEMBERS,
        Discord.Intents.FLAGS.GUILD_MESSAGES,
        Discord.Intents.FLAGS.GUILD_VOICE_STATES,
        //Discord.Intents.FLAGS.GUILD_BANS,
        //Discord.Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS,
        //Discord.Intents.FLAGS.GUILD_INTEGRATIONS,
        //Discord.Intents.FLAGS.GUILD_WEBHOOKS,
        //Discord.Intents.FLAGS.GUILD_INVITES,
        //Discord.Intents.FLAGS.GUILD_PRESENCES,
        //Discord.Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
        //Discord.Intents.FLAGS.GUILD_MESSAGE_TYPING,
        //Discord.Intents.FLAGS.DIRECT_MESSAGES,
        //Discord.Intents.FLAGS.DIRECT_MESSAGE_REACTIONS,
        //Discord.Intents.FLAGS.DIRECT_MESSAGE_TYPING
    ],
    presence: {
      activity: {
        name: `+help | musicium.eu`, 
        type: "PLAYING", 
      },
      status: "online"
    }
});
//BOT CODED BY: Tomato#6966
//DO NOT SHARE WITHOUT CREDITS!
// Only use proxy if configured via PROXY_URL env var
const proxyUrl = process.env.PROXY_URL;
const agent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;
const { SpotifyPlugin } = require("@distube/spotify");
const { SoundCloudPlugin } = require("@distube/soundcloud");
let spotifyoptions = {
  parallel: true,
  emitEventsAfterFetching: true,
}
if(config.spotify_api.enabled){
  spotifyoptions.api = {
    clientId: config.spotify_api.clientId,
    clientSecret: config.spotify_api.clientSecret,
  }
}
client.distube = new DisTube(client, {
  emitNewSongOnly: false,
  leaveOnEmpty: true,
  leaveOnFinish: true,
  leaveOnStop: true,
  savePreviousSongs: true,
  emitAddSongWhenCreatingQueue: false,
  //emitAddListWhenCreatingQueue: false,
  searchSongs: 0,
  youtubeCookie: config.youtubeCookie,     //Comment this line if you dont want to use a youtube Cookie 
  nsfw: false, //Set it to false if u want to disable nsfw songs
  emptyCooldown: 25,
  ytdlOptions: {
    ...(agent ? { requestOptions: { agent } } : {}),    
    highWaterMark: 1024 * 1024 * 64,
    quality: "highestaudio",
    format: "audioonly",
    liveBuffer: 60000,
    dlChunkSize: 1024 * 1024 * 4,
  },
  youtubeDL: true,
  updateYouTubeDL: true,
  customFilters: filters,
  plugins: [
    new SpotifyPlugin(spotifyoptions),
    new SoundCloudPlugin()
  ]
})
//Define some Global Collections
client.commands = new Discord.Collection();
client.cooldowns = new Discord.Collection();
client.slashCommands = new Discord.Collection();
client.aliases = new Discord.Collection();
client.categories = require("fs").readdirSync(`./commands`);
client.allEmojis = require("./botconfig/emojis.json");
client.maps = new Map();

client.setMaxListeners(100); require('events').defaultMaxListeners = 100;

client.settings = new Enmap({ name: "settings",dataDir: "./databases/settings"});
client.infos = new Enmap({ name: "infos", dataDir: "./databases/infos"});
client.autoresume = new Enmap({ name: "autoresume", dataDir: "./databases/infos"});

//Require the Handlers                  Add the antiCrash file too, if its enabled
["events", "commands", "slashCommands", settings.antiCrash ? "antiCrash" : null, "distubeEvent"]
    .filter(Boolean)
    .forEach(h => {
        require(`./handlers/${h}`)(client);
    })
//Start the Bot
const botToken = process.env.DISCORD_TOKEN || config.token;
if (!botToken) {
    console.error("No bot token found! Set DISCORD_TOKEN env var or add token to botconfig/config.json");
    process.exit(1);
}
client.login(botToken)

/**
 * @INFO
 * Bot Coded by Tomato#6966 | https://discord.gg/milrato
 * @INFO
 * Work for Milrato Development | https://milrato.eu
 * @INFO
 * Please mention Him / Milrato Development, when using this Code!
 * @INFO
 */






/**
 * @LOAD_THE_DASHBOARD - Loading the Dashbaord Module with the BotClient into it!
 */
client.on("ready", () => {
  require("./dashboard/index.js")(client);
})