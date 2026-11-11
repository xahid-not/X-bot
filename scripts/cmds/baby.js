const axios = require("axios");

const API = axios.create({
  baseURL: "https://eryxenx.agi.bd/api/simsimi",
  timeout: 20000
});

const triggerLocks = new Set();

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const ROMANTIC_BANGLISH_SYSTEM_PROMPT = `You are XBot, a playful, sweet, romantic Banglish chat companion in a Facebook Messenger group.

PERSONALITY:
- Sound like a real, relaxed Bangladeshi friend: warm, witty, affectionate, playful and lightly teasing.
- Write mainly in Banglish (Bangla written using English letters), naturally mixing a little English when it fits.
- Use everyday conversational wording, not formal textbook Bangla or robotic customer-service language.
- Keep most replies short (usually one sentence, sometimes two).
- Use emojis sparingly and naturally.
- Match the user's mood.
- Do not force romance into every answer.
- Be affectionate without being clingy, possessive, sexually explicit, or repetitive.
- Never invent facts. If you do not understand, ask a short clarification.
- If asked whether you are a bot or AI, answer honestly that you are XBot, an AI chatbot.

OUTPUT:
- Return only the message to send.
- No labels, quotation marks, analysis, or markdown wrappers.
- Use Banglish by default. Keep the response natural and concise.`;

function errMsg(e) {
  console.error("[BABY AI ERROR]", e);

  if (e && e.response && e.response.data) {
    return JSON.stringify(e.response.data);
  }

  if (e && e.message) {
    return e.message;
  }

  return String(e);
}
async function sendTypingIndicatorV2(api, sendTyping, threadID) {
  try {
    if (typeof api.sendTypingIndicator === "function") {
      await api.sendTypingIndicator(threadID, sendTyping);
    }
  } catch (err) {
    console.log("Typing indicator error:", err.message);
  }
}

let botUID = null;

function getBotUID(api) {
  if (botUID) return botUID;

  try {
    if (typeof api.getCurrentUserID === "function") {
      botUID = api.getCurrentUserID();
    }
  } catch {}

  return botUID;
}

module.exports.config = {
  name: "baby",
  version: "8.0.1",
  role: 0,
  author: "EryXenX",
  countTime: 0,
  category: "chat",
  shortDescription: "Romantic Banglish AI chat",
  longDescription: "Natural romantic Banglish chat powered by Gemini; manual teaching tools preserved",
  guide: "{pn} [query]\n{pn} list\n{pn} teach [Question] - [Reply]\n{pn} react [Question] - [Emoji]\n{pn} edit [Question] - [OldReply] - [NewReply]\n{pn} remove/rm [Question] - [Reply]\n{pn} del (reply to bot's wrong answer)\n{pn} msg [trigger]",
  envConfig: {}
};

async function getUserName(api, uid, usersData) {
  try {
    if (usersData && typeof usersData.getName === "function") {
      const name = await usersData.getName(uid);
      if (name) return name;
    }

    const info = await api.getUserInfo(uid);
    return (info && info[uid] && info[uid].name) || "User";
  } catch {
    return "User";
  }
}

