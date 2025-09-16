const { ipcRenderer } = require('electron');

// App State
let currentScreen = 'library';
let currentSongIndex = 0;
let isPlaying = false;
let isShuffled = false;
let repeatMode = 'none'; // none, one, all
let songs = [];
let playlists = [];
let currentPlaylist = null;
let playQueue = [];
let originalQueue = [];

// DOM Elements
const screens = {
    player: document.getElementById('player-screen'),
    library: document.getElementById('library-screen'),
    playlists: document.getElementById('playlists-screen')
};

const navItems = document.querySelectorAll('.nav-item');
const minimizeBtn = document.getElementById('minimize-btn');

// Player elements
const audio = document.getElementById('audio');
const albumArt = document.getElementById('album-art');
const playOverlay = document.getElementById('play-overlay');
const songTitle = document.getElementById('song-title');
const artistName = document.getElementById('artist-name');
const currentPlaylistEl = document.getElementById('current-playlist');
const currentTimeEl = document.getElementById('current-time');
const totalDurationEl = document.getElementById('total-duration');
const seekBar = document.getElementById('seek-bar');
const playBtn = document.getElementById('play');
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');
const shuffleBtn = document.getElementById('shuffle');
const repeatBtn = document.getElementById('repeat');
const volumeSlider = document.getElementById('volume-slider');
const queueList = document.getElementById('queue-list');

// Library elements
const uploadBtn = document.getElementById('upload-btn');
const fileInput = document.getElementById('file-input');
const refreshLibraryBtn = document.getElementById('refresh-library');
const totalSongsEl = document.getElementById('total-songs');
const totalDurationLibraryEl = document.getElementById('total-duration');
const totalPlaylistsEl = document.getElementById('total-playlists');
const songList = document.getElementById('song-list');
const playAllBtn = document.getElementById('play-all');
const shuffleAllBtn = document.getElementById('shuffle-all');

// Playlist elements
const createPlaylistBtn = document.getElementById('create-playlist');
const playlistsGrid = document.getElementById('playlists-grid');
const playlistDetail = document.getElementById('playlist-detail');
const backToPlaylistsBtn = document.getElementById('back-to-playlists');
const playlistDetailName = document.getElementById('playlist-detail-name');
const playlistDetailCount = document.getElementById('playlist-detail-count');
const playPlaylistBtn = document.getElementById('play-playlist');
const shufflePlaylistBtn = document.getElementById('shuffle-playlist');
const deletePlaylistBtn = document.getElementById('delete-playlist');
const playlistSongs = document.getElementById('playlist-songs');

// Modal elements
const createPlaylistModal = document.getElementById('create-playlist-modal');
const playlistNameInput = document.getElementById('playlist-name-input');
const cancelPlaylistBtn = document.getElementById('cancel-playlist');
const confirmPlaylistBtn = document.getElementById('confirm-playlist');
const addToPlaylistModal = document.getElementById('add-to-playlist-modal');
const playlistOptions = document.getElementById('playlist-options');
const cancelAddPlaylistBtn = document.getElementById('cancel-add-playlist');

// Initialize App
async function initializeApp() {
    console.log('Initializing app...');
    setupEventListeners();
    await loadLibrary();
    await loadPlaylists();
    if (songs.length > 0) {
        loadSong(0);
    }
    updateLibraryStats();
    updateQueueDisplay();
    
    // Debug: Check if buttons exist
    console.log('Upload button:', uploadBtn);
    console.log('Create playlist button:', createPlaylistBtn);
    console.log('Library screen:', screens.library);
}

