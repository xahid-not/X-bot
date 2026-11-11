
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const baseApiUrl = async () => {
  const base = await axios.get(
    "https://raw.githubusercontent.com/mahmudx7/HINATA/main/baseApiUrl.json",
    { timeout: 15000 }
  );
  return base.data.mahmud;
};

/**
 * @author MahMUD
 * @author: do not delete it
 */

module.exports = {
  config: {
    name: "kiss2",
    aliases: ["k2"],
    version: "1.8",
    author: "MahMUD",
    role: 0,
    category: "fun",
    cooldown: 8,
    guide: "{pn}kiss2 [mention/reply/UID]"
  },

  onStart: async function ({ api, event, args }) {
    const obfuscatedAuthor = String.fromCharCode(77, 97, 104, 77, 85, 68);

    if (module.exports.config.author !== obfuscatedAuthor) {
      return api.sendMessage(
        "You are not authorized to change the author name.",
        event.threadID,
        event.messageID
      );
    }

    const {
      threadID,
      messageID,
      messageReply,
      mentions,
      senderID
    } = event;

    let targetID = null;

    // 1. Reply to someone's message
    if (messageReply && messageReply.senderID) {
      targetID = messageReply.senderID;
    }

    // 2. Mention someone
    else if (mentions && Object.keys(mentions).length > 0) {
      targetID = Object.keys(mentions)[0];
    }

    // 3. Provide UID directly
    else {
      targetID = args.find(arg => /^\d+$/.test(arg));
    }

    if (!targetID) {
      return api.sendMessage(
        "💋 Please mention someone, reply to their message, or provide their UID.\n\n" +
        "Usage:\n" +
        "kiss2 @mention\n" +
        "Reply + kiss2\n" +
        "kiss2 1000123456789",
        threadID,
        messageID
      );
    }

    if (targetID === senderID) {
      return api.sendMessage(
        "😂 You cannot kiss yourself!",
        threadID,
        messageID
      );
    }

    let filePath;

    try {
      const baseURL = await baseApiUrl();

      if (!baseURL) {
        throw new Error("API URL not found");
      }

      const url =
        `${baseURL.replace(/\/+$/, "")}/api/dig` +
        `?type=kiss&user=${encodeURIComponent(senderID)}` +
        `&user2=${encodeURIComponent(targetID)}`;

      const response = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 45000
      });

      if (!response.data || response.data.length === 0) {
        throw new Error("Empty image response");
      }

      const cacheDir = path.join(__dirname, "cache");

      fs.mkdirSync(cacheDir, { recursive: true });

      filePath = path.join(
        cacheDir,
        `kiss2_${senderID}_${targetID}_${Date.now()}.png`
      );

      fs.writeFileSync(filePath, Buffer.from(response.data));

      return api.sendMessage(
        {
          body: "💋 Effect kiss successful!",
          attachment: fs.createReadStream(filePath)
        },
        threadID,
        (err) => {
          if (err) console.error("[KISS2] Send error:", err);

          if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        },
        messageID
      );

    } catch (err) {
      console.error("[KISS2 ERROR]", err);

      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      return api.sendMessage(
        "🥹 Kiss image generation failed. Please try again later.",
        threadID,
        messageID
      );
    }
  }
};
