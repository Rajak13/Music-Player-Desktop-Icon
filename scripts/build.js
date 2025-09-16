#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🎵 Building Melodies Music Player...\n');

// Ensure directories exist
const dirs = ['assets', 'data'];
dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✅ Created directory: ${dir}`);
  }
});

// Ensure songs directory exists with .gitkeep
const songsDir = path.join('assets', 'songs');
if (!fs.existsSync(songsDir)) {
  fs.mkdirSync(songsDir, { recursive: true });
  fs.writeFileSync(path.join(songsDir, '.gitkeep'), '# Keep this directory in git\n');
  console.log('✅ Created songs directory with .gitkeep');
}

// Ensure playlists.json exists
const playlistsFile = path.join('data', 'playlists.json');
if (!fs.existsSync(playlistsFile)) {
  fs.writeFileSync(playlistsFile, '[]');
  console.log('✅ Created empty playlists.json');
}

console.log('\n🔨 Running electron-builder...\n');

try {
  execSync('npx electron-builder', { stdio: 'inherit' });
  console.log('\n✅ Build completed successfully!');
  console.log('📦 Check the dist/ directory for your installers');
} catch (error) {
  console.error('\n❌ Build failed:', error.message);
  process.exit(1);
}