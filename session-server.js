// server.js
import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import qrcode from "qrcode";
import makeWASocket, { useMultiFileAuthState, DisconnectReason } from "@whiskeysockets/baileys";
import bodyParser from "body-parser";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public"))); // serve index.html

const PORT = process.env.PORT || 3000;
const AUTH_FOLDER = path.join(__dirname, "auth_info_baileys");

fs.mkdirSync(AUTH_FOLDER, { recursive: true });

let sock;

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);
  sock = makeWASocket({ auth: state, browser: ["Maxx-XMD", "Chrome", "1.0"] });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log("Scan this QR in terminal:\n");
      qrcode.toString(qr, { type: "terminal", small: true }, (_, qrStr) => console.log(qrStr));
    }

    if (connection === "close") {
      const reason = lastDisconnect?.error?.output?.statusCode;
      if (reason !== DisconnectReason.loggedOut) startBot();
      else console.log("❌ Logged out, scan QR again.");
    }

    if (connection === "open") console.log("✅ BOT CONNECTED!");
  });
}

// Endpoint to generate session ID
app.post("/generate-session", async (req, res) => {
  if (!sock) return res.status(500).json({ error: "Bot not connected yet." });

  let { number } = req.body;
  if (!number) return res.status(400).json({ error: "Number is required." });

  number = number.replace(/\D/g, ""); // remove non-digit chars
  if (number.length < 8) return res.status(400).json({ error: "Invalid number. Include country code." });

  const whatsappID = `${number}@s.whatsapp.net`;
  const sessionCode = Math.floor(100000 + Math.random() * 900000); // 6-digit code

  try {
    await sock.sendMessage(whatsappID, { text: `✅ Your MAXX-XMD session code: ${sessionCode}` });
    return res.json({ success: true, code: sessionCode });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to send session code." });
  }
});

app.listen(PORT, () => {
  console.log(`MAXX-XMD Session Generator running on port ${PORT}`);
  startBot();
});
