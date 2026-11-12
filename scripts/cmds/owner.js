
const fs = require("fs-extra");
const request = require("request");
const path = require("path");

module.exports = {
  config: {
    name: "owner",
    version: "1.5.0",
    author: "Xahid Doesn'tExist",
    role: 0,
    shortDescription: "Owner information with image",
    category: "Information",
    guide: {
      en: "owner"
    }
  },

  onStart: async function ({ api, event }) {
    const ownerText =
`👑 OWNER INFO

Name: Xahid Doesn'tExist

With great power comes great responsibility.

📞 CONTACT INFORMATION

Facebook:
https://www.facebook.com/xxxahidsus

Page: Ultimate GFX

WhatsApp: 01923879906`;

    const cacheDir = path.join(__dirname, "cache");
    const imgPath = path.join(cacheDir, `owner_${Date.now()}.jpg`);

    const imgLink = "https://imgur.com/oU7Rt3g.jpeg";

    try {
      await fs.ensureDir(cacheDir);

      // Download the owner image
      const response = await new Promise((resolve, reject) => {
        request.get(
          {
            url: imgLink,
            encoding: null,
            timeout: 20000
          },
          (error, res, body) => {
            if (error) return reject(error);

            if (!res || res.statusCode !== 200 || !body || !body.length) {
              return reject(new Error("Image download failed"));
            }

            resolve(body);
          }
        );
      });

      await fs.writeFile(imgPath, response);

      // STEP 1: Send owner information as a text message
      api.sendMessage(
        ownerText,
        event.threadID,
        (err) => {
          if (err) {
            console.error("[OWNER] Text send error:", err);
            fs.remove(imgPath).catch(() => {});
            return;
          }

          // STEP 2: Send the image separately
          api.sendMessage(
            {
              attachment: fs.createReadStream(imgPath)
            },
            event.threadID,
            (imageErr) => {
              if (imageErr) {
                console.error("[OWNER] Image send error:", imageErr);
              }

              fs.remove(imgPath).catch(() => {});
            }
          );
        },
        event.messageID
      );

    } catch (error) {
      console.error("[OWNER] Error:", error);

      fs.remove(imgPath).catch(() => {});

      return api.sendMessage(
        ownerText,
        event.threadID,
        null,
        event.messageID
      );
    }
  }
};
