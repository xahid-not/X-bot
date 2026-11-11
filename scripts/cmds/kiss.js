
const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "kiss",
    aliases: ["kisses"],
    version: "2.0.0",
    author: "SHAHADAT SAHU",
    role: 0,
    description: "Generate a kiss image with another user",
    category: "fun",
    cooldown: 5,
    guide: "{pn}kiss @mention or reply"
  },

  onStart: async function ({ api, event }) {
    const {
      threadID,
      messageID,
      senderID,
      mentions,
      messageReply
    } = event;

    // Find target user
    let targetID = null;

    if (mentions && Object.keys(mentions).length > 0) {
      targetID = Object.keys(mentions)[0];
    } else if (messageReply && messageReply.senderID) {
      targetID = messageReply.senderID;
    }

    if (!targetID) {
      return api.sendMessage(
        "💋 Please mention someone or reply to their message!",
        threadID,
        messageID
      );
    }

    if (targetID === senderID) {
      return api.sendMessage(
        "You cannot kiss yourself! 😂",
        threadID,
        messageID
      );
    }

    const cacheFolder = path.join(__dirname, "cache");
    const imgPath = path.join(
      cacheFolder,
      `kiss_${senderID}_${targetID}.png`
    );

    try {
      // Create cache directory
      await fs.ensureDir(cacheFolder);

      // Get API endpoint
      const apiList = await axios.get(
        "https://gitlab.com/shahadat-sahu/sahu-api/-/raw/main/API.json",
        { timeout: 15000 }
      );

      const avatarAPI = apiList.data.AvatarCanvas;

      if (!avatarAPI) {
        throw new Error("AvatarCanvas API URL not found");
      }

      // Generate kiss image
      const response = await axios.post(
        `${avatarAPI.replace(/\/+$/, "")}/api`,
        {
          cmd: "kiss",
          senderID: senderID,
          targetID: targetID
        },
        {
          responseType: "arraybuffer",
          timeout: 45000
        }
      );

      if (!response.data || response.data.length === 0) {
        throw new Error("Empty image response");
      }

      // Save generated image
      await fs.writeFile(imgPath, Buffer.from(response.data));

      const captions = [
        "কারণে অকারণে প্রতিদিন নিয়ম করে, তোমার মায়াতে জড়িয়ে পড়ছি আমি বারেবার!🌷",
        "তোমাকে কেন ভালোবাসি তার কোন বিশেষ কারণ আমার জানা নাই! কিন্তু তোমার কাছে সারাজীবন থেকে যাওয়ার হাজারটা কারণ আমার কাছে আছে!💚",
        "তোমার সাথে কাটানো সময়গুলোর কথা চিন্তা করলে মনে হয়, এই এক জনম তোমার সাথে অনেক কম সময়!😘",
        "প্রিয় তুমি কি আমার জীবনের সেই গল্প হবে? যেই গল্পের শুরু থাকবে, কিন্তু কোনো শেষ থাকবে না!♥️",
        "তুমি পাশে থাকলে সবকিছু সুন্দর মনে হয়, জীবন যেন একটা মধুর কবিতায় রূপ নেয়!😍",
        "তোমাকে ছাড়া জীবনটা অসম্পূর্ণ, তুমি আমার ভালোবাসার পূর্ণতা!🧡",
        "তুমি আমার স্বপ্ন, তুমি আমার জীবনের প্রতিটি সুন্দর মুহূর্ত!🌻",
        "তোমাতে শুরু তোমাতেই শেষ, তুমি না থাকলে আমাদের গল্প এখানেই শেষ!😘",
        "ভালোবাসা যদি কোনো অনুভূতি হয়, তাহলে তোমার প্রতি আমার অনুভূতি পৃথিবীর সেরা অনুভূতি।🌻ღ🌺"
      ];

      const caption =
        captions[Math.floor(Math.random() * captions.length)];

      // Send generated image
      return api.sendMessage(
        {
          body: caption,
          attachment: fs.createReadStream(imgPath)
        },
        threadID,
        (err) => {
          if (err) console.error("[KISS] Send error:", err);
          fs.remove(imgPath).catch(console.error);
        },
        messageID
      );

    } catch (error) {
      console.error("[KISS COMMAND ERROR]", error);

      await fs.remove(imgPath).catch(() => {});

      return api.sendMessage(
        "🥺 Kiss image generation failed. Please try again later.",
        threadID,
        messageID
      );
    }
  }
};
