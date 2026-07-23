const socket = io();
let myInfo = null;
let currentChat = null;
let profilePhotoBase64 = null;

// Image Preview
function previewImage(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('preview-photo').src = e.target.result;
            profilePhotoBase64 = e.target.result;
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function register() {
    const name = document.getElementById('name-input').value;
    if (!name) return alert('Digite seu nome para continuar');
    
    const photo = profilePhotoBase64 || 'https://via.placeholder.com/150?text=User';
    socket.emit('register', { name, photo });
}

socket.on('registered', (user) => {
    myInfo = user;
    localStorage.setItem('ultzap_user', JSON.stringify(user));
    
    document.getElementById('setup-screen').classList.add('hidden');
    document.getElementById('main-screen').classList.remove('hidden');
    
    // Update Settings UI
    document.getElementById('settings-name').innerText = user.name;
    document.getElementById('settings-number').innerText = user.ultnumero;
    document.getElementById('settings-photo').src = user.photo;
});

function addContact() {
    const num = prompt('Digite o ultnumero do contato (ex: ULT-123456):');
    if (num) {
        if (num === myInfo.ultnumero) return alert('Você não pode adicionar seu próprio número.');
        createChatItem(num, num, 'https://via.placeholder.com/50?text=U');
    }
}

function createChatItem(id, name, photo) {
    const chatList = document.getElementById('chat-list');
    // Check if already exists
    if (document.getElementById(`chat-item-${id}`)) return;

    const div = document.createElement('div');
    div.id = `chat-item-${id}`;
    div.className = 'chat-item';
    div.onclick = () => openChat(id, name, photo);
    div.innerHTML = `
        <img src="${photo}" alt="">
        <div class="chat-info">
            <strong>${name}</strong>
            <p>Clique para conversar</p>
        </div>
    `;
    chatList.appendChild(div);
}

function openChat(id, name, photo) {
    currentChat = id;
    document.getElementById('chat-window').classList.remove('hidden');
    document.getElementById('contact-name').innerText = name;
    document.getElementById('contact-photo').src = photo;
    document.getElementById('messages').innerHTML = '';
}

function backToList() {
    document.getElementById('chat-window').classList.add('hidden');
    currentChat = null;
}

function toggleSettings() {
    const screen = document.getElementById('settings-screen');
    screen.classList.toggle('hidden');
}

function sendMessage() {
    const input = document.getElementById('msg-input');
    const text = input.value;
    if (!text || !currentChat) return;
    
    socket.emit('send_message', { 
        from: myInfo.ultnumero, 
        to: currentChat, 
        text 
    });
    input.value = '';
}

socket.on('receive_message', (msg) => {
    // If message is for/from current open chat
    if (currentChat === msg.from || (currentChat === msg.to && msg.from === myInfo.ultnumero)) {
        const div = document.createElement('div');
        div.className = `msg ${msg.from === myInfo.ultnumero ? 'sent' : 'received'}`;
        div.innerText = msg.text;
        document.getElementById('messages').appendChild(div);
        document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight;
    }
    
    // If it's a new contact messaging, add to list
    if (msg.from !== myInfo.ultnumero && msg.from !== 'ULTIIA') {
        createChatItem(msg.from, msg.from, 'https://via.placeholder.com/50?text=U');
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
