// MiMo TTS Speech Provider for OpenClaw
// API Documentation: https://platform.xiaomimimo.com/docs/usage-guide/speech-synthesis-v2.5

const MIMO_TTS_VOICES = [
  { id: "mimo_default", name: "MiMo-默认", language: "混合", gender: "自动" },
  { id: "冰糖", name: "冰糖", language: "中文", gender: "女性" },
  { id: "茉莉", name: "茉莉", language: "中文", gender: "女性" },
  { id: "苏打", name: "苏打", language: "中文", gender: "男性" },
  { id: "白桦", name: "白桦", language: "中文", gender: "男性" },
  { id: "Mia", name: "Mia", language: "英文", gender: "女性" },
  { id: "Chloe", name: "Chloe", language: "英文", gender: "女性" },
  { id: "Milo", name: "Milo", language: "英文", gender: "男性" },
  { id: "Dean", name: "Dean", language: "英文", gender: "男性" },
];

const MIMO_TTS_MODELS = [
  "mimo-v2.5-tts",
  "mimo-v2.5-tts-voicedesign",
  "mimo-v2.5-tts-voiceclone",
];

const DEFAULT_MODEL = "mimo-v2.5-tts";
const DEFAULT_VOICE = "mimo_default";
const DEFAULT_FORMAT = "mp3"; // Telegram voice compatible
const DEFAULT_BASE_URL = "https://api.xiaomimimo.com/v1";