// Event Listeners Setup
function setupEventListeners() {
    // Navigation
    navItems.forEach(item => {
        item.addEventListener('click', () => switchScreen(item.dataset.screen));
    });

    minimizeBtn.addEventListener('click', () => {
        ipcRenderer.send('minimize-window');
    });

    // Player controls
    playBtn.addEventListener('click', togglePlayback);
    prevBtn.addEventListener('click', previousSong);
    nextBtn.addEventListener('click', nextSong);
    shuffleBtn.addEventListener('click', toggleShuffle);
    repeatBtn.addEventListener('click', toggleRepeat);
    playOverlay.addEventListener('click', togglePlayback);

    // Audio events
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleSongEnd);
    audio.addEventListener('error', handleAudioError);

    // Seek and volume
    seekBar.addEventListener('input', handleSeek);
    volumeSlider.addEventListener('input', handleVolumeChange);

    // Library functionality
    if (uploadBtn) {
        uploadBtn.addEventListener('click', async () => {
            console.log('Upload button clicked');
            try {
                const result = await ipcRenderer.invoke('show-file-dialog');
                if (result.success && result.files.length > 0) {
                    await handleDirectFileUpload(result.files);
                }
            } catch (error) {
                console.error('File dialog error:', error);
                // Fallback to file input
                fileInput.click();
            }
        });
    } else {
        console.error('Upload button not found!');
    }
    
    if (fileInput) {
        fileInput.addEventListener('change', handleFileUpload);
    }
    
    if (refreshLibraryBtn) {
        refreshLibraryBtn.addEventListener('click', loadLibrary);
    }
    
    if (playAllBtn) {
        playAllBtn.addEventListener('click', playAllSongs);
    }
    
    if (shuffleAllBtn) {
        shuffleAllBtn.addEventListener('click', shuffleAllSongs);
    }

    // Playlist functionality
    if (createPlaylistBtn) {
        createPlaylistBtn.addEventListener('click', showCreatePlaylistModal);
    } else {
        console.error('Create playlist button not found!');
    }
    backToPlaylistsBtn.addEventListener('click', hidePlaylistDetail);
    playPlaylistBtn.addEventListener('click', playCurrentPlaylist);
    shufflePlaylistBtn.addEventListener('click', shuffleCurrentPlaylist);
    deletePlaylistBtn.addEventListener('click', deleteCurrentPlaylist);

    // Modal functionality
    cancelPlaylistBtn.addEventListener('click', hideCreatePlaylistModal);
    confirmPlaylistBtn.addEventListener('click', createNewPlaylist);
    cancelAddPlaylistBtn.addEventListener('click', hideAddToPlaylistModal);
    playlistNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') createNewPlaylist();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboard);
}

// Screen Management
function switchScreen(screenName) {
    currentScreen = screenName;
    
    // Update nav items
    navItems.forEach(item => {
        item.classList.toggle('active', item.dataset.screen === screenName);
    });

    // Update screens
    Object.keys(screens).forEach(key => {
        screens[key].classList.toggle('active', key === screenName);
    });

    // Hide playlist detail when switching screens
    if (screenName !== 'playlists') {
        hidePlaylistDetail();
    }
}

// File Upload Handling
async function handleFileUpload(event) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
    uploadBtn.disabled = true;

    try {
        const fileData = [];
        for (const file of files) {
            // For web file input, we need to handle the file differently
            const filePath = file.path || file.webkitRelativePath || '';
            fileData.push({
                name: file.name,
                path: filePath,
                size: file.size,
                type: file.type
            });
        }

        const result = await ipcRenderer.invoke('upload-audio-files', fileData);

        if (result.success) {
            await loadLibrary();
            updateLibraryStats();
            console.log(`Successfully uploaded ${result.uploadedCount} files`);
        } else {
            console.error('Upload failed:', result.error);
        }
    } catch (error) {
        console.error('Upload error:', error);
    }

    uploadBtn.innerHTML = '<i class="fas fa-plus"></i> Add Music';
    uploadBtn.disabled = false;
    fileInput.value = '';
}

