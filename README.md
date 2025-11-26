# Mnemosyne

A magical personal archive for references, memories, curiosities and wonders. Inspired by Aby Warburg's Mnemosyne Atlas.

## Features

- **Invisible Interface** — Content-first design where UI elements appear only when needed
- **Universal Capture** — Double-click anywhere to add notes, drop images to save them, paste links
- **Smart Search** — Search by content, tags, or type (`image`, `note`, `link`)
- **GitHub Storage** — All data stored in a private GitHub repository you control
- **Offline-First** — Local caching for instant access

## Getting Started

### Prerequisites

- Node.js 18+
- A GitHub account

### Installation

```bash
npm install
npm run dev
```

### Setup

1. Create a GitHub OAuth App at [github.com/settings/developers](https://github.com/settings/developers)
2. Set the callback URL to your app's URL
3. Add your Client ID to the environment

The app will automatically create a private `mnemosyne-db` repository in your GitHub account to store your data.

## Usage

| Action | How |
|--------|-----|
| Add a note | Double-click anywhere |
| Add an image | Drag & drop onto the page |
| Add a link | Paste a URL |
| Edit | Double-click on any card |
| Delete | Hover card → click the dot → click again to confirm |
| Search | Hover the dot at the bottom |
| Filter by type | Search `image`, `note`, or `link` |

## Tech Stack

- React + TypeScript
- Vite
- TanStack Query
- GitHub API (Octokit)
- CSS (no frameworks)

## Architecture

```
src/
├── components/     # UI components
├── contexts/       # Auth context
├── services/       # GitHub & storage services
├── types/          # TypeScript definitions
└── index.css       # All styles
```

Data is stored as individual JSON files in your GitHub repository:
```
mnemosyne-db/
├── data/           # Item JSON files
└── assets/         # Uploaded images
```

## License

MIT License — see [LICENSE](LICENSE)
