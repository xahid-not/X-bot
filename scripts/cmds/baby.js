const axios = require("axios");

const TEACH_API = axios.create({
baseURL: "https://eryxenx.agi.bd/api/simsimi",
timeout: 20000
});

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const GEMINI_URL = https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent;
const triggerLocks = new Set();
let botUID = null;
let memoryModelPromise = null;

const SYSTEM_PROMPT = You are XBot, a warm, playful, lightly romantic Bangladeshi Messenger companion. Speak naturally in Banglish (Bangla written with English letters), using a little English when natural. Keep replies short and conversational. Match the sender's mood. Do not force romance, repeat stock phrases, or invent facts. Be honest that you are an AI bot if asked. You will receive a personal-memory profile belonging only to the current sender. Use it only when relevant. Save only useful, stable facts the sender explicitly says about themselves, such as favourite things, hobbies, preferences, goals, and projects. Never guess. Do not save sensitive details such as passwords, API keys, financial information, addresses, phone numbers, health information, sexual information, religion, or political opinions. Return JSON only with keys reply, memory_updates, memory_deletions. memory_updates must contain only new stable facts explicitly shared by this sender. memory_deletions must contain only facts the sender explicitly corrected or asked to forget. Use empty arrays when there are no changes.;

function errorText(error) {
  console.error("[BABY COMMAND ERROR]", error?.response?.data || error);
  if (error?.response?.data) return JSON.stringify(error.response.data);
  return error?.message || String(error);
}

function sendMessage(api, text, threadID, replyToID) {
  return new Promise((resolve, reject) => {
    const callback = (error, info) => error ? reject(error) : resolve(info);
    if (replyToID) api.sendMessage(text, threadID, callback, replyToID);
    else api.sendMessage(text, threadID, callback);
  });
}

async function getName(api, uid, usersData) {
  try {
    if (usersData?.getName) {
      const name = await usersData.getName(uid);
      if (name) return name;
    }
    const info = await api.getUserInfo(uid);
    return info?.[uid]?.name || "friend";
  } catch {
    return "friend";
  }
}

async function getMemoryModel() {
  if (memoryModelPromise) return memoryModelPromise;
  memoryModelPromise = (async () => {
    const sequelize = global.db?.sequelize;
    if (!sequelize) throw new Error("SQLite database is unavailable. Check XBot database settings.");
    const { DataTypes } = require("sequelize");
    const model = sequelize.models.BabyPersonalMemory || sequelize.define("BabyPersonalMemory", {
      senderID: { type: DataTypes.STRING, primaryKey: true },
      memories: { type: DataTypes.TEXT, allowNull: false, defaultValue: "[]" }
    }, { tableName: "baby_personal_memories", timestamps: true });
    await model.sync();
    return model;
  })();
  try {
    return await memoryModelPromise;
  } catch (error) {
    memoryModelPromise = null;
    throw error;
  }
}

async function getMemories(senderID) {
  const model = await getMemoryModel();
  const row = await model.findByPk(String(senderID));
  if (!row) return [];
  try {
    const parsed = JSON.parse(row.memories || "[]");
    return Array.isArray(parsed) ? parsed.filter(x => typeof x === "string").slice(0, 25) : [];
  } catch {
    return [];
  }
}

async function saveMemories(senderID, memories) {
  const model = await getMemoryModel();
  const clean = [...new Set(memories.filter(x => typeof x === "string").map(x => x.trim().slice(0, 180)).filter(Boolean))].slice(-25);
  await model.upsert({ senderID: String(senderID), memories: JSON.stringify(clean) });
}

async function forgetMemories(senderID) {
  const model = await getMemoryModel();
  await model.destroy({ where: { senderID: String(senderID) } });
}

async function generateReply({ message, senderID, senderName }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is missing. Add it in Render > Environment.");

const memories = await getMemories(senderID);
const prompt = Sender name: ${String(senderName || "friend").slice(0, 60)}\n +
This sender's saved personal memories (do not mix with anyone else):\n${memories.length ? memories.map((x, i) => ${i + 1}. ${x}).join("\n") : "No saved facts yet."}\n\n +
New message: ${String(message).slice(0, 2500)}\n\n +
Return JSON exactly like this: {"reply":"short Banglish reply","memory_updates":[],"memory_deletions":[]}.  +
Remember only stable, non-sensitive facts explicitly stated by this sender. Maximum 25 facts.;

const response = await axios.post(GEMINI_URL, {
    system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.8,
      topP: 0.9,
      maxOutputTokens: 700,
      responseMimeType: "application/json"
    }
  }, {
    timeout: 30000,
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey
    }
  });

const raw = (response.data?.candidates?.[0]?.content?.parts || [])
    .map(p => p.text || "").join("").trim();

if (!raw) {
throw new Error(Gemini returned no text. ${JSON.stringify(response.data?.promptFeedback || {})});
}

let result;
try {
result = JSON.parse(raw.replace(/^json\s*/i, "").replace(/$/, "").trim());
} catch 

const reply = typeof result.reply === "string" ? result.reply.trim() : "";
  if (!reply) throw new Error("Gemini did not return a reply.");

  let updated = memories.slice();

for (const oldFact of (Array.isArray(result.memory_deletions) ? result.memory_deletions : [])) 

for (const newFact of (Array.isArray(result.memory_updates) ? result.memory_updates : [])) 

  if (updated.length > 25) updated = updated.slice(-25);

if (JSON.stringify(updated) !== JSON.stringify(memories)) 

return reply.slice(0, 1800);
}

async function sendAIReply()
