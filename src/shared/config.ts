/**
 * Application configuration schema.
 *
 * The full config object is persisted as plain JSON at
 * `app.getPath('userData')/config.json`. API keys are stored in plain text
 * (see README security note). The `configVersion` field enables forward
 * migration; `AppConfig` is deep-merged over `DEFAULT_CONFIG` on load so that
 * new fields added in future versions receive sane defaults automatically —
 * this is what preserves user settings across app updates.
 */

export type ProviderId = 'openai' | 'anthropic' | 'gemini' | 'deepseek'

export type ThemeMode = 'light' | 'dark' | 'system'

export interface ProviderConfig {
  apiKey: string
  /** The model id currently selected for this provider. */
  model: string
}

export interface ApiConfig {
  openai: ProviderConfig
  anthropic: ProviderConfig
  gemini: ProviderConfig
  deepseek: ProviderConfig
}

/** A user-added Ollama model with its VRAM footprint (GB). */
export interface CustomOllamaModel {
  name: string
  vramGb: number
}

export interface AppConfig {
  configVersion: number

  // General
  gpuVramGb: number
  autoCheckUpdates: boolean
  theme: ThemeMode
  projectsRootPath: string
  obsidianVaultPath: string

  // Providers
  api: ApiConfig

  // Gemini screenshot analysis
  geminiAnalysisEnabled: boolean
  autoFixFromGemini: boolean

  // Ollama
  ollamaEndpoint: string
  autoStartOllama: boolean

  // Advanced
  temperature: number
  maxTokens: number

  // Custom Ollama model VRAM entries (merged with hardcoded MODEL_VRAM)
  customModels: CustomOllamaModel[]

  // The last selected model id across providers, e.g. "ollama:deepseek-coder:33b"
  // or "openai:gpt-4o". Restored on launch.
  lastSelectedModel: string | null
}

export const DEFAULT_CONFIG: AppConfig = {
  configVersion: 1,

  gpuVramGb: 8,
  autoCheckUpdates: true,
  theme: 'system',
  projectsRootPath: '',
  obsidianVaultPath: '',

  api: {
    openai: { apiKey: '', model: 'gpt-4o' },
    anthropic: { apiKey: '', model: 'claude-3-5-sonnet-latest' },
    gemini: { apiKey: '', model: 'gemini-2.5-pro' },
    deepseek: { apiKey: '', model: 'deepseek-chat' }
  },

  geminiAnalysisEnabled: false,
  autoFixFromGemini: false,

  ollamaEndpoint: 'http://localhost:11434',
  autoStartOllama: true,

  temperature: 0.7,
  maxTokens: 2048,

  customModels: [],

  lastSelectedModel: null
}

/**
 * Hardcoded VRAM requirements (GB) for well-known Ollama models.
 * Users can extend this via `customModels` in settings.
 */
export const MODEL_VRAM: Record<string, number> = {
  'deepseek-coder:33b': 10.5,
  'deepseek-coder:13b': 9,
  'mistral:7b': 5.5,
  'codellama:7b': 5.5,
  'codellama:13b': 9,
  'llama3:8b': 6,
  'qwen2.5-coder:7b': 5.5,
  'qwen2.5-coder:14b': 9.5
}

/** Available cloud models offered per provider in the settings dropdowns. */
export const PROVIDER_MODELS: Record<ProviderId, string[]> = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'o1', 'o1-mini'],
  anthropic: [
    'claude-3-5-sonnet-latest',
    'claude-3-5-haiku-latest',
    'claude-3-opus-latest'
  ],
  gemini: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-1.5-pro'],
  deepseek: ['deepseek-chat', 'deepseek-reasoner']
}

export const PROVIDER_LABELS: Record<ProviderId, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  gemini: 'Google Gemini',
  deepseek: 'DeepSeek'
}

/** Rough per-1K-token pricing (USD) for cost estimation. input/output. */
export const PROVIDER_PRICING: Record<
  string,
  { inputPer1k: number; outputPer1k: number }
> = {
  'gpt-4o': { inputPer1k: 0.0025, outputPer1k: 0.01 },
  'gpt-4o-mini': { inputPer1k: 0.00015, outputPer1k: 0.0006 },
  'gpt-4-turbo': { inputPer1k: 0.01, outputPer1k: 0.03 },
  o1: { inputPer1k: 0.015, outputPer1k: 0.06 },
  'o1-mini': { inputPer1k: 0.003, outputPer1k: 0.012 },
  'claude-3-5-sonnet-latest': { inputPer1k: 0.003, outputPer1k: 0.015 },
  'claude-3-5-haiku-latest': { inputPer1k: 0.0008, outputPer1k: 0.004 },
  'claude-3-opus-latest': { inputPer1k: 0.015, outputPer1k: 0.075 },
  'gemini-2.5-pro': { inputPer1k: 0.00125, outputPer1k: 0.005 },
  'gemini-2.5-flash': { inputPer1k: 0.0003, outputPer1k: 0.0025 },
  'gemini-1.5-pro': { inputPer1k: 0.00125, outputPer1k: 0.005 },
  'deepseek-chat': { inputPer1k: 0.00027, outputPer1k: 0.0011 },
  'deepseek-reasoner': { inputPer1k: 0.00055, outputPer1k: 0.00219 }
}
