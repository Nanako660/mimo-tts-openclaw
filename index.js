// MiMo TTS Plugin Entry Point
import { buildMimoSpeechProvider } from "./speech-provider.js";

export default function (api) {
  api.registerSpeechProvider(buildMimoSpeechProvider());
}

export { buildMimoSpeechProvider };