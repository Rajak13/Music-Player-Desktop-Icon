#!/bin/bash
# Script to create all icon formats using ImageMagick

echo "🎨 Creating icon files..."

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "❌ ImageMagick not found. Please install it first:"
    echo "   macOS: brew install imagemagick"
    echo "   Ubuntu: sudo apt-get install imagemagick"
    echo "   Windows: Download from https://imagemagick.org/"
    exit 1
fi

# Create PNG icon (512x512)
convert assets/icon.svg -resize 512x512 assets/icon.png
echo "✅ Created assets/icon.png"

# Create ICO file for Windows (multiple sizes)
convert assets/icon.svg -resize 256x256 \
        \( -clone 0 -resize 128x128 \) \
        \( -clone 0 -resize 64x64 \) \
        \( -clone 0 -resize 48x48 \) \
        \( -clone 0 -resize 32x32 \) \
        \( -clone 0 -resize 16x16 \) \
        assets/icon.ico
echo "✅ Created assets/icon.ico"

echo "🎉 Icon creation complete!"
echo "📝 Note: For ICNS (macOS), use an online converter or the macOS script"