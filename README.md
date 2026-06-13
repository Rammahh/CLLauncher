# CLLauncher

A production-ready desktop Minecraft modpack launcher for CraftersLand, built with **Tauri 2**, **React**, **TypeScript**, and **Rust**.

## Features

- **Modpack browsing** — Browse, search, filter, and install modpacks from the CraftersLand API
- **Microsoft & Offline accounts** — Device-code OAuth for Microsoft; offline mode support
- **Install / Update / Repair** — Manifest-driven installs with SHA256 verification, optional mods, and safe path handling
- **Java detection** — Auto-finds the right Java for each Minecraft version
- **Minecraft launching** — Full launch pipeline for Vanilla, Forge, NeoForge, Fabric, and Quilt
- **Logs** — Live game and launcher logs with filtering, export, and masking of tokens
- **Server list** — Live server status, player count, copy IP, launch matching modpack
- **Offline mode** — Play installed packs when the API is unreachable
- **Advanced settings** — RAM, Java, JVM args, resolution, API URL, download threads

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | Tauri 2 |
| Frontend | React 18 + TypeScript |
| Styling | Tailwind CSS + Radix UI |
| State | Zustand (persist) |
| API | TanStack Query + Axios |
| Backend | Rust (Tokio, reqwest, sha2) |

## Project Structure

```
CLLauncher/
├── src/                      # React frontend
│   ├── api/                  # API client + endpoints + query keys
│   ├── components/
│   │   ├── layout/           # Sidebar, Layout
│   │   ├── modpack/          # ModpackCard, ActionButton, ProgressOverlay, OptionalModsPanel
│   │   ├── settings/         # JavaDetectionPanel
│   │   └── ui/               # shadcn-style components (Button, Badge, Dialog, ...)
│   ├── hooks/
│   │   ├── useInstallModpack.ts
│   │   └── useLaunchMinecraft.ts
│   ├── pages/                # HomePage, ModpacksPage, ModpackDetailPage, InstalledPage, ...
│   ├── store/                # Zustand stores (settings, accounts, instances, logs, apiStatus)
│   ├── types/                # TypeScript models
│   └── lib/utils.ts          # Formatters, helpers
│
├── src-tauri/                # Rust backend
│   └── src/
│       ├── commands/         # Tauri IPC commands
│       │   ├── accounts.rs   # Microsoft OAuth + offline accounts
│       │   ├── config.rs     # Launcher config + instance management
│       │   ├── download.rs   # File downloads with progress events
│       │   ├── fs.rs         # Filesystem helpers
│       │   ├── java.rs       # Java detection commands
│       │   ├── launch.rs     # Minecraft process launch
│       │   ├── logs.rs       # Log file management
│       │   └── manifest.rs   # Modpack install/repair with path safety
│       ├── java/mod.rs       # Java scanning + version matching
│       ├── minecraft/
│       │   ├── launch.rs     # Launch command builder
│       │   ├── loaders.rs    # Loader type definitions
│       │   └── assets.rs     # Version profile + asset models
│       ├── accounts/
│       │   ├── microsoft.rs  # Full Microsoft → XBL → XSTS → Minecraft auth
│       │   ├── offline.rs    # Offline account factory
│       │   └── storage.rs    # Account file storage
│       ├── error.rs          # AppError enum
│       └── tests/            # Unit tests
│
├── examples/
│   ├── example-config.json
│   ├── example-api-response-modpacks.json
│   └── example-manifest.json
└── README.md
```

## API

The launcher connects to:

```
https://apiv1.clbackend.net
```

This can be overridden in **Settings → Advanced → API base URL**.

Endpoints used:

| Endpoint | Purpose |
|----------|---------|
| `GET /launcher/config` | Announcements, maintenance mode |
| `GET /launcher/news` | News feed |
| `GET /launcher/modpacks` | Modpack list |
| `GET /launcher/modpacks/:id` | Modpack details |
| `GET /launcher/modpacks/:id/versions` | Version list |
| `GET /launcher/modpacks/:id/versions/:vid/manifest` | Install manifest |
| `GET /launcher/modpacks/:id/versions/:vid/changelog` | Changelog |
| `GET /launcher/servers` | Server list |
| `GET /launcher/servers/:id/status` | Live server status |

