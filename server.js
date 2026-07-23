const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const Groq = require('groq-sdk');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

const DATA_FILE = 'data.json';
let db = { users: {}, messages: [] };

if (fs.existsSync(DATA_FILE)) {
    db = JSON.parse(fs.readFileSync(DATA_FILE));
}

function saveDB() {
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

function generateUltNumero() {
    return 'ULT-' + Math.floor(100000 + Math.random() * 900000);
}

io.on('connection', (socket) => {
    console.log('User connected');

    socket.on('register', ({ name, photo }) => {
        let user = Object.values(db.users).find(u => u.name === name); // Simplification
        if (!user) {
            const ultnumero = generateUltNumero();
            user = { name, photo, ultnumero, id: socket.id };
            db.users[ultnumero] = user;
            saveDB();
        }
        socket.emit('registered', user);
        socket.join(user.ultnumero);
    });

    socket.on('send_message', async ({ from, to, text, type = 'text' }) => {
        const msg = { from, to, text, type, timestamp: new Date() };
        db.messages.push(msg);
        saveDB();

        io.to(to).emit('receive_message', msg);
        io.to(from).emit('receive_message', msg);

        // UltIIA logic
        if (to === 'ULTIIA' || text.toLowerCase().includes('@ultiia')) {
            try {
                const completion = await groq.chat.completions.create({
                    messages: [
                        { role: 'system', content: 'Você é a UltIIA, a assistente inteligente do ULTZAP. Seja prestativa, informal e responda em português.' },
                        { role: 'user', content: text }
                    ],
                    model: 'llama-3.3-70b-versatile',
                });
                const aiMsg = { 
                    from: 'ULTIIA', 
                    to: from, 
                    text: completion.choices[0].message.content, 
                    type: 'text', 
                    timestamp: new Date() 
                };
                db.messages.push(aiMsg);
                saveDB();
                io.to(from).emit('receive_message', aiMsg);
            } catch (error) {
                console.error('Groq Error:', error);
            }
        }
    });

    socket.on('get_history', (myNum) => {
        const history = db.messages.filter(m => m.from === myNum || m.to === myNum);
        socket.emit('load_history', history);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`ULTZAP running on port ${PORT}`);
});
