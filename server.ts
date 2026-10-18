import express from "express";
import path from "path";
import { google } from "googleapis";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Health check endpoint for Cloud Run / deployment checks
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Google Drive API setup
// Forziamo l'ID corretto ignorando la variabile d'ambiente che potrebbe contenere quello vecchio
const FOLDER_ID = "16-k2jnG7CJAIEHJLYK4Xr2aFAnrjiwau";
const FILE_NAME = "wallgo_stats.txt";

const getDriveService = () => {
  if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    return null;
  }
  
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/"/g, ''),
    },
    scopes: ['https://www.googleapis.com/auth/drive'],
  });

  return google.drive({ version: 'v3', auth });
};

app.get("/api/test-drive", async (req, res) => {
  try {
    const drive = getDriveService();
    if (!drive) {
      return res.status(500).json({ error: "Credentials missing (GOOGLE_CLIENT_EMAIL or GOOGLE_PRIVATE_KEY)" });
    }
    
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;

    // List ALL files the service account can see to debug
    const response = await drive.files.list({
      q: `trashed=false`,
      fields: 'files(id, name, mimeType)',
      pageSize: 50,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true
    });
    
    const files = response.data.files || [];
    const fileList = files.map(f => `${f.name} (${f.id})`).join(', ');
    
    res.json({ 
      success: true, 
      message: `Connection successful! Account ${clientEmail} can see ${files.length} files/folders: ${fileList || 'None'}`, 
      filesFound: files.length 
    });
  } catch (error: any) {
    console.error("Drive Test Error:", error);
    const errorDetails = error.errors ? JSON.stringify(error.errors) : '';
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
    // 1. Find if the file already exists (anywhere the service account can see it)
    const response = await drive.files.list({
      q: `name='${FILE_NAME}' and trashed=false`,
      fields: 'files(id)',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true
    });

    let fileId = response.data.files?.[0]?.id;
    let currentStats: any = {
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

    // 2. If file exists, read its content
    if (fileId) {
      const fileResponse = await drive.files.get({
        fileId: fileId,
        alt: 'media',
        supportsAllDrives: true
      }, { responseType: 'text' });
      
      try {
        const parsed = JSON.parse(fileResponse.data as string);
        if (parsed.totalGames !== undefined) {
          currentStats = { ...currentStats, ...parsed };
          // Ensure nested objects exist in case of old format
          currentStats.humanWins = {
            neon: 0, islands: 0, desert: 0, hourglass: 0, bridge: 0, hammer: 0, arena: 0,
            ...(parsed.humanWins || {})
          };
          currentStats.difficultyWins = { ...currentStats.difficultyWins, ...(parsed.difficultyWins || {}) };
          currentStats._userIds = parsed._userIds || [];
        }
      } catch (e) {
        // If it's not JSON, we'll just overwrite it
        console.error("Failed to parse existing stats file", e);
      }
    }

    // 3. Update stats
    const updates = batch || [{ winner, theme, difficulty, userId }];
    
    for (const update of updates) {
      if (!update.winner || !update.theme) continue;
      currentStats.totalGames += 1;
      
      if (update.userId && !currentStats._userIds.includes(update.userId)) {
        currentStats._userIds.push(update.userId);
        currentStats.uniqueUsersCount = currentStats._userIds.length;
      }

      if (update.winner === 'ai') {
        currentStats.aiWins += 1;
      } else if (update.winner === 'human') {
        if (update.theme === 'neon') currentStats.humanWins.neon = (currentStats.humanWins.neon || 0) + 1;
        else if (update.theme === 'islands') currentStats.humanWins.islands = (currentStats.humanWins.islands || 0) + 1;
        else if (update.theme === 'desert') currentStats.humanWins.desert = (currentStats.humanWins.desert || 0) + 1;
        else if (update.theme === 'hourglass') currentStats.humanWins.hourglass = (currentStats.humanWins.hourglass || 0) + 1;
        else if (update.theme === 'bridge') currentStats.humanWins.bridge = (currentStats.humanWins.bridge || 0) + 1;
        else if (update.theme === 'hammer') currentStats.humanWins.hammer = (currentStats.humanWins.hammer || 0) + 1;
        else if (update.theme === 'arena') currentStats.humanWins.arena = (currentStats.humanWins.arena || 0) + 1;

        if (update.difficulty === 'facile') currentStats.difficultyWins.facile += 1;
        else if (update.difficulty === 'normale') currentStats.difficultyWins.normale += 1;
        else if (update.difficulty === 'difficile') currentStats.difficultyWins.difficile += 1;
      }
    }

    const newContent = JSON.stringify(currentStats, null, 2);

    // 4. Create or update the file
    if (fileId) {
      await drive.files.update({
        fileId: fileId,
        supportsAllDrives: true,
        media: {
          mimeType: 'text/plain',
          body: newContent
        }
      });
    } else {
      // The service account cannot create files because it has no storage quota.
      // It must update an existing file that the user has created and shared with it.
      throw new Error(`The file '${FILE_NAME}' does not exist in the shared folder. Because service accounts do not have their own storage quota, they cannot create new files. Please create an empty text file named '${FILE_NAME}' inside the 'wall go' folder manually, and then try again.`);
    }

    res.json({ success: true, stats: currentStats });
  } catch (error: any) {
    console.error("Error updating Google Drive:", error);
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const errorDetails = error.errors ? JSON.stringify(error.errors) : '';
    res.status(500).json({ 
      error: `Failed to update stats. Ensure folder is shared with ${clientEmail}. Error: ${error.message} ${errorDetails}` 
    });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
