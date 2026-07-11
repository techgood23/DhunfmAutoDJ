const $ = id => document.getElementById(id);

async function loadStatus() {
    const res = await fetch('/api/tracks');
    const data = await res.json();
    
    $('trackList').innerHTML = data.tracks.length 
        ? data.tracks.map((t, i) => `<li class="bg-gray-800 p-2 rounded border border-gray-700 truncate">${i+1}. ${t}</li>`).join('') 
        : '<p class="text-gray-500 text-center">No tracks on server.</p>';

    if(data.isPlaying) {
        $('statusBadge').textContent = 'ON AIR (Looping)';
        $('statusBadge').className = 'px-4 py-1.5 rounded-full text-sm font-semibold bg-red-500/20 text-red-400 border border-red-500/50 animate-pulse';
        $('startBtn').classList.add('hidden');
        $('stopBtn').classList.remove('hidden');
    } else {
        $('statusBadge').textContent = 'Offline';
        $('statusBadge').className = 'px-4 py-1.5 rounded-full text-sm font-semibold bg-gray-800 text-gray-400 border border-gray-700';
        $('startBtn').classList.remove('hidden');
        $('stopBtn').classList.add('hidden');
    }
}

$('uploadBtn').onclick = () => $('fileInput').click();

$('fileInput').onchange = async (e) => {
    if(!e.target.files.length) return;
    const formData = new FormData();
    for(let f of e.target.files) formData.append('audioFiles', f);
    
    $('uploadStatus').textContent = 'Uploading to server... Please wait.';
    await fetch('/api/upload', { method: 'POST', body: formData });
    $('uploadStatus').textContent = 'Upload complete!';
    $('fileInput').value = '';
    loadStatus();
};

$('clearBtn').onclick = async () => {
    if(confirm('Delete all tracks from server? This will stop the broadcast.')) {
        await fetch('/api/clear', { method: 'POST' });
        loadStatus();
    }
};

$('startBtn').onclick = async () => {
    const config = {
        host: $('host').value,
        port: $('port').value,
        user: $('user').value,
        password: $('password').value,
        mount: $('mount').value
    };
    
    if(!config.host || !config.password) return alert('Enter Host and Password!');
    
    const res = await fetch('/api/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
    });
    
    const data = await res.json();
    if(data.error) alert(data.error);
    loadStatus();
};

$('stopBtn').onclick = async () => {
    await fetch('/api/stop', { method: 'POST' });
    loadStatus();
};

// Load status initially
loadStatus();
