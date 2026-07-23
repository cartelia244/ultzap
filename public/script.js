const socket = io();
let myInfo = null;
let currentChat = null;
let profilePhotoBase64 = null;
const AI_PHOTO = "https://cdn.discordapp.com/attachments/1521337815278026875/1521337915106525204/file_000000000784720ea3d8f2a81897b319.png?ex=6a60d018&is=6a5f7e98&hm=c97bd31f748132fba52a29c1495b9d9117347e904bd4ab5d6bef75b643f92282&";

let messagesDB = JSON.parse(localStorage.getItem('ultzap_messages')) || [];
function saveMessages() { localStorage.setItem('ultzap_messages', JSON.stringify(messagesDB)); }

let mediaRecorder;
let audioChunks = [];

// Função robusta para capturar áudio no celular
async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Configuração específica para compatibilidade com iPhone e Android
        const options = { mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4' };
        mediaRecorder = new MediaRecorder(stream, options);
        
        audioChunks = [];
        mediaRecorder.ondataavailable = e => {
            if (e.data.size > 0) audioChunks.push(e.data);
        };

        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: options.mimeType });
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
            // Parar todos os tracks para liberar o microfone
            stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        document.getElementById('audio-btn').style.color = 'red';
        document.getElementById('audio-btn').classList.add('recording-animation');
    } catch (err) {
        alert("Erro ao acessar microfone: " + err.message + ". Verifique as permissões do navegador.");
    }
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        document.getElementById('audio-btn').style.color = '';
        document.getElementById('audio-btn').classList.remove('recording-animation');
    }
}

function renderMessage(msg) {
    const div = document.createElement('div');
    div.className = `msg ${msg.from === myInfo.ultnumero ? 'sent' : 'received'}`;
    
    if (msg.type === 'audio') {
        const audio = document.createElement('audio');
        audio.controls = true;
        audio.src = msg.media;
        audio.style.width = '100%';
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

// Funções de Interface
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
    socket.emit('send_message', { from: myInfo.ultnumero, to: currentChat, text, type: 'text' });
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
        myInfo.bio = bio;
        localStorage.setItem('ultzap_user', JSON.stringify(myInfo));
        socket.emit('update_profile', { ultnumero: myInfo.ultnumero, bio: bio });
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

// Inicialização
const savedUser = localStorage.getItem('ultzap_user');
if (savedUser) {
    myInfo = JSON.parse(savedUser);
    socket.emit('register', { name: myInfo.name, photo: myInfo.photo });
    document.getElementById('setup-screen').classList.add('hidden');
    document.getElementById('main-screen').classList.remove('hidden');
}
