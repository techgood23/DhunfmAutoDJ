const express = require('express');
const multer = require('multer');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const MUSIC_DIR = path.join(__dirname, 'music');
const PLAYLIST_FILE = path.join(__dirname, 'playlist.txt');

// Ensure music directory exists
if (!fs.existsSync(MUSIC_DIR)) fs.mkdirSync(MUSIC_DIR);

let ffmpegProcess = null;

// File upload setup
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, MUSIC_DIR),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'))
});
const upload = multer({ storage: storage });

app.use(express.static('public'));
app.use(express.json());

// Get list of uploaded tracks
app.get('/api/tracks', (req, res) => {
    fs.readdir(MUSIC_DIR, (err, files) => {
        if (err) return res.status(500).json({ error: 'Failed to read tracks' });
        const tracks = files.filter(f => f.endsWith('.mp3'));
        res.json({ tracks, isPlaying: !!ffmpegProcess });
    });
});

// Upload new tracks
app.post('/api/upload', upload.array('audioFiles'), (req, res) => {
    res.json({ message: 'Tracks uploaded successfully!' });
});

// Delete all tracks
app.post('/api/clear', (req, res) => {
    if (ffmpegProcess) {
        ffmpegProcess.kill('SIGINT');
        ffmpegProcess = null;
    }
    const files = fs.readdirSync(MUSIC_DIR);
    for (const file of files) fs.unlinkSync(path.join(MUSIC_DIR, file));
    res.json({ message: 'Playlist cleared.' });
});

// Start the Auto-DJ Broadcast
app.post('/api/start', (req, res) => {
    if (ffmpegProcess) return res.status(400).json({ error: 'Already playing!' });

    const config = req.body;
    const files = fs.readdirSync(MUSIC_DIR).filter(f => f.endsWith('.mp3'));
    
    if (files.length === 0) return res.status(400).json({ error: 'No MP3 files found. Upload first!' });

    // Generate FFmpeg concat playlist
    let playlistContent = files.map(f => `file '${path.join(MUSIC_DIR, f)}'`).join('\n');
    fs.writeFileSync(PLAYLIST_FILE, playlistContent);

    // Shoutcast/Icecast URL
    const streamUrl = `icecast://${encodeURIComponent(config.user)}:${encodeURIComponent(config.password)}@${config.host}:${config.port}${config.mount}`;

    // Spawn FFmpeg in background
    const args = [
        '-re',                     // Read input at native frame rate
        '-stream_loop', '-1',      // Loop the playlist infinitely
        '-f', 'concat',            // Use concat demuxer
        '-safe', '0',
        '-i', PLAYLIST_FILE,
        '-c:a', 'libmp3lame',
        '-b:a', '128k',
        '-content_type', 'audio/mpeg',
        '-ice_name', 'Rupantar Music Auto-DJ',
        '-f', 'mp3',
        streamUrl
    ];

    ffmpegProcess = spawn('ffmpeg', args);

// Yeh nayi line FFmpeg ka real error print karegi
ffmpegProcess.stderr.on('data', (data) => {
    console.error(`FFmpeg Error: ${data}`);
});

ffmpegProcess.on('close', () => {
    ffmpegProcess = null;
    console.log('FFmpeg stopped.');
});


    res.json({ message: 'Auto-DJ Started in background!' });
});

// Stop the Auto-DJ
app.post('/api/stop', (req, res) => {
    if (ffmpegProcess) {
        ffmpegProcess.kill('SIGINT');
        ffmpegProcess = null;
        return res.json({ message: 'Broadcast stopped.' });
    }
    res.json({ message: 'Not playing currently.' });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Auto-DJ Server running on port ${PORT}`);
});
