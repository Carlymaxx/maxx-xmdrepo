import express from 'express';
import { makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import P from 'pino';

const app = express();
app.use(express.json()); // for parsing JSON body

let sock;

// Initialize WhatsApp connection
async function startWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');

    sock = makeWASocket({
        auth: state,
        logger: P({ level: 'info' }),
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if(connection === 'open') {
            console.log('✅ WhatsApp is connected and ready!');
        } else if(connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode;
            console.log('⚠️ Disconnected:', reason);
            // Optionally, try to reconnect
        }
    });

    sock.ev.on('creds.update', saveCreds);
}

// Start WhatsApp client
startWhatsApp();

// API endpoint to send message
app.post('/send', async (req, res) => {
    const { id, message } = req.body;

    // Validate request
    if(!id || !message) {
        return res.status(400).send({ error: 'Missing id or message' });
    }

    // Ensure sock is connected
    if(!sock?.user) {
        return res.status(500).send({ error: 'WhatsApp client not ready yet' });
    }

    try {
        await sock.sendMessage(id, { text: message });
        return res.send({ success: true, message: 'Message sent!' });
    } catch(err) {
        console.error('Send message error:', err);
        return res.status(500).send({ error: 'Failed to send message' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
