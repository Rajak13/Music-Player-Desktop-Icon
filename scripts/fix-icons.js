#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🎨 Icon Fix Script for Melodies Music Player\n');

// Check if icon files exist
const iconFiles = {
    svg: 'assets/icon.svg',
    png: 'assets/icon.png', 
    ico: 'assets/icon.ico',
    icns: 'assets/icon.icns'
};

console.log('📋 Checking existing icon files:');
for (const [type, filepath] of Object.entries(iconFiles)) {
    const exists = fs.existsSync(filepath);
    const size = exists ? fs.statSync(filepath).size : 0;
    console.log(`  ${type.toUpperCase()}: ${exists ? '✅' : '❌'} ${exists ? `(${(size/1024).toFixed(1)}KB)` : ''}`);
}

console.log('\n🔧 To fix the Windows build error:');
console.log('The ICO file needs to be at least 256x256 pixels.');
console.log('\n📝 Quick fix options:');

console.log('\n1️⃣  Online Converter (Recommended):');
console.log('   • Go to: https://convertio.co/svg-ico/');
console.log('   • Upload: assets/icon.svg');
console.log('   • Set size: 256x256 or larger');
console.log('   • Download and replace: assets/icon.ico');

console.log('\n2️⃣  ImageMagick (if installed):');
console.log('   • Run: convert assets/icon.svg -resize 256x256 assets/icon.ico');

console.log('\n3️⃣  Online ICO Generator:');
console.log('   • Go to: https://www.favicon-generator.org/');
console.log('   • Upload your SVG');
console.log('   • Download the ICO file');

console.log('\n4️⃣  Temporary workaround:');
console.log('   • The build will work without icons (using default Electron icon)');
console.log('   • You can add proper icons later');

console.log('\n🚀 After fixing icons, update package.json:');
console.log('   "win": { "icon": "assets/icon.ico" }');
console.log('   "mac": { "icon": "assets/icon.icns" }');

console.log('\n✨ Then test with: npm run build');