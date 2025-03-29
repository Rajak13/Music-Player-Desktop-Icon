const audio = document.getElementById('audio');
const playButton = document.getElementById('play');
const prevButton = document.getElementById('prev');
const nextButton = document.getElementById('next');
const seekBar = document.getElementById('seek-bar');
const songTitle = document.getElementById('song-title');
const volumeSlider = document.getElementById('volume-slider');
const currentTimeDisplay = document.getElementById('current-time');
const totalDurationDisplay = document.getElementById('total-duration');
const exitButton = document.getElementById('exit-btn');
const { ipcRenderer } = require('electron');

const minimizeButton = document.getElementById('minimize-btn');

minimizeButton.addEventListener('click', () => {
    ipcRenderer.send('minimize-window');
});

// Music tracks configuration
const songs = [
    { src: 'assets/songs/Enchanted.mp3' },
    { src: 'assets/songs/Either on or off the drugs.mp3' },
    { src: 'assets/songs/Karma Police.mp3' },
    { src: 'assets/songs/Killing Time.mp3'},
    { src: 'assets/songs/No Surprises.mp3' },

];

let currentSongIndex = 0;
let isPlaying = false;

// Format filename to title
function formatFileName(filename) {
    return filename
        .replace(/\.mp3$/, '')
        .replace(/(^\w| \w)/g, match => match.toUpperCase())
        .replace(/-/g, ' ')
        .replace(/Jpegmafia/gi, 'JPEGMAFIA');
}

// Load song and update UI
function loadSong(index) {
    const song = songs[index];
    audio.src = song.src;
    
    const fileName = song.src.split('/').pop();
    songTitle.textContent = formatFileName(fileName);
    
    seekBar.value = 0;
    audio.load();
}

// Play/pause toggle
function togglePlayback() {
    if (isPlaying) {
        audio.pause();
    } else {
        audio.play();
    }
    isPlaying = !isPlaying;
    playButton.innerHTML = isPlaying 
        ? '<i class="fas fa-pause"></i>'
        : '<i class="fas fa-play"></i>';
}

// Next song
function nextSong() {
    currentSongIndex = (currentSongIndex + 1) % songs.length;
    loadSong(currentSongIndex);
    if (isPlaying) audio.play();
}

// Previous song
function prevSong() {
    currentSongIndex = (currentSongIndex - 1 + songs.length) % songs.length;
    loadSong(currentSongIndex);
    if (isPlaying) audio.play();
}

// Update seek bar
audio.addEventListener('timeupdate', () => {
    const progress = (audio.currentTime / audio.duration) * 100 || 0;
    seekBar.value = progress;
});

// Handle seek bar interaction
seekBar.addEventListener('input', () => {
    const seekTime = (seekBar.value / 100) * audio.duration;
    audio.currentTime = seekTime;
});

// Audio ended handler
audio.addEventListener('ended', nextSong);

// Control event listeners
playButton.addEventListener('click', togglePlayback);
nextButton.addEventListener('click', nextSong);
prevButton.addEventListener('click', prevSong);

// Keyboard controls
document.addEventListener('keydown', (e) => {
    switch (e.code) {
        case 'Space':
            e.preventDefault();
            togglePlayback();
            break;
        case 'ArrowRight':
            nextSong();
            break;
        case 'ArrowLeft':
            prevSong();
            break;
    }
});

// Error handling
audio.addEventListener('error', (e) => {
    console.error('Audio error:', e);
    songTitle.textContent = 'Error loading song';
});

// Update progress time display
audio.addEventListener('timeupdate', () => {
    const currentTime = formatTime(audio.currentTime);
    const totalDuration = formatTime(audio.duration);
    currentTimeDisplay.textContent = currentTime;
    totalDurationDisplay.textContent = totalDuration || '0:00';
});

// Ensure duration is displayed after metadata is loaded
audio.addEventListener('loadedmetadata', () => {
    const totalDuration = formatTime(audio.duration);
    totalDurationDisplay.textContent = totalDuration || '0:00';
});

// Format time in mm:ss
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// Volume control
volumeSlider.addEventListener('input', () => {
    audio.volume = volumeSlider.value;
});

// Initialize player
function initializePlayer() {
    loadSong(currentSongIndex);
}

// Start the player
initializePlayer();