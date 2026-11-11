
const fs = require("fs-extra");
const path = require("path");
const https = require("https");

module.exports = {
  config: {
    name: "help",
    aliases: ["menu", "commands"],
    version: "6.5",
    author: "EryXenX",
    shortDescription: "Show all commands",
    longDescription: "Show all commands in clean UI",
    category: "system",
    guide: "{pn}help [command name]"
  },

  onStart: async function ({ message, args, prefix }) {
    const allCommands = global.GoatBot.commands;

    const fancyFont = (str) =>
      str.replace(/[A-Za-z]/g, (c) => {
        const map = {
          A:"𝐀",B:"𝐁",C:"𝐂",D:"𝐃",E:"𝐄",F:"𝐅",G:"𝐆",H:"𝐇",
          I:"𝐈",J:"𝐉",K:"𝐊",L:"𝐋",M:"𝐌",N:"𝐍",O:"𝐎",P:"𝐏",
          Q:"𝐐",R:"𝐑",S:"𝐒",T:"𝐓",U:"𝐔",V:"𝐕",W:"𝐖",X:"𝐗",
          Y:"𝐘",Z:"𝐙",
          a:"𝐚",b:"𝐛",c:"𝐜",d:"𝐝",e:"𝐞",f:"𝐟",g:"𝐠",h:"𝐡",
          i:"𝐢",j:"𝐣",k:"𝐤",l:"𝐥",m:"𝐦",n:"𝐧",o:"𝐨",p:"𝐩",
          q:"𝐪",r:"𝐫",s:"𝐬",t:"𝐭",u:"𝐮",v:"𝐯",w:"𝐰",x:"𝐱",
          y:"𝐲",z:"𝐳"
        };
        return map[c] || c;
      });

    const categoryFont = (str) =>
      str.split("").map(c => {
        const map = {
          A:"𝐀",B:"𝐁",C:"𝐂",D:"𝐃",E:"𝐄",F:"𝐅",G:"𝐆",H:"𝐇",
          I:"𝐈",J:"𝐉",K:"𝐊",L:"𝐋",M:"𝐌",N:"𝐍",O:"𝐎",P:"𝐏",
          Q:"𝐐",R:"𝐑",S:"𝐒",T:"𝐓",U:"𝐔",V:"𝐕",W:"𝐖",X:"𝐗",
          Y:"𝐘",Z:"𝐙"
        };
        return map[c] || c;
      }).join("");

    const cleanCategoryName = (text) =>
      text ? text.toLowerCase() : "others";

    // Individual command information
    if (args[0]) {
      const cmdName = args[0].toLowerCase();

      const cmd =
        allCommands.get(cmdName) ||
        [...allCommands.values()].find(c =>
          c.config.aliases?.includes(cmdName)
        );

      if (!cmd) {
        return message.reply(
          `❌ ${fancyFont(`Command '${cmdName}' not found!`)}\n` +
          `➤ Try ${prefix}help to see full list`
        );
      }

      const usage = typeof cmd.config.guide === "string"
        ? cmd.config.guide.replace("{pn}", cmd.config.name)
        : cmd.config.name;

      const infoMsg =
`┏━━━━━━━━━━━━━┓
 🧩 𝐂𝐌𝐃 𝐈𝐍𝐅𝐎
┗━━━━━━━━━━━━━┛
 ✦ Name     : ${cmd.config.name}
 ✦ Aliases  : ${cmd.config.aliases?.join(", ") || "None"}
 ✦ Category : ${categoryFont((cmd.config.category || "Others").toUpperCase())}
 ✦ Version  : v${cmd.config.version || "1.0"}
 ✦ Author   : ${cmd.config.author || "Unknown"}
 ✦ Usage    : ${prefix}${usage}
━━━━━━━━━━━━━━━
 📝 ${(cmd.config.longDescription || cmd.config.shortDescription || "No description")}`;

      return message.reply(infoMsg);
    }

    // Build command categories
    const categories = {};

    for (const [name, cmd] of allCommands) {
      const cat = cleanCategoryName(cmd.config.category);

      if (!categories[cat]) {
        categories[cat] = [];
      }

      categories[cat].push(name);
    }

    // Main help menu
    let msg =
`╭─ 𝐂𝐎𝐌𝐌𝐀𝐍𝐃𝐒 𝐌𝐄𝐍𝐔
├ Prefix : ${prefix}
├ Total  : ${allCommands.size}
├ Author : EryXenX
`;

    for (const cat of Object.keys(categories).sort()) {
      const catTitle = categoryFont(cat.toUpperCase());

      msg += `\n┌─ ${catTitle} ─┐\n`;

      for (const cmdName of categories[cat].sort()) {
        msg += `│ ⎙ ${fancyFont(cmdName)}\n`;
      }

      msg += `└─────────────┘\n`;
    }

    msg += `\n╰─ Use: ${prefix}help <command>`;

    // Send text separately in smaller chunks
    const chunks = splitMessage(msg, 1800);

    for (const chunk of chunks) {
      await message.reply(chunk);
    }

    // GIF URLs
    const gifURLs = [
      "https://i.imgur.com/Xw6JTfn.gif",
      "https://i.imgur.com/mW0yjZb.gif",
      "https://i.imgur.com/KQBcxOV.gif"
    ];

    const randomGifURL =
      gifURLs[Math.floor(Math.random() * gifURLs.length)];

    const gifFolder = path.join(__dirname, "cache");

    await fs.ensureDir(gifFolder);

    const gifName = path.basename(randomGifURL);
    const gifPath = path.join(gifFolder, gifName);

    // Download and send GIF separately
    try {
      if (!await fs.pathExists(gifPath)) {
        await downloadGif(randomGifURL, gifPath);
      }

      await message.reply({
        attachment: fs.createReadStream(gifPath)
      });

    } catch (error) {
      console.error("[HELP] GIF error:", error);
    }
  }
};

// Split long messages
function splitMessage(text, maxLength = 1800) {
  const chunks = [];
  let current = "";

  for (const line of text.split("\n")) {
    const piece = current ? `\n${line}` : line;

    if (current.length + piece.length <= maxLength) {
      current += piece;
    } else {
      if (current) chunks.push(current);

      if (line.length <= maxLength) {
        current = line;
      } else {
        for (let i = 0; i < line.length; i += maxLength) {
          chunks.push(line.slice(i, i + maxLength));
        }
        current = "";
      }
    }
  }

  if (current) chunks.push(current);

  return chunks;
}

// Download GIF
function downloadGif(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);

    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        file.close(() => fs.unlink(dest, () => {}));
        return reject(
          new Error(`GIF download failed: HTTP ${res.statusCode}`)
        );
      }

      res.pipe(file);

      file.on("finish", () => file.close(resolve));

      file.on("error", (error) => {
        fs.unlink(dest, () => {});
        reject(error);
      });

    }).on("error", (error) => {
      fs.unlink(dest, () => {});
      reject(error);
    });
  });
}
