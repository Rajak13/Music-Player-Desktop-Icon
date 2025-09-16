# 🎨 Icon Setup Guide

You need to create proper icon files from the SVG. Here are the easiest methods:

## 🌐 Method 1: Online Converters (Recommended)

### For PNG (512x512):
1. Go to [CloudConvert](https://cloudconvert.com/svg-to-png)
2. Upload `assets/icon.svg`
3. Set width/height to 512x512
4. Download and save as `assets/icon.png`

### For ICO (Windows):
1. Go to [CloudConvert](https://cloudconvert.com/png-to-ico)
2. Upload your new `assets/icon.png`
3. Download and save as `assets/icon.ico`

### For ICNS (macOS):
1. Go to [iConvert Icons](https://iconverticons.com/online/)
2. Upload your `assets/icon.png`
3. Select ICNS format
4. Download and save as `assets/icon.icns`

## 💻 Method 2: Using ImageMagick (if installed)

```bash
# Install ImageMagick first:
# macOS: brew install imagemagick
# Ubuntu: sudo apt-get install imagemagick

# Then run:
chmod +x scripts/create-icons.sh
./scripts/create-icons.sh
```

## 🍎 Method 3: macOS Only (for ICNS)

```bash
chmod +x scripts/create-icns.sh
./scripts/create-icns.sh
```

## ✅ After Creating Icons

You should have these files:
- `assets/icon.png` (512x512)
- `assets/icon.ico` (Windows)
- `assets/icon.icns` (macOS) - optional, PNG works too

Then update `package.json` to use ICNS for Mac:
```json
"mac": {
  "icon": "assets/icon.icns"
}
```

## 🚀 Quick Test

After creating icons, test the build:
```bash
npm run build
```

The icons will appear in your built applications!