// Direct file upload handling (from dialog)
async function handleDirectFileUpload(filePaths) {
    uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
    uploadBtn.disabled = true;

    try {
        const result = await ipcRenderer.invoke('upload-audio-files-direct', filePaths);

        if (result.success) {
            await loadLibrary();
            updateLibraryStats();
            console.log(`Successfully uploaded ${result.uploadedCount} files`);
        } else {
            console.error('Upload failed:', result.error);
        }
    } catch (error) {
        console.error('Upload error:', error);
    }

    uploadBtn.innerHTML = '<i class="fas fa-plus"></i> Add Music';
    uploadBtn.disabled = false;
}

// Music Player Functions
function loadSong(index, fromPlaylist = null) {
    if (!songs[index]) return;
    
    currentSongIndex = index;
    const song = songs[index];
    
    audio.src = song.src;
    songTitle.textContent = song.title || formatFileName(song.src);
    artistName.textContent = song.artist || 'Unknown Artist';
    
    // Update current playlist display
    if (fromPlaylist) {
        currentPlaylistEl.textContent = fromPlaylist;
    } else if (currentPlaylist) {
        currentPlaylistEl.textContent = currentPlaylist.name;
    } else {
        currentPlaylistEl.textContent = 'All Songs';
    }
    
    seekBar.value = 0;
    updateLibraryDisplay();
    updateQueueDisplay();
}

function togglePlayback() {
    if (!songs.length) return;
    
    if (isPlaying) {
        audio.pause();
    } else {
        audio.play();
    }
    
    isPlaying = !isPlaying;
    updatePlayButton();
}

function updatePlayButton() {
    const icon = playBtn.querySelector('i');
    icon.className = isPlaying ? 'fas fa-pause' : 'fas fa-play';
}

function nextSong() {
    if (playQueue.length > 1) {
        // Remove current song from queue and play next
        playQueue.shift();
        if (playQueue.length > 0) {
            const nextSongIndex = songs.findIndex(song => song.src === playQueue[0].src);
            if (nextSongIndex !== -1) {
                loadSong(nextSongIndex);
                if (isPlaying) audio.play();
                return;
            }
        }
    }
    
    // Fallback to regular next song logic
    if (!songs.length) return;
    
    let nextIndex;
    if (isShuffled) {
        nextIndex = Math.floor(Math.random() * songs.length);
    } else {
        nextIndex = (currentSongIndex + 1) % songs.length;
    }
    
    loadSong(nextIndex);
    if (isPlaying) audio.play();
}

function previousSong() {
    if (!songs.length) return;
    
    let prevIndex;
    if (isShuffled) {
        prevIndex = Math.floor(Math.random() * songs.length);
    } else {
        prevIndex = (currentSongIndex - 1 + songs.length) % songs.length;
    }
    
    loadSong(prevIndex);
    if (isPlaying) audio.play();
}

function toggleShuffle() {
    isShuffled = !isShuffled;
    shuffleBtn.classList.toggle('active', isShuffled);
    
    if (isShuffled && playQueue.length > 0) {
        // Shuffle the remaining queue
        const currentSong = playQueue[0];
        const remainingSongs = playQueue.slice(1);
        shuffleArray(remainingSongs);
        playQueue = [currentSong, ...remainingSongs];
        updateQueueDisplay();
    }
}

function toggleRepeat() {
    const modes = ['none', 'all', 'one'];
    const currentIndex = modes.indexOf(repeatMode);
    repeatMode = modes[(currentIndex + 1) % modes.length];
    
    repeatBtn.classList.toggle('active', repeatMode !== 'none');
    
    const icon = repeatBtn.querySelector('i');
    if (repeatMode === 'one') {
        icon.className = 'fas fa-redo-alt';
    } else {
        icon.className = 'fas fa-redo';
    }
}

function handleSongEnd() {
    if (repeatMode === 'one') {
        audio.currentTime = 0;
        audio.play();
    } else if (repeatMode === 'all' || playQueue.length > 1 || currentSongIndex < songs.length - 1) {
        nextSong();
    } else {
        isPlaying = false;
        updatePlayButton();
    }
}

function updateProgress() {
    if (audio.duration) {
        const progress = (audio.currentTime / audio.duration) * 100;
        seekBar.value = progress;
        currentTimeEl.textContent = formatTime(audio.currentTime);
    }
}

