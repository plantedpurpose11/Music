const Discord = require("discord.js");
const config = require(`./botconfig/config.json`);
const settings = require(`./botconfig/settings.json`);
const filtersConfig = require(`./botconfig/filters.json`);
const colors = require("colors");
const Enmap = require("enmap");

// Import Lavalink client
let LavalinkManager;
try {
  const lc = require('lavalink-client');
  LavalinkManager = lc.LavalinkManager;
  console.log("lavalink-client loaded".cyan);
} catch(e) {
  console.error("lavalink-client not installed! Run: npm install lavalink-client".red);
  process.exit(1);
}

// Set up Lavalink nodes
const lavalinkNodes = [{
  host: config.lavalink?.host || "localhost",
  port: config.lavalink?.port || 2333,
  authorization: config.lavalink?.password || "youshallnotpass",
  secure: config.lavalink?.secure || false,
}];

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
        name: `~help | Forge Music`, 
        type: "PLAYING", 
      },
      status: "online"
    }
});

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

// Helper function to format duration (ms to human readable)
function formatDuration(ms) {
  if (!ms || isNaN(ms)) return "0:00";
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

client.formatDuration = formatDuration;

// INITIALIZE LAVALINK MANAGER IMMEDIATELY (not in ready event)
const manager = new LavalinkManager({
  nodes: lavalinkNodes,
  userName: client.user?.username || "MusicBot",
  defaultSearchPlatform: 'ytm',
  sendToShard: (guildId, payload) => {
    const guild = client.guilds.cache.get(guildId);
    if (guild) guild.shard.send(payload);
    return true;
  }
});

manager
  .on("ready", (node) => {
    console.log(`Lavalink node connected: ${node.id}`.green);
  })
  .on("error", (node, error) => {
    console.log(`Lavalink node error: ${error.message}`.red);
  })
  .on("playerCreate", (player) => {
    console.log(`Player created for guild: ${player.guildId}`.cyan);
  });

client.manager = manager;

// Initialize manager when client is ready
client.on("ready", () => {
  if (!manager.initiated) {
    manager.init({ id: client.user.id });
    console.log("Lavalink Manager initialized".cyan);
  }
});

// Forward voice state updates to Lavalink manager
client.on("raw", (d) => {
  if (d.t === "VOICE_STATE_UPDATE" || d.t === "VOICE_SERVER_UPDATE") {
    client.manager?.sendRawData(d);
  }
});

//Require the Handlers
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
 * @LOAD_THE_DASHBOARD
 */
client.on("ready", () => {
  require("./dashboard/index.js")(client);
})