module.exports.onStart = async function ({
  api,
  event,
  args,
  usersData
}) {
  const uid = event.senderID;
  const senderName = await getUserName(api, uid, usersData);
  const query = args.join(" ").toLowerCase();

  try {
    if (args[0] === "autoteach") {
      return api.sendMessage(
        "╭─╼🌟 𝗔𝘂𝘁𝗼𝘁𝗲𝗮𝗰𝗵 𝗦𝘁𝗮𝘁𝘂𝘀\n├ 🔴 𝗦𝘁𝗮𝘁𝘂𝘀: OFF\n╰─╼ Ordinary group messages are not automatically learned.",
        event.threadID,
        event.messageID
      );
    }

    if (args[0] === "list") {
      const res = await API.get("/list");

      return api.sendMessage(
        `╭─╼🌟 𝗕𝗮𝗯𝘆 𝗔𝗜 𝗦𝘁𝗮𝘁𝘂𝘀
├ 📝 𝗧𝗲𝗮𝗰𝗵𝗲𝗱 𝗤𝘂𝗲𝘀𝘁𝗶𝗼𝗻𝘀: ${res.data.totalQuestions}
├ 📦 𝗦𝘁𝗼𝗿𝗲𝗱 𝗥𝗲𝗽𝗹𝗶𝗲𝘀: ${res.data.totalReplies}
╰─╼👤 𝗗𝗲𝘃𝗲𝗹𝗼𝗽𝗲𝗿: 𝗘𝗿𝘆𝗫𝗲𝗻𝗫`,
        event.threadID,
        event.messageID
      );
    }

    if (args[0] === "msg") {
      let trigger = args.slice(1).join(" ").trim();

      if (!trigger) {
        return api.sendMessage(
          "❌ | Use: !baby msg [trigger]",
          event.threadID,
          event.messageID
        );
      }

      let customLimit = null;
      const limitMatch = trigger.match(/\s*-(\d+)\s*$/);

      if (limitMatch) {
        customLimit = parseInt(limitMatch[1], 10);
        trigger = trigger.replace(/\s*-(\d+)\s*$/, "").trim();

        if (!trigger) {
          return api.sendMessage(
            "❌ | Use: !baby msg [trigger] -20",
            event.threadID,
            event.messageID
          );
        }
      }

      const res = await API.get("/simsimi-list", {
        params: { ask: trigger }
      });

      if (!res.data.replies || res.data.replies.length === 0) {
        return api.sendMessage(
          "❌ No replies found.",
          event.threadID,
          event.messageID
        );
      }

      const REPLY_LIMIT =
        customLimit && customLimit > 0 ? customLimit : 150;

      const allReplies = res.data.replies;
      const shownReplies = allReplies.slice(0, REPLY_LIMIT);
      const remaining = allReplies.length - shownReplies.length;

      const formatted = shownReplies
        .map((rep, i) => `➤ ${i + 1}. ${rep}`)
        .join("\n");

      const limitNote = remaining > 0
        ? `\n⚠️ Showing ${REPLY_LIMIT} replies. ${remaining} more are hidden.\n`
        : "";

      const msg = `📌 Trigger: ${trigger.toUpperCase()}
📋 Total: ${res.data.total}
━━━━━━━━━━━━━━
${formatted}
━━━━━━━━━━━━━━${limitNote}Reply with the numbers you want to KEEP (e.g. "2, 7"). Everything else will be removed.`;

      return api.sendMessage(
        msg,
        event.threadID,
        (err, info) => {
          if (!err) {
            global.GoatBot.onReply.set(info.messageID, {
              commandName: module.exports.config.name,
              messageID: info.messageID,
              author: event.senderID,
              type: "msgSelect",
              trigger
            });
          }
        },
        event.messageID
      );
    }

    if (args[0] === "teach") {
      const parts = query.replace("teach ", "").split(" - ");

      if (parts.length < 2) {
        return api.sendMessage(
          "❌ | Use: teach [Question] - [Reply]",
          event.threadID,
          event.messageID
        );
      }

      const [ask, ans] = parts;

      const res = await API.get("/teach", {
        params: {
          ask,
          ans,
          senderID: uid,
          senderName
        }
      });

      return api.sendMessage(
        `✅ ${res.data.message}`,
        event.threadID,
        event.messageID
      );
    }

    if (args[0] === "react") {
      const rawQuery = args.slice(1).join(" ");
      const parts = rawQuery.split(" - ");

      if (parts.length < 2) {
        return api.sendMessage(
          "❌ | Use: react [Question] - [Emoji]",
          event.threadID,
          event.messageID
        );
      }

      const [ask, emoji] = parts;

      if (!ask.trim() || !emoji.trim()) {
        return api.sendMessage(
          "❌ | Use: react [Question] - [Emoji]",
          event.threadID,
          event.messageID
        );
      }

      const res = await API.get("/teachReact", {
        params: { ask, emoji, senderName }
      });

      return api.sendMessage(
        `✅ ${res.data.message}`,
        event.threadID,
        event.messageID
      );
    }

    if (args[0] === "edit") {
      const parts = query.replace("edit ", "").split(" - ");

      if (parts.length < 3) {
        return api.sendMessage(
          "❌ | Use: edit [Question] - [OldReply] - [NewReply]",
          event.threadID,
          event.messageID
        );
      }

      const [ask, oldR, newR] = parts;

      const res = await API.get("/edit", {
        params: { ask, old: oldR, new: newR }
      });

      return api.sendMessage(
        res.data.message,
        event.threadID,
        event.messageID
      );
    }

    if (["remove", "rm"].includes(args[0])) {
      const parts = query
        .replace(/^(remove|rm)\s*/, "")
        .split(" - ");

      if (parts.length < 2) {
        return api.sendMessage(
          "❌ | Use: remove [Question] - [Reply]",
          event.threadID,
          event.messageID
        );
      }

      const [ask, ans] = parts;

      const res = await API.get("/delete", {
        params: { ask, ans }
      });

      return api.sendMessage(
        res.data.message,
        event.threadID,
        event.messageID
      );
    }

    if (args[0] === "del") {
      return api.sendMessage(
        '❌ | Reply to the bot\'s wrong answer with "!baby del" to delete it.',
        event.threadID,
        event.messageID
      );
    }

    if (!query) {
      return deliverSimsimiResponse({
        api,
        event,
        query: "Someone called me. Reply with a short, cute Banglish greeting.",
        senderName
      });
    }

    return deliverSimsimiResponse({
      api,
      event,
      query: args.join(" "),
      senderName
    });

  } catch (e) {
    console.error("[baby/onStart] error:", e);

    return api.sendMessage(
      `❌ Error: ${errMsg(e)}`,
      event.threadID,
      event.messageID
    );
  }
};

