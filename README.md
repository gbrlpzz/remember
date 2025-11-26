# Mnemosyne

**Mnemosyne.**

Mnemosyne is a magical personal archive for references, memories, curiosities, and wonders. Inspired by Aby Warburg's *Mnemosyne Atlas*, it reimagines the digital pinboard as a liquid, ethereal space where connections can be discovered naturally.

> **Try it live:** [mnemosyne.gbrlpzz.com](https://mnemosyne.gbrlpzz.com)

## ✨ Features

- **Universal Capture**: 
  - Double-click anywhere to add a note.
  - Drag & drop images directly onto the canvas.
  - Paste links to automatically generate rich previews with embeds.
- **Smart Search**: Filter by content, tags, type (`image`, `note`), or time (`yesterday`, `last week`).
- **Privacy First**: 100% client-side. Connects directly to your GitHub. No tracking, no middleman.

## 🚀 How to Use

### Option 1: Hosted (Recommended)

Visit [mnemosyne.gbrlpzz.com](https://mnemosyne.gbrlpzz.com).

Mnemosyne works on a **Bring Your Own Key (BYOK)** model. 
1. Generate a **GitHub Personal Access Token** (Classic) with `repo` scope.
2. Enter it to unlock the archive.
3. The app automatically creates a private `mnemosyne-db` repository in your account.

Your token is stored only in your browser's local storage and used directly against the GitHub API. It never touches our servers (because there are no servers).

### Option 2: Self-Host

Clone and run it locally or deploy to your own Vercel instance.

```bash
npm install
npm run dev
```


## 📂 Data Structure

Your data belongs to you. Check your `mnemosyne-db` repository:

```
mnemosyne-db/
├── data/           # JSON files for every note, link, and image
└── assets/         # Raw image files
```

## License

MIT License — see [LICENSE](LICENSE).
