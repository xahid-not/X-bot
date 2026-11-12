
const activeRuns = new Map();

module.exports = {
  config: {
    name: "everyone",
    version: "1.0.0",
    author: "Xahid",
    role: 0,
    shortDescription: "Mention group members",
    category: "Group",
    guide: {
      en: "{pn} start or {pn} stop"
    }
  },

  onStart: async function ({ api, event, args }) {
    const threadID = event.threadID;
    const senderID = event.senderID;
    const action = (args[0] || "").toLowerCase();

    // Check group information
    const getInfo = () => new Promise((resolve, reject) => {
      api.getThreadInfo(threadID, (err, info) => {
        if (err) reject(err);
        else resolve(info);
      });
    });

    let info;

    try {
      info = await getInfo();
    } catch (err) {
      return api.sendMessage(
        "❌ Could not get group information.",
        threadID,
        event.messageID
      );
    }

    // Only group admins can use this command
    const isAdmin = (info.adminIDs || []).some(
      admin => String(admin.id) === String(senderID)
    );

    if (!isAdmin) {
      return api.sendMessage(
        "❌ Only group admins can use this command.",
        threadID,
        event.messageID
      );
    }

    // Stop an active mention process
    if (action === "stop") {
      const run = activeRuns.get(threadID);

      if (!run) {
        return api.sendMessage(
          "ℹ️ No mention process is running.",
          threadID,
          event.messageID
        );
      }

      run.cancelled = true;

      return api.sendMessage(
        "🛑 Everyone mention process stopped.",
        threadID,
        event.messageID
      );
    }

    if (action !== "start") {
      return api.sendMessage(
        "Usage:\n/everyone start\n/everyone stop",
        threadID,
        event.messageID
      );
    }

    if (activeRuns.has(threadID)) {
      return api.sendMessage(
        "⚠️ A mention process is already running.",
        threadID,
        event.messageID
      );
    }

    const members = (info.userInfo || []).filter(
      user => String(user.id) !== String(api.getCurrentUserID())
    );

    if (!members.length) {
      return api.sendMessage(
        "No group members found.",
        threadID,
        event.messageID
      );
    }

    const run = { cancelled: false };
    activeRuns.set(threadID, run);

    api.sendMessage(
      `📢 Starting group announcement for ${members.length} members.`,
      threadID
    );

    // Mention 8 members per message, with a delay
    const batchSize = 8;

    for (let i = 0; i < members.length; i += batchSize) {
      if (run.cancelled) break;

      const batch = members.slice(i, i + batchSize);
      const mentions = [];
      let body = "📢 Attention everyone!\n\n";

      for (const member of batch) {
        const name = member.name || "Member";
        const tag = `@${name}`;

        const offset = body.length;
        body += tag + " ";
        
        mentions.push({
          tag,
          id: String(member.id),
          fromIndex: offset
        });
      }

      if (run.cancelled) break;

      await new Promise(resolve => {
        api.sendMessage(
          { body, mentions },
          threadID,
          () => resolve()
        );
      });

      if (i + batchSize < members.length && !run.cancelled) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    activeRuns.delete(threadID);

    if (run.cancelled) {
      return api.sendMessage(
        "🛑 Mention process cancelled.",
        threadID
      );
    }

    return api.sendMessage(
      "✅ All group members have been mentioned once.",
      threadID
    );
  }
};
