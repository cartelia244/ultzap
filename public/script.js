const socket = io();
let myInfo = null;
let currentChat = null;
let profilePhotoBase64 = null;
const AI_PHOTO = "https://cdn.discordapp.com/attachments/1521337815278026875/1521337915106525204/file_000000000784720ea3d8f2a81897b319.png?ex=6a60d018&is=6a5f7e98&hm=c97bd31f748132fba52a29c1495b9d9117347e904bd4ab5d6bef75b643f92282&";

// Persistência local de mensagens
let messagesDB = JSON.parse(localStorage.getItem('ultzap_messages')) || [];
function saveMessages() { localStorage.setItem('ultzap_messages', JSON.stringify(messagesDB)); }

// PERMISSÕES E ÁUDIO
let mediaRecorder;
let audioChunks = [];

async function requestPermissions() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        console.log("Permissões concedidas");
        return stream;
    } catch (err) {
        alert("Para gravar áudios e usar a câmera, você precisa permitir o acesso no navegador.");
        console.warn("Permissões negadas:", err);
    }
}

async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = () => {
                socket.emit('send_message', { 
                    from: myInfo.ultnumero, 
                    to: currentChat, 
                    text: '🎤 Áudio', 
                    type: 'audio',
                    media: reader.result 
                });
            };
        };
        mediaRecorder.start();
        document.getElementById('audio-btn').style.color = 'red';
        if (navigator.vibrate) navigator.vibrate(50);
    } catch (err) {
        alert("Não foi possível acessar o microfone.");
    }
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        document.getElementById('audio-btn').style.color = '';
    }
}

function renderMessage(msg) {
    const div = document.createElement('div');
    div.className = `msg ${msg.from === myInfo.ultnumero ? 'sent' : 'received'}`;
    
    if (msg.type === 'audio') {
        const audio = document.createElement('audio');
        audio.controls = true;
        audio.src = msg.media;
        audio.style.width = '200px';
        div.appendChild(audio);
    } else if (msg.type === 'image') {
        const img = document.createElement('img');
        img.src = msg.media;
        img.style.maxWidth = '100%';
        img.style.borderRadius = '5px';
        div.appendChild(img);
    } else {
        div.innerText = msg.text;
    }
    
    document.getElementById('messages').appendChild(div);
    document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight;
}

// RESTANTE DO CÓDIGO (Cadastro, Tabs, etc)
function register() {
    const name = document.getElementById('name-input').value;
    if (!name) return alert("Digite seu nome");
    
    socket.emit('register', { name, photo: profilePhotoBase64 });
}

socket.on('registered', user => {
    myInfo = user;
    localStorage.setItem('ultzap_user', JSON.stringify(user));
    document.getElementById('setup-screen').classList.add('hidden');
    document.getElementById('main-screen').classList.remove('hidden');
    
    document.getElementById('settings-name').innerText = user.name;
    document.getElementById('settings-number').innerText = user.ultnumero;
    document.getElementById('settings-photo').src = user.photo || 'https://via.placeholder.com/150';
    
    createChatItem('ULTIIA', 'UltIIA', AI_PHOTO);
    requestPermissions();
});

socket.on('receive_message', msg => {
    messagesDB.push(msg);
    saveMessages();
    const other = msg.from === myInfo.ultnumero ? msg.to : msg.from;
    if (currentChat === other) renderMessage(msg);
});

function sendMessage() {
    const text = document.getElementById('msg-input').value;
    if (!text || !currentChat) return;
    
    const msg = { from: myInfo.ultnumero, to: currentChat, text, type: 'text' };
    socket.emit('send_message', msg);
    document.getElementById('msg-input').value = '';
}

function createChatItem(id, name, photo) {
    if (document.getElementById('chat-' + id)) return;
    const div = document.createElement('div');
    div.id = 'chat-' + id;
    div.className = 'chat-item';
    div.onclick = () => openChat(id, name, photo);
    div.innerHTML = `
        <img src="${photo}" alt="">
        <div class="chat-info">
            <strong>${name}</strong>
            <p>Clique para conversar</p>
        </div>
    `;
    document.getElementById('chat-list').appendChild(div);
}

function openChat(id, name, photo) {
    currentChat = id;
    document.getElementById('chat-window').classList.remove('hidden');
    document.getElementById('contact-name').innerText = name;
    document.getElementById('contact-photo').src = photo;
    document.getElementById('messages').innerHTML = '';
    
    messagesDB.forEach(msg => {
        const other = msg.from === myInfo.ultnumero ? msg.to : msg.from;
        if (other === id) renderMessage(msg);
    });
}

function backToList() {
    document.getElementById('chat-window').classList.add('hidden');
    currentChat = null;
}

function toggleSettings() {
    document.getElementById('settings-screen').classList.toggle('hidden');
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.add('hidden'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.getElementById(tabId).classList.remove('hidden');
    event.currentTarget.classList.add('active');
}

function addContact() {
    const name = prompt("Nome do contato:");
    const number = prompt("Número do contato (+55...):");
    if (name && number) {
        createChatItem(number, name, 'https://via.placeholder.com/50?text=' + name[0]);
    }
}

function logout() {
    if (confirm("Sair da conta?")) {
        localStorage.clear();
        location.reload();
    }
}

function editBio() {
    const bio = prompt("Novo recado:");
    if (bio) {
        document.getElementById('settings-bio').innerText = bio;
        document.getElementById('settings-bio-detail').innerText = bio;
    }
}

function previewImage(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = e => {
            document.getElementById('preview-photo').src = e.target.result;
            profilePhotoBase64 = e.target.result;
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function sendMedia(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = e => {
            socket.emit('send_message', { 
                from: myInfo.ultnumero, 
                to: currentChat, 
                text: '📷 Foto', 
                type: 'image',
                media: e.target.result 
            });
        };
        reader.readAsDataURL(input.files[0]);
    }
}

// Carregamento inicial
const savedUser = localStorage.getItem('ultzap_user');
if (savedUser) {
    myInfo = JSON.parse(savedUser);
    socket.emit('register', { name: myInfo.name, photo: myInfo.photo });
}