function updateDuration() {
    if (audio.duration) {
        totalDurationEl.textContent = formatTime(audio.duration);
    }
}

function handleSeek() {
    if (audio.duration) {
        const seekTime = (seekBar.value / 100) * audio.duration;
        audio.currentTime = seekTime;
    }
}

function handleVolumeChange() {
    audio.volume = volumeSlider.value;
}

function handleAudioError(e) {
    console.error('Audio error:', e);
    songTitle.textContent = 'Error loading song';
    artistName.textContent = 'Please try another track';
}

// Queue Management
function setPlayQueue(songList, startIndex = 0) {
    playQueue = [...songList];
    originalQueue = [...songList];
    
    if (isShuffled) {
        const currentSong = playQueue[startIndex];
        playQueue.splice(startIndex, 1);
        shuffleArray(playQueue);
        playQueue.unshift(currentSong);
    } else if (startIndex > 0) {
        // Move the starting song to the front
        const currentSong = playQueue[startIndex];
        playQueue.splice(startIndex, 1);
        playQueue.unshift(currentSong);
    }
    
    updateQueueDisplay();
}

function updateQueueDisplay() {
    if (playQueue.length === 0) {
        queueList.innerHTML = '<p class="empty-queue">No songs in queue</p>';
        return;
    }
    
    const upNext = playQueue.slice(1, 6); // Show next 5 songs
    if (upNext.length === 0) {
        queueList.innerHTML = '<p class="empty-queue">No more songs in queue</p>';
        return;
    }
    
    queueList.innerHTML = upNext.map((song, index) => `
        <div class="queue-item" onclick="playFromQueue(${index + 1})">
            <div class="song-details">
                <div class="song-name">${song.title || formatFileName(song.src)}</div>
                <div class="song-artist">${song.artist || 'Unknown Artist'}</div>
            </div>
        </div>
    `).join('');
}

function playFromQueue(queueIndex) {
    if (queueIndex < playQueue.length) {
        // Move selected song to front of queue
        const selectedSong = playQueue[queueIndex];
        playQueue.splice(queueIndex, 1);
        playQueue.unshift(selectedSong);
        
        const songIndex = songs.findIndex(song => song.src === selectedSong.src);
        if (songIndex !== -1) {
            loadSong(songIndex);
            if (!isPlaying) togglePlayback();
        }
    }
}

// Library Functions
async function loadLibrary() {
    try {
        const result = await ipcRenderer.invoke('get-library');
        if (result.success) {
            songs = result.songs;
            updateLibraryDisplay();
            updateLibraryStats();
        }
    } catch (error) {
        console.error('Error loading library:', error);
    }
}