## Prerequisites

- [Rust](https://rustup.rs/) 1.77.2+
- [Node.js](https://nodejs.org/) 18+
- [Tauri prerequisites](https://tauri.app/start/prerequisites/) for your OS

### Windows
- WebView2 (usually pre-installed on Windows 11)
- Microsoft C++ Build Tools or Visual Studio

### Linux
- `libwebkit2gtk-4.1-dev`, `build-essential`, `libssl-dev`

### macOS
- Xcode command-line tools

## Development

```bash
# Install Node dependencies
npm install

# Start dev server (hot-reload frontend + Rust backend)
npm run tauri:dev
```

The Tauri dev window opens at `http://localhost:1420`.

## Build

```bash
# Build release binary for your OS
npm run tauri:build
```

Output is in `src-tauri/target/release/bundle/`.

## Running Rust Tests

```bash
cd src-tauri
cargo test
```

Tests cover:
- Path safety (traversal rejection, absolute path rejection)
- SHA256 hash computation and mismatch detection
- Manifest file validation
- Java version parsing and Minecraft requirement matching

## Data Directory

The launcher stores data in your OS app data directory:

| OS | Path |
|----|------|
| Windows | `%APPDATA%\org.craftersland.launcher\` |
| Linux | `~/.local/share/org.craftersland.launcher/` |
| macOS | `~/Library/Application Support/org.craftersland.launcher/` |

Structure:

```
org.craftersland.launcher/
├── accounts/           # Account files (tokens stored here)
├── cache/              # API cache
├── downloads/          # Temp download files
├── instances/
│   └── <pack-id>/
│       ├── .minecraft/ # Game directory
│       └── instance.json
├── logs/               # Log files
├── assets/             # Shared Minecraft assets
├── libraries/          # Shared Minecraft libraries
└── config.json         # Launcher settings
```

## Security

- All manifest file paths are validated against path traversal (`..`) and absolute paths before writing
- Protected directories (`saves`, `screenshots`, `shaderpacks`, `resourcepacks`, `options.txt`, `servers.dat`) are never deleted by manifests
- SHA256 is verified after every download — corrupted files are rejected
- Access tokens are never logged — the launch command is masked in all log outputs
- Account tokens are stored in the local accounts directory (not in Zustand/localStorage)
- All API connections use HTTPS

## Loader Support

| Loader | Status |
|--------|--------|
| Vanilla | Supported |
| Fabric | Supported |
| Quilt | Supported |
| Forge | Supported (launch command) |
| NeoForge | Supported (launch command) |

New loaders can be added by extending `LoaderType` in `src-tauri/src/minecraft/loaders.rs` and the corresponding `LoaderType` in `src/types/index.ts`.

## Microsoft Authentication

The launcher uses the **device code flow** (no embedded browser required):

1. User clicks "Add Account → Microsoft Account"
2. Launcher calls Microsoft's device code endpoint
3. User visits the shown URL and enters the one-time code
4. Launcher polls for the token in the background
5. On success, performs full Xbox Live → XSTS → Minecraft Services auth chain
6. Profile (username + UUID) is fetched from Minecraft Services API

## Offline Mode

When the API is unreachable:
- Installed modpacks are still listed (from Zustand store)
- Play buttons work for already-installed instances
- Install/Update buttons are disabled
- A warning banner is shown throughout the UI
- Cached API data (modpack info, news) is served from TanStack Query cache

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `TAURI_DEV_HOST` | Custom dev server host (for mobile/remote dev) |
| `RUST_LOG` | Rust log level (e.g. `debug`, `info`) |

## License

© 2024 CraftersLand — All rights reserved.
