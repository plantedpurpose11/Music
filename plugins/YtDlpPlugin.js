const { Plugin } = require("distube");

class YtDlpPlugin extends Plugin {
  constructor() {
    super();
  }

  async play(voiceChannel, url, options = {}, seekable) {
    // Use yt-dlp to get the stream URL instead of normal ytdl
    const ytdlpPath = process.env.YTDLP_PATH || "yt-dlp";
    
    // Parse URL to get video ID
    const videoId = this.getVideoId(url);
    if (!videoId) return null;

    try {
      // Use yt-dlp to get direct audio URL
      const { spawn } = require("child_process");
      
      // Get direct URL via yt-dlp
      const getUrl = () => new Promise((resolve, reject) => {
        const proc = spawn(ytdlpPath, [
          url,
          "-f", "bestaudio",
          "-g", "--no-playlist"
        ], {
          env: { ...process.env }
        });
        
        let output = "";
        proc.stdout.on("data", (data) => output += data);
        proc.stderr.on("data", () => {}); // Ignore errors
        proc.on("close", (code) => {
          if (code === 0 && output.trim()) {
            resolve(output.trim());
          } else {
            reject(new Error("yt-dlp failed"));
          }
        });
        proc.on("error", reject);
      });

      const directUrl = await getUrl();
      
      return {
        type: "url",
        url: directUrl,
        options: {
          ...seekable,
          YouTubeID: videoId
        }
      };
    } catch (e) {
      console.error("YtDlpPlugin error:", e.message);
      return null;
    }
  }

  getVideoId(url) {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /^([a-zA-Z0-9_-]{11})$/
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  }
}

module.exports = YtDlpPlugin;