module.exports.onReply = async function ({
  api,
  event,
  Reply,
  usersData
}) {
  const senderName = await getUserName(
    api,
    event.senderID,
    usersData
  );

  const text = event.body?.trim();
  const lowered = text?.toLowerCase();

  if (event.attachments && event.attachments.length > 0) {
    const type = event.attachments[0].type;
    let reaction = null;

    if (type === "photo") reaction = "🫩";
    else if (type === "animated_image") reaction = "😵‍💫";
    else if (type === "video") reaction = "🤔";
    else if (type === "audio") reaction = "🤕";

    if (reaction) {
      try {
        await api.setMessageReaction(
          reaction,
          event.messageID,
          () => {},
          true
        );
      } catch (e) {
        console.log("Attachment reaction error:", e.message);
      }

      return;
    }
  }

  if (!text) return;

  if (lowered === "del" || lowered === "!baby del") {
    try {
      const originalReply =
        event.messageReply?.body || Reply?.body;

      if (!originalReply) {
        return api.sendMessage(
          "❌ Couldn't read the original message to delete.",
          event.threadID,
          event.messageID
        );
      }

      const res = await API.get("/deleteByReply", {
        params: { reply: originalReply }
      });

      return api.sendMessage(
        res.data.message,
        event.threadID,
        event.messageID
      );

    } catch (e) {
      console.error("[baby/del] error:", e);

      return api.sendMessage(
        `❌ Failed to delete: ${errMsg(e)}`,
        event.threadID,
        event.messageID
      );
    }
  }

  if (Reply?.type === "msgSelect") {
    if (event.senderID !== Reply.author) return;

    const numbers = text
      .split(",")
      .map(n => parseInt(n.trim(), 10))
      .filter(n => Number.isInteger(n));

    if (numbers.length === 0) {
      return api.sendMessage(
        "❌ Send numbers like: 2, 7",
        event.threadID,
        event.messageID
      );
    }

    try {
      const res = await API.post("/keepOnly", {
        ask: Reply.trigger,
        keepIndexes: numbers
      });

      return api.sendMessage(
        res.data.message,
        event.threadID,
        event.messageID
      );

    } catch (e) {
      console.error("[baby/keepOnly] error:", e);

      return api.sendMessage(
        `❌ Failed to update: ${errMsg(e)}`,
        event.threadID,
        event.messageID
      );
    }
  }

  try {
    return await deliverSimsimiResponse({
      api,
      event,
      query: text,
      senderName
    });

  } catch (e) {
    console.error("[baby/onReply] error:", e);

    return api.sendMessage(
      `❌ Error: ${errMsg(e)}`,
      event.threadID,
      event.messageID
    );
  }
};

function sendMessageAsync(api, text, threadID, replyToID) {
  return new Promise((resolve, reject) => {
    const cb = (err, info) => {
      if (err) reject(err);
      else resolve(info);
    };

    if (replyToID) {
      api.sendMessage(text, threadID, cb, replyToID);
    } else {
      api.sendMessage(text, threadID, cb);
    }
  });
}

