"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_googleapis = require("googleapis");
var import_cors = __toESM(require("cors"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
var app = (0, import_express.default)();
var PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3e3;
app.use((0, import_cors.default)());
app.use(import_express.default.json());
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});
var FILE_NAME = "wallgo_stats.txt";
var getDriveService = () => {
  if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    return null;
  }
  const auth = new import_googleapis.google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n").replace(/"/g, "")
    },
    scopes: ["https://www.googleapis.com/auth/drive"]
  });
  return import_googleapis.google.drive({ version: "v3", auth });
};
app.get("/api/test-drive", async (req, res) => {
  try {
    const drive = getDriveService();
    if (!drive) {
      return res.status(500).json({ error: "Credentials missing (GOOGLE_CLIENT_EMAIL or GOOGLE_PRIVATE_KEY)" });
    }
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const response = await drive.files.list({
      q: `trashed=false`,
      fields: "files(id, name, mimeType)",
      pageSize: 50,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true
    });
    const files = response.data.files || [];
    const fileList = files.map((f) => `${f.name} (${f.id})`).join(", ");
    res.json({
      success: true,
      message: `Connection successful! Account ${clientEmail} can see ${files.length} files/folders: ${fileList || "None"}`,
      filesFound: files.length
    });
  } catch (error) {
    console.error("Drive Test Error:", error);
    const errorDetails = error.errors ? JSON.stringify(error.errors) : "";
    res.status(500).json({ error: `${error.message || "Unknown error connecting to Drive"} ${errorDetails}` });
  }
});
app.post("/api/stats", async (req, res) => {
  const { winner, theme, difficulty, userId, batch } = req.body;
  if (!winner && !theme && !batch) {
    return res.status(400).json({ error: "Missing winner/theme or batch data" });
  }
  const drive = getDriveService();
  if (!drive) {
    return res.status(500).json({ error: "Google Drive credentials not configured" });
  }
  try {
    const response = await drive.files.list({
      q: `name='${FILE_NAME}' and trashed=false`,
      fields: "files(id)",
      supportsAllDrives: true,
      includeItemsFromAllDrives: true
    });
    let fileId = response.data.files?.[0]?.id;
    let currentStats = {
      totalGames: 0,
      aiWins: 0,
      humanWins: {
        neon: 0,
        islands: 0,
        desert: 0,
        hourglass: 0,
        bridge: 0,
        hammer: 0,
        arena: 0
      },
      difficultyWins: {
        facile: 0,
        normale: 0,
        difficile: 0
      },
      uniqueUsersCount: 0,
      _userIds: []
    };
    if (fileId) {
      const fileResponse = await drive.files.get({
        fileId,
        alt: "media",
        supportsAllDrives: true
      }, { responseType: "text" });
      try {
        const parsed = JSON.parse(fileResponse.data);
        if (parsed.totalGames !== void 0) {
          currentStats = { ...currentStats, ...parsed };
          currentStats.humanWins = {
            neon: 0,
            islands: 0,
            desert: 0,
            hourglass: 0,
            bridge: 0,
            hammer: 0,
            arena: 0,
            ...parsed.humanWins || {}
          };
          currentStats.difficultyWins = { ...currentStats.difficultyWins, ...parsed.difficultyWins || {} };
          currentStats._userIds = parsed._userIds || [];
        }
      } catch (e) {
        console.error("Failed to parse existing stats file", e);
      }
    }
    const updates = batch || [{ winner, theme, difficulty, userId }];
    for (const update of updates) {
      if (!update.winner || !update.theme) continue;
      currentStats.totalGames += 1;
      if (update.userId && !currentStats._userIds.includes(update.userId)) {
        currentStats._userIds.push(update.userId);
        currentStats.uniqueUsersCount = currentStats._userIds.length;
      }
      if (update.winner === "ai") {
        currentStats.aiWins += 1;
      } else if (update.winner === "human") {
        if (update.theme === "neon") currentStats.humanWins.neon = (currentStats.humanWins.neon || 0) + 1;
        else if (update.theme === "islands") currentStats.humanWins.islands = (currentStats.humanWins.islands || 0) + 1;
        else if (update.theme === "desert") currentStats.humanWins.desert = (currentStats.humanWins.desert || 0) + 1;
        else if (update.theme === "hourglass") currentStats.humanWins.hourglass = (currentStats.humanWins.hourglass || 0) + 1;
        else if (update.theme === "bridge") currentStats.humanWins.bridge = (currentStats.humanWins.bridge || 0) + 1;
        else if (update.theme === "hammer") currentStats.humanWins.hammer = (currentStats.humanWins.hammer || 0) + 1;
        else if (update.theme === "arena") currentStats.humanWins.arena = (currentStats.humanWins.arena || 0) + 1;
        if (update.difficulty === "facile") currentStats.difficultyWins.facile += 1;
        else if (update.difficulty === "normale") currentStats.difficultyWins.normale += 1;
        else if (update.difficulty === "difficile") currentStats.difficultyWins.difficile += 1;
      }
    }
    const newContent = JSON.stringify(currentStats, null, 2);
    if (fileId) {
      await drive.files.update({
        fileId,
        supportsAllDrives: true,
        media: {
          mimeType: "text/plain",
          body: newContent
        }
      });
    } else {
      throw new Error(`The file '${FILE_NAME}' does not exist in the shared folder. Because service accounts do not have their own storage quota, they cannot create new files. Please create an empty text file named '${FILE_NAME}' inside the 'wall go' folder manually, and then try again.`);
    }
    res.json({ success: true, stats: currentStats });
  } catch (error) {
    console.error("Error updating Google Drive:", error);
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const errorDetails = error.errors ? JSON.stringify(error.errors) : "";
    res.status(500).json({
      error: `Failed to update stats. Ensure folder is shared with ${clientEmail}. Error: ${error.message} ${errorDetails}`
    });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
