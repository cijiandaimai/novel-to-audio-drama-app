# 白泽 IP 预演台

AI 影视预创作工具。用于把灵感、小说、IP 设定和人物关系快速预演成短剧/长剧大纲、剧本、角色对白、广播剧样片和影视化提案。

## 功能

- 首页免费有声书/广播剧展示
- 小说上传或粘贴
- GPT / Gemini / 豆包文本 / Doubao-Seed-Audio 1.0 API 配置页
- 自动创作流水线
- 剧本 1、剧本 2、音频提示词和合成音频产物
- 应用内音频播放器
- 自定义播放器背景图
- 角色音色参考上传
- 跳过编剧流程，直接上传音频提示词生成音频
- 创作历史记录
- 后端中转模式，避免正式 APK 暴露付费 API Key

## 启动

```bash
npm start
```

然后打开：

```text
http://localhost:4173
```

## 说明

没有配置 API Key 时，应用会使用演示模式，生成脚本、提示词和静音占位 WAV，便于先验证流程。

Doubao-Seed-Audio 1.0 的正式接口如果仍处于体验或邀测阶段，可以先在配置页使用演示模式；拿到正式接口地址后，填入音频模型配置即可替换。

正式给别人安装使用时，建议部署后端中转，把 Key 放到服务器环境变量里。见：

[docs/backend-relay.md](docs/backend-relay.md)

## 安卓 App

项目已接入 Capacitor，可生成 Android 原生工程：

```bash
npm install
npm run android:sync
npm run android:debug
```

调试 APK 通常位于：

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

详细说明见：

[docs/android-release.md](docs/android-release.md)
