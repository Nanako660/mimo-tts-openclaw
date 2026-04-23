# MiMo TTS Plugin for OpenClaw

为 OpenClaw 提供 [MiMo TTS](https://platform.xiaomimimo.com) 语音合成能力的插件。

## 功能

- 支持中英文语音合成
- 9 种预设音色可选
- 支持自定义语音风格描述
- 兼容 Telegram 语音消息格式
- 支持电话/实时通话场景（PCM16 格式）

## 安装

将此插件目录放置在 `~/.openclaw/extensions/mimo-tts/` 下，OpenClaw 会自动加载。

## 配置

在 `~/.openclaw/openclaw.json` 中添加：

```json
{
  "messages": {
    "tts": {
      "providers": {
        "mimo-tts": {
          "apiKey": "your-api-key",
          "baseUrl": "https://api.xiaomimimo.com/v1",
          "model": "mimo-v2.5-tts",
          "voice": "冰糖",
          "format": "mp3"
        }
      }
    }
  }
}
```

### 配置项

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `apiKey` | MiMo TTS API Key（必填） | - |
| `baseUrl` | API Base URL | `https://api.xiaomimimo.com/v1` |
| `model` | TTS 模型 | `mimo-v2.5-tts` |
| `voice` | 音色 ID | `mimo_default` |
| `format` | 输出格式 | `mp3` |
| `style` | 语音风格描述（可选） | - |

## 可用音色

| ID | 名称 | 语言 | 性别 |
|----|------|------|------|
| `mimo_default` | MiMo-默认 | 混合 | 自动 |
| `冰糖` | 冰糖 | 中文 | 女性 |
| `茉莉` | 茉莉 | 中文 | 女性 |
| `苏打` | 苏打 | 中文 | 男性 |
| `白桦` | 白桦 | 中文 | 男性 |
| `Mia` | Mia | 英文 | 女性 |
| `Chloe` | Chloe | 英文 | 女性 |
| `Milo` | Milo | 英文 | 男性 |
| `Dean` | Dean | 英文 | 男性 |

## 可用模型

| 模型 | 说明 |
|------|------|
| `mimo-v2.5-tts` | 基础 TTS（默认） |
| `mimo-v2.5-tts-voicedesign` | 语音设计模式，支持风格描述 |
| `mimo-v2.5-tts-voiceclone` | 语音克隆模式 |

## 输出格式

| 格式 | 用途 |
|------|------|
| `mp3` | Telegram 语音兼容（默认） |
| `wav` | 通用音频格式 |
| `pcm16` | 电话/实时通话场景 |

## API 参考

MiMo TTS API 文档：https://platform.xiaomimimo.com/docs/usage-guide/speech-synthesis-v2.5

## License

MIT