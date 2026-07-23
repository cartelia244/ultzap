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

const AI_PHOTO = "https://cdn.discordapp.com/attachments/1521337815278026875/1521337915106525204/file_000000000784720ea3d8f2a81897b319.png?ex=6a60d018&is=6a5f7e98&hm=c97bd31f748132fba52a29c1495b9d9117347e904bd4ab5d6bef75b643f92282&";

socket.on('registered', (user) => {
    myInfo = user;
    localStorage.setItem('ultzap_user', JSON.stringify(user));
    
    document.getElementById('setup-screen').classList.add('hidden');
    document.getElementById('main-screen').classList.remove('hidden');
    
    // Update Settings UI
    document.getElementById('settings-name').innerText = user.name;
    document.getElementById('settings-number').innerText = user.ultnumero;
    document.getElementById('settings-photo').src = user.photo;
    if (user.bio) document.getElementById('settings-bio').innerText = user.bio;

    // Request permissions early
    requestPermissions();

    // Load AI Chat explicitly if not there
    createChatItem('ULTIIA', 'UltIIA', AI_PHOTO);
    
    // Request history
    socket.emit('get_history', user.ultnumero);
});

socket.on('load_history', (history) => {
    // Basic implementation: if a chat is open, filter and show. 
    // In a real app, this would populate the chat list with last messages.
    history.forEach(msg => {
        // This is a simple way to "remember" who we talked to
        const other = msg.from === myInfo.ultnumero ? msg.to : msg.from;
        if (other === 'ULTIIA') {
             createChatItem('ULTIIA', 'UltIIA', AI_PHOTO);
        } else {
             createChatItem(other, other, 'https://via.placeholder.com/50?text=U');
        }
    });
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
    
    // Request history to fill this specific chat
    socket.emit('get_history', myInfo.ultnumero);
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

function logout() {
    if (confirm("Deseja realmente sair da conta? Você poderá criar uma nova ou entrar em outra.")) {
        localStorage.removeItem('ultzap_user');
        location.reload();
    }
}

function requestPermissions() {
    navigator.mediaDevices.getUserMedia({ audio: true, video: true })
        .then(() => console.log("Permissões concedidas"))
        .catch(err => console.warn("Permissões negadas ou erro:", err));
}

function editBio() {
    const newBio = prompt("Digite seu novo recado:", document.getElementById('settings-bio').innerText);
    if (newBio) {
        document.getElementById('settings-bio').innerText = newBio;
        myInfo.bio = newBio;
        localStorage.setItem('ultzap_user', JSON.stringify(myInfo));
        socket.emit('update_profile', { ultnumero: myInfo.ultnumero, bio: newBio });
    }
}

function addContact() {
    const number = prompt("Digite o número do contato (ex: +55...):");
    const name = prompt("Nome do contato:");
    if (number && name) {
        createChatItem(number, name, 'https://via.placeholder.com/50?text=' + name[0]);
    }
}

let mediaRecorder;
let audioChunks = [];

async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
    mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/ogg; codecs=opus' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
            socket.emit('send_message', { 
                from: myInfo.ultnumero, 
                to: currentChat, 
                text: '[Áudio]', 
                type: 'audio',
                media: reader.result 
            });
        };
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

function sendMedia(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        const reader = new FileReader();
        reader.onload = e => {
            socket.emit('send_message', { 
                from: myInfo.ultnumero, 
                to: currentChat, 
                text: file.type.startsWith('image') ? '[Foto]' : '[Vídeo]', 
                type: file.type.startsWith('image') ? 'image' : 'video',
                media: e.target.result 
            });
        };
        reader.readAsDataURL(file);
    }
}
