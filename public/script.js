const socket = io();
let myInfo = null;
let currentChat = null;

function register() {
    const name = document.getElementById('name-input').value;
    if (!name) return alert('Digite seu nome');
    
    // Simulating photo upload for now
    socket.emit('register', { name, photo: 'https://via.placeholder.com/150' });
}

socket.on('registered', (user) => {
    myInfo = user;
    localStorage.setItem('ultzap_user', JSON.stringify(user));
    document.getElementById('setup-screen').classList.add('hidden');
    document.getElementById('main-screen').classList.remove('hidden');
    document.getElementById('my-name').innerText = user.name;
    document.getElementById('my-number').innerText = user.ultnumero;
});

function addContact() {
    const num = prompt('Digite o ultnumero do contato:');
    if (num) {
        const chatList = document.getElementById('chat-list');
        const div = document.createElement('div');
        div.className = 'chat-item';
        div.onclick = () => openChat(num);
        div.innerHTML = `<img src="https://via.placeholder.com/50" alt=""><div><strong>${num}</strong><p>Clique para conversar</p></div>`;
        chatList.appendChild(div);
    }
}

function openChat(num) {
    currentChat = num;
    document.getElementById('chat-window').classList.remove('hidden');
    document.getElementById('contact-name').innerText = num;
    document.getElementById('messages').innerHTML = ''; // Basic logic
}

function backToList() {
    document.getElementById('chat-window').classList.add('hidden');
    currentChat = null;
}

function sendMessage() {
    const text = document.getElementById('msg-input').value;
    if (!text || !currentChat) return;
    
    socket.emit('send_message', { 
        from: myInfo.ultnumero, 
        to: currentChat, 
        text 
    });
    document.getElementById('msg-input').value = '';
}

socket.on('receive_message', (msg) => {
    if (currentChat === msg.from || currentChat === msg.to) {
        const div = document.createElement('div');
        div.className = `msg ${msg.from === myInfo.ultnumero ? 'sent' : 'received'}`;
        div.innerText = msg.text;
        document.getElementById('messages').appendChild(div);
        document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight;
    }
});

// Auto-login
const savedUser = localStorage.getItem('ultzap_user');
if (savedUser) {
    const user = JSON.parse(savedUser);
    socket.emit('register', { name: user.name, photo: user.photo });
}

// Service Worker for PWA
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
}
