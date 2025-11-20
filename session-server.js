// Maxx-XMD Session Generator
import express from "express";
import fs from "fs";
import path from "path";
import qrcode from "qrcode";
import makeWASocket, { useMultiFileAuthState, DisconnectReason } from "@whiskeysockets/baileys";

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;

const AUTH_FOLDER = path.join(process.cwd(), "auth_info_baileys");
fs.mkdirSync(AUTH_FOLDER, { recursive: true });

// Store number ↔ code mapping
let codeMap = {};

// --- Start WhatsApp Bot ---
let sock;
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);

  sock = makeWASocket({
    auth: state,
    browser: ["Maxx-XMD", "Chrome", "1.0"]
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", ({ connection, lastDisconnect }) => {
    if (connection === "open") console.log("✅ BOT CONNECTED!");
    if (connection === "close") {
      const reason = lastDisconnect?.error?.output?.statusCode;
      if (reason !== DisconnectReason.loggedOut) startBot();
    }
  });
}
startBot();

// --- Generate 6-digit code ---
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// --- POST /generate-session ---
app.post("/generate-session", async (req, res) => {
  try {
    const { number } = req.body;
    if (!number || !number.match(/^\d{9,15}$/)) {
      return res.status(400).json({ error: "Invalid number. Include country code." });
    }

    // Generate 6-digit code
    const code = generateCode();
    codeMap[code] = number + "@s.whatsapp.net"; // store mapping

    // Send a confirmation message via WhatsApp
    if (!sock) return res.status(500).json({ error: "Bot not connected yet" });

    await sock.sendMessage(codeMap[code], {
      text: `✅ Your MAXX-XMD session code is: ${code}\nKeep it safe!`
    });

    res.json({ message: `Code sent to ${number}`, code });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate session" });
  }
});

// --- Simple Frontend ---
app.get("/", (req, res) => {
  res.send(`
    <h2>MAXX-XMD Session Generator</h2>
    <form method="POST" action="/generate-session">
      <label>Enter WhatsApp Number (with country code):</label>
      <input name="number" type="text" placeholder="2547XXXXXXX" required />
      <button type="submit">Generate Session</button>
    </form>
  `);
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
