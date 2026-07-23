const socket = io();
let myInfo = null;
let currentChat = null;
let profilePhotoBase64 = null;
const AI_PHOTO = "https://cdn.discordapp.com/attachments/1521337815278026875/1521337915106525204/file_000000000784720ea3d8f2a81897b319.png?ex=6a60d018&is=6a5f7e98&hm=c97bd31f748132fba52a29c1495b9d9117347e904bd4ab5d6bef75b643f92282&";

// Permissions
async function requestPermissions() {
    try {
        await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        console.log("Permissões concedidas");
    } catch (err) {
        console.warn("Permissões negadas:", err);
    }
}

// Image Preview
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

function register() {
    const name = document.getElementById('name-input').value;
    if (!name) return alert('Digite seu nome');
    const photo = profilePhotoBase64 || 'https://via.placeholder.com/150?text=U';
    socket.emit('register', { name, photo });
}

socket.on('registered', user => {
    myInfo = user;
    localStorage.setItem('ultzap_user', JSON.stringify(user));
    document.getElementById('setup-screen').classList.add('hidden');
    document.getElementById('main-screen').classList.remove('hidden');
    updateSettingsUI();
    requestPermissions();
    socket.emit('get_history', user.ultnumero);
});

function updateSettingsUI() {
    document.getElementById('settings-name').innerText = myInfo.name;
    document.getElementById('settings-number').innerText = myInfo.ultnumero;
    document.getElementById('settings-photo').src = myInfo.photo;
    const bio = myInfo.bio || 'Disponível';
    document.getElementById('settings-bio').innerText = bio;
    document.getElementById('settings-bio-detail').innerText = bio;
}

function toggleSettings() {
    document.getElementById('settings-screen').classList.toggle('hidden');
}

function logout() {
    if (confirm("Sair da conta?")) {
        localStorage.removeItem('ultzap_user');
        location.reload();
    }
}

function editBio() {
    const newBio = prompt("Novo recado:", myInfo.bio || "Disponível");
    if (newBio) {
        myInfo.bio = newBio;
        updateSettingsUI();
        localStorage.setItem('ultzap_user', JSON.stringify(myInfo));
        socket.emit('update_profile', { ultnumero: myInfo.ultnumero, bio: newBio });
    }
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.add('hidden'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.getElementById(tabId).classList.remove('hidden');
    event.currentTarget.classList.add('active');
}

function openChat(id, name, photo) {
    currentChat = id;
    document.getElementById('chat-window').classList.remove('hidden');
    document.getElementById('contact-name').innerText = name;
    document.getElementById('contact-photo').src = photo;
    document.getElementById('messages').innerHTML = '';
    socket.emit('get_history', myInfo.ultnumero);
}

function backToList() {
    document.getElementById('chat-window').classList.add('hidden');
    currentChat = null;
}

function addContact() {
    const name = prompt("Nome do contato:");
    const number = prompt("Número (+55...):");
    if (name && number) {
        createChatItem(number, name, 'https://via.placeholder.com/50?text=' + name[0]);
    }
}

function createChatItem(id, name, photo) {
    if (document.getElementById('chat-' + id)) return;
    const div = document.createElement('div');
    div.id = 'chat-' + id;
    div.className = 'chat-item';
    div.onclick = () => openChat(id, name, photo);
    div.innerHTML = `<img src="${photo}"> <div class="chat-info"><strong>${name}</strong><p>Clique para conversar</p></div>`;
    document.getElementById('chat-list').appendChild(div);
}

function sendMessage() {
    const input = document.getElementById('msg-input');
    const text = input.value;
    if (!text || !currentChat) return;
    socket.emit('send_message', { from: myInfo.ultnumero, to: currentChat, text });
    input.value = '';
}

socket.on('receive_message', msg => {
    const other = msg.from === myInfo.ultnumero ? msg.to : msg.from;
    if (currentChat === other) renderMessage(msg);
    if (msg.from !== myInfo.ultnumero) {
        const photo = msg.from === 'ULTIIA' ? AI_PHOTO : 'https://via.placeholder.com/50?text=U';
        createChatItem(msg.from, msg.from, photo);
    }
});

socket.on('load_history', history => {
    history.forEach(msg => {
        const other = msg.from === myInfo.ultnumero ? msg.to : msg.from;
        if (other === 'ULTIIA') createChatItem('ULTIIA', 'UltIIA', AI_PHOTO);
        else createChatItem(other, other, 'https://via.placeholder.com/50?text=U');
        if (currentChat === other) renderMessage(msg);
    });
});

function renderMessage(msg) {
    const div = document.createElement('div');
    div.className = `msg ${msg.from === myInfo.ultnumero ? 'sent' : 'received'}`;
    div.innerText = msg.text;
    document.getElementById('messages').appendChild(div);
    document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight;
}

// Media & Audio
function sendMedia(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = e => socket.emit('send_message', { 
            from: myInfo.ultnumero, to: currentChat, text: '[Mídia]', type: 'image', media: e.target.result 
        });
        reader.readAsDataURL(input.files[0]);
    }
}

let mediaRecorder;
let audioChunks = [];
async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
    mediaRecorder.onstop = () => {
        const reader = new FileReader();
        reader.readAsDataURL(new Blob(audioChunks));
        reader.onloadend = () => socket.emit('send_message', { 
            from: myInfo.ultnumero, to: currentChat, text: '[Áudio]', type: 'audio', media: reader.result 
        });
        audioChunks = [];
    };
    mediaRecorder.start();
    document.getElementById('audio-btn').style.color = 'red';
}
function stopRecording() {
    if (mediaRecorder) {
        mediaRecorder.stop();
        document.getElementById('audio-btn').style.color = '';
    }
}

const savedUser = localStorage.getItem('ultzap_user');
if (savedUser) {
    myInfo = JSON.parse(savedUser);
    socket.emit('register', { name: myInfo.name, photo: myInfo.photo });
}
