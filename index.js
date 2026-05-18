const Discord = require("discord.js");
const config = require(`./botconfig/config.json`);
const settings = require(`./botconfig/settings.json`);
const filtersConfig = require(`./botconfig/filters.json`);
const colors = require("colors");
const Enmap = require("enmap");
const voice = require("@discordjs/voice");

// Verify voice encryption library loaded (sodium-native for xchacha20)
try {
  const sodium = require("sodium-native");
  console.log("Voice encryption: sodium-native loaded OK".green);
} catch (e) {
  console.warn("Voice encryption: sodium-native not available, falling back to other libs".yellow);
}

// Import Lavalink client (v4 compatible)
let LavalinkManager, LavalinkNode;
try {
  const lc = require('./node_modules/lavalink-client/dist/index.cjs');
  LavalinkManager = lc.LavalinkManager;
  console.log("Using lavalink-client v4".cyan);
} catch(e) {
  console.warn("lavalink-client not available, using erela.js fallback".yellow);
  const { Manager } =require("erela.js");
  LavalinkManager = null;
}

// Set up Lavalink nodes
const lavalinkNodes = [{
  host: config.lavalink?.host || "localhost",
  port: config.lavalink?.port || 2333,
  authorization: config.lavalink?.password || "youshallnotpass",
  secure: config.lavalink?.secure || false,
}];

let manager = null;

// Initialize the Discord client
const client = new Discord.Client({
    fetchAllMembers: false,
    shards: "auto",
    allowedMentions: {
      parse: [],
      repliedUser: false,
    },
    failIfNotExists: false,
    partials: ['MESSAGE', 'CHANNEL', 'REACTION'],
    intents: [ 
        Discord.Intents.FLAGS.GUILDS,
        Discord.Intents.FLAGS.GUILD_MESSAGES,
        Discord.Intents.FLAGS.GUILD_VOICE_STATES,
    ],
    presence: {
      activity: { 
        name: `+help | musicium.eu`, 
        type: "PLAYING", 
      },
      status: "online"
    }
});

// Bot coded by: Tomato#6966
// Migrated to use Lavalink

//Define some Global Collections
client.commands = new Discord.Collection();
client.cooldowns = new Discord.Collection();
client.slashCommands = new Discord.Collection();
client.aliases = new Discord.Collection();
client.categories = require("fs").readdirSync(`./commands`);
client.allEmojis = require("./botconfig/emojis.json");
client.maps = new Map();

client.setMaxListeners(100); require('events').defaultMaxListeners = 100;

client.settings = new Enmap({ name: "settings", dataDir: "./databases/settings"});
client.infos = new Enmap({ name: "infos", dataDir: "./databases/infos"});
client.autoresume = new Enmap({ name: "autoresume", dataDir: "./databases/infos"});

// Helper function to format duration
function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const secs = seconds % 60;
  const mins = minutes % 60;
  
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Make helper available globally
client.formatDuration = formatDuration;

// Initialize the music manager when client is ready
client.on("ready", () => {
  if (LavalinkManager) {
    // Use lavalink-client v4
    manager = new LavalinkManager({
      nodes: lavalinkNodes,
      userName: client.user.username,
      defaultSearchPlatform: 'ytm',
      sendToShard: (guildId, payload) => {
        const guild = client.guilds.cache.get(guildId);
        if (guild) guild.shard.send(JSON.stringify(payload));
        return true;
      }
    })
    .on("ready", (node) => {
      console.log(`Lavalink node connected: ${node.id}`.green);
    })
    .on("error", (node, error) => {
      console.log(`Lavalink node error: ${error.message}`.red);
    });
    
    manager.init({ id: client.user.id });
    console.log("Lavalink Manager initialized (v4)".cyan);
  } else {
    // Fallback to erela.js
    const { Manager } = require("erela.js");
    manager = new Manager({
      nodes: lavalinkNodes,
      deploymentId: client.user.id,
      send: (id, payload) => {
        const guild = client.guilds.cache.get(id);
        if (guild) guild.shard.send(payload);
      },
    })
    .on("nodeReady", (node) => {
      console.log(`Lavalink node connected: ${node.id}`.green);
    })
    .on("nodeError", (node, error) => {
      console.log(`Lavalink node error: ${error.message}`.red);
    })
    .on("trackStart", (player, track) => {
      if (player.textChannel) {
        const channel = client.channels.cache.get(player.textChannel);
        if (channel) {
          channel.send({
            embeds: [{
              color: 0x00ff00,
              title: "Now Playing",
              description: `[${track.title}](${track.uri})`,
              thumbnail: { url: track.thumbnail },
              fields: [
                { name: "Requested by", value: track.requester?.toString() || "Unknown" },
                { name: "Duration", value: track.isStream ? "LIVE" : formatDuration(track.duration) }
              ]
            }]
          });
        }
      }
    })
    .on("queueEnd", (player) => {
      if (settings.leaveOnFinish) {
        player.destroy();
      }
    });

    manager.init(client.user.id);
    console.log("Erela.js Manager initialized".cyan);
  }
  
  // Set the manager on the client
  client.manager = manager;
});

//Require the Handlers - Add the antiCrash file too, if its enabled
["events", "commands", "slashCommands", settings.antiCrash ? "antiCrash" : null, "lavalinkEvent"]
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
 * Migrated to use Lavalink
 * @INFO
 */

/**
 * @LOAD_THE_DASHBOARD - Loading the Dashboard Module with the BotClient into it!
 */
client.on("ready", () => {
  require("./dashboard/index.js")(client);
})