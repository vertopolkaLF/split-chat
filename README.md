# SplitChat

SplitChat is a modern web application for viewing multiple live streaming chat rooms simultaneously. Perfect for multi-streaming enthusiasts, moderators, and viewers who want to keep track of multiple conversations at once.

![SplitChat Preview](https://via.placeholder.com/800x400/1a1a1a/ffffff?text=SplitChat+Preview)

## ✨ Features

### Core Functionality
- **Multi-platform Support**: View chats from Twitch, YouTube, and Kick simultaneously
- **Unlimited Chat Panels**: Display up to 10+ chat rooms side by side (technically unlimited)
- **Auto-Detection**: Automatically detects current YouTube live streams by username
- **Responsive Design**: Adjust the width of each chat panel with intuitive drag-and-drop
- **Smart Performance**: Automatically unloads chats when the tab becomes inactive to save resources

### User Experience
- **Light/Dark Mode**: Switch between light, dark, and system themes
- **Persistent Settings**: Everything is saved locally in your browser
- **Preset System**: Quick-switch between predefined chat configurations via URL
- **Real-time Updates**: Live chat updates with smooth animations
- **Mobile Friendly**: Responsive design that works on all devices

### Technical Features
- **YouTube API Integration**: Real-time lookup of live streams using YouTube Data API v3
- **Caching System**: Intelligent caching to reduce API calls and improve performance
- **Privacy Focused**: All data stays in your browser, no account required
- **Modern Tech Stack**: Built with Nuxt 4, Vue 3, and TypeScript

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Package manager: pnpm, npm, yarn, or bun

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd theo-chat
```

2. Install dependencies:
```bash
# Using pnpm (recommended)
pnpm install

# Or using npm
npm install

# Or using yarn
yarn install

# Or using bun
bun install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Get a YouTube Data API v3 key (optional for auto-detect current livestream by username):
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable YouTube Data API v3
   - Create credentials (API Key)
   - Add the key to your `.env` file:
   ```
   YT_API_KEY=your_youtube_api_key_here
   ```

5. Start the development server:
```bash
# Using pnpm
pnpm dev

# Or using npm
npm run dev

# Or using yarn
yarn dev

# Or using bun
bun run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## 📖 Usage

### Adding Chat Rooms

1. Click the settings button (gear icon) at the bottom of the screen
2. Click "Add chat" to create a new chat panel
3. Enter a streamer username or URL:
   - Twitch: `streamername` or `https://twitch.tv/streamername`
   - YouTube: `@username` or `https://youtube.com/@username`
   - Kick: `streamername` or `https://kick.com/streamername`

### Supported Input Formats

**Twitch:**
- `ninja`
- `https://twitch.tv/ninja`
- `https://www.twitch.tv/ninja`

**YouTube:**
- `@PewDiePie`
- `PewDiePie` (automatically treated as @handle)
- `UC-lHJZR3Gqxm24_Vd_AJ5Yw` (channel ID)
- `https://youtube.com/@PewDiePie`
- `https://youtube.com/channel/UC-lHJZR3Gqxm24_Vd_AJ5Yw`

**Kick:**
- `xqc`
- `https://kick.com/xqc`

### Adjusting Layout

- **Resize panels**: Drag the divider between chat panels to adjust widths
- **Equalize widths**: Double-click any divider to equalize all panel widths
- **Theme toggle**: Use the theme buttons in settings to switch between light/dark mode

### Performance Settings

- **Unload on blur**: Configure automatic unloading of YouTube chats when tab becomes inactive
- **Platform selection**: Choose which platforms should unload when inactive

## 🎯 Presets

SplitChat includes built-in presets for quick setup:

### Available Presets

- `theo` - Theo's Twitch and YouTube chats
- `empty` - Clear all settings

### Using Presets

Access presets via URL:
```
http://localhost:3000/theo
http://localhost:3000/empty
```

## 🛠️ Development

### Project Structure

```
├── app/
│   └── app.vue                 # Main application component
├── components/
│   ├── ChatEntryInput.vue      # Chat input component
│   ├── PlatformMultiPicker.vue # Platform selection
│   ├── SettingsModal.vue       # Settings modal
│   └── UiSelect.vue           # UI select component
├── server/
│   └── api/
│       └── youtube/
│           └── live.get.ts     # YouTube API integration
├── presets/
│   └── index.ts               # Preset definitions
└── public/
    ├── sounds/                # Sound effects
    └── images/                # Static assets
```

### Building for Production

```bash
# Build the application
pnpm build

# Preview production build locally
pnpm preview
```

### Environment Variables

Create a `.env` file with:

```env
# YouTube Data API v3 Key (required for YouTube live detection)
YT_API_KEY=your_youtube_api_key_here
```

## 🔧 Configuration

### Nuxt Configuration

The app uses Nuxt 4 with the following modules:
- `@nuxt/icon` - Icon support
- `@nuxtjs/color-mode` - Theme switching
- `@nuxt/fonts` - Font management
- `@formkit/auto-animate` - Smooth animations

### Runtime Configuration

YouTube API key is configured in `nuxt.config.ts`:

```typescript
runtimeConfig: {
  youtubeApiKey: process.env.YT_API_KEY
}
```

## 📝 API Reference

### YouTube Live Detection

**Endpoint:** `GET /api/youtube/live`

**Query Parameters:**
- `input` - Streamer username, handle, or URL

**Response:**
```json
{
  "videoId": "dQw4w9WgXcQ",
  "reason": "optional reason for null videoId"
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- Built with [Nuxt](https://nuxt.com/)
- Icons from [Iconify](https://iconify.design/)
- YouTube Data API v3 integration
- Inspired by the streaming community's need for better multi-chat tools

---

**Happy streaming!** 🎮📺