async function generateGeminiReply({ query, senderName }) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is missing. Add it in Render Environment Variables."
    );
  }

  const response = await axios.post(
    GEMINI_URL,
    {
      system_instruction: {
        parts: [{ text: ROMANTIC_BANGLISH_SYSTEM_PROMPT }]
      },
      contents: [{
        role: "user",
        parts: [{
          text:
            `The sender's display name is ${String(senderName || "friend").slice(0, 60)}.\n` +
            `Their message is: ${String(query).slice(0, 3000)}`
        }]
      }],
      generationConfig: {
        temperature: 0.85,
        topP: 0.9,
        maxOutputTokens: 512
      }
    },
    {
      params: { key: apiKey },
      timeout: 25000,
      headers: {
        "Content-Type": "application/json"
      }
    }
  );

  const parts =
    response.data?.candidates?.[0]?.content?.parts || [];

  const answer = parts
    .map(part => part.text || "")
    .join("")
    .trim();

  if (!answer) {
    const reason = response.data?.promptFeedback?.blockReason;

    throw new Error(
      reason
        ? `Gemini blocked this prompt (${reason}).`
        : "Gemini returned an empty response."
    );
  }

  return answer.slice(0, 1800);
}

async function deliverSimsimiResponse({
  api,
  event,
  query,
  senderName
}) {
  await sendTypingIndicatorV2(api, true, event.threadID);

  let answer;

  try {
    answer = await generateGeminiReply({
      query,
      senderName
    });
  } finally {
    await sendTypingIndicatorV2(api, false, event.threadID);
  }

  const info = await sendMessageAsync(
    api,
    answer,
    event.threadID,
    event.messageID
  );

  // Only reply-routing metadata is stored.
  // No conversation transcript or chat history is saved.
  if (global.GoatBot?.onReply && info?.messageID) {
    global.GoatBot.onReply.set(info.messageID, {
      commandName: module.exports.config.name,
      messageID: info.messageID,
      author: event.senderID,
      type: "simsimi"
    });
  }
}

function isBotMentioned(event, uid) {
  if (!uid || !event.mentions) return false;

  return Object.prototype.hasOwnProperty.call(
    event.mentions,
    uid
  );
}

module.exports.onChat = async function ({
  api,
  event,
  usersData
}) {
  const rawText = event.body?.trim();
  const text = rawText?.toLowerCase();

  if (!text) return;

  const senderName = await getUserName(
    api,
    event.senderID,
    usersData
  );

  const triggers = [
  "bot", "bby", "beby", "bbz",
  "xan", "jan", "janu", "xanu",
  "বেবি", "জান", "বট", "জানু"
];

  const uid = getBotUID(api);

  if (isBotMentioned(event, uid)) {
    if (triggerLocks.has(event.threadID)) return;

    triggerLocks.add(event.threadID);

    try {
      return await deliverSimsimiResponse({
        api,
        event,
        query: "Someone mentioned me. Reply with a short, cute Banglish greeting.",
        senderName
      });
    } catch (e) {
      console.error("[baby/mention] error:", e);

      return api.sendMessage(
        `❌ Error: ${errMsg(e)}`,
        event.threadID,
        event.messageID
      );
    } finally {
      triggerLocks.delete(event.threadID);
    }
  }

  if (triggers.includes(text)) {
    if (triggerLocks.has(event.threadID)) return;

    triggerLocks.add(event.threadID);

    try {
      return await deliverSimsimiResponse({
        api,
        event,
        query: "Someone called me baby. Reply with a short, sweet, playful Banglish greeting.",
        senderName
      });
    } catch (e) {
      console.error("[baby/greeting] error:", e);

      return api.sendMessage(
        `❌ Error: ${errMsg(e)}`,
        event.threadID,
        event.messageID
      );
    } finally {
      triggerLocks.delete(event.threadID);
    }
  }

  const matchPrefix =
  /^(bot|bby|beby|bbz|xan|jan|janu|xanu|বেবি|জান|বট|জানু)\s+/i;
  if (matchPrefix.test(rawText)) {
    const query = rawText.replace(matchPrefix, "").trim();

    if (!query) return;
    if (triggerLocks.has(event.threadID)) return;

    triggerLocks.add(event.threadID);

    try {
      return await deliverSimsimiResponse({
        api,
        event,
        query,
        senderName
      });
    } catch (e) {
      console.error("[baby/onChat] error:", e);

      return api.sendMessage(
        `❌ Error: ${errMsg(e)}`,
        event.threadID,
        event.messageID
      );
    } finally {
      triggerLocks.delete(event.threadID);
    }
  }

  // Ordinary group messages are NOT automatically learned.
};
