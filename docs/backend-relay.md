# 后端中转部署说明

正式给 Android 用户安装时，不建议把付费 API Key 写进 APK。App 已支持“后端中转地址”：把 `server.mjs` 部署到自己的服务器，再在 App 的 API 配置页填写服务器地址即可。

## 本地测试

```bash
npm install
npm start
```

本地默认地址：

```text
http://localhost:4173
```

## 服务端环境变量

按需配置即可，没配置的模型仍可由 App 本机配置补齐。

```bash
# 豆包文本 / 火山方舟
ARK_API_KEY=你的火山方舟APIKey
DOUBAO_TEXT_MODEL=你的豆包文本模型或接入点ID
DOUBAO_TEXT_BASE_URL=https://ark.cn-beijing.volces.com/api/v3/chat/completions

# C计划：千问 / Kimi
QWEN_API_KEY=你的阿里云百炼APIKey
QWEN_MODEL=qwen-plus
QWEN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions
KIMI_API_KEY=你的Moonshot或Kimi APIKey
KIMI_MODEL=你的Kimi模型ID
KIMI_BASE_URL=https://api.moonshot.cn/v1/chat/completions

# 豆包音频
DOUBAO_AUDIO_API_KEY=你的豆包音频Key
DOUBAO_AUDIO_MODEL=seed-audio-1.0
DOUBAO_AUDIO_ENDPOINT=https://openspeech.bytedance.com/api/v3/tts/create

# 可选：OpenAI 兼容接口
OPENAI_API_KEY=你的Key
OPENAI_MODEL=你的模型ID
OPENAI_BASE_URL=https://api.openai.com/v1/chat/completions

# 可选：Gemini / Grok
GEMINI_API_KEY=你的Key
GEMINI_MODEL=你的模型ID
GROK_API_KEY=你的Key
GROK_MODEL=你的模型ID

# 网络
NETWORK_TIMEOUT_SECONDS=120
NETWORK_RETRY_COUNT=1
```

## App 内填写

在 `API 配置 -> 后端中转与网络 -> 后端中转地址` 填：

```text
https://你的服务器域名
```

填了中转地址后，创作、直接音频生成、历史记录和联网诊断都会优先请求服务器的 `/api` 接口。中转失败时不会自动改成本机直连，避免付费 Key 暴露在 APK 里。

## 与 AI App Lab 的关系

AI App Lab 里的 `arkitect` 适合作为下一阶段的 Python 编排层。当前项目先保留轻量 Node 中转，方便马上测试豆包 API；后续如果要做多 Agent、任务队列、审计日志、限流和更复杂的音频流水线，可以把 `server.mjs` 的模型调用迁移到 Arkitect 服务。