function trimToUndefined(value) {
  if (value === null || value === undefined) return undefined;
  const str = String(value).trim();
  return str.length > 0 ? str : undefined;
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asFiniteNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

function normalizeMimoProviderConfig(rawConfig) {
  const raw = asObject(asObject(rawConfig.providers)?.["mimo-tts"]) ?? asObject(rawConfig["mimo-tts"]);
  return {
    apiKey: trimToUndefined(raw?.apiKey),
    baseUrl: trimToUndefined(raw?.baseUrl) ?? DEFAULT_BASE_URL,
    model: trimToUndefined(raw?.model) ?? DEFAULT_MODEL,
    voice: trimToUndefined(raw?.voice) ?? DEFAULT_VOICE,
    format: trimToUndefined(raw?.format) ?? DEFAULT_FORMAT,
    style: trimToUndefined(raw?.style),
  };
}

function readMimoProviderConfig(config) {
  const defaults = normalizeMimoProviderConfig({});
  return {
    apiKey: trimToUndefined(config?.apiKey) ?? defaults.apiKey,
    baseUrl: trimToUndefined(config?.baseUrl) ?? defaults.baseUrl,
    model: trimToUndefined(config?.model) ?? defaults.model,
    voice: trimToUndefined(config?.voice) ?? defaults.voice,
    format: trimToUndefined(config?.format) ?? defaults.format,
    style: trimToUndefined(config?.style) ?? defaults.style,
  };
}

function parseDirectiveToken(ctx) {
  const key = (ctx.key || "").toLowerCase().replace(/[-_]/g, "");
  try {
    switch (key) {
      case "voice":
      case "voiceid":
      case "mimovoice":
        if (!ctx.policy.allowVoice) return { handled: true };
        return {
          handled: true,
          overrides: { ...ctx.currentOverrides, voice: ctx.value },
        };
      case "model":
      case "modelid":
      case "mimomodel":
        if (!ctx.policy.allowModelId) return { handled: true };
        return {
          handled: true,
          overrides: { ...ctx.currentOverrides, model: ctx.value },
        };
      case "style":
      case "mimostyle":
        return {
          handled: true,
          overrides: { ...ctx.currentOverrides, style: ctx.value },
        };
      case "format":
      case "audioformat":
        return {
          handled: true,
          overrides: { ...ctx.currentOverrides, format: ctx.value },
        };
      default:
        return { handled: false };
    }
  } catch (error) {
    return { handled: true, warnings: [String(error)] };
  }
}

async function mimoTTS(params) {
  const { text, apiKey, baseUrl, model, voice, format, style, timeoutMs } = params;
  
  if (!apiKey) throw new Error("MiMo TTS API key missing");
  if (!text) throw new Error("Text is required for TTS");
  
  const messages = [];
  
  // User message for style instruction (optional)
  if (style && model !== "mimo-v2.5-tts-voiceclone") {
    messages.push({ role: "user", content: style });
  } else if (model === "mimo-v2.5-tts-voicedesign") {
    // VoiceDesign model requires user message for voice description
    messages.push({ role: "user", content: style || "默认风格" });
  }
  
  // Assistant message contains the text to be spoken
  messages.push({ role: "assistant", content: text });
  
  const requestBody = {
    model: model || DEFAULT_MODEL,
    messages,
    audio: {
      format: format || DEFAULT_FORMAT,
      voice: voice || DEFAULT_VOICE,
    },
  };
  
  const timeout = timeoutMs || 30000;
  
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(timeout),
  });
  
  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`MiMo TTS API error (${response.status}): ${errorText}`);
  }
  
  // MiMo returns audio data in the response
  // The response format depends on the API implementation
  // For non-streaming, it may return base64-encoded audio or binary data
  
  // Check if response is JSON with audio data
  const contentType = response.headers.get("content-type") || "";
  
  if (contentType.includes("application/json")) {
    const json = await response.json();
    // MiMo might return audio in different formats
    // Check for base64 audio data
    if (json.choices && json.choices[0]?.message?.audio) {
      // Audio data in message
      const audioData = json.choices[0].message.audio;
      if (typeof audioData === "string") {
        // Base64 encoded
        return Buffer.from(audioData, "base64");
      } else if (audioData.data) {
        return Buffer.from(audioData.data, "base64");
      }
    }
    // Check for direct audio field
    if (json.audio) {
      if (typeof json.audio === "string") {
        return Buffer.from(json.audio, "base64");
      } else if (json.audio.data) {
        return Buffer.from(json.audio.data, "base64");
      }
    }
    throw new Error("MiMo TTS response format not recognized");
  }
  
  // Binary audio data
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export function buildMimoSpeechProvider() {
  return {
    id: "mimo-tts",
    label: "MiMo TTS",
    autoSelectOrder: 15,
    models: MIMO_TTS_MODELS,
    
    resolveConfig: ({ rawConfig }) => normalizeMimoProviderConfig(rawConfig),
    
    parseDirectiveToken,
    
    resolveTalkConfig: ({ baseTtsConfig, talkProviderConfig }) => {
      const base = normalizeMimoProviderConfig(baseTtsConfig);
      const talk = asObject(talkProviderConfig);
      return {
        ...base,
        apiKey: trimToUndefined(talk.apiKey) ?? base.apiKey,
        baseUrl: trimToUndefined(talk.baseUrl) ?? base.baseUrl,
        model: trimToUndefined(talk.model) ?? base.model,
        voice: trimToUndefined(talk.voice) ?? base.voice,
        format: trimToUndefined(talk.format) ?? base.format,
        style: trimToUndefined(talk.style) ?? base.style,
      };
    },
    
    resolveTalkOverrides: ({ params }) => {
      return {
        ...trimToUndefined(params.voice) ? { voice: trimToUndefined(params.voice) } : {},
        ...trimToUndefined(params.model) ? { model: trimToUndefined(params.model) } : {},
        ...trimToUndefined(params.style) ? { style: trimToUndefined(params.style) } : {},
        ...trimToUndefined(params.format) ? { format: trimToUndefined(params.format) } : {},
      };
    },
    
    listVoices: async (req) => {
      // Return predefined voices (MiMo doesn't have a voices API)
      return MIMO_TTS_VOICES.map(v => ({
        id: v.id,
        name: v.name,
        language: v.language,
        gender: v.gender,
      }));
    },
    
    isConfigured: ({ providerConfig }) => {
      const config = readMimoProviderConfig(providerConfig);
      return Boolean(config.apiKey || process.env.MIMO_TTS_API_KEY);
    },
    
    synthesize: async (req) => {
      const config = readMimoProviderConfig(req.providerConfig);
      const overrides = req.providerOverrides ?? {};
      const apiKey = config.apiKey || process.env.MIMO_TTS_API_KEY;
      
      if (!apiKey) throw new Error("MiMo TTS API key missing");
      
      const format = trimToUndefined(overrides.format) ?? config.format ?? DEFAULT_FORMAT;
      
      const audioBuffer = await mimoTTS({
        text: req.text,
        apiKey,
        baseUrl: config.baseUrl,
        model: trimToUndefined(overrides.model) ?? config.model,
        voice: trimToUndefined(overrides.voice) ?? config.voice,
        format,
        style: trimToUndefined(overrides.style) ?? config.style,
        timeoutMs: req.timeoutMs,
      });
      
      const fileExtension = format === "wav" ? ".wav" : format === "mp3" ? ".mp3" : ".pcm";
      
      // Telegram voice-compatible formats: mp3, opus, ogg, m4a
      const voiceCompatibleFormats = ['mp3', 'opus', 'ogg', 'm4a'];
      const voiceCompatible = voiceCompatibleFormats.includes(format.toLowerCase());
      
      return {
        audioBuffer,
        outputFormat: format,
        fileExtension,
        voiceCompatible,
      };
    },
    
    synthesizeTelephony: async (req) => {
      const config = readMimoProviderConfig(req.providerConfig);
      const apiKey = config.apiKey || process.env.MIMO_TTS_API_KEY;
      
      if (!apiKey) throw new Error("MiMo TTS API key missing");
      
      // Use pcm16 format for telephony
      const audioBuffer = await mimoTTS({
        text: req.text,
        apiKey,
        baseUrl: config.baseUrl,
        model: config.model,
        voice: config.voice,
        format: "pcm16",
        style: config.style,
        timeoutMs: req.timeoutMs,
      });
      
      return {
        audioBuffer,
        outputFormat: "pcm16",
        sampleRate: 16000,
      };
    },
  };
}

export default buildMimoSpeechProvider;