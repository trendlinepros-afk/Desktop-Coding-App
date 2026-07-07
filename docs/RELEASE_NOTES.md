# Release Notes

## v0.1.0 — First release

The first public build of **Local LLM Coding Assistant**, a Windows desktop
coding assistant that works like Claude Code but runs on local Ollama models
with seamless cloud API fallback.

### Highlights

- **Local-first chat** — Chat with any downloaded Ollama model, with real-time
  token-by-token streaming and a stop button.
- **Cloud fallback** — OpenAI, Anthropic, Google Gemini, and DeepSeek. Switch
  models mid-conversation without losing history. Paid requests show a
  token/cost estimate before sending.
- **Model switcher with VRAM awareness** — Hover any model to see provider,
  VRAM footprint (X GB, Y% of your total), and an inference-speed hint. Models
  that exceed your VRAM budget are flagged.
- **Claude-Code-style file generation** — The assistant writes files directly
  into your project folder as it responds; a Monaco editor with a live file
  tree lets you view and edit them.
- **Live preview** — Serve and preview the app you're building (static / SPA /
  Node), with hot reload on file changes.
- **Gemini screenshot analysis** — Automatically (or manually) screenshot the
  live preview and send it to Gemini 2.5 Pro for visual bug/UI review. With
  *Auto Fix* enabled, fixes are applied automatically; otherwise you get
  **Fix** / **Don't Fix** buttons.
- **Conversations in your Obsidian vault** — Every conversation (including
  embedded Gemini analyses and screenshots) is saved as Markdown under
  `chat-conversations/`.
- **Light / dark themes** that follow your system by default.
- **Auto-updates** via GitHub Releases — all settings and API keys persist
  across updates.

### Requirements

- Windows 10/11
- [Ollama](https://ollama.com/download) installed for local models (optional if
  you only use cloud APIs)

### Known limitations

- API keys are stored in plain text in the config file (a warning is shown in
  Settings). Windows Credential Manager support is planned for v2.
- Node/Express preview assumes the dev server binds the configured port.
