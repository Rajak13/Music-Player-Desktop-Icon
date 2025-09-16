const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const crypto = require('crypto');

let mainWindow;

app.on('ready', () => {
    mainWindow = new BrowserWindow({
        width: 400,
        height: 600,
        frame: false,
        transparent: true,
        resizable: false,
        icon: path.join(__dirname, 'assets', 'icon.png'), // Custom icon
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    mainWindow.loadFile('index.html');
    mainWindow.setAlwaysOnTop(true);
    
    // Initialize directories
    initializeDirectories();
});

// Initialize required directories
async function initializeDirectories() {
    const appDataPath = path.join(__dirname, 'data');
    const songsPath = path.join(__dirname, 'assets', 'songs');
    
    await fs.ensureDir(appDataPath);
    await fs.ensureDir(songsPath);
    
    // Initialize playlists file if it doesn't exist
    const playlistsPath = path.join(appDataPath, 'playlists.json');
    if (!await fs.pathExists(playlistsPath)) {
        await fs.writeJson(playlistsPath, []);
    }
}

// Window controls
ipcMain.on('minimize-window', () => {
    if (mainWindow) {
        mainWindow.minimize();
    }
});

// Show file dialog
ipcMain.handle('show-file-dialog', async () => {
    try {
        const result = await dialog.showOpenDialog(mainWindow, {
            title: 'Select Audio Files',
            filters: [
                {
                    name: 'Audio Files',
                    extensions: ['mp3', 'wav', 'm4a', 'flac', 'ogg', 'aac']
                },
                {
                    name: 'All Files',
                    extensions: ['*']
                }
            ],
            properties: ['openFile', 'multiSelections']
        });

        if (result.canceled) {
            return { success: false, files: [] };
        }

        return { success: true, files: result.filePaths };
    } catch (error) {
        console.error('File dialog error:', error);
        return { success: false, files: [], error: error.message };
    }
});

// File upload handling
ipcMain.handle('upload-audio-files', async (event, files) => {
    try {
        const songsDir = path.join(__dirname, 'assets', 'songs');
        await fs.ensureDir(songsDir);
        
        const uploadedFiles = [];
        
        for (const file of files) {
            // Validate file type
            const allowedTypes = ['.mp3', '.wav', '.m4a', '.flac', '.ogg', '.aac'];
            const fileExt = path.extname(file.name).toLowerCase();
            
            if (!allowedTypes.includes(fileExt)) {
                console.log(`Skipping unsupported file type: ${file.name}`);
                continue;
            }
            
            // Generate unique filename to avoid conflicts
            const sanitizedName = sanitizeFilename(file.name);
            const uniqueId = crypto.randomBytes(8).toString('hex');
            const filename = `${path.parse(sanitizedName).name}_${uniqueId}${fileExt}`;
            const destPath = path.join(songsDir, filename);
            
            // Copy file to songs directory (check if path exists)
            if (file.path && await fs.pathExists(file.path)) {
                await fs.copy(file.path, destPath);
            } else {
                console.log(`Skipping file with invalid path: ${file.name}`);
                continue;
            }
            
            // Extract basic metadata
            const metadata = await extractMetadata(file.name, destPath);
            
            // Save metadata
            const metadataPath = destPath.replace(fileExt, '.json');
            await fs.writeJson(metadataPath, {
                id: uniqueId,
                title: metadata.title,
                artist: metadata.artist,
                album: metadata.album,
                duration: metadata.duration,
                originalName: file.name,
                uploadedAt: new Date().toISOString(),
                fileSize: file.size
            });
            
            uploadedFiles.push({
                filename,
                originalName: file.name,
                metadata
            });
        }
        
        return {
            success: true,
            uploadedCount: uploadedFiles.length,
            files: uploadedFiles
        };
        
    } catch (error) {
        console.error('Upload error:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

// Direct file upload handling (from file dialog)
ipcMain.handle('upload-audio-files-direct', async (event, filePaths) => {
    try {
        const songsDir = path.join(__dirname, 'assets', 'songs');
        await fs.ensureDir(songsDir);
        
        const uploadedFiles = [];
        
        for (const filePath of filePaths) {
            // Validate file type
            const allowedTypes = ['.mp3', '.wav', '.m4a', '.flac', '.ogg', '.aac'];
            const fileExt = path.extname(filePath).toLowerCase();
            
            if (!allowedTypes.includes(fileExt)) {
                console.log(`Skipping unsupported file type: ${filePath}`);
                continue;
            }
            
            const fileName = path.basename(filePath);
            const sanitizedName = sanitizeFilename(fileName);
            const uniqueId = crypto.randomBytes(8).toString('hex');
            const filename = `${path.parse(sanitizedName).name}_${uniqueId}${fileExt}`;
            const destPath = path.join(songsDir, filename);
            
            // Copy file to songs directory
            await fs.copy(filePath, destPath);
            
            // Extract basic metadata
            const metadata = extractMetadata(fileName, destPath);
            
            // Save metadata
            const metadataPath = destPath.replace(fileExt, '.json');
            await fs.writeJson(metadataPath, {
                id: uniqueId,
                title: metadata.title,
                artist: metadata.artist,
                album: metadata.album,
                duration: metadata.duration,
                originalName: fileName,
                uploadedAt: new Date().toISOString(),
                fileSize: (await fs.stat(filePath)).size
            });
            
            uploadedFiles.push({
                filename,
                originalName: fileName,
                metadata
            });
        }
        
        return {
            success: true,
            uploadedCount: uploadedFiles.length,
            files: uploadedFiles
        };
        
    } catch (error) {
        console.error('Direct upload error:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

// Extract basic metadata from filename
function extractMetadata(filename, filePath) {
    const baseName = path.parse(filename).name;
    
    // Try to parse artist - title format
    let title = baseName;
    let artist = 'Unknown Artist';
    let album = 'Unknown Album';
    
    // Common patterns: "Artist - Title", "Artist_Title", "Title by Artist"
    if (baseName.includes(' - ')) {
        const parts = baseName.split(' - ');
        if (parts.length >= 2) {
            artist = parts[0].trim();
            title = parts.slice(1).join(' - ').trim();
        }
    } else if (baseName.includes(' by ')) {
        const parts = baseName.split(' by ');
        if (parts.length >= 2) {
            title = parts[0].trim();
            artist = parts.slice(1).join(' by ').trim();
        }
    } else if (baseName.includes('_')) {
        const parts = baseName.split('_');
        if (parts.length >= 2) {
            artist = parts[0].trim();
            title = parts.slice(1).join('_').replace(/_/g, ' ').trim();
        }
    } else {
        // For existing files without clear artist-title separation
        // Try to extract artist from common patterns or use filename as title
        title = baseName;
        
        // Check if it's one of the existing songs and assign proper artists
        const knownSongs = {
            'enchanted': 'Taylor Swift',
            'karma police': 'Radiohead', 
            'killing time': 'Infected Mushroom',
            'no surprises': 'Radiohead',
            'either on or off the drugs': 'JPEGMAFIA',
            'newjeans': 'NewJeans'
        };
        
        const lowerTitle = title.toLowerCase();
        for (const [songKey, songArtist] of Object.entries(knownSongs)) {
            if (lowerTitle.includes(songKey)) {
                artist = songArtist;
                break;
            }
        }
    }
    
    // Clean up the extracted data
    title = title.replace(/[_-]/g, ' ').replace(/\s+/g, ' ').trim();
    artist = artist.replace(/[_-]/g, ' ').replace(/\s+/g, ' ').trim();
    
    // Capitalize first letters
    title = title.replace(/\b\w/g, l => l.toUpperCase());
    if (artist !== 'Unknown Artist') {
        artist = artist.replace(/\b\w/g, l => l.toUpperCase());
    }
    
    return {
        title,
        artist,
        album,
        duration: '3:30' // Default duration - in a real app you'd use a library to get actual duration
    };
}

// Sanitize filename for safe storage
function sanitizeFilename(filename) {
    return filename
        .replace(/[^a-zA-Z0-9\s\-_.]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 100); // Limit length
}

// Get library (song list)
ipcMain.handle('get-library', async () => {
    try {
        const songsDir = path.join(__dirname, 'assets', 'songs');
        await fs.ensureDir(songsDir);
        
        const files = await fs.readdir(songsDir);
        const audioFiles = files.filter(file => 
            file.endsWith('.mp3') || file.endsWith('.wav') || 
            file.endsWith('.m4a') || file.endsWith('.flac') || 
            file.endsWith('.ogg') || file.endsWith('.aac')
        );
        
        const songs = [];
        
        for (const file of audioFiles) {
            const filepath = path.join(songsDir, file);
            const metadataPath = filepath.replace(/\.(mp3|wav|m4a|flac|ogg|aac)$/i, '.json');
            
            let metadata = {};
            if (await fs.pathExists(metadataPath)) {
                try {
                    metadata = await fs.readJson(metadataPath);
                } catch (e) {
                    // Ignore metadata errors
                }
            } else {
                // Create metadata for existing files that don't have it
                const extractedMetadata = extractMetadata(file, filepath);
                metadata = {
                    id: crypto.randomBytes(8).toString('hex'),
                    title: extractedMetadata.title,
                    artist: extractedMetadata.artist,
                    album: extractedMetadata.album,
                    duration: extractedMetadata.duration,
                    originalName: file,
                    uploadedAt: new Date().toISOString()
                };
                
                // Save the metadata for future use
                try {
                    await fs.writeJson(metadataPath, metadata);
                } catch (e) {
                    console.log('Could not save metadata for', file);
                }
            }
            
            songs.push({
                id: metadata.id || crypto.randomBytes(8).toString('hex'),
                src: `assets/songs/${file}`,
                title: metadata.title || formatFileName(file),
                artist: metadata.artist || 'Unknown Artist',
                album: metadata.album || 'Unknown Album',
                duration: metadata.duration || '3:30',
                uploadedAt: metadata.uploadedAt || new Date().toISOString()
            });
        }
        
        // Sort by upload date (newest first)
        songs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
        
        return { success: true, songs };
    } catch (error) {
        console.error('Error getting library:', error);
        return { success: false, songs: [] };
    }
});

// Playlist management
ipcMain.handle('get-playlists', async () => {
    try {
        const playlistsPath = path.join(__dirname, 'data', 'playlists.json');
        const playlists = await fs.readJson(playlistsPath);
        return { success: true, playlists };
    } catch (error) {
        console.error('Error getting playlists:', error);
        return { success: false, playlists: [] };
    }
});

ipcMain.handle('create-playlist', async (event, { name }) => {
    try {
        const playlistsPath = path.join(__dirname, 'data', 'playlists.json');
        const playlists = await fs.readJson(playlistsPath);
        
        const newPlaylist = {
            id: crypto.randomBytes(8).toString('hex'),
            name: name.trim(),
            songs: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        playlists.push(newPlaylist);
        await fs.writeJson(playlistsPath, playlists);
        
        return { success: true, playlist: newPlaylist };
    } catch (error) {
        console.error('Error creating playlist:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('delete-playlist', async (event, playlistId) => {
    try {
        const playlistsPath = path.join(__dirname, 'data', 'playlists.json');
        const playlists = await fs.readJson(playlistsPath);
        
        const filteredPlaylists = playlists.filter(p => p.id !== playlistId);
        await fs.writeJson(playlistsPath, filteredPlaylists);
        
        return { success: true };
    } catch (error) {
        console.error('Error deleting playlist:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('add-to-playlist', async (event, { playlistId, songId }) => {
    try {
        const playlistsPath = path.join(__dirname, 'data', 'playlists.json');
        const playlists = await fs.readJson(playlistsPath);
        
        const playlist = playlists.find(p => p.id === playlistId);
        if (!playlist) {
            return { success: false, error: 'Playlist not found' };
        }
        
        // Check if song is already in playlist
        if (!playlist.songs.includes(songId)) {
            playlist.songs.push(songId);
            playlist.updatedAt = new Date().toISOString();
            
            await fs.writeJson(playlistsPath, playlists);
        }
        
        return { success: true };
    } catch (error) {
        console.error('Error adding to playlist:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('remove-from-playlist', async (event, { playlistId, songIndex }) => {
    try {
        const playlistsPath = path.join(__dirname, 'data', 'playlists.json');
        const playlists = await fs.readJson(playlistsPath);
        
        const playlist = playlists.find(p => p.id === playlistId);
        if (!playlist) {
            return { success: false, error: 'Playlist not found' };
        }
        
        if (songIndex >= 0 && songIndex < playlist.songs.length) {
            playlist.songs.splice(songIndex, 1);
            playlist.updatedAt = new Date().toISOString();
            
            await fs.writeJson(playlistsPath, playlists);
        }
        
        return { success: true };
    } catch (error) {
        console.error('Error removing from playlist:', error);
        return { success: false, error: error.message };
    }
});

// Utility function to format filename
function formatFileName(filename) {
    return filename
        .replace(/\.(mp3|wav|m4a|flac|ogg|aac)$/i, '')
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
}

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});