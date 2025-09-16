#!/bin/bash
# Script to create ICNS file on macOS

# Create iconset directory
mkdir -p icon.iconset

# Generate different sizes from the PNG
sips -z 16 16     assets/icon.png --out icon.iconset/icon_16x16.png
sips -z 32 32     assets/icon.png --out icon.iconset/icon_16x16@2x.png
sips -z 32 32     assets/icon.png --out icon.iconset/icon_32x32.png
sips -z 64 64     assets/icon.png --out icon.iconset/icon_32x32@2x.png
sips -z 128 128   assets/icon.png --out icon.iconset/icon_128x128.png
sips -z 256 256   assets/icon.png --out icon.iconset/icon_128x128@2x.png
sips -z 256 256   assets/icon.png --out icon.iconset/icon_256x256.png
sips -z 512 512   assets/icon.png --out icon.iconset/icon_256x256@2x.png
sips -z 512 512   assets/icon.png --out icon.iconset/icon_512x512.png
sips -z 1024 1024 assets/icon.png --out icon.iconset/icon_512x512@2x.png

# Create ICNS file
iconutil -c icns icon.iconset -o assets/icon.icns

# Clean up
rm -rf icon.iconset

echo "✅ Created assets/icon.icns"