function updateLibraryDisplay() {
    songList.innerHTML = songs.map((song, index) => `
        <div class="song-item ${index === currentSongIndex ? 'playing' : ''}" onclick="playSong(${index})">
            <div class="song-number">${index + 1}</div>
            <div class="song-details">
                <div class="song-name">${song.title || formatFileName(song.src)}</div>
                <div class="song-artist">${song.artist || 'Unknown Artist'}</div>
            </div>
            <div class="song-duration">${song.duration || '--:--'}</div>
            <div class="song-actions">
                <button class="song-action-btn" onclick="event.stopPropagation(); addToPlaylist(${index})" title="Add to Playlist">
                    <i class="fas fa-plus"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function updateLibraryStats() {
    totalSongsEl.textContent = songs.length;
    totalPlaylistsEl.textContent = playlists.length;
    
    // Calculate total duration (simplified)
    const totalMinutes = songs.length * 3.5; // Estimate 3.5 minutes per song
    totalDurationLibraryEl.textContent = formatTime(totalMinutes * 60);
}

function playSong(index) {
    setPlayQueue(songs, index);
    loadSong(index);
    if (!isPlaying) {
        togglePlayback();
    }
    switchScreen('player');
}

function playAllSongs() {
    if (songs.length === 0) return;
    setPlayQueue(songs, 0);
    loadSong(0);
    if (!isPlaying) {
        togglePlayback();
    }
    switchScreen('player');
}

function shuffleAllSongs() {
    if (songs.length === 0) return;
    const shuffledSongs = [...songs];
    shuffleArray(shuffledSongs);
    setPlayQueue(shuffledSongs, 0);
    loadSong(songs.findIndex(song => song.src === shuffledSongs[0].src));
    if (!isPlaying) {
        togglePlayback();
    }
    switchScreen('player');
}

// Playlist Functions
async function loadPlaylists() {
    try {
        const result = await ipcRenderer.invoke('get-playlists');
        if (result.success) {
            playlists = result.playlists;
            updatePlaylistsDisplay();
            updateLibraryStats();
        }
    } catch (error) {
        console.error('Error loading playlists:', error);
    }
}

function updatePlaylistsDisplay() {
    playlistsGrid.innerHTML = playlists.map(playlist => `
        <div class="playlist-card" onclick="showPlaylistDetail('${playlist.id}')">
            <div class="playlist-icon">
                <i class="fas fa-music"></i>
            </div>
            <div class="playlist-name">${playlist.name}</div>
            <div class="playlist-count">${playlist.songs.length} songs</div>
        </div>
    `).join('');
}

function showCreatePlaylistModal() {
    createPlaylistModal.classList.remove('hidden');
    playlistNameInput.focus();
}

function hideCreatePlaylistModal() {
    createPlaylistModal.classList.add('hidden');
    playlistNameInput.value = '';
}

async function createNewPlaylist() {
    const name = playlistNameInput.value.trim();
    if (!name) return;
    
    try {
        const result = await ipcRenderer.invoke('create-playlist', { name });
        if (result.success) {
            await loadPlaylists();
            hideCreatePlaylistModal();
        }
    } catch (error) {
        console.error('Error creating playlist:', error);
    }
}

function showPlaylistDetail(playlistId) {
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) return;
    
    currentPlaylist = playlist;
    playlistDetailName.textContent = playlist.name;
    playlistDetailCount.textContent = `${playlist.songs.length} songs`;
    
    // Display playlist songs
    playlistSongs.innerHTML = playlist.songs.map((songId, index) => {
        const song = songs.find(s => s.id === songId);
        if (!song) return '';
        
        return `
            <div class="song-item" onclick="playPlaylistSong(${index})">
                <div class="song-number">${index + 1}</div>
                <div class="song-details">
                    <div class="song-name">${song.title || formatFileName(song.src)}</div>
                    <div class="song-artist">${song.artist || 'Unknown Artist'}</div>
                </div>
                <div class="song-duration">${song.duration || '--:--'}</div>
                <div class="song-actions">
                    <button class="song-action-btn" onclick="event.stopPropagation(); removeFromPlaylist(${index})" title="Remove from Playlist">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    playlistDetail.classList.remove('hidden');
}

function hidePlaylistDetail() {
    playlistDetail.classList.add('hidden');
    currentPlaylist = null;
}

function playCurrentPlaylist() {
    if (!currentPlaylist || currentPlaylist.songs.length === 0) return;
    
    const playlistSongs = currentPlaylist.songs.map(songId => 
        songs.find(s => s.id === songId)
    ).filter(Boolean);
    
    setPlayQueue(playlistSongs, 0);
    const firstSong = playlistSongs[0];
    const songIndex = songs.findIndex(song => song.src === firstSong.src);
    
    if (songIndex !== -1) {
        loadSong(songIndex, currentPlaylist.name);
        if (!isPlaying) {
            togglePlayback();
        }
        switchScreen('player');
    }
}

function shuffleCurrentPlaylist() {
    if (!currentPlaylist || currentPlaylist.songs.length === 0) return;
    
    const playlistSongs = currentPlaylist.songs.map(songId => 
        songs.find(s => s.id === songId)
    ).filter(Boolean);
    
    shuffleArray(playlistSongs);
    setPlayQueue(playlistSongs, 0);
    const firstSong = playlistSongs[0];
    const songIndex = songs.findIndex(song => song.src === firstSong.src);
    
    if (songIndex !== -1) {
        loadSong(songIndex, currentPlaylist.name);
        if (!isPlaying) {
            togglePlayback();
        }
        switchScreen('player');
    }
}

async function deleteCurrentPlaylist() {
    if (!currentPlaylist) return;
    
    if (confirm(`Are you sure you want to delete "${currentPlaylist.name}"?`)) {
        try {
            const result = await ipcRenderer.invoke('delete-playlist', currentPlaylist.id);
            if (result.success) {
                await loadPlaylists();
                hidePlaylistDetail();
            }
        } catch (error) {
            console.error('Error deleting playlist:', error);
        }
    }
}

function playPlaylistSong(index) {
    if (!currentPlaylist) return;
    
    const playlistSongs = currentPlaylist.songs.map(songId => 
        songs.find(s => s.id === songId)
    ).filter(Boolean);
    
    setPlayQueue(playlistSongs, index);
    const selectedSong = playlistSongs[index];
    const songIndex = songs.findIndex(song => song.src === selectedSong.src);
    
    if (songIndex !== -1) {
        loadSong(songIndex, currentPlaylist.name);
        if (!isPlaying) {
            togglePlayback();
        }
        switchScreen('player');
    }
}

async function removeFromPlaylist(index) {
    if (!currentPlaylist) return;
    
    try {
        const result = await ipcRenderer.invoke('remove-from-playlist', {
            playlistId: currentPlaylist.id,
            songIndex: index
        });
        
        if (result.success) {
            await loadPlaylists();
            showPlaylistDetail(currentPlaylist.id); // Refresh the detail view
        }
    } catch (error) {
        console.error('Error removing from playlist:', error);
    }
}

function addToPlaylist(songIndex) {
    const song = songs[songIndex];
    if (!song) return;
    
    // Show playlist selection modal
    playlistOptions.innerHTML = playlists.map(playlist => `
        <div class="playlist-option" onclick="addSongToPlaylist('${playlist.id}', '${song.id}')">
            <i class="fas fa-music"></i>
            ${playlist.name}
        </div>
    `).join('');
    
    addToPlaylistModal.classList.remove('hidden');
}

function hideAddToPlaylistModal() {
    addToPlaylistModal.classList.add('hidden');
}

async function addSongToPlaylist(playlistId, songId) {
    try {
        const result = await ipcRenderer.invoke('add-to-playlist', {
            playlistId,
            songId
        });
        
        if (result.success) {
            await loadPlaylists();
            hideAddToPlaylistModal();
        }
    } catch (error) {
        console.error('Error adding to playlist:', error);
    }
}

// Utility Functions
function formatFileName(filename) {
    return filename
        .split('/').pop()
        .replace(/\.(mp3|wav|m4a|flac|ogg)$/i, '')
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
}

function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function handleKeyboard(e) {
    if (e.target.tagName === 'INPUT') return;
    
    switch (e.code) {
        case 'Space':
            e.preventDefault();
            togglePlayback();
            break;
        case 'ArrowRight':
            nextSong();
            break;
        case 'ArrowLeft':
            previousSong();
            break;
        case 'KeyL':
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                switchScreen('library');
            }
            break;
        case 'KeyP':
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                switchScreen('playlists');
            }
            break;
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing app...');
    initializeApp();
});

// Make functions available globally for onclick handlers
window.playSong = playSong;
window.playFromQueue = playFromQueue;
window.addToPlaylist = addToPlaylist;
window.addSongToPlaylist = addSongToPlaylist;
window.showPlaylistDetail = showPlaylistDetail;
window.playPlaylistSong = playPlaylistSong;
window.removeFromPlaylist = removeFromPlaylist;