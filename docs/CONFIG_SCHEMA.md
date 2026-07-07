# Configuration Schema

All settings are stored as a single JSON object at:

```
%APPDATA%\local-llm-coding-assistant\config.json
```

(`app.getPath('userData')/config.json`). A backup is written to
`config.backup.json` before every save. Because this file lives outside the
application bundle, **it is preserved across app updates**. On load the stored
object is deep-merged over the built-in defaults, so new fields introduced by a
newer version get sensible defaults automatically and your existing values are
kept.

> ⚠️ **Security:** API keys are stored in **plain text**. Keep this file secure.
> A future version may move secrets to Windows Credential Manager.

## Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `configVersion` | number | `1` | Schema version, owned by the app (never downgraded). |
| `gpuVramGb` | number | `8` | Total GPU VRAM available, used to gate local models. |
| `autoCheckUpdates` | boolean | `true` | Check GitHub Releases on launch. |
| `theme` | `"light" \| "dark" \| "system"` | `"system"` | UI theme. |
| `projectsRootPath` | string | `""` | Root folder where new projects are created. |
| `obsidianVaultPath` | string | `""` | Obsidian vault; conversations save under `chat-conversations/`. |
| `api.openai` | `{ apiKey, model }` | `{ "", "gpt-4o" }` | OpenAI credentials + selected model. |
| `api.anthropic` | `{ apiKey, model }` | `{ "", "claude-3-5-sonnet-latest" }` | Anthropic credentials + model. |
| `api.gemini` | `{ apiKey, model }` | `{ "", "gemini-2.5-pro" }` | Gemini credentials + model. |
| `api.deepseek` | `{ apiKey, model }` | `{ "", "deepseek-chat" }` | DeepSeek credentials + model. |
| `geminiAnalysisEnabled` | boolean | `false` | Enable screenshot analysis (requires a Gemini key). |
| `autoFixFromGemini` | boolean | `false` | Auto-apply fixes from Gemini analysis without confirmation. |
| `ollamaEndpoint` | string | `"http://localhost:11434"` | Ollama HTTP endpoint. |
| `autoStartOllama` | boolean | `true` | Launch `ollama serve` on app start if not running. |
| `temperature` | number | `0.7` | Sampling temperature (0.0–1.0). |
| `maxTokens` | number | `2048` | Max tokens per response. |
| `customModels` | `{ name, vramGb }[]` | `[]` | User-added Ollama models with VRAM footprints. |
| `lastSelectedModel` | string \| null | `null` | Last selected model id (e.g. `"ollama:mistral:7b"`, `"openai:gpt-4o"`). |

## Model id format

Model ids used by `lastSelectedModel` and the model switcher are:

- Local Ollama: `ollama:<model-name>` — e.g. `ollama:deepseek-coder:33b`
- Cloud: `<provider>:<model>` — e.g. `openai:gpt-4o`, `gemini:gemini-2.5-pro`

## Example `config.json`

```json
{
  "configVersion": 1,
  "gpuVramGb": 12,
  "autoCheckUpdates": true,
  "theme": "dark",
  "projectsRootPath": "C:\\Users\\Adam\\projects",
  "obsidianVaultPath": "C:\\Users\\Adam\\ObsidianVault",
  "api": {
    "openai": { "apiKey": "sk-...", "model": "gpt-4o" },
    "anthropic": { "apiKey": "", "model": "claude-3-5-sonnet-latest" },
    "gemini": { "apiKey": "AIza...", "model": "gemini-2.5-pro" },
    "deepseek": { "apiKey": "", "model": "deepseek-chat" }
  },
  "geminiAnalysisEnabled": true,
  "autoFixFromGemini": false,
  "ollamaEndpoint": "http://localhost:11434",
  "autoStartOllama": true,
  "temperature": 0.7,
  "maxTokens": 2048,
  "customModels": [{ "name": "phi3:mini", "vramGb": 3.5 }],
  "lastSelectedModel": "ollama:deepseek-coder:33b"
}
```
