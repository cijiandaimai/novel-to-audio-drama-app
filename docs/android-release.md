# 安卓正式安装包打包说明

本项目已经改成 Capacitor 双模式结构：

- 电脑开发时：运行 `npm start`，使用本地 Node 后端。
- 安卓安装包里：没有 Node 后端时，前端会自动切换到 App 内独立流水线。

## 一次性准备

1. 安装 Android Studio。
2. 在 Android Studio 里安装 Android SDK、Android SDK Platform Tools、Android SDK Build Tools。
3. 确认 `ANDROID_HOME` 或 `ANDROID_SDK_ROOT` 指向 SDK 目录。
4. 安装 Node 依赖：

```bash
npm install
```

如果 npm 安装很慢，可以指定官方源：

```bash
npm install --registry=https://registry.npmjs.org/
```

## 生成安卓工程

```bash
npm run android:init
npm run android:sync
```

生成后会出现 `android/` 目录。

## 调试安装包

```bash
npm run android:debug
```

APK 位置通常在：

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

把这个 APK 发到安卓手机上即可安装测试。

## 正式发布包

```bash
npm run android:release
```

正式上架应用商店前，还需要在 Android Studio 里配置签名证书，并生成 signed APK 或 AAB。

## 当前安卓端能力

- 支持上传或粘贴小说文本。
- 支持在 App 内配置 GPT、Gemini、豆包文本、Doubao-Seed-Audio 1.0。
- 没有 API Key 时使用演示模式。
- 支持应用内播放器和自定义背景图。
- 生成产物以 App 内 Blob/Data URL 方式提供下载和播放。

## 后续正式化建议

1. 增加服务端账号体系和云端任务队列，避免用户 API Key 暴露在客户端。
2. 增加 Android 原生文件保存能力，把剧本和音频写入手机下载目录。
3. 增加后台任务进度和失败段重试。
4. 配置正式应用图标、启动页和签名证书。
