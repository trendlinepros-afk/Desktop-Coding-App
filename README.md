# Local LLM Coding Assistant

A **Windows** desktop coding assistant that works like Claude Code but runs on
**local LLMs via [Ollama](https://ollama.com)**, with seamless fallback to cloud
APIs (OpenAI, Anthropic, Google Gemini, DeepSeek). It manages its own Ollama
instance, generates files directly into a project folder, previews the app it's
building, uses **Gemini 2.5 Pro** to visually review screenshots for bugs, and
stores every conversation in your **Obsidian vault**.

> Built with Electron + React + TypeScript + Vite + Tailwind.

![split layout: chat on the left, code editor / live preview on the right](docs/screenshot-placeholder.png)

---

## Features

- 💬 **Streaming chat** with local Ollama models and cloud models, with a stop
  button and syntax-highlighted (display-only) code blocks.
- 🔀 **Model switcher** showing local + cloud models. Hover for provider, VRAM
  usage (`X GB, Y% of Z GB total`), and a speed hint. Switching models keeps
  the conversation history.
- 🧠 **VRAM awareness** — hardcoded model sizes + your GPU VRAM setting flag
  models that won't fit.
- 📁 **Claude-Code-style file generation** — the AI writes files into your
  project folder in real time; a Monaco editor + live file tree let you view
  and edit them.
- 👁 **Live preview** — serve and preview static sites, SPAs, or Node apps with
  hot reload.
- 📷 **Gemini screenshot analysis** — auto/manual screenshot of the preview sent
  to Gemini 2.5 Pro; **Auto Fix** applies fixes automatically, or you choose
  **Fix / Don't Fix**.
- 🗒 **Obsidian storage** — conversations (with embedded analyses/screenshots)
  saved as Markdown under `chat-conversations/`.
- 💵 **Cost guard** — paid requests show an estimated token count and cost
  before sending (local models are free, no prompt).
- 🌗 **Light / dark** themes following the system by default.
- ⬆️ **Auto-updates** via GitHub Releases; **all settings and keys persist**
  across updates.

---

## Prerequisites

- **Windows 10/11**
- **Node.js 20+** and npm (for building from source)
- **[Ollama](https://ollama.com/download)** — required only for local models.
  Ensure `ollama` is on your `PATH`; the app can auto-start `ollama serve`.
- Cloud API keys (optional) for any of OpenAI / Anthropic / Gemini / DeepSeek.

---

## Getting started (from source)

```bash
npm install        # install dependencies
npm run dev        # launch in development (hot reload)
```

Build a production Windows installer + portable exe:

```bash
npm run build:win
```

Artifacts are written to `dist/` (`*-setup.exe`, `*-portable.exe`, and the
`latest.yml` auto-update metadata).

Other scripts:

| Script | Purpose |
|--------|---------|
| `npm run typecheck` | Type-check main, preload, and renderer. |
| `npm run lint` | ESLint. |
| `npm run build` | Type-check + build all three processes (no packaging). |
| `npm run build:unpack` | Build an unpacked app dir (for quick local testing). |

---

## First-run setup

1. Open **Settings → General** and set:
   - **GPU VRAM (GB)** — used to gate local models.
   - **Projects folder** — where new projects are created.
   - **Obsidian vault** — where conversations are saved.
2. **Settings → API Configuration** — paste any cloud API keys and click
   **Test**. Toggle **Have Gemini Analyze Screenshots** (needs a Gemini key).
3. **Settings → Ollama** — confirm the endpoint and that the status shows
   **Connected**. Download models with `ollama pull <model>` or from the app.
4. Pick a model in the switcher, click **Load Model** (for local), and start
   chatting. Create a project from **File → New Project** to enable file
   generation and preview.

---

## How it works

```
src/
├── main/                 # Electron main process
│   ├── index.ts          # app lifecycle + window
│   ├── ipc.ts            # all IPC handlers -> services
│   └── services/
│       ├── ollama.ts             # Ollama lifecycle, pull, chat streaming
│       ├── api-providers.ts      # OpenAI/Anthropic/Gemini/DeepSeek streaming
│       ├── chat.ts               # routes requests, cost estimation, stop
│       ├── models.ts             # unified model list + VRAM availability
│       ├── file-manager.ts       # project files, file-block parsing, watcher
│       ├── conversation-store.ts # Obsidian markdown + JSON sidecar
│       ├── preview-manager.ts    # live preview server / detection
│       ├── screenshot-service.ts # offscreen capture -> base64 PNG
│       ├── gemini-analyzer.ts    # Gemini 2.5 Pro analysis + auto-fix
│       ├── updater.ts            # electron-updater
│       └── config-persistence.ts # config.json + backup, update-safe
├── preload/index.ts      # typed contextBridge -> window.api
├── shared/               # types, IPC contract, config schema (shared both sides)
└── renderer/             # React UI (Zustand store + components)
```

The renderer talks to the main process exclusively through `window.api`, whose
shape is defined once in `src/shared/ipc.ts` (`AppApi`) and implemented by both
the preload bridge and the main-process handlers — so the two can't drift.

### File generation format

When the assistant emits a fenced code block whose info string names a path, the
file is written to the active project (folders created recursively):

~~~
```tsx title="src/components/Button.tsx"
export function Button() { /* ... */ }
```
~~~

Supported header forms: `title="path"`, `file=path`, `path:path`, a `lang path`
token, or a `// FILE: path` directive line before the fence. A block whose body
is exactly `DELETE` removes the file.

---

## Configuration

See **[docs/CONFIG_SCHEMA.md](docs/CONFIG_SCHEMA.md)** for the full config
schema. Config lives at `%APPDATA%\local-llm-coding-assistant\config.json`
(outside the app bundle, so it survives updates) with a `config.backup.json`
snapshot.

> ⚠️ API keys are stored in **plain text**. Keep the config file secure.

---

## Releasing

Push a tag to trigger the Windows build + GitHub Release publish:

```bash
git tag v0.1.0
git push origin v0.1.0
```

The [`build.yml`](.github/workflows/build.yml) workflow type-checks, builds on
Windows, and (on tags) publishes the installer, portable exe, and `latest.yml`
so the in-app updater can find it.

---

## License

[MIT](LICENSE). No telemetry — all data stays local (your Obsidian vault and
config file).
