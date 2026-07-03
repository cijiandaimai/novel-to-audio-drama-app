import { optimizedPlan, runDirectAudioPipeline, runStandalonePipeline } from './mobile-pipeline.js';

const defaultConfig = {
  workflow: {
    plan: "auto"
  },
  gpt: {
    baseUrl: "https://api.openai.com/v1/chat/completions",
    model: "",
    apiKey: ""
  },
  gemini: {
    model: "",
    apiKey: "",
    endpoint: ""
  },
  doubao: {
    baseUrl: "https://ark.cn-beijing.volces.com/api/v3/chat/completions",
    model: "doubao-seed-2-1-pro-260628",
    apiKey: ""
  },
  qwen: {
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
    model: "qwen-plus",
    apiKey: ""
  },
  kimi: {
    baseUrl: "https://api.moonshot.cn/v1/chat/completions",
    model: "kimi-k2.6",
    apiKey: ""
  },
  audio: {
    mode: "mock",
    endpoint: "https://openspeech.bytedance.com/api/v3/tts/create",
    model: "seed-audio-1.0",
    apiKey: ""
  },
  grok: {
    baseUrl: "https://api.x.ai/v1/chat/completions",
    model: "grok-4.3",
    apiKey: ""
  },
  network: {
    profile: "china",
    relayBaseUrl: "",
    timeoutSeconds: "120",
    retryCount: "1"
  }
};

const stageNames = [
  "选择 A/B/C 创作计划",
  "生成项目资料包",
  "扩展分场大纲",
  "豆包优化对白方向",
  "生成剧本 1",
  "豆包二次优化台词",
  "生成剧本 2",
  "生成影视级音频提示词",
  "豆包音频生成 seed-audio-1.0 生成并合成音频"
];

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));
const homeView = "discover";
const routeViews = ["discover", "create", "editor", "config", "history"];
const viewLabels = {
  discover: "音箱",
  create: "创作",
  editor: "剪辑",
  config: "API 配置",
  history: "创作历史"
};
const appLanguageKey = "appLanguage";
const i18n = {
  zh: {
    appName: "白泽声工坊",
    tagline: "编剧、配音、配乐、合成",
    navDiscover: "音箱",
    navCreate: "创作",
    navEditor: "剪辑",
    language: "语言",
    startCreate: "开始创作",
    speakerEyebrow: "音箱",
    speakerTitle: "播放、歌词、外部音频",
    nowPlaying: "正在播放",
    emptyPlayerTitle: "选择一段广播剧开始收听",
    fullscreen: "全屏",
    lyricHint: "导入 LRC / KRC 歌词后，这里会跟随音频逐字亮起。",
    prev: "上一首",
    play: "播放",
    pause: "暂停",
    next: "下一首",
    loopNone: "顺序",
    loopSingle: "单曲循环",
    loopList: "列表循环",
    speed: "速度",
    volume: "音量",
    pathEmpty: "未导入音频",
    lyricEmpty: "歌词未导入",
    importAudio: "导入音频",
    scanDownloads: "扫描下载文件夹",
    importLyrics: "导入歌词",
    changeBg: "换背景",
    importMemoryEmpty: "尚未记录导入位置",
    moreSettings: "更多设置",
    bgUrlPlaceholder: "粘贴图片链接",
    applyLink: "应用链接",
    clearBg: "恢复默认",
    bluetooth: "蓝牙",
    test: "测试",
    autoResumeOn: "自动续播：开",
    autoResumeOff: "自动续播：关",
    exportRecord: "导出记录",
    bluetoothHint: "请先在系统蓝牙中配对音箱，App 播放声音会跟随系统输出设备。",
    playlist: "播放列表",
    clear: "清空",
    playlistEmpty: "导入音频或播放作品后，会自动生成播放列表。",
    apiConfig: "API 配置",
    history: "创作历史",
    createEyebrow: "创作台",
    createTitle: "上传小说，生成广播剧",
    checkApi: "检查 API",
    editorEyebrow: "音频工作台",
    configEyebrow: "傻瓜式配置",
    configTitle: "把自己的 API 接进来",
    saveConfig: "保存配置",
    historyEyebrow: "创作历史",
    historyTitle: "继续收听或下载成品",
    refresh: "刷新"
  },
  ja: {
    appName: "BaizeZRakugo",
    tagline: "脚本、音声、音楽、ミックス",
    navDiscover: "音箱",
    navCreate: "制作",
    navEditor: "編集",
    language: "言語",
    startCreate: "制作を始める",
    speakerEyebrow: "音箱",
    speakerTitle: "再生、歌詞、ローカル音声",
    nowPlaying: "再生中",
    emptyPlayerTitle: "音声ドラマを選んで再生",
    fullscreen: "全画面",
    lyricHint: "LRC / KRC 歌詞を読み込むと、音声に合わせて文字が光ります。",
    prev: "前へ",
    play: "再生",
    pause: "一時停止",
    next: "次へ",
    loopNone: "順番",
    loopSingle: "1曲リピート",
    loopList: "リストリピート",
    speed: "速度",
    volume: "音量",
    pathEmpty: "音声未読み込み",
    lyricEmpty: "歌詞未読み込み",
    importAudio: "音声追加",
    scanDownloads: "Downloadsをスキャン",
    importLyrics: "歌詞追加",
    changeBg: "背景変更",
    importMemoryEmpty: "読み込み場所は未記録",
    moreSettings: "その他設定",
    bgUrlPlaceholder: "画像リンクを貼り付け",
    applyLink: "適用",
    clearBg: "既定に戻す",
    bluetooth: "Bluetooth",
    test: "テスト",
    autoResumeOn: "自動再開：オン",
    autoResumeOff: "自動再開：オフ",
    exportRecord: "記録を書き出す",
    bluetoothHint: "先に端末のBluetooth設定でスピーカーをペアリングしてください。再生音はシステムの出力先に従います。",
    playlist: "プレイリスト",
    clear: "クリア",
    playlistEmpty: "音声を追加または再生すると、プレイリストが自動作成されます。",
    apiConfig: "API設定",
    history: "制作履歴",
    createEyebrow: "制作台",
    createTitle: "小説をアップロードして音声ドラマを生成",
    checkApi: "API確認",
    editorEyebrow: "音声ワークベンチ",
    configEyebrow: "かんたん設定",
    configTitle: "自分のAPIを接続",
    saveConfig: "設定を保存",
    historyEyebrow: "制作履歴",
    historyTitle: "作品を聴く・ダウンロード",
    refresh: "更新"
  },
  en: {
    appName: "Baize Voice Studio",
    tagline: "Script, voice, music, mix",
    navDiscover: "Speaker",
    navCreate: "Create",
    navEditor: "Edit",
    language: "Language",
    startCreate: "Start",
    speakerEyebrow: "Speaker",
    speakerTitle: "Player, lyrics, local audio",
    nowPlaying: "Now Playing",
    emptyPlayerTitle: "Choose an audio drama to play",
    fullscreen: "Fullscreen",
    lyricHint: "Import LRC / KRC lyrics to highlight words with playback.",
    prev: "Previous",
    play: "Play",
    pause: "Pause",
    next: "Next",
    loopNone: "Order",
    loopSingle: "Repeat One",
    loopList: "Repeat List",
    speed: "Speed",
    volume: "Volume",
    pathEmpty: "No audio imported",
    lyricEmpty: "No lyrics imported",
    importAudio: "Import Audio",
    scanDownloads: "Scan Downloads",
    importLyrics: "Import Lyrics",
    changeBg: "Background",
    importMemoryEmpty: "No import location recorded",
    moreSettings: "More Settings",
    bgUrlPlaceholder: "Paste image URL",
    applyLink: "Apply",
    clearBg: "Default",
    bluetooth: "Bluetooth",
    test: "Test",
    autoResumeOn: "Auto resume: On",
    autoResumeOff: "Auto resume: Off",
    exportRecord: "Export Record",
    bluetoothHint: "Pair your Bluetooth speaker in system settings first. Playback follows the system audio output.",
    playlist: "Playlist",
    clear: "Clear",
    playlistEmpty: "Import or play audio to build a playlist automatically.",
    apiConfig: "API Config",
    history: "History",
    createEyebrow: "Studio",
    createTitle: "Upload a novel and generate an audio drama",
    checkApi: "Check API",
    editorEyebrow: "Audio Desk",
    configEyebrow: "Simple Setup",
    configTitle: "Connect your APIs",
    saveConfig: "Save Config",
    historyEyebrow: "History",
    historyTitle: "Listen again or download",
    refresh: "Refresh"
  }
};
const playerBgKey = "playerBackgroundImage";
const playerPlaylistKey = "playerPlaylist";
const playerLastImportKey = "playerLastImportLocation";
const playerPlaybackDocKey = "playerPlaybackDocument";
const playerAudioGuardKey = "playerAudioGuard";
const playerLoopModeKey = "playerLoopMode";
const playerRateKey = "playerPlaybackRate";
const appIntroSeenKey = "appIntroSeen";
const creatorDraftKey = "creatorDraft";
const configDirtyKey = "configDirty";
const defaultPlayerBg = "/assets/player-default-bg.jpg";
const midnightPlayerBg = "/assets/player-midnight-bg.png";
const playerState = {
  audioUrl: "",
  objectUrl: "",
  mediaDbPromise: null,
  currentPlaylistId: "",
  playlist: [],
  lyrics: [],
  lyricFileName: "",
  lyricMode: "none",
  lyricFormatLabel: "",
  activeLyricIndex: -1,
  activeWordIndex: -1,
  seeking: false,
  seekWasPlaying: false,
  pendingSeekTime: 0,
  seekResumeTimer: 0,
  lastLyricScrollIndex: -1,
  lyricScrollFrame: 0,
  lastFullscreenTapAt: 0,
  lastFullscreenPointerTouchAt: 0,
  fullscreenPointerStartY: 0,
  lyricHoldTimer: 0,
  lyricScrubbing: false,
  lyricScrubStartY: 0,
  lyricScrubStartTime: 0,
  playbackSaveTimer: 0,
  lastPlaybackSyncAt: 0,
  userPaused: true,
  expectedPlaying: false,
  interruptionResumeAttempts: 0,
  interruptionResumeTimer: 0,
  loopMode: "none",
  playbackRate: 1
};
const voiceRefsKey = "voiceReferences";
const midnightUnlockKey = "midnightNekomataUnlocked";
const midnightFailKey = "midnightNekomataFailCount";
const midnightRemovedKey = "midnightNekomataRemoved";
const midnightQuizSessionKey = "midnightNekomataQuizSession";
const midnightQuizUrl = "/assets/midnight-quiz.enc.json";
const midnightQuizSecret = "midnight-nekomata-quiz-v1|novel-radio-drama";
const midnightQuizState = {
  bank: [],
  selected: [],
  loading: null
};
const editorState = {
  audioContext: null,
  tracks: [
    { id: "A", name: "轨道 1", label: "人声/主轨", buffer: null, url: "", fileName: "", volume: 1, muted: false, solo: false, sourceHistory: [], heightWeight: 1 },
    { id: "B", name: "轨道 2", label: "音乐/环境", buffer: null, url: "", fileName: "", volume: 0.75, muted: false, solo: false, sourceHistory: [], heightWeight: 1 }
  ],
  activeTrackId: "A",
  selection: { trackId: "A", sourceStart: 0, sourceEnd: 0, timelineStart: 0 },
  timeline: { zoom: 1, offset: 0, playhead: 0, snap: true, grid: 0.5 },
  drag: null,
  sourceBuffer: null,
  sourceUrl: "",
  sourceName: "",
  clips: [],
  selectedClipId: "",
  clipboardClip: null,
  pickNext: "start",
  clipTimer: null,
  playingNodes: [],
  undoStack: [],
  redoStack: [],
  renderedUrl: "",
  pendingDrag: null,
  lastTimelineTap: null,
  lastTimelineClick: null,
  longPressTimer: null,
  playheadRaf: 0,
  playbackStartClock: 0,
  playbackStartPlayhead: 0,
  playbackDuration: 0,
  micTrackId: "A",
  micStream: null,
  micRecorder: null,
  micChunks: [],
  micMimeType: "audio/webm"
};
const recorderState = {
  stream: null,
  recorder: null,
  chunks: [],
  dataUrl: "",
  mimeType: "audio/webm"
};

let lastHomeBackAt = 0;

const apiHelp = {
  "workflow.plan": {
    title: "创作方案",
    url: "https://help.aliyun.com/zh/model-studio/first-api-call-to-qwen",
    text: "自动推荐会优先使用 A 计划；没有 GPT/Gemini 但配置了千问或 Kimi 时切到 C 计划；只有豆包时走 B 计划。"
  },
  "gpt.baseUrl": {
    title: "GPT 接口地址",
    url: "https://platform.openai.com/docs",
    text: "官网在 OpenAI Platform。默认填写 /v1/chat/completions；如果你用兼容 OpenAI 的中转服务，也填它提供的 chat completions 地址。"
  },
  "gpt.model": {
    title: "GPT 模型 ID",
    url: "https://platform.openai.com/docs/models",
    text: "在 OpenAI 模型列表或你的中转后台查看模型 ID。用于故事骨架、剧本整理和提示词拆分。"
  },
  "gpt.apiKey": {
    title: "GPT API Key",
    url: "https://platform.openai.com/api-keys",
    text: "进入 OpenAI API Keys 页面创建 Key。不要把 Key 发给陌生人；本 App 目前只保存在本机。"
  },
  "gemini.model": {
    title: "Gemini 模型 ID",
    url: "https://aistudio.google.com/",
    text: "在 Google AI Studio 选择可用 Gemini 模型。用于扩展场景、补足冲突和细节。"
  },
  "gemini.apiKey": {
    title: "Gemini API Key",
    url: "https://aistudio.google.com/app/apikey",
    text: "进入 Google AI Studio 的 API Key 页面创建 Key。大陆用户通常需要系统代理或中转线路。"
  },
  "gemini.endpoint": {
    title: "Gemini 自定义接口",
    url: "https://ai.google.dev/gemini-api/docs",
    text: "可留空，App 会按官方 generateContent 地址拼接；如果用代理或中转服务，在这里填完整接口。"
  },
  "doubao.baseUrl": {
    title: "豆包文本接口",
    url: "https://console.volcengine.com/ark/",
    text: "在火山方舟开通文本模型。默认地址是 cn-beijing 的 chat completions 兼容接口。"
  },
  "doubao.model": {
    title: "豆包文本模型 ID",
    url: "https://console.volcengine.com/ark/",
    text: "在火山方舟模型接入页面复制模型 ID，用于中文台词润色和角色语气统一。"
  },
  "doubao.apiKey": {
    title: "豆包文本 API Key",
    url: "https://console.volcengine.com/ark/",
    text: "在火山方舟创建 API Key，填入后才能调用真实文本模型。"
  },
  "qwen.baseUrl": {
    title: "千问接口地址",
    url: "https://help.aliyun.com/zh/model-studio/qwen-api-via-dashscope",
    text: "推荐使用阿里云百炼 OpenAI 兼容模式地址：/compatible-mode/v1/chat/completions。用于 C 计划中的结构化剧本和提示词输出。"
  },
  "qwen.model": {
    title: "千问模型 ID",
    url: "https://help.aliyun.com/zh/model-studio/models",
    text: "可先填 qwen-plus，也可以填你在百炼控制台开通的其他 Qwen 模型。"
  },
  "qwen.apiKey": {
    title: "千问 API Key",
    url: "https://bailian.console.aliyun.com/",
    text: "进入阿里云百炼创建 API Key。C 计划会优先让千问负责结构化剧本、角色表和 JSON 音频提示词。"
  },
  "kimi.baseUrl": {
    title: "Kimi 接口地址",
    url: "https://platform.kimi.ai/docs/overview",
    text: "月之暗面 Kimi API 使用 OpenAI 兼容接口，默认地址为 https://api.moonshot.cn/v1/chat/completions。"
  },
  "kimi.model": {
    title: "Kimi 模型 ID",
    url: "https://platform.kimi.ai/docs/models",
    text: "填你账号可用的 Kimi 模型。C 计划会优先让 Kimi 处理长篇小说理解、人物关系和伏笔梳理。"
  },
  "kimi.apiKey": {
    title: "Kimi API Key",
    url: "https://platform.kimi.ai/",
    text: "进入 Kimi API 平台创建 Key。适合补强长上下文阅读和分场扩写。"
  },
  "audio.mode": {
    title: "豆包音频模式",
    url: "https://www.volcengine.com/docs/6561/2550782?lang=zh",
    text: "演示模式会生成占位音频；HTTP 模式会调用 Doubao-Seed-Audio 1.0 生成真实音频。"
  },
  "audio.endpoint": {
    title: "豆包音频接口地址",
    url: "https://www.volcengine.com/docs/6561/2550782?lang=zh",
    text: "当前默认接口为 https://openspeech.bytedance.com/api/v3/tts/create，使用 X-Api-Key 鉴权。"
  },
  "audio.model": {
    title: "豆包音频模型 ID",
    url: "https://www.volcengine.com/docs/6561/1816214?lang=zh",
    text: "Doubao-Seed-Audio 1.0 当前填 seed-audio-1.0。建议单段提示词控制在 30-90 秒。"
  },
  "audio.apiKey": {
    title: "豆包音频 API Key",
    url: "https://console.volcengine.com/",
    text: "在火山引擎语音服务或相关控制台创建 Key。真实生成音频前请先确认额度和计费。"
  },
  "network.relayBaseUrl": {
    title: "后端中转地址",
    url: "https://github.com/volcengine/ai-app-lab/tree/main/arkitect",
    text: "正式安装给别人用时，建议把 Key 放在自己的后端。这里填你的中转服务地址，例如 https://api.example.com，App 会优先请求它的 /api/run 等接口。"
  },
  "network.timeoutSeconds": {
    title: "请求超时",
    url: "https://github.com/volcengine/ai-app-lab/tree/main/arkitect",
    text: "大模型和音频生成可能较慢。大陆网络或系统代理下建议 120-180 秒，避免长音频还没生成就被中断。"
  },
  "network.retryCount": {
    title: "失败重试次数",
    url: "https://github.com/volcengine/ai-app-lab/tree/main/arkitect",
    text: "网络不稳时可设 1-2 次。重试只适合临时网络失败；如果 Key 或模型 ID 填错，重试不会解决。"
  },
  "grok.baseUrl": {
    title: "Grok 接口地址",
    url: "https://docs.x.ai/developers/rest-api-reference/inference/chat",
    text: "xAI 官方 OpenAI 兼容地址为 https://api.x.ai/v1/chat/completions。"
  },
  "grok.model": {
    title: "Grok 模型 ID",
    url: "https://docs.x.ai/developers/quickstart",
    text: "xAI 文档示例使用 grok-4.3；也可填你账号中可用的其他 Grok 模型 ID。"
  },
  "grok.apiKey": {
    title: "Grok API Key",
    url: "https://console.x.ai/",
    text: "进入 xAI Console 创建 API Key。午夜猫娘只做合规的成年人成熟向氛围改编。"
  }
};

function deepMerge(base, extra) {
  const out = structuredClone(base);
  for (const [key, value] of Object.entries(extra || {})) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      out[key] = deepMerge(out[key] || {}, value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

function getAppLanguage() {
  const value = localStorage.getItem(appLanguageKey) || "zh";
  return i18n[value] ? value : "zh";
}

function t(key) {
  const lang = getAppLanguage();
  return i18n[lang]?.[key] || i18n.zh[key] || key;
}

function setText(selector, value) {
  const target = $(selector);
  if (target) target.textContent = value;
}

function setPlaceholder(selector, value) {
  const target = $(selector);
  if (target) target.placeholder = value;
}

function setNavItemText(view, value) {
  const button = $(`.nav-item[data-view='${view}']`);
  if (!button) return;
  const icon = button.querySelector(".nav-icon");
  button.textContent = "";
  if (icon) button.appendChild(icon);
  button.append(document.createTextNode(value));
}

function applyAppLanguage(language = getAppLanguage()) {
  const lang = i18n[language] ? language : "zh";
  localStorage.setItem(appLanguageKey, lang);
  document.documentElement.lang = lang === "zh" ? "zh-CN" : lang;
  document.title = t("appName");
  const selector = $("#appLanguageSelect");
  if (selector) selector.value = lang;

  setText(".brand h1", t("appName"));
  setText(".brand p", t("tagline"));
  setNavItemText("discover", t("navDiscover"));
  setNavItemText("create", t("navCreate"));
  setNavItemText("editor", t("navEditor"));
  setText("#discover .page-head .eyebrow", t("speakerEyebrow"));
  setText("#discover .page-head h2", t("speakerTitle"));
  setText(".language-switch span", t("language"));
  setText("#discover .page-head [data-jump='create']", t("startCreate"));
  setText(".speaker-now .eyebrow", t("nowPlaying"));
  if (!playerState.currentPlaylistId) setText("#playerTitle", t("emptyPlayerTitle"));
  setText("#fullScreenPlayer", t("fullscreen"));
  if (!playerState.lyrics.length) setText("#lyricCurrent", t("lyricHint"));
  setText("#playerPrev", t("prev"));
  setText("#playerNext", t("next"));
  setText(".player-rate span", t("speed"));
  setText(".player-volume span", t("volume"));
  setText("#scanDownloadsButton", t("scanDownloads"));
  setText(".player-more summary", t("moreSettings"));
  setPlaceholder("#playerBgUrl", t("bgUrlPlaceholder"));
  setText("#applyBgUrl", t("applyLink"));
  setText("#clearBg", t("clearBg"));
  setText("#openBluetoothSettings", t("bluetooth"));
  setText("#testBluetoothAudio", t("test"));
  setText("#exportPlaybackRecord", t("exportRecord"));
  setText("#bluetoothStatus", t("bluetoothHint"));
  setText(".player-playlist-head strong", t("playlist"));
  setText("#clearPlaylist", t("clear"));
  setText(".home-actions [data-jump='config']", t("apiConfig"));
  setText(".home-actions [data-jump='history']", t("history"));
  setText("#create .page-head .eyebrow", t("createEyebrow"));
  setText("#create .page-head h2", t("createTitle"));
  setText("#create .page-head [data-jump='config']", t("checkApi"));
  setText("#editor .page-head .eyebrow", t("editorEyebrow"));
  setText("#config .page-head .eyebrow", t("configEyebrow"));
  setText("#config .page-head h2", t("configTitle"));
  setText("#saveConfig", t("saveConfig"));
  setText("#history .page-head .eyebrow", t("historyEyebrow"));
  setText("#history .page-head h2", t("historyTitle"));
  setText("#refreshHistory", t("refresh"));

  const playerActionLabels = $$(".player-actions label.image-picker");
  if (playerActionLabels[0]) {
    playerActionLabels[0].childNodes[0].nodeValue = t("importAudio");
  }
  if (playerActionLabels[1]) {
    playerActionLabels[1].childNodes[0].nodeValue = t("importLyrics");
  }
  if (playerActionLabels[2]) {
    playerActionLabels[2].childNodes[0].nodeValue = t("changeBg");
  }

  updatePlayerPathLabel(playerState.playlist.find((item) => item.id === playerState.currentPlaylistId));
  renderAudioGuardUi();
  renderPlayerLoopRateUi();
  syncPlayerControls();
}

function getConfig() {
  try {
    return deepMerge(defaultConfig, JSON.parse(localStorage.getItem("apiConfig") || "{}"));
  } catch {
    return structuredClone(defaultConfig);
  }
}

function setByPath(object, path, value) {
  const parts = path.split(".");
  let cursor = object;
  for (let i = 0; i < parts.length - 1; i++) {
    cursor[parts[i]] ||= {};
    cursor = cursor[parts[i]];
  }
  cursor[parts.at(-1)] = value;
}

function getByPath(object, path) {
  return path.split(".").reduce((cursor, part) => cursor?.[part], object);
}

function getRelayBaseUrl(config = getConfig()) {
  return String(config.network?.relayBaseUrl || "").trim().replace(/\/+$/, "");
}

function apiUrl(path, config = getConfig()) {
  const relay = getRelayBaseUrl(config);
  if (!relay) return path;
  if (relay.endsWith("/api") && path.startsWith("/api/")) return `${relay}${path.slice(4)}`;
  return `${relay}${path}`;
}

function relayAssetUrl(path, config = getConfig()) {
  if (!path || /^(https?:|data:|blob:|file:)/i.test(path)) return path;
  const relay = getRelayBaseUrl(config);
  if (!relay) return path;
  const base = relay.endsWith("/api") ? relay.slice(0, -4) : relay;
  return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
}

function normalizeResultLinks(result, config = getConfig()) {
  const links = { ...(result?.links || {}) };
  for (const [key, value] of Object.entries(links)) {
    if (typeof value === "string") links[key] = relayAssetUrl(value, config);
  }
  return links;
}

function normalizeHistoryItem(item, config = getConfig()) {
  return {
    ...item,
    finalAudio: relayAssetUrl(item.finalAudio, config),
    manifest: relayAssetUrl(item.manifest, config)
  };
}

async function apiJson(path, payload, config = getConfig()) {
  const response = await fetch(apiUrl(path, config), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) throw new Error(data.error || `接口请求失败：${response.status}`);
  return data;
}

async function apiGetJson(path, config = getConfig()) {
  const response = await fetch(apiUrl(path, config), { cache: "no-store" });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) throw new Error(data.error || `接口请求失败：${response.status}`);
  return data;
}

let toastTimer = null;
let routeSwipe = null;

function showToast(message, type = "") {
  const toast = $("#appToast");
  if (!toast || !message) return;
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.className = `app-toast ${type}`.trim();
  toast.classList.remove("hidden");
  toastTimer = setTimeout(() => toast.classList.add("hidden"), 2600);
}

function setButtonBusy(buttonOrSelector, busy, busyLabel = "处理中...") {
  const button = typeof buttonOrSelector === "string" ? $(buttonOrSelector) : buttonOrSelector;
  if (!button) return;
  if (busy) {
    if (!button.dataset.idleText) button.dataset.idleText = button.textContent.trim();
    button.textContent = busyLabel;
  } else if (button.dataset.idleText) {
    button.textContent = button.dataset.idleText;
    delete button.dataset.idleText;
  }
  button.disabled = busy;
  button.setAttribute("aria-busy", busy ? "true" : "false");
}

function readLocalHistory() {
  try {
    const history = JSON.parse(localStorage.getItem("localHistory") || "[]");
    return Array.isArray(history) ? history : [];
  } catch {
    localStorage.removeItem("localHistory");
    return [];
  }
}

function readCreatorDraft() {
  try {
    return JSON.parse(localStorage.getItem(creatorDraftKey) || "{}") || {};
  } catch {
    localStorage.removeItem(creatorDraftKey);
    return {};
  }
}

function saveCreatorDraft() {
  const draft = {
    title: $("#titleInput")?.value || "",
    novel: $("#novelInput")?.value || "",
    directPrompt: $("#directPromptInput")?.value || "",
    voiceRole: $("#voiceRoleInput")?.value || "",
    updatedAt: new Date().toISOString()
  };
  localStorage.setItem(creatorDraftKey, JSON.stringify(draft));
  syncCreatorReadyState();
}

function restoreCreatorDraft() {
  const draft = readCreatorDraft();
  if ($("#titleInput") && !$("#titleInput").value && draft.title) $("#titleInput").value = draft.title;
  if ($("#novelInput") && !$("#novelInput").value && draft.novel) $("#novelInput").value = draft.novel;
  if ($("#directPromptInput") && !$("#directPromptInput").value && draft.directPrompt) $("#directPromptInput").value = draft.directPrompt;
  if ($("#voiceRoleInput") && !$("#voiceRoleInput").value && draft.voiceRole) $("#voiceRoleInput").value = draft.voiceRole;
  syncCreatorReadyState();
}

function syncCreatorReadyState() {
  const novelReady = Boolean($("#novelInput")?.value.trim());
  const directReady = Boolean($("#directPromptInput")?.value.trim());
  const runButton = $("#runButton");
  const directButton = $("#runDirectAudioButton");
  if (runButton) {
    runButton.disabled = !novelReady;
    runButton.title = novelReady ? "" : "请先上传或粘贴小说内容";
  }
  if (directButton) {
    directButton.disabled = !directReady;
    directButton.title = directReady ? "" : "请先填写或导入音频提示词";
  }
}

function markConfigDirty(dirty = true) {
  const button = $("#saveConfig");
  if (!button) return;
  localStorage.setItem(configDirtyKey, dirty ? "yes" : "no");
  if (!button.dataset.cleanText) button.dataset.cleanText = button.textContent.trim();
  button.textContent = dirty ? `${button.dataset.cleanText} *` : button.dataset.cleanText;
  button.classList.toggle("attention", dirty);
}

function normalizeView(name) {
  return routeViews.includes(name) ? name : homeView;
}

function getViewFromLocation() {
  const hash = decodeURIComponent(window.location.hash || "").replace(/^#\/?/, "");
  if (routeViews.includes(hash)) return hash;
  const queryView = new URLSearchParams(window.location.search).get("view");
  return normalizeView(queryView);
}

function getRouteHref(name) {
  const url = new URL(window.location.href);
  url.searchParams.delete("view");
  const view = normalizeView(name);
  url.hash = view === homeView ? "" : view;
  return url.href;
}

function syncRoute(name, mode = "push") {
  if (!window.history?.pushState) return;
  const view = normalizeView(name);
  const href = getRouteHref(view);
  const sameRoute = window.history.state?.appRoute && window.history.state?.view === view;
  if (href === window.location.href && (mode !== "replace" || sameRoute)) return;
  window.history[mode === "replace" ? "replaceState" : "pushState"]({ appRoute: true, view }, "", href);
}

function closeApiHelpPanels(exceptKey = "") {
  let closed = false;
  $$(".api-help:not(.hidden)").forEach((panel) => {
    const key = panel.dataset.apiHelpPanel;
    if (key === exceptKey) return;
    panel.classList.add("hidden");
    $(`.api-help-button[data-api-help="${key}"]`)?.setAttribute("aria-expanded", "false");
    closed = true;
  });
  return closed;
}

function hasTransientSurface() {
  const midnightModal = $("#midnightModal");
  const appIntroModal = $("#appIntroModal");
  return isPlayerFullscreen()
    || !!$(".player-more[open]")
    || !!$(".api-help:not(.hidden)")
    || !!(appIntroModal && !appIntroModal.classList.contains("hidden"))
    || !!(midnightModal && !midnightModal.classList.contains("hidden"))
    || (document.body.dataset.view === "editor" && !!$("[data-editor-drawer].active"));
}

function closeTransientSurfaces() {
  let closed = false;
  if (isPlayerFullscreen()) {
    exitPlayerFullscreen();
    closed = true;
  }
  $$(".player-more[open]").forEach((details) => {
    details.open = false;
    closed = true;
  });
  if (closeApiHelpPanels()) closed = true;
  const appIntroModal = $("#appIntroModal");
  if (appIntroModal && !appIntroModal.classList.contains("hidden")) {
    setAppIntroModal(false);
    closed = true;
  }
  const midnightModal = $("#midnightModal");
  if (midnightModal && !midnightModal.classList.contains("hidden")) {
    setMidnightModal(false);
    closed = true;
  }
  if (document.body.dataset.view === "editor" && $("[data-editor-drawer].active")) {
    setEditorPanel("");
    closed = true;
  }
  return closed;
}

function showView(name, options = {}) {
  const viewName = normalizeView(name);
  if (options.updateHistory !== false) syncRoute(viewName, options.historyMode || "push");
  closeTransientSurfaces();
  document.body.dataset.view = viewName;
  $$(".view").forEach((view) => view.classList.toggle("active", view.id === viewName));
  const navView = viewName === "config" || viewName === "history" ? "discover" : viewName;
  $$(".nav-item").forEach((item) => {
    const active = item.dataset.view === navView;
    item.classList.toggle("active", active);
    item.setAttribute("aria-current", active ? "page" : "false");
  });
  const activeView = $(`#${viewName}`);
  requestAnimationFrame(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    activeView?.scrollIntoView({ block: "start" });
  });
  if (viewName === "history") loadHistory();
  if (viewName === "editor") requestAnimationFrame(renderWaveform);
  if (options.announce) showToast(`已切换到${viewLabels[viewName] || "页面"}。`, "ok");
}

function initRouteNavigation() {
  if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";
  const initialView = getViewFromLocation();
  if (initialView === homeView) {
    syncRoute(homeView, "replace");
  } else if (window.history?.pushState) {
    window.history.replaceState({ appRoute: true, view: homeView }, "", getRouteHref(homeView));
    window.history.pushState({ appRoute: true, view: initialView }, "", getRouteHref(initialView));
  }
  showView(initialView, { updateHistory: false });
  window.addEventListener("popstate", () => {
    showView(getViewFromLocation(), { updateHistory: false, announce: true });
  });
  window.addEventListener("hashchange", () => {
    const nextView = getViewFromLocation();
    if (nextView !== document.body.dataset.view) {
      showView(nextView, { updateHistory: false, announce: true });
    }
  });
}

function getCapacitorAppPlugin() {
  return window.Capacitor?.Plugins?.App || window.Capacitor?.App;
}

function getBaizeMediaPlugin() {
  return window.Capacitor?.Plugins?.BaizeMedia || window.BaizeMedia;
}

function nativeMediaSrc(uri) {
  if (!uri) return "";
  return window.Capacitor?.convertFileSrc ? window.Capacitor.convertFileSrc(uri) : uri;
}

function goHomeFromBack() {
  showView(homeView, { historyMode: "replace", announce: true });
}

function performBackNavigation(event = {}) {
  if (closeTransientSurfaces()) return;
  const currentView = normalizeView(document.body.dataset.view);
  if (currentView !== homeView) {
    if (event.canGoBack && window.history.length > 1) {
      window.history.back();
    } else {
      goHomeFromBack();
    }
    return;
  }

  const now = Date.now();
  const app = getCapacitorAppPlugin();
  if (event.allowExit !== false && now - lastHomeBackAt < 1600 && app?.exitApp) {
    app.exitApp();
    return;
  }
  lastHomeBackAt = now;
  showToast("已在首页，再按一次返回退出。");
}

function handleNativeBackButton(event = {}) {
  performBackNavigation({ ...event, allowExit: true });
}

function registerNativeBackHandler() {
  const app = getCapacitorAppPlugin();
  if (!app?.addListener) return;
  app.addListener("backButton", handleNativeBackButton);
}

function isRouteSwipeTarget(target) {
  if (document.body.classList.contains("player-fullscreen-lock")) return true;
  return !target?.closest?.("input, textarea, select, audio, button, a, canvas, [data-editor-drawer], .waveform-wrap, .modal-panel");
}

function handleRouteSwipeStart(event) {
  const touch = event.touches?.[0];
  if (!touch || !isRouteSwipeTarget(event.target)) return;
  routeSwipe = {
    x: touch.clientX,
    y: touch.clientY,
    time: Date.now()
  };
}

function handleRouteSwipeEnd(event) {
  if (!routeSwipe) return;
  const touch = event.changedTouches?.[0];
  const start = routeSwipe;
  routeSwipe = null;
  if (!touch) return;
  const dx = touch.clientX - start.x;
  const dy = Math.abs(touch.clientY - start.y);
  const elapsed = Date.now() - start.time;
  const fromEdge = start.x <= 42;
  if (fromEdge && dx > 72 && dy < 54 && elapsed < 700) {
    if (normalizeView(document.body.dataset.view) === homeView && !hasTransientSurface()) return;
    performBackNavigation({ canGoBack: window.history.length > 1, allowExit: false });
  }
}


function setPlayerBackground(value) {
  const art = $("#playerArt");
  if (!art) return;
  const background = value || defaultPlayerBg;
  art.style.setProperty("--player-bg", `url("${background}")`);
}

function loadPlayerBackground() {
  setPlayerBackground(localStorage.getItem(playerBgKey));
}

function applyMidnightPlayerBackground() {
  localStorage.setItem(playerBgKey, midnightPlayerBg);
  setPlayerBackground(midnightPlayerBg);
}

function readPlayerPlaylist() {
  try {
    const value = JSON.parse(localStorage.getItem(playerPlaylistKey) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function savePlayerPlaylist() {
  localStorage.setItem(playerPlaylistKey, JSON.stringify(playerState.playlist.slice(0, 100)));
}

function getPlayerMediaDb() {
  if (!("indexedDB" in window)) return Promise.reject(new Error("当前环境不支持本地媒体库。"));
  if (playerState.mediaDbPromise) return playerState.mediaDbPromise;
  playerState.mediaDbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open("baize-player-media", 1);
    request.addEventListener("upgradeneeded", () => {
      request.result.createObjectStore("audio");
    });
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error || new Error("媒体库打开失败。")));
  });
  return playerState.mediaDbPromise;
}

async function savePlayerMediaBlob(id, blob) {
  const db = await getPlayerMediaDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("audio", "readwrite");
    tx.objectStore("audio").put(blob, id);
    tx.addEventListener("complete", resolve);
    tx.addEventListener("error", () => reject(tx.error || new Error("音频保存失败。")));
  });
}

async function loadPlayerMediaBlob(id) {
  const db = await getPlayerMediaDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction("audio", "readonly").objectStore("audio").get(id);
    request.addEventListener("success", () => resolve(request.result || null));
    request.addEventListener("error", () => reject(request.error || new Error("音频读取失败。")));
  });
}

async function deletePlayerMediaBlob(id) {
  if (!id) return;
  const db = await getPlayerMediaDb().catch(() => null);
  if (!db) return;
  await new Promise((resolve) => {
    const tx = db.transaction("audio", "readwrite");
    tx.objectStore("audio").delete(id);
    tx.addEventListener("complete", resolve);
    tx.addEventListener("error", resolve);
  });
}

function getImportedFilePath(file) {
  return file?.webkitRelativePath || file?.name || "本机音频";
}

function getImportRootLabel(file) {
  const relativePath = file?.webkitRelativePath || "";
  if (relativePath.includes("/")) return relativePath.split("/")[0];
  return file?.name ? "最近一次文件选择" : "未记录导入位置";
}

function getImportFolderLabel(file) {
  const relativePath = file?.webkitRelativePath || "";
  if (relativePath.includes("/")) return relativePath.split("/").slice(0, -1).join("/");
  return file?.name ? "最近一次文件选择" : "未记录导入位置";
}

function rememberPlayerImportLocation(file, type = "导入", details = {}) {
  const label = getImportFolderLabel(file);
  if (!label) return;
  localStorage.setItem(playerLastImportKey, JSON.stringify({
    label,
    root: getImportRootLabel(file),
    type,
    ...details,
    updatedAt: new Date().toISOString()
  }));
  renderPlayerImportLocation();
}

function renderPlayerImportLocation() {
  const target = $("#playerLastImportLabel");
  if (!target) return;
  const fallback = "尚未记录导入位置";
  try {
    const value = JSON.parse(localStorage.getItem(playerLastImportKey) || "null");
    if (!value?.label) {
      target.textContent = fallback;
      return;
    }
    const countText = value.audioCount !== undefined
      ? `（音频 ${value.audioCount}，歌词 ${value.lyricCount || 0}）`
      : "";
    target.textContent = `上次${value.type || "导入"}：${value.root || value.label} / ${value.label}${countText}`;
  } catch {
    target.textContent = fallback;
  }
}

function readPlaybackDocument() {
  const fallback = {
    version: 1,
    app: "白泽声工坊",
    updatedAt: new Date().toISOString(),
    currentPlaylistId: "",
    playlistOrder: [],
    folders: [],
    tracks: [],
    events: []
  };
  try {
    const parsed = JSON.parse(localStorage.getItem(playerPlaybackDocKey) || "null");
    return parsed && typeof parsed === "object" ? { ...fallback, ...parsed } : fallback;
  } catch {
    return fallback;
  }
}

function savePlaybackDocument(documentValue) {
  localStorage.setItem(playerPlaybackDocKey, JSON.stringify({
    ...documentValue,
    updatedAt: new Date().toISOString(),
    events: (documentValue.events || []).slice(-200),
    tracks: (documentValue.tracks || []).slice(0, 200),
    folders: (documentValue.folders || []).slice(0, 30)
  }));
}

function getTrackDocumentId(item) {
  if (!item) return "";
  return item.blobId || item.src || item.id || item.fileName || item.title;
}

function getCurrentPlaybackItem() {
  return playerState.playlist.find((item) => item.id === playerState.currentPlaylistId) || null;
}

function buildTrackRecord(item, player = $("#mainPlayer")) {
  const existingDoc = readPlaybackDocument();
  const docId = getTrackDocumentId(item);
  const existing = existingDoc.tracks.find((track) => track.docId === docId) || {};
  return {
    ...existing,
    docId,
    playlistId: item.id,
    title: item.title || "未命名音频",
    fileName: item.fileName || "",
    displayPath: item.displayPath || item.src || "",
    sourceType: item.sourceType || "remote",
    blobId: item.blobId || "",
    src: item.sourceType === "remote" ? item.src || "" : "",
    mimeType: item.mimeType || "",
    fileSize: item.fileSize || 0,
    lyricFileName: item.lyricFileName || "",
    hasLyrics: Boolean(item.lyricText || item.lyricFileName),
    duration: Number.isFinite(player?.duration) ? Math.round(player.duration * 1000) / 1000 : existing.duration || 0,
    lastPosition: Number.isFinite(player?.currentTime) ? Math.round(player.currentTime * 1000) / 1000 : existing.lastPosition || 0,
    importedAt: item.createdAt || existing.importedAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function updatePlaybackDocument(updater) {
  const doc = readPlaybackDocument();
  updater(doc);
  savePlaybackDocument(doc);
  renderPlayerImportLocation();
}

function upsertPlaybackTrack(item, patch = {}) {
  if (!item) return;
  updatePlaybackDocument((doc) => {
    const record = { ...buildTrackRecord(item), ...patch, updatedAt: new Date().toISOString() };
    const index = doc.tracks.findIndex((track) => track.docId === record.docId);
    if (index >= 0) doc.tracks[index] = { ...doc.tracks[index], ...record };
    else doc.tracks.unshift(record);
    doc.currentPlaylistId = playerState.currentPlaylistId;
    doc.playlistOrder = playerState.playlist.map((entry) => getTrackDocumentId(entry)).filter(Boolean);
  });
}

function recordPlaybackEvent(type, item = getCurrentPlaybackItem()) {
  if (!item) return;
  const player = $("#mainPlayer");
  updatePlaybackDocument((doc) => {
    const docId = getTrackDocumentId(item);
    let track = doc.tracks.find((entry) => entry.docId === docId);
    if (!track) {
      track = buildTrackRecord(item, player);
      doc.tracks.unshift(track);
    }
    const event = {
      type,
      docId,
      title: item.title || "",
      at: new Date().toISOString(),
      position: Number.isFinite(player?.currentTime) ? Math.round(player.currentTime * 1000) / 1000 : 0,
      duration: Number.isFinite(player?.duration) ? Math.round(player.duration * 1000) / 1000 : 0
    };
    doc.events.push(event);
    if (track) {
      track.lastEvent = type;
      track.lastPlayedAt = event.at;
      track.lastPosition = event.position;
      track.duration = event.duration || track.duration || 0;
      if (type === "play") track.playCount = Number(track.playCount || 0) + 1;
      if (type === "ended") track.completedAt = event.at;
    }
  });
}

function syncCurrentPlaybackRecord(force = false) {
  const now = Date.now();
  if (!force && now - playerState.lastPlaybackSyncAt < 5000) return;
  playerState.lastPlaybackSyncAt = now;
  const item = getCurrentPlaybackItem();
  if (item) upsertPlaybackTrack(item);
}

function recordFolderScan(files, audioCount, lyricCount) {
  const fileList = Array.from(files || []);
  if (!fileList.length) return;
  const first = fileList[0];
  const root = getImportRootLabel(first);
  const label = getImportFolderLabel(first);
  updatePlaybackDocument((doc) => {
    const folder = {
      id: root,
      root,
      label,
      audioCount,
      lyricCount,
      totalFiles: fileList.length,
      updatedAt: new Date().toISOString(),
      files: fileList.slice(0, 500).map((file) => ({
        name: file.name,
        relativePath: file.webkitRelativePath || file.name,
        size: file.size || 0,
        type: isAudioFile(file) ? "audio" : (isLyricFile(file) ? "lyric" : "other"),
        lastModified: file.lastModified || 0
      }))
    };
    doc.folders = [folder, ...doc.folders.filter((entry) => entry.id !== folder.id)].slice(0, 30);
  });
}

function exportPlaybackRecord() {
  syncCurrentPlaybackRecord(true);
  const doc = readPlaybackDocument();
  const blob = new Blob([JSON.stringify(doc, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `白泽声工坊-播放记录-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  showToast("播放记录文档已导出。", "ok");
}

function normalizeMediaBaseName(fileName = "") {
  return String(fileName || "")
    .split(/[\\/]/)
    .pop()
    .replace(/\.[^.]+$/, "")
    .trim()
    .toLowerCase();
}

function normalizeLyricMatchKey(fileName = "") {
  return normalizeMediaBaseName(fileName)
    .replace(/^\s*\d{1,4}\s*[-_.、]\s*/, "")
    .replace(/\s*[\[(（]?\d{1,4}[\])）]?\s*$/, "")
    .replace(/\s*(歌词|lyrics?)$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeLyricLooseKey(fileName = "") {
  return normalizeLyricMatchKey(fileName)
    .replace(/[\s\-_.·・、，,()[\]（）【】《》<>]+/g, "")
    .toLowerCase();
}

function getMediaRelativePath(item = {}) {
  return String(item.relativePath || item.webkitRelativePath || item.name || "").replace(/\\/g, "/");
}

function getMediaRelativeBase(item = {}) {
  return getMediaRelativePath(item)
    .replace(/\.[^.]+$/, "")
    .trim()
    .toLowerCase();
}

function getMediaPathDirectory(item = {}) {
  const path = getMediaRelativePath(item);
  return path.includes("/") ? path.split("/").slice(0, -1).join("/").toLowerCase() : String(item.directory || "").toLowerCase();
}

function addLyricIndexEntry(map, key, record) {
  if (!key) return;
  const list = map.get(key) || [];
  list.push(record);
  map.set(key, list);
}

function buildLyricMatchIndex(lyricItems = []) {
  const index = {
    byRelative: new Map(),
    byName: new Map(),
    byLoose: new Map()
  };
  lyricItems.forEach((item) => {
    const record = {
      ...item,
      name: item.name || "",
      text: item.text || "",
      directory: getMediaPathDirectory(item)
    };
    addLyricIndexEntry(index.byRelative, getMediaRelativeBase(record), record);
    addLyricIndexEntry(index.byName, normalizeLyricMatchKey(record.name), record);
    addLyricIndexEntry(index.byLoose, normalizeLyricLooseKey(record.name), record);
  });
  return index;
}

function pickLyricMatch(candidates = [], audioItem = {}) {
  if (!candidates.length) return null;
  const directory = getMediaPathDirectory(audioItem);
  return candidates.find((entry) => entry.directory && entry.directory === directory) || candidates[0];
}

function findBestLyricMatch(audioItem = {}, lyricIndex = {}) {
  const exactRelative = pickLyricMatch(lyricIndex.byRelative?.get(getMediaRelativeBase(audioItem)) || [], audioItem);
  if (exactRelative) return exactRelative;
  const exactName = pickLyricMatch(lyricIndex.byName?.get(normalizeLyricMatchKey(audioItem.name)) || [], audioItem);
  if (exactName) return exactName;
  const looseKey = normalizeLyricLooseKey(audioItem.name);
  const looseName = pickLyricMatch(lyricIndex.byLoose?.get(looseKey) || [], audioItem);
  if (looseName) return looseName;
  const fuzzy = Array.from(lyricIndex.byLoose?.entries?.() || [])
    .filter(([key]) => key && looseKey && (key.includes(looseKey) || looseKey.includes(key)))
    .flatMap(([, list]) => list);
  return pickLyricMatch(fuzzy, audioItem);
}

function normalizeMediaCollectionKey(name = "") {
  return String(name || "")
    .split(/[\\/]/)
    .pop()
    .replace(/\.[^.]+$/, "")
    .replace(/^\s*\d{1,4}\s*[-_.、]\s*/, "")
    .replace(/\s*[\[(（]?\d{1,4}[\])）]?\s*$/, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function getDownloadsCollectionName(item = {}) {
  const relativePath = String(item.relativePath || "").replace(/\\/g, "/");
  const folderParts = relativePath.split("/").filter(Boolean);
  const appFolderIndex = folderParts.findIndex((part) => part === "白泽声工坊");
  if (appFolderIndex >= 0 && folderParts[appFolderIndex + 1]) return folderParts[appFolderIndex + 1];
  if (folderParts.length > 1) {
    const leafFolder = folderParts[folderParts.length - 2];
    if (leafFolder && !/^download$/i.test(leafFolder)) return leafFolder;
  }
  return normalizeMediaCollectionKey(item.name || "");
}

function buildCollectionCounts(items = [], getName = (item) => item.collectionName || "") {
  return items.reduce((counts, item) => {
    const name = String(getName(item) || "").trim();
    if (name) counts[name] = (counts[name] || 0) + 1;
    return counts;
  }, {});
}

function normalizeMediaRelativeBase(file) {
  return getMediaRelativeBase(file);
}

function getMediaDirectory(file) {
  return getMediaPathDirectory(file);
}

function sortMediaFiles(files) {
  return Array.from(files || []).sort((a, b) =>
    String(a.webkitRelativePath || a.name).localeCompare(String(b.webkitRelativePath || b.name), "zh-Hans-CN", {
      numeric: true,
      sensitivity: "base"
    })
  );
}

function sortMediaRecords(records) {
  return Array.from(records || []).sort((a, b) =>
    String(a.relativePath || a.name).localeCompare(String(b.relativePath || b.name), "zh-Hans-CN", {
      numeric: true,
      sensitivity: "base"
    })
  );
}

function isAudioFile(file) {
  return file?.type?.startsWith("audio/") || /\.(mp3|m4a|aac|wav|flac|ogg|opus)$/i.test(file?.name || "");
}

function isLyricFile(file) {
  return /\.(lrc|krc|txt)$/i.test(file?.name || "") || /^text\//.test(file?.type || "");
}

function recordNativeDownloadScan(audioItems = [], lyricItems = []) {
  updatePlaybackDocument((doc) => {
    const folder = {
      id: "android-downloads",
      root: "Download",
      label: "手机下载文件夹",
      audioCount: audioItems.length,
      lyricCount: lyricItems.length,
      totalFiles: audioItems.length + lyricItems.length,
      updatedAt: new Date().toISOString(),
      files: [...audioItems, ...lyricItems].slice(0, 500).map((item) => ({
        name: item.name,
        relativePath: item.relativePath || item.name,
        size: item.size || 0,
        type: item.text !== undefined ? "lyric" : "audio",
        uri: item.uri || ""
      }))
    };
    doc.folders = [folder, ...doc.folders.filter((entry) => entry.id !== folder.id)].slice(0, 30);
  });
}

async function scanDownloadsToPlaylist() {
  const plugin = getBaizeMediaPlugin();
  if (!plugin?.scanDownloads) {
    $("#playerFolderInput")?.click();
    showToast("当前环境无法直接扫描下载文件夹，请手动选择下载文件夹。", "fail");
    return;
  }
  try {
    setButtonBusy("#scanDownloadsButton", true, "扫描中...");
    const result = await plugin.scanDownloads();
    const audioItems = sortMediaRecords(result.audio || []);
    const lyricItems = sortMediaRecords(result.lyrics || []);
    const lyricIndex = buildLyricMatchIndex(lyricItems);
    const collectionCounts = buildCollectionCounts(audioItems, getDownloadsCollectionName);
    let firstAddedId = "";
    let matchedLyrics = 0;
    audioItems.forEach((item) => {
      const lyric = findBestLyricMatch(item, lyricIndex);
      if (lyric?.text) matchedLyrics += 1;
      const collectionName = getDownloadsCollectionName(item);
      const playlistItem = createPlaylistItem({
        title: item.name.replace(/\.[^.]+$/, ""),
        src: nativeMediaSrc(item.uri),
        sourceType: "native",
        persistent: true,
        lyricText: lyric?.text || "",
        lyricFileName: lyric?.name || "",
        collectionName: collectionCounts[collectionName] > 1 ? collectionName : ""
      });
      playlistItem.fileName = item.name;
      playlistItem.fileSize = item.size || 0;
      playlistItem.mimeType = item.mimeType || "";
      playlistItem.displayPath = `下载 / ${item.relativePath || item.name}`;
      const saved = upsertPlaylistItem(playlistItem);
      if (!firstAddedId) firstAddedId = saved.id;
    });
    saveAndRenderPlayerPlaylist();
    const targetId = playerState.currentPlaylistId || firstAddedId;
    if (targetId) await loadPlaylistItem(targetId, { autoplay: false });
    localStorage.setItem(playerLastImportKey, JSON.stringify({
      label: "手机下载文件夹",
      root: "Download",
      type: "扫描",
      audioCount: audioItems.length,
      lyricCount: lyricItems.length,
      updatedAt: new Date().toISOString()
    }));
    recordNativeDownloadScan(audioItems, lyricItems);
    renderPlayerImportLocation();
    const lyricHint = lyricItems.length ? "" : " 未找到歌词时，可用“导入歌词”手动绑定当前歌曲。";
    showToast(`下载文件夹扫描完成：${audioItems.length} 个音频，${lyricItems.length} 个歌词，已关联 ${matchedLyrics} 首。${lyricHint}`, lyricItems.length || !audioItems.length ? "ok" : "fail");
  } catch (error) {
    showToast(`扫描失败：${error.message || error}`, "fail");
    $("#playerFolderInput")?.click();
  } finally {
    setButtonBusy("#scanDownloadsButton", false);
  }
}

function createPlaylistItem({ title, src, file, sourceType = "remote", blobId = "", persistent = true, lyricText = "", lyricFileName = "", collectionName = "" }) {
  const id = `audio-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return {
    id,
    title: title || file?.name?.replace(/\.[^.]+$/, "") || "未命名音频",
    src: src || "",
    blobId,
    sourceType,
    persistent,
    fileName: file?.name || "",
    fileSize: file?.size || 0,
    mimeType: file?.type || "",
    displayPath: file ? `本机导入 / ${getImportedFilePath(file)}` : (src || "临时音频"),
    lyricText,
    lyricFileName,
    collectionName,
    createdAt: new Date().toISOString()
  };
}

function upsertPlaylistItem(item) {
  if (!item?.id) return item;
  const sameIndex = playerState.playlist.findIndex((existing) =>
    (item.src && existing.src === item.src)
    || (item.blobId && existing.blobId === item.blobId)
    || (item.displayPath && existing.displayPath === item.displayPath && existing.fileSize === item.fileSize)
    || (item.fileName && existing.fileName === item.fileName && existing.fileSize === item.fileSize)
  );
  if (sameIndex >= 0) {
    playerState.playlist[sameIndex] = { ...playerState.playlist[sameIndex], ...item, id: playerState.playlist[sameIndex].id };
    return playerState.playlist[sameIndex];
  }
  playerState.playlist.unshift(item);
  playerState.playlist = playerState.playlist.slice(0, 100);
  return item;
}

function updatePlayerPathLabel(item = null) {
  const pathLabel = $("#playerPathLabel");
  if (pathLabel) pathLabel.textContent = item?.displayPath || t("pathEmpty");
  const lyricLabel = $("#lyricModeLabel");
  if (lyricLabel) lyricLabel.textContent = playerState.lyricFormatLabel || t("lyricEmpty");
}

function resetPlayerLyrics() {
  playerState.lyrics = [];
  playerState.lyricFileName = "";
  playerState.lyricMode = "none";
  playerState.lyricFormatLabel = "";
  playerState.activeLyricIndex = -1;
  playerState.activeWordIndex = -1;
  playerState.lastLyricScrollIndex = -1;
  renderLyrics();
}

function renderPlayerPlaylist() {
  const list = $("#playerPlaylist");
  if (!list) return;
  if (!playerState.playlist.length) {
    list.innerHTML = `<p class="playlist-empty">${escapeHtml(t("playlistEmpty"))}</p>`;
    updatePlayerPathLabel();
    return;
  }
  const groupCounts = playerState.playlist.reduce((counts, item) => {
    const key = item.collectionName || "";
    if (key) counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
  const renderedGroups = new Set();
  const renderItem = (item) => `
    <article class="playlist-item${item.id === playerState.currentPlaylistId ? " active" : ""}" data-playlist-id="${item.id}">
      <button class="playlist-play" data-playlist-action="play">
        <strong>${escapeHtml(item.title)}</strong>
        <span>${escapeHtml(item.displayPath || item.src || "音频")}</span>
      </button>
      <button class="playlist-remove" data-playlist-action="remove" aria-label="移除 ${escapeHtml(item.title)}">移除</button>
    </article>
  `;
  list.innerHTML = playerState.playlist.map((item) => {
    const group = item.collectionName || "";
    if (!group || groupCounts[group] < 2) return renderItem(item);
    if (renderedGroups.has(group)) return "";
    renderedGroups.add(group);
    const children = playerState.playlist.filter((entry) => entry.collectionName === group);
    const active = children.some((entry) => entry.id === playerState.currentPlaylistId);
    return `
      <details class="playlist-group" ${active ? "open" : ""}>
        <summary>${escapeHtml(group)} <span>${children.length} 段</span></summary>
        ${children.map(renderItem).join("")}
      </details>
    `;
  }).join("");
  updatePlayerPathLabel(playerState.playlist.find((item) => item.id === playerState.currentPlaylistId));
}

function loadPlayerPlaylist() {
  playerState.playlist = readPlayerPlaylist();
  renderPlayerPlaylist();
  playerState.playlist.forEach((item) => upsertPlaybackTrack(item));
}

function saveAndRenderPlayerPlaylist() {
  savePlayerPlaylist();
  renderPlayerPlaylist();
}

async function resolvePlaylistSrc(item) {
  if (!item) return "";
  if (item.sourceType === "local" && item.blobId) {
    const blob = await loadPlayerMediaBlob(item.blobId);
    if (!blob) throw new Error("本机音频缓存不存在，请重新导入。");
    if (playerState.objectUrl?.startsWith("blob:")) URL.revokeObjectURL(playerState.objectUrl);
    playerState.objectUrl = URL.createObjectURL(blob);
    return playerState.objectUrl;
  }
  return item.src;
}

async function loadPlaylistItem(id, { autoplay = false } = {}) {
  const item = playerState.playlist.find((entry) => entry.id === id);
  if (!item) return;
  try {
    const src = await resolvePlaylistSrc(item);
    playInApp(src, item.title, { playlistItem: item, addToPlaylist: false, autoplay });
  } catch (error) {
    showToast(error.message, "fail");
  }
}

async function playPlaylistItem(id) {
  await loadPlaylistItem(id, { autoplay: true });
}

function playNextPlaylistItem() {
  if (!playerState.playlist.length || !playerState.currentPlaylistId) return;
  const index = playerState.playlist.findIndex((item) => item.id === playerState.currentPlaylistId);
  if (index < 0) return;
  if (index >= playerState.playlist.length - 1) {
    if (playerState.loopMode === "list") playPlaylistItem(playerState.playlist[0].id);
    return;
  }
  playPlaylistItem(playerState.playlist[index + 1].id);
}

function playPreviousPlaylistItem() {
  const player = $("#mainPlayer");
  if (player?.currentTime > 3) {
    player.currentTime = 0;
    syncLyrics(0);
    syncPlayerControls();
    return;
  }
  if (!playerState.playlist.length || !playerState.currentPlaylistId) return;
  const index = playerState.playlist.findIndex((item) => item.id === playerState.currentPlaylistId);
  if (index > 0) playPlaylistItem(playerState.playlist[index - 1].id);
  else if (index === 0 && playerState.loopMode === "list") playPlaylistItem(playerState.playlist[playerState.playlist.length - 1].id);
}

async function removePlaylistItem(id) {
  const item = playerState.playlist.find((entry) => entry.id === id);
  playerState.playlist = playerState.playlist.filter((entry) => entry.id !== id);
  if (playerState.currentPlaylistId === id) {
    playerState.currentPlaylistId = "";
    const player = $("#mainPlayer");
    if (player) {
      playerState.userPaused = true;
      playerState.expectedPlaying = false;
      clearTimeout(playerState.interruptionResumeTimer);
      player.pause();
      player.removeAttribute("src");
      player.load();
    }
    $("#playerTitle").textContent = "选择一段广播剧开始收听";
    resetPlayerLyrics();
    updatePlayerPathLabel();
    syncPlayerControls();
  }
  saveAndRenderPlayerPlaylist();
  updatePlaybackDocument((doc) => {
    doc.currentPlaylistId = playerState.currentPlaylistId;
    doc.playlistOrder = playerState.playlist.map((entry) => getTrackDocumentId(entry)).filter(Boolean);
  });
  if (item?.sourceType === "local") await deletePlayerMediaBlob(item.blobId);
}

async function clearPlayerPlaylist() {
  if (playerState.playlist.length && !window.confirm("确定清空播放列表吗？本地缓存音频也会一并移除。")) return;
  const localBlobIds = playerState.playlist
    .filter((item) => item.sourceType === "local" && item.blobId)
    .map((item) => item.blobId);
  playerState.playlist = [];
  playerState.currentPlaylistId = "";
  const player = $("#mainPlayer");
  if (player) {
    playerState.userPaused = true;
    playerState.expectedPlaying = false;
    clearTimeout(playerState.interruptionResumeTimer);
    player.pause();
    player.removeAttribute("src");
    player.load();
  }
  $("#playerTitle").textContent = "选择一段广播剧开始收听";
  resetPlayerLyrics();
  saveAndRenderPlayerPlaylist();
  updatePlaybackDocument((doc) => {
    doc.currentPlaylistId = "";
    doc.playlistOrder = [];
  });
  syncPlayerControls();
  await Promise.all(localBlobIds.map((id) => deletePlayerMediaBlob(id)));
  showToast("播放列表已清空。", "ok");
}

function formatLyricTime(seconds) {
  const safe = Math.max(0, Number(seconds) || 0);
  const minute = Math.floor(safe / 60);
  const second = Math.floor(safe % 60);
  return `${minute}:${String(second).padStart(2, "0")}`;
}

function syncPlayerControls() {
  const player = $("#mainPlayer");
  if (!player) return;
  const duration = Number.isFinite(player.duration) ? player.duration : 0;
  const currentTime = Number.isFinite(player.currentTime) ? player.currentTime : 0;
  const seek = $("#playerSeek");
  const playPause = $("#playerPlayPause");
  const currentLabel = $("#playerCurrentTime");
  const durationLabel = $("#playerDuration");
  const hasSource = Boolean(player.currentSrc || player.src);
  if (currentLabel) currentLabel.textContent = formatLyricTime(currentTime);
  if (durationLabel) durationLabel.textContent = duration ? formatLyricTime(duration) : "0:00";
  if (seek) {
    seek.max = String(Math.max(1, duration || 1));
    if (!playerState.seeking) seek.value = String(Math.min(currentTime, Number(seek.max) || 1));
    seek.disabled = !hasSource;
  }
  if (playPause) {
    playPause.textContent = player.paused ? t("play") : t("pause");
    playPause.disabled = !hasSource && !playerState.playlist.length;
  }
  const index = playerState.playlist.findIndex((item) => item.id === playerState.currentPlaylistId);
  const hasPlaylist = playerState.playlist.length > 0;
  const prev = $("#playerPrev");
  const next = $("#playerNext");
  const listLoop = playerState.loopMode === "list";
  if (prev) prev.disabled = !hasPlaylist || (index <= 0 && !listLoop);
  if (next) next.disabled = !hasPlaylist || index < 0 || (index >= playerState.playlist.length - 1 && !listLoop);
  renderPlayerLoopRateUi();
  updateMediaSessionState();
}

function isPlayerActivelyPlaying(player = $("#mainPlayer")) {
  return Boolean(player && !player.paused && !player.ended && (player.currentSrc || player.src));
}

function clampPlayerTime(player, time) {
  const rawTime = Number(time) || 0;
  const duration = Number.isFinite(player?.duration) ? player.duration : rawTime;
  return Math.max(0, Math.min(duration || rawTime, rawTime));
}

function beginPlayerSeek() {
  const player = $("#mainPlayer");
  if (!player || !(player.currentSrc || player.src)) return;
  playerState.seeking = true;
  playerState.pendingSeekTime = Number.isFinite(player.currentTime) ? player.currentTime : 0;
  playerState.seekWasPlaying = isPlayerActivelyPlaying(player) || playerState.expectedPlaying;
  clearTimeout(playerState.seekResumeTimer);
  if (playerState.seekWasPlaying) {
    playerState.userPaused = false;
    playerState.expectedPlaying = true;
  }
}

function setPlayerSeekTime(time) {
  const player = $("#mainPlayer");
  if (!player || !(player.currentSrc || player.src)) return;
  const nextTime = clampPlayerTime(player, time);
  playerState.pendingSeekTime = nextTime;
  player.currentTime = nextTime;
  syncLyrics(nextTime);
  syncPlayerControls();
}

function previewPlayerSeekTime(time) {
  const player = $("#mainPlayer");
  if (!player || !(player.currentSrc || player.src)) return;
  const nextTime = clampPlayerTime(player, time);
  playerState.pendingSeekTime = nextTime;
  const seek = $("#playerSeek");
  if (seek) seek.value = String(nextTime);
  const currentLabel = $("#playerCurrentTime");
  if (currentLabel) currentLabel.textContent = formatLyricTime(nextTime);
  syncLyrics(nextTime);
}

function finishPlayerSeek(reason = "seek") {
  const player = $("#mainPlayer");
  if (!player) return;
  const shouldResume = playerState.seekWasPlaying;
  if (playerState.seeking) setPlayerSeekTime(playerState.pendingSeekTime);
  playerState.seeking = false;
  playerState.seekWasPlaying = false;
  clearTimeout(playerState.seekResumeTimer);
  syncPlayerControls();
  syncCurrentPlaybackRecord(true);
  if (shouldResume && (player.currentSrc || player.src)) {
    playerState.seekResumeTimer = window.setTimeout(() => resumeMainPlayer(reason), 100);
  }
}

function readPlayerLoopMode() {
  const value = localStorage.getItem(playerLoopModeKey);
  return ["none", "single", "list"].includes(value) ? value : "none";
}

function readPlayerRate() {
  const value = Number(localStorage.getItem(playerRateKey) || 1);
  return [0.75, 1, 1.25, 1.5, 2].includes(value) ? value : 1;
}

function renderPlayerLoopRateUi() {
  const loopButton = $("#playerLoopMode");
  if (loopButton) {
    const labels = { none: t("loopNone"), single: t("loopSingle"), list: t("loopList") };
    loopButton.textContent = labels[playerState.loopMode] || "顺序";
    loopButton.classList.toggle("active", playerState.loopMode !== "none");
  }
  const rate = $("#playerRate");
  if (rate && String(rate.value) !== String(playerState.playbackRate)) rate.value = String(playerState.playbackRate);
}

function applyPlayerPlaybackSettings() {
  playerState.loopMode = readPlayerLoopMode();
  playerState.playbackRate = readPlayerRate();
  const player = $("#mainPlayer");
  if (player) player.playbackRate = playerState.playbackRate;
  renderPlayerLoopRateUi();
}

function togglePlayerLoopMode() {
  const next = playerState.loopMode === "none" ? "single" : (playerState.loopMode === "single" ? "list" : "none");
  playerState.loopMode = next;
  localStorage.setItem(playerLoopModeKey, next);
  renderPlayerLoopRateUi();
  showToast(`播放模式：${$("#playerLoopMode")?.textContent || "顺序"}`, "ok");
}

function setPlayerPlaybackRate(value) {
  const rate = Number(value) || 1;
  playerState.playbackRate = rate;
  localStorage.setItem(playerRateKey, String(rate));
  const player = $("#mainPlayer");
  if (player) player.playbackRate = rate;
  updateMediaSessionState();
  showToast(`播放速度：${rate}x`, "ok");
}

function isAudioGuardEnabled() {
  return localStorage.getItem(playerAudioGuardKey) !== "off";
}

function renderAudioGuardUi() {
  const button = $("#toggleAudioGuard");
  if (button) button.textContent = isAudioGuardEnabled() ? t("autoResumeOn") : t("autoResumeOff");
}

function toggleAudioGuard() {
  const enabled = !isAudioGuardEnabled();
  localStorage.setItem(playerAudioGuardKey, enabled ? "on" : "off");
  renderAudioGuardUi();
  showToast(enabled ? "已开启自动续播，音频被短暂打断后会尝试恢复。" : "已关闭自动续播。", "ok");
}

function updateMediaSessionMetadata(item = getCurrentPlaybackItem()) {
  if (!("mediaSession" in navigator)) return;
  try {
    if (window.MediaMetadata) navigator.mediaSession.metadata = new MediaMetadata({
      title: item?.title || $("#playerTitle")?.textContent?.trim() || "白泽声工坊",
      artist: "白泽声工坊",
      album: item?.lyricFileName ? `歌词：${item.lyricFileName}` : "本地播放"
    });
    navigator.mediaSession.setActionHandler("play", () => resumeMainPlayer("media-session"));
    navigator.mediaSession.setActionHandler("pause", () => pauseMainPlayerByUser());
    navigator.mediaSession.setActionHandler("previoustrack", playPreviousPlaylistItem);
    navigator.mediaSession.setActionHandler("nexttrack", playNextPlaylistItem);
    navigator.mediaSession.setActionHandler("seekto", (details) => {
      if (!Number.isFinite(details.seekTime)) return;
      beginPlayerSeek();
      setPlayerSeekTime(details.seekTime);
      finishPlayerSeek("media-seek");
    });
  } catch {
    // Some WebView builds expose Media Session partially.
  }
}

function updateMediaSessionState() {
  if (!("mediaSession" in navigator)) return;
  const player = $("#mainPlayer");
  try {
    navigator.mediaSession.playbackState = player && !player.paused ? "playing" : "paused";
    if (navigator.mediaSession.setPositionState && player && Number.isFinite(player.duration)) {
      navigator.mediaSession.setPositionState({
        duration: Math.max(0, player.duration || 0),
        playbackRate: player.playbackRate || 1,
        position: Math.max(0, Math.min(player.currentTime || 0, player.duration || 0))
      });
    }
  } catch {
    // Ignore incomplete WebView Media Session support.
  }
}

async function resumeMainPlayer(reason = "manual") {
  const player = $("#mainPlayer");
  if (!player) return;
  if (!(player.currentSrc || player.src)) {
    const firstId = playerState.currentPlaylistId || playerState.playlist[0]?.id;
    if (firstId) await playPlaylistItem(firstId);
    else showToast("请先导入音频。", "fail");
    syncPlayerControls();
    return;
  }
  playerState.userPaused = false;
  playerState.expectedPlaying = true;
  await player.play()
    .then(() => {
      playerState.interruptionResumeAttempts = 0;
      if (reason !== "manual") $("#bluetoothStatus").textContent = "播放已恢复。";
    })
    .catch(() => {
      playerState.expectedPlaying = false;
      showToast("播放失败，请重新选择音频。", "fail");
    });
  syncPlayerControls();
}

function pauseMainPlayerByUser() {
  const player = $("#mainPlayer");
  if (!player) return;
  playerState.userPaused = true;
  playerState.expectedPlaying = false;
  clearTimeout(playerState.interruptionResumeTimer);
  player.pause();
  syncPlayerControls();
}

async function togglePlayerPlayback() {
  const player = $("#mainPlayer");
  if (!player) return;
  if (!(player.currentSrc || player.src)) {
    const firstId = playerState.currentPlaylistId || playerState.playlist[0]?.id;
    if (firstId) await playPlaylistItem(firstId);
    else showToast("请先导入音频。", "fail");
    syncPlayerControls();
    return;
  }
  if (player.paused) {
    await resumeMainPlayer("manual");
  } else {
    pauseMainPlayerByUser();
  }
  syncPlayerControls();
}

function shouldAutoResumeInterruptedPlayback(player = $("#mainPlayer")) {
  return isAudioGuardEnabled()
    && player
    && !player.ended
    && playerState.expectedPlaying
    && !playerState.userPaused
    && Boolean(player.currentSrc || player.src);
}

function scheduleInterruptedResume(reason = "interrupted", delay = 1200) {
  const player = $("#mainPlayer");
  if (!shouldAutoResumeInterruptedPlayback(player)) return;
  clearTimeout(playerState.interruptionResumeTimer);
  if (playerState.interruptionResumeAttempts >= 3) {
    $("#bluetoothStatus").textContent = "播放被系统或其他应用暂停，已停止自动重试，可手动点播放继续。";
    return;
  }
  playerState.interruptionResumeAttempts += 1;
  $("#bluetoothStatus").textContent = "播放被系统或其他应用短暂打断，正在尝试自动续播。";
  playerState.interruptionResumeTimer = window.setTimeout(() => {
    if (shouldAutoResumeInterruptedPlayback(player)) resumeMainPlayer(reason);
  }, delay);
}

function handlePlayerPauseEvent() {
  syncPlayerControls();
  recordPlaybackEvent("pause");
  if (playerState.seeking) return;
  scheduleInterruptedResume("audio-focus");
}

function handlePlayerPlayEvent() {
  playerState.userPaused = false;
  playerState.expectedPlaying = true;
  playerState.interruptionResumeAttempts = 0;
  syncPlayerControls();
  recordPlaybackEvent("play");
}

function handlePlayerEndedEvent() {
  playerState.expectedPlaying = false;
  playerState.userPaused = true;
  clearTimeout(playerState.interruptionResumeTimer);
  recordPlaybackEvent("ended");
  if (playerState.loopMode === "single") {
    const player = $("#mainPlayer");
    if (player) {
      player.currentTime = 0;
      resumeMainPlayer("loop");
    }
    return;
  }
  playNextPlaylistItem();
}

function handleAppAudioResumeSignal() {
  if (document.visibilityState === "hidden") return;
  scheduleInterruptedResume("app-resume", 300);
}

function registerPlaybackInterruptionHandlers() {
  document.addEventListener("visibilitychange", handleAppAudioResumeSignal);
  window.addEventListener("focus", handleAppAudioResumeSignal);
  const app = getCapacitorAppPlugin();
  app?.addListener?.("appStateChange", ({ isActive }) => {
    if (isActive) handleAppAudioResumeSignal();
  });
}

function parseLyricTime(raw) {
  const match = String(raw || "").match(/(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?/);
  if (!match) return null;
  const fraction = match[3] ? Number(`0.${match[3].padEnd(3, "0").slice(0, 3)}`) : 0;
  return Number(match[1]) * 60 + Number(match[2]) + fraction;
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[char]);
}

function renderLyricToken(value) {
  const escaped = escapeHtml(value);
  return escaped === " " ? "&nbsp;" : escaped;
}

function normalizeLyricText(text) {
  return String(text || "")
    .replace(/<\d{1,3}:\d{1,2}(?:[.:]\d{1,3})?>/g, "")
    .replace(/<\d+,\d+(?:,\d+)?>/g, "")
    .replace(/\[\d+,\d+\]/g, "")
    .replace(/\{[^}]+\}/g, "")
    .trim();
}

function expandTimedText(text, start, end) {
  const chars = Array.from(String(text || ""));
  if (!chars.length) return [];
  const safeStart = Number(start) || 0;
  const safeEnd = Math.max(safeStart + 0.08, Number(end) || safeStart + chars.length * 0.18);
  const step = (safeEnd - safeStart) / chars.length;
  return chars.map((char, index) => ({
    text: char,
    start: safeStart + step * index,
    end: safeStart + step * (index + 1)
  }));
}

function parseKrcWordSegments(text, lineStart = 0) {
  const matches = Array.from(String(text || "").matchAll(/<(\d+),(\d+)(?:,\d+)?>/g));
  if (!matches.length) return [];
  return matches.flatMap((match, index) => {
    const next = matches[index + 1];
    const rawText = String(text).slice(match.index + match[0].length, next?.index ?? String(text).length);
    const cleanedText = normalizeLyricText(rawText);
    if (!cleanedText) return [];
    const start = lineStart + Number(match[1]) / 1000;
    const end = start + Number(match[2]) / 1000;
    return expandTimedText(cleanedText, start, end);
  });
}

function parseEnhancedLrcWordSegments(text) {
  const matches = Array.from(String(text || "").matchAll(/<(\d{1,3}:\d{1,2}(?:[.:]\d{1,3})?)>/g));
  if (!matches.length) return [];
  const raw = String(text || "");
  return matches.flatMap((match, index) => {
    const next = matches[index + 1];
    const rawText = raw.slice(match.index + match[0].length, next?.index ?? raw.length);
    const cleanedText = normalizeLyricText(rawText);
    if (!cleanedText) return [];
    const start = parseLyricTime(match[1]);
    const end = next ? parseLyricTime(next[1]) : null;
    if (start === null) return [];
    return expandTimedText(cleanedText, start, end ?? start + Array.from(cleanedText).length * 0.22);
  });
}

function buildFallbackWordSegments(text, start, end) {
  return expandTimedText(text, start, end);
}

function hasCjkText(text) {
  return /[\u3400-\u9fff]/.test(String(text || ""));
}

function hasLatinText(text) {
  return /[a-z]/i.test(String(text || ""));
}

function isEnglishTranslationPair(primary, secondary) {
  const primaryText = primary?.text || "";
  const secondaryText = secondary?.text || "";
  return (hasLatinText(primaryText) && hasCjkText(secondaryText))
    || (hasCjkText(primaryText) && hasLatinText(secondaryText));
}

function mergeBilingualLyricRows(rows) {
  const merged = [];
  let bilingualCount = 0;
  for (let index = 0; index < rows.length; index += 1) {
    const group = [rows[index]];
    while (
      rows[index + 1]
      && Math.abs(Number(rows[index + 1].time) - Number(group[0].time)) < 0.04
    ) {
      group.push(rows[index + 1]);
      index += 1;
    }
    if (group.length < 2) {
      merged.push(group[0]);
      continue;
    }
    const latin = group.find((line) => hasLatinText(line.text) && !hasCjkText(line.text));
    const cjk = group.find((line) => hasCjkText(line.text));
    if (latin && cjk && isEnglishTranslationPair(latin, cjk)) {
      const translation = group
        .filter((line) => line !== latin)
        .map((line) => line.text)
        .join(" / ");
      merged.push({ ...latin, translation, bilingual: true });
      bilingualCount += 1;
      continue;
    }
    const [first, ...rest] = group;
    merged.push({ ...first, translation: rest.map((line) => line.text).join(" / "), bilingual: true });
    bilingualCount += 1;
  }
  return { rows: merged, bilingualCount };
}

function finalizeLyrics(rows) {
  const sorted = rows
    .filter((line) => line && Number.isFinite(line.time) && line.text)
    .sort((a, b) => a.time - b.time);
  const mergedLyrics = mergeBilingualLyricRows(sorted);
  const merged = mergedLyrics.rows;

  merged.forEach((line, index) => {
    const nextLine = merged[index + 1];
    const textLength = Math.max(1, Array.from(line.text).length);
    const fallbackEnd = line.time + Math.min(10, Math.max(2, textLength * 0.28));
    const timedEnd = line.lineDuration ? line.time + line.lineDuration : fallbackEnd;
    const nextEnd = nextLine ? nextLine.time - 0.04 : timedEnd;
    line.end = Math.max(line.time + 0.35, Math.min(timedEnd, nextEnd || timedEnd));

    if (!line.words?.length) {
      line.words = line.mode === "word" ? buildFallbackWordSegments(line.text, line.time, line.end) : [];
    } else {
      line.mode = "word";
      line.words = line.words
        .filter((word) => word.text)
        .map((word, wordIndex, list) => {
          const start = Math.max(line.time, Number(word.start) || line.time);
          const nextWord = list[wordIndex + 1];
          const end = Math.max(start + 0.05, Number(word.end) || nextWord?.start || line.end);
          return { ...word, start, end };
        });
    }
  });

  merged.bilingualCount = mergedLyrics.bilingualCount;
  return merged;
}

function detectLyricFormat(rawText, fileName = "") {
  const raw = String(rawText || "");
  const lowerName = String(fileName || "").toLowerCase();
  const hasKrcLine = /\[\d+,\d+\]/.test(raw);
  const hasKrcWord = /<\d+,\d+(?:,\d+)?>/.test(raw);
  const hasEnhancedLrc = /<\d{1,3}:\d{1,2}(?:[.:]\d{1,3})?>/.test(raw);
  const hasLrcLine = /\[\d{1,3}:\d{1,2}(?:[.:]\d{1,3})?\]/.test(raw);
  if (hasKrcLine || hasKrcWord || lowerName.endsWith(".krc")) {
    return {
      type: "krc",
      mode: hasKrcWord ? "word" : "line",
      label: hasKrcWord ? "KRC 逐字歌词" : "KRC 逐行歌词"
    };
  }
  if (hasEnhancedLrc) {
    return { type: "enhanced-lrc", mode: "word", label: "增强 LRC 逐字歌词" };
  }
  if (hasLrcLine || lowerName.endsWith(".lrc")) {
    return { type: "lrc", mode: "line", label: "LRC 逐行歌词" };
  }
  return { type: "plain", mode: "line", label: "普通文本歌词" };
}

function parseLyrics(rawText, fileName = "") {
  const rows = [];
  const format = detectLyricFormat(rawText, fileName);
  let explicitWordRows = 0;
  String(rawText || "").split(/\r?\n/).forEach((line) => {
    const lrcTags = Array.from(line.matchAll(/\[(\d{1,3}:\d{1,2}(?:[.:]\d{1,3})?)\]/g));
    const krcTag = line.match(/\[(\d+),(\d+)\]/);
    const body = line.replace(/\[[^\]]+\]/g, "");
    const krcStart = krcTag ? Number(krcTag[1]) / 1000 : null;
    const krcDuration = krcTag ? Number(krcTag[2]) / 1000 : null;
    const krcWords = krcStart !== null ? parseKrcWordSegments(body, krcStart) : [];
    const enhancedWords = krcWords.length ? [] : parseEnhancedLrcWordSegments(body);
    const words = krcWords.length ? krcWords : enhancedWords;
    const text = words.length ? words.map((word) => word.text).join("").trim() : normalizeLyricText(body);
    if (!text) return;
    if (words.length) explicitWordRows += 1;

    if (krcStart !== null) {
      rows.push({ time: krcStart, text, words, lineDuration: krcDuration, mode: words.length ? "word" : "line" });
      return;
    }

    if (words.length) {
      const time = lrcTags.length ? parseLyricTime(lrcTags[0][1]) : words[0].start;
      if (time !== null) rows.push({ time, text, words, mode: "word" });
      return;
    }

    lrcTags.forEach((tag) => {
      const time = parseLyricTime(tag[1]);
      if (time !== null) rows.push({ time, text, words: [], mode: "line" });
    });
  });
  const lines = finalizeLyrics(rows);
  const mode = explicitWordRows ? "word" : "line";
  const label = lines.bilingualCount
    ? `${format.type === "lrc" ? "双语 LRC" : format.label}（英文/翻译）`
    : (explicitWordRows ? format.label.replace("逐行", "逐字") : format.label);
  return { lines, mode, label, type: format.type };
}

function renderLyrics() {
  const panel = $("#lyricPanel");
  if (!panel) return;
  if (!playerState.lyrics.length) {
    panel.innerHTML = `<p id="lyricCurrent">导入 LRC / KRC 歌词后，这里会跟随音频逐字亮起。</p>`;
    updatePlayerPathLabel(playerState.playlist.find((item) => item.id === playerState.currentPlaylistId));
    return;
  }
  panel.innerHTML = playerState.lyrics
    .map((line, index) => {
      const words = line.mode === "word" && line.words?.length
        ? line.words
          .map((word, wordIndex) => `<span class="lyric-word${word.text === " " ? " lyric-space" : ""}" data-lyric-word="${wordIndex}" style="--word-fill: 0%">${renderLyricToken(word.text)}</span>`)
          .join("")
        : `<span class="lyric-line-fill" style="--line-fill: 0%">${escapeHtml(line.text)}</span>`;
      const translation = line.translation
        ? `<span class="lyric-translation">${escapeHtml(line.translation)}</span>`
        : "";
      return `<p class="${line.translation ? "bilingual" : ""}" data-lyric-index="${index}"><span class="lyric-time">${formatLyricTime(line.time)}</span><span class="lyric-text">${words}${translation}</span></p>`;
    })
    .join("");
  updatePlayerPathLabel(playerState.playlist.find((item) => item.id === playerState.currentPlaylistId));
}

function applyLyricText(rawText, fileName = "") {
  const parsed = parseLyrics(rawText, fileName);
  playerState.lyrics = parsed.lines;
  playerState.lyricFileName = fileName;
  playerState.lyricMode = parsed.mode;
  playerState.lyricFormatLabel = parsed.lines.length ? parsed.label : "歌词未识别";
  playerState.activeLyricIndex = -1;
  playerState.activeWordIndex = -1;
  playerState.lastLyricScrollIndex = -1;
  renderLyrics();
  return parsed;
}

function attachLyricsToCurrentItem(rawText, fileName = "") {
  if (!playerState.currentPlaylistId || !rawText) return;
  const item = playerState.playlist.find((entry) => entry.id === playerState.currentPlaylistId);
  if (!item) return;
  item.lyricText = rawText;
  item.lyricFileName = fileName;
  saveAndRenderPlayerPlaylist();
  upsertPlaybackTrack(item, { hasLyrics: true, lyricFileName: fileName });
}

function getActiveWordIndex(line, currentTime) {
  if (!line?.words?.length) return -1;
  let activeWordIndex = -1;
  line.words.forEach((word, index) => {
    if (currentTime >= word.start - 0.03) activeWordIndex = index;
  });
  return activeWordIndex;
}

function updateLyricWordFill(lineElement, line, currentTime) {
  const wordElements = Array.from(lineElement.querySelectorAll("[data-lyric-word]"));
  const lineFill = lineElement.querySelector(".lyric-line-fill");
  if (lineFill) {
    const duration = Math.max(0.35, line.end - line.time);
    const progress = Math.max(0, Math.min(1, (currentTime - line.time) / duration));
    lineFill.style.setProperty("--line-fill", `${Math.round(progress * 100)}%`);
  }
  wordElements.forEach((element, index) => {
    const word = line.words[index];
    if (!word) return;
    const duration = Math.max(0.05, word.end - word.start);
    const progress = Math.max(0, Math.min(1, (currentTime - word.start) / duration));
    element.style.setProperty("--word-fill", `${Math.round(progress * 100)}%`);
    element.classList.toggle("played", progress >= 1);
    element.classList.toggle("current", progress > 0 && progress < 1);
  });
}

function scrollActiveLyric(lineElement) {
  const panel = $("#lyricPanel");
  if (!panel || !lineElement) return;
  cancelAnimationFrame(playerState.lyricScrollFrame);
  playerState.lyricScrollFrame = requestAnimationFrame(() => {
    const panelRect = panel.getBoundingClientRect();
    const lineRect = lineElement.getBoundingClientRect();
    const safeZone = Math.min(72, panel.clientHeight * 0.24);
    const alreadyComfortable = lineRect.top >= panelRect.top + safeZone
      && lineRect.bottom <= panelRect.bottom - safeZone;
    if (alreadyComfortable) return;
    const targetTop = panel.scrollTop
      + (lineRect.top - panelRect.top)
      - ((panel.clientHeight - lineRect.height) / 2);
    const maxTop = Math.max(0, panel.scrollHeight - panel.clientHeight);
    panel.scrollTo({
      top: Math.max(0, Math.min(maxTop, targetTop)),
      behavior: "smooth"
    });
  });
}

function syncLyrics(currentTime = 0) {
  if (!playerState.lyrics.length) return;
  let activeIndex = 0;
  for (let index = 0; index < playerState.lyrics.length; index += 1) {
    if (playerState.lyrics[index].time <= currentTime + 0.15) activeIndex = index;
    else break;
  }
  const activeWordIndex = getActiveWordIndex(playerState.lyrics[activeIndex], currentTime);
  const lyricChanged = activeIndex !== playerState.activeLyricIndex;
  playerState.activeLyricIndex = activeIndex;
  playerState.activeWordIndex = activeWordIndex;
  $$("[data-lyric-index]").forEach((line) => {
    const lineIndex = Number(line.dataset.lyricIndex);
    const active = lineIndex === activeIndex;
    const lyricLine = playerState.lyrics[lineIndex];
    line.classList.toggle("active", active);
    updateLyricWordFill(line, lyricLine, active ? currentTime : (lineIndex < activeIndex ? Number.POSITIVE_INFINITY : 0));
    if (active && lyricChanged) {
      playerState.lastLyricScrollIndex = activeIndex;
      scrollActiveLyric(line);
    }
  });
}

async function importPlayerAudio(file, { play = false, select = false, lyricText = "", lyricFileName = "", notify = true, collectionName = "" } = {}) {
  if (!file) return;
  const blobId = `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const item = createPlaylistItem({
    title: file.name.replace(/\.[^.]+$/, ""),
    file,
    sourceType: "local",
    blobId,
    lyricText,
    lyricFileName,
    collectionName
  });
  try {
    await savePlayerMediaBlob(blobId, file);
  } catch {
    item.sourceType = "session";
    item.persistent = false;
    item.src = URL.createObjectURL(file);
    item.displayPath = `本次导入 / ${getImportedFilePath(file)}`;
  }
  const saved = upsertPlaylistItem(item);
  saveAndRenderPlayerPlaylist();
  upsertPlaybackTrack(saved, { importedAt: saved.createdAt });
  if (play) await playPlaylistItem(saved.id);
  else if (select || !playerState.currentPlaylistId) await loadPlaylistItem(saved.id, { autoplay: false });
  rememberPlayerImportLocation(file, "音频");
  if (notify) showToast(`已加入播放列表：${file.name}`, "ok");
}

async function importPlayerFolder(files) {
  const fileList = sortMediaFiles(files);
  if (!fileList.length) return;
  const audioFiles = fileList.filter(isAudioFile);
  const lyricFiles = fileList.filter(isLyricFile);
  const folderCollectionCounts = buildCollectionCounts(audioFiles, (file) => {
    const directory = getMediaDirectory(file);
    return directory || normalizeMediaCollectionKey(file.name);
  });
  const lyricRecords = await Promise.all(lyricFiles.map(async (file) => ({
      text: await file.text(),
      name: file.name,
      directory: getMediaDirectory(file),
      relativePath: file.webkitRelativePath || file.name
    })));
  const lyricIndex = buildLyricMatchIndex(lyricRecords);
  let matchedLyrics = 0;
  for (const [index, file] of audioFiles.entries()) {
    const lyric = findBestLyricMatch(file, lyricIndex);
    if (lyric?.text) matchedLyrics += 1;
    const collectionName = getMediaDirectory(file) || normalizeMediaCollectionKey(file.name);
    await importPlayerAudio(file, {
      play: false,
      select: index === 0,
      lyricText: lyric?.text || "",
      lyricFileName: lyric?.name || "",
      collectionName: folderCollectionCounts[collectionName] > 1 ? collectionName : "",
      notify: false
    });
  }
  if (!audioFiles.length && lyricFiles[0]) {
    await importLyrics(lyricFiles[0]);
  }
  rememberPlayerImportLocation(fileList[0], "文件夹", { audioCount: audioFiles.length, lyricCount: lyricFiles.length });
  recordFolderScan(fileList, audioFiles.length, lyricFiles.length);
  showToast(`文件夹导入完成：${audioFiles.length} 个音频，${lyricFiles.length} 个歌词，已关联 ${matchedLyrics} 首。`, "ok");
}

async function importLyrics(file) {
  if (!file) return;
  const text = await file.text();
  const parsed = applyLyricText(text, file.name);
  rememberPlayerImportLocation(file, "歌词");
  if (!parsed.lines.length) {
    $("#lyricPanel").innerHTML = `<p id="lyricCurrent">没有识别到可同步的时间戳。当前支持普通 LRC、逐字 LRC 和明文 KRC，部分加密 KRC 需要先转换成文本。</p>`;
    playerState.lyricFormatLabel = "歌词未识别";
    updatePlayerPathLabel(playerState.playlist.find((item) => item.id === playerState.currentPlaylistId));
    showToast("没有识别到可同步歌词，请检查 LRC/KRC 时间戳。", "fail");
    return;
  }
  attachLyricsToCurrentItem(text, file.name);
  syncLyrics($("#mainPlayer")?.currentTime || 0);
  showToast(`已导入${parsed.label}：${file.name}，共 ${parsed.lines.length} 行。`, "ok");
}

function togglePlayerFullscreen() {
  const target = $("#playerArt");
  if (!target) return;
  if (isPlayerFullscreen(target)) {
    exitPlayerFullscreen();
    return;
  }
  if (!target.requestFullscreen) {
    enterPlayerFullscreenFallback(target);
    return;
  }
  target.requestFullscreen().catch(() => {
    enterPlayerFullscreenFallback(target);
  });
}

function isPlayerFullscreen(target = $("#playerArt")) {
  return document.fullscreenElement === target || target?.classList.contains("is-player-fullscreen");
}

function enterPlayerFullscreenFallback(target = $("#playerArt")) {
  target?.classList.add("is-player-fullscreen");
  syncPlayerFullscreenUi();
}

function exitPlayerFullscreen() {
  const target = $("#playerArt");
  target?.classList.remove("is-player-fullscreen");
  if (document.fullscreenElement === target) {
    document.exitFullscreen?.().catch(() => {}).finally(syncPlayerFullscreenUi);
    return;
  }
  syncPlayerFullscreenUi();
}

function syncPlayerFullscreenUi() {
  const active = isPlayerFullscreen();
  document.body.classList.toggle("player-fullscreen-lock", active);
  const button = $("#fullScreenPlayer");
  if (button) {
    button.setAttribute("aria-pressed", active ? "true" : "false");
    button.textContent = active ? "退出" : "全屏";
  }
  if (!active) {
    playerState.lastFullscreenTapAt = 0;
    playerState.lastFullscreenPointerTouchAt = 0;
    playerState.fullscreenPointerStartY = 0;
    stopLyricScrub();
  }
}

function stopLyricScrub() {
  clearTimeout(playerState.lyricHoldTimer);
  playerState.lyricHoldTimer = 0;
  playerState.lyricScrubbing = false;
  $("#lyricPanel")?.classList.remove("is-scrubbing");
}

function startFullscreenLyricScrub(event) {
  if (!isPlayerFullscreen() || !playerState.lyrics.length) return;
  const player = $("#mainPlayer");
  if (!player?.duration) return;
  clearTimeout(playerState.lyricHoldTimer);
  playerState.lyricScrubbing = false;
  playerState.lyricScrubStartY = event.clientY;
  playerState.lyricScrubStartTime = player.currentTime || 0;
  playerState.lyricHoldTimer = window.setTimeout(() => {
    beginPlayerSeek();
    playerState.lyricScrubbing = true;
    $("#lyricPanel")?.classList.add("is-scrubbing");
  }, 360);
}

function moveFullscreenLyricScrub(event) {
  if (!isPlayerFullscreen()) return;
  if (!playerState.lyricScrubbing) return;
  event.preventDefault();
  event.stopPropagation();
  const player = $("#mainPlayer");
  if (!player?.duration) return;
  const deltaY = event.clientY - playerState.lyricScrubStartY;
  const nextTime = Math.max(0, Math.min(player.duration, playerState.lyricScrubStartTime - deltaY * 0.08));
  previewPlayerSeekTime(nextTime);
}

function endFullscreenLyricScrub(event) {
  const wasScrubbing = playerState.lyricScrubbing;
  if (playerState.lyricScrubbing) {
    event.preventDefault();
    event.stopPropagation();
    playerState.lastFullscreenTapAt = 0;
  }
  stopLyricScrub();
  if (wasScrubbing) finishPlayerSeek("lyric-scrub");
}

function startPlayerFullscreenGesture(event) {
  if (!isPlayerFullscreen()) return;
  playerState.fullscreenPointerStartY = event.clientY;
}

function startPlayerFullscreenTouch(event) {
  if (!isPlayerFullscreen()) return;
  playerState.fullscreenPointerStartY = event.touches?.[0]?.clientY || 0;
}

function exitPlayerFullscreenOnSwipe(endY) {
  const swipeDistance = endY - playerState.fullscreenPointerStartY;
  if (swipeDistance > 96) {
    playerState.lastFullscreenTapAt = 0;
    exitPlayerFullscreen();
    return true;
  }
  return false;
}

function exitPlayerFullscreenOnDoubleTap(event) {
  const target = $("#playerArt");
  if (!isPlayerFullscreen(target)) return;
  if (playerState.lyricScrubbing) return;
  if (event.type === "dblclick") {
    exitPlayerFullscreen();
    return;
  }
  if (exitPlayerFullscreenOnSwipe(event.clientY)) return;
  if (event.pointerType !== "touch") return;
  const now = Date.now();
  playerState.lastFullscreenPointerTouchAt = now;
  if (now - playerState.lastFullscreenTapAt < 320) {
    playerState.lastFullscreenTapAt = 0;
    exitPlayerFullscreen();
    return;
  }
  playerState.lastFullscreenTapAt = now;
}

function exitPlayerFullscreenOnTouchEnd(event) {
  const target = $("#playerArt");
  if (!isPlayerFullscreen(target)) return;
  if (playerState.lyricScrubbing) return;
  const now = Date.now();
  if (now - playerState.lastFullscreenPointerTouchAt < 90) return;
  const endY = event.changedTouches?.[0]?.clientY || 0;
  if (exitPlayerFullscreenOnSwipe(endY)) return;
  if (now - playerState.lastFullscreenTapAt < 320) {
    playerState.lastFullscreenTapAt = 0;
    exitPlayerFullscreen();
    return;
  }
  playerState.lastFullscreenTapAt = now;
}

function handlePlayerFullscreenKey(event) {
  const isEscape = event.key === "Escape";
  const isBack = event.key === "Backspace";
  if (isPlayerFullscreen() && (isEscape || isBack)) {
    event.preventDefault();
    exitPlayerFullscreen();
    return;
  }
  if (!isEscape) return;
  const appIntroModal = $("#appIntroModal");
  if (appIntroModal && !appIntroModal.classList.contains("hidden")) {
    event.preventDefault();
    setAppIntroModal(false);
    return;
  }
  const midnightModal = $("#midnightModal");
  if (midnightModal && !midnightModal.classList.contains("hidden")) {
    event.preventDefault();
    setMidnightModal(false);
    return;
  }
  if (document.body.dataset.view === "editor" && $("[data-editor-drawer].active")) {
    event.preventDefault();
    setEditorPanel("");
  }
}

function decorateApiHelpFields() {
  $$("[data-config]").forEach((field) => {
    const help = apiHelp[field.dataset.config];
    const label = field.closest("label");
    if (!help || !label || label.dataset.helpReady) return;
    label.dataset.helpReady = "true";
    const row = document.createElement("div");
    row.className = "api-input-row";
    label.insertBefore(row, field);
    row.appendChild(field);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "api-help-button";
    button.dataset.apiHelp = field.dataset.config;
    button.setAttribute("aria-expanded", "false");
    button.textContent = "?";
    row.appendChild(button);
    const panel = document.createElement("div");
    panel.className = "api-help hidden";
    panel.dataset.apiHelpPanel = field.dataset.config;
    panel.innerHTML = `<strong>${help.title}</strong><br />${help.text}<br /><a href="${help.url}" target="_blank" rel="noreferrer">打开官网/文档</a>`;
    label.appendChild(panel);
  });
}

function playInApp(src, title, options = {}) {
  const player = $("#mainPlayer");
  const playerTitle = $("#playerTitle");
  if (!player || !src) return;
  const previousPlaylistId = playerState.currentPlaylistId;
  const shouldAutoplay = options.autoplay !== false;
  clearTimeout(playerState.interruptionResumeTimer);
  player.src = src;
  player.playbackRate = playerState.playbackRate || 1;
  playerState.audioUrl = src;
  playerTitle.textContent = title || "正在播放广播剧";
  let playlistItem = options.playlistItem || null;
  if (!playlistItem && options.addToPlaylist !== false) {
    const sourceType = src.startsWith("blob:") ? "session" : "remote";
    playlistItem = upsertPlaylistItem(createPlaylistItem({
      title: title || "广播剧",
      src,
      sourceType,
      persistent: sourceType !== "session"
    }));
    saveAndRenderPlayerPlaylist();
  }
  if (playlistItem) {
    playerState.currentPlaylistId = playlistItem.id;
    if (playlistItem.id !== previousPlaylistId && options.keepLyrics !== true) {
      if (playlistItem.lyricText) {
        applyLyricText(playlistItem.lyricText, playlistItem.lyricFileName || `${playlistItem.title}.lrc`);
      } else {
        playerState.lyrics = [];
        playerState.lyricFileName = "";
        playerState.lyricMode = "none";
        playerState.lyricFormatLabel = "";
        renderLyrics();
      }
    }
    updatePlayerPathLabel(playlistItem);
    renderPlayerPlaylist();
    upsertPlaybackTrack(playlistItem);
    updateMediaSessionMetadata(playlistItem);
  }
  playerState.activeLyricIndex = -1;
  playerState.activeWordIndex = -1;
  playerState.lastLyricScrollIndex = -1;
  syncLyrics(0);
  syncPlayerControls();
  if (!shouldAutoplay) {
    playerState.userPaused = true;
    playerState.expectedPlaying = false;
    player.pause();
    player.load();
    syncPlayerControls();
    return;
  }
  playerState.userPaused = false;
  playerState.expectedPlaying = true;
  player.play()
    .then(() => {
      playerState.interruptionResumeAttempts = 0;
      syncPlayerControls();
    })
    .catch(() => {
      playerState.expectedPlaying = false;
      playerTitle.textContent = `${title || "广播剧"}（点击播放）`;
      syncPlayerControls();
    });
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result || "")));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(file);
  });
}

function dataUrlToBase64(dataUrl = "") {
  const text = String(dataUrl || "");
  const comma = text.indexOf(",");
  return comma >= 0 ? text.slice(comma + 1) : text;
}

function guessAudioMime(fileName = "") {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".mp3")) return "audio/mpeg";
  if (lower.endsWith(".m4a")) return "audio/mp4";
  if (lower.endsWith(".flac")) return "audio/flac";
  if (lower.endsWith(".ogg") || lower.endsWith(".opus")) return "audio/ogg";
  return "audio/wav";
}

async function urlToBase64(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`音频下载失败：${response.status}`);
  const blob = await response.blob();
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result || "")));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(blob);
  });
  return { base64: dataUrlToBase64(dataUrl), mimeType: blob.type || guessAudioMime(url) };
}

function collectAudioSegmentsForSaving(result, links = {}) {
  const segments = result?.manifest?.audioSegments || result?.audioSegments || [];
  return Array.isArray(segments) ? segments.map((segment, index) => ({
    ...segment,
    index,
    fileName: segment.fileName || `${String(index + 1).padStart(3, "0")}-${segment.id || "segment"}.wav`,
    url: segment.dataUrl || segment.url || (links.outputFolder && segment.fileName ? `${links.outputFolder}${segment.fileName}` : "")
  })).filter((segment) => segment.url || segment.dataUrl || segment.base64) : [];
}

async function saveGeneratedSegmentsToDownloads(result, links) {
  const segments = collectAudioSegmentsForSaving(result, links);
  if (!segments.length) return null;
  const plugin = getBaizeMediaPlugin();
  const prepared = [];
  for (const segment of segments) {
    let base64 = segment.base64 || dataUrlToBase64(segment.dataUrl || "");
    let mimeType = segment.mimeType || guessAudioMime(segment.fileName);
    if (!base64 && segment.url) {
      const converted = await urlToBase64(segment.url);
      base64 = converted.base64;
      mimeType = converted.mimeType || mimeType;
    }
    if (base64) prepared.push({
      fileName: segment.fileName,
      mimeType,
      base64
    });
  }
  if (!prepared.length) return null;
  if (plugin?.saveAudioSegments) {
    const saved = await plugin.saveAudioSegments({
      title: result.title || "未命名作品",
      segments: prepared
    });
    addSavedDownloadFilesToPlaylist(saved, result.title || "未命名作品");
    return saved;
  }
  prepared.forEach((segment, index) => {
    const anchor = document.createElement("a");
    anchor.href = `data:${segment.mimeType};base64,${segment.base64}`;
    anchor.download = `${String(index + 1).padStart(3, "0")}-${segment.fileName.replace(/^\d{1,3}-/, "")}`;
    anchor.click();
  });
  return { count: prepared.length, folder: "浏览器默认下载文件夹" };
}

function addSavedDownloadFilesToPlaylist(savedDownloads, title = "未命名作品") {
  const files = Array.isArray(savedDownloads?.files) ? savedDownloads.files : [];
  if (!files.length) return;
  const sorted = sortMediaRecords(files);
  sorted.forEach((file) => {
    if (!file?.uri) return;
    const item = createPlaylistItem({
      title: String(file.name || "").replace(/\.[^.]+$/, "") || title,
      src: nativeMediaSrc(file.uri),
      sourceType: "native",
      persistent: true,
      collectionName: sorted.length > 1 ? title : ""
    });
    item.fileName = file.name || "";
    item.fileSize = file.size || 0;
    item.mimeType = file.mimeType || guessAudioMime(file.name || "");
    item.displayPath = file.path || `${savedDownloads.folder || "Download"}/${file.name || item.title}`;
    upsertPlaylistItem(item);
    upsertPlaybackTrack(item, { importedAt: item.createdAt });
  });
  saveAndRenderPlayerPlaylist();
}

async function startVoiceRecording() {
  if (!navigator.mediaDevices?.getUserMedia) {
    showToast("当前环境不支持录音，请改用上传参考音频。", "fail");
    return;
  }
  const role = $("#voiceRoleInput").value.trim();
  if (!role) {
    showToast("请先填写角色名，再开始录音。", "fail");
    $("#voiceRoleInput").focus();
    return;
  }
  recorderState.chunks = [];
  recorderState.dataUrl = "";
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    }
  });
  const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
    ? "audio/webm;codecs=opus"
    : "audio/webm";
  const recorder = new MediaRecorder(stream, { mimeType });
  recorderState.stream = stream;
  recorderState.recorder = recorder;
  recorderState.mimeType = mimeType;
  recorder.addEventListener("dataavailable", (event) => {
    if (event.data?.size) recorderState.chunks.push(event.data);
  });
  recorder.addEventListener("stop", async () => {
    const blob = new Blob(recorderState.chunks, { type: recorderState.mimeType });
    recorderState.dataUrl = await fileToDataUrl(blob);
    $("#voiceRecordPreview").src = recorderState.dataUrl;
    $("#saveVoiceRecord").disabled = false;
    $("#voiceRecordStatus").textContent = "录音完成，可以试听并保存为参考音色。";
    recorderState.stream?.getTracks().forEach((track) => track.stop());
    recorderState.stream = null;
  });
  recorder.start();
  $("#startVoiceRecord").disabled = true;
  $("#stopVoiceRecord").disabled = false;
  $("#saveVoiceRecord").disabled = true;
  $("#voiceRecordStatus").textContent = "录音中，请保持 5-20 秒清晰干声。";
  showToast("录音已开始，请保持清晰干声。");
}

function stopVoiceRecording() {
  if (recorderState.recorder?.state === "recording") {
    recorderState.recorder.stop();
  }
  $("#startVoiceRecord").disabled = false;
  $("#stopVoiceRecord").disabled = true;
}

function saveRecordedVoiceReference() {
  const role = $("#voiceRoleInput").value.trim();
  if (!role) {
    showToast("请先填写角色名。", "fail");
    $("#voiceRoleInput").focus();
    return;
  }
  if (!recorderState.dataUrl) {
    showToast("还没有可保存的录音。", "fail");
    return;
  }
  const references = getVoiceReferences();
  references.unshift({
    id: `voice-record-${Date.now()}`,
    role,
    fileName: `${role}-录音参考.webm`,
    mimeType: recorderState.mimeType,
    dataUrl: recorderState.dataUrl
  });
  saveVoiceReferences(references);
  $("#voiceRecordStatus").textContent = "录音已保存为参考音色。";
  showToast(`已保存 ${role} 的录音参考。`, "ok");
}

function openBluetoothSettings() {
  $("#bluetoothStatus").textContent = "正在尝试打开系统蓝牙设置；如果没有跳转，请从手机系统设置里配对音箱。";
  showToast("正在尝试打开系统蓝牙设置。");
  try {
    window.location.href = "intent:#Intent;action=android.settings.BLUETOOTH_SETTINGS;end";
  } catch {
    $("#bluetoothStatus").textContent = "当前环境不能直接打开蓝牙设置，请从系统设置手动连接蓝牙音箱。";
  }
}

function testBluetoothAudio() {
  const context = getEditorAudioContext();
  const duration = 0.8;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.frequency.value = 660;
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + duration);
  $("#bluetoothStatus").textContent = "已播放测试音。如果蓝牙音箱已配对，声音会从系统当前输出设备播放。";
  showToast("已播放测试音，请留意当前输出设备。", "ok");
}

function formatSeconds(value) {
  const safeValue = Math.max(0, Number(value) || 0);
  const minutes = Math.floor(safeValue / 60);
  const seconds = safeValue - minutes * 60;
  return `${minutes}:${seconds.toFixed(2).padStart(5, "0")}`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

function getEditorAudioContext() {
  if (!editorState.audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    editorState.audioContext = new AudioContextClass();
  }
  return editorState.audioContext;
}

function getTrack(trackId = editorState.activeTrackId) {
  return editorState.tracks.find((track) => track.id === trackId) || editorState.tracks[0];
}

function getActiveTrack() {
  return getTrack(editorState.activeTrackId);
}

function getEditorDuration(trackId = editorState.activeTrackId) {
  return getTrack(trackId)?.buffer?.duration || 0;
}

function getTimelineDuration() {
  const clipEnd = editorState.clips.reduce((max, clip) => Math.max(max, clip.timelineStart + Math.max(0, clip.sourceEnd - clip.sourceStart)), 0);
  const trackEnd = editorState.tracks.reduce((max, track) => Math.max(max, track.buffer?.duration || 0), 0);
  return Math.max(1, clipEnd, trackEnd);
}

function snapshotEditor() {
  return JSON.stringify({
    clips: editorState.clips,
    selectedClipId: editorState.selectedClipId,
    selection: editorState.selection,
    timeline: editorState.timeline,
    trackHeights: editorState.tracks.map((track) => ({ id: track.id, heightWeight: track.heightWeight || 1 }))
  });
}

function restoreEditor(snapshot) {
  const data = JSON.parse(snapshot);
  editorState.clips = data.clips || [];
  editorState.selectedClipId = data.selectedClipId && editorState.clips.some((clip) => clip.id === data.selectedClipId) ? data.selectedClipId : "";
  editorState.selection = data.selection || editorState.selection;
  editorState.timeline = { ...editorState.timeline, ...(data.timeline || {}) };
  (data.trackHeights || []).forEach((saved) => {
    const track = getTrack(saved.id);
    if (track) track.heightWeight = clamp(Number(saved.heightWeight) || 1, 0.45, 3.2);
  });
  syncTimelineControls();
  renderClipList();
  renderWaveform();
}

function pushEditorHistory() {
  editorState.undoStack.push(snapshotEditor());
  editorState.undoStack = editorState.undoStack.slice(-80);
  editorState.redoStack = [];
  syncTimelineControls();
}

function undoEditor() {
  if (!editorState.undoStack.length) {
    const track = getActiveTrack();
    if (track.sourceHistory?.length) {
      undoTrackImport(track.id);
    } else {
      showToast("没有可撤销的剪辑操作。", "fail");
    }
    return;
  }
  editorState.redoStack.push(snapshotEditor());
  restoreEditor(editorState.undoStack.pop());
  showToast("已撤销上一步。", "ok");
}

function redoEditor() {
  if (!editorState.redoStack.length) {
    showToast("没有可重做的剪辑操作。", "fail");
    return;
  }
  editorState.undoStack.push(snapshotEditor());
  restoreEditor(editorState.redoStack.pop());
  showToast("已重做上一步。", "ok");
}

function isTextEditingTarget(target) {
  return !!target?.closest?.("input, textarea, select, [contenteditable='true']");
}

function handleEditorShortcut(event) {
  if (document.body.dataset.view !== "editor" || isTextEditingTarget(event.target)) return;
  const key = event.key.toLowerCase();
  const modifier = event.ctrlKey || event.metaKey;
  const selectedClip = getSelectedClip();
  if (!modifier && !event.altKey && selectedClip) {
    if (key === "delete" || key === "backspace") {
      event.preventDefault();
      removeSelectedClip();
      return;
    }
    if (key === "arrowleft" || key === "arrowright") {
      event.preventDefault();
      nudgeSelectedClip(key === "arrowleft" ? -1 : 1, event.shiftKey ? 4 : 1);
      return;
    }
  }
  if (!modifier || event.altKey) return;
  if (key === "c" && selectedClip) {
    event.preventDefault();
    copySelectedClip();
    return;
  }
  if (key === "x" && selectedClip) {
    event.preventDefault();
    cutSelectedClip();
    return;
  }
  if (key === "v") {
    event.preventDefault();
    pasteClipAtPlayhead();
    return;
  }
  const isUndo = key === "z" && !event.shiftKey;
  const isRedo = key === "y" || (key === "z" && event.shiftKey);
  if (!isUndo && !isRedo) return;
  event.preventDefault();
  if (isUndo) undoEditor();
  if (isRedo) redoEditor();
}

function snapTime(value) {
  const safeValue = Math.max(0, Number(value) || 0);
  if (!editorState.timeline.snap) return safeValue;
  const grid = Math.max(0.01, Number(editorState.timeline.grid) || 0.5);
  return Math.round(safeValue / grid) * grid;
}

function getVisibleTimelineDuration(projectDuration = getTimelineDuration()) {
  return Math.max(0.5, projectDuration / Math.max(1, editorState.timeline.zoom));
}

function setTimelineZoom(nextZoom) {
  const projectDuration = getTimelineDuration();
  const center = editorState.timeline.offset + getVisibleTimelineDuration(projectDuration) / 2;
  editorState.timeline.zoom = clamp(nextZoom, 1, 32);
  const visible = getVisibleTimelineDuration(projectDuration);
  editorState.timeline.offset = clamp(center - visible / 2, 0, Math.max(0, projectDuration - visible));
  syncTimelineControls();
  renderWaveform();
}

function setTimelineOffset(nextOffset) {
  const projectDuration = getTimelineDuration();
  const visible = getVisibleTimelineDuration(projectDuration);
  editorState.timeline.offset = clamp(nextOffset, 0, Math.max(0, projectDuration - visible));
  syncTimelineControls();
  renderWaveform();
}

function panTimeline(direction = 1) {
  const visible = getVisibleTimelineDuration();
  setTimelineOffset(editorState.timeline.offset + direction * Math.max(0.5, visible * 0.35));
}

function ensurePlayheadVisible(time = editorState.timeline.playhead, marginRatio = 0.14) {
  const projectDuration = getTimelineDuration();
  const visible = getVisibleTimelineDuration(projectDuration);
  const maxOffset = Math.max(0, projectDuration - visible);
  if (maxOffset <= 0) return;
  const margin = visible * marginRatio;
  const viewStart = editorState.timeline.offset;
  const viewEnd = viewStart + visible;
  if (time < viewStart + margin) {
    editorState.timeline.offset = clamp(time - margin, 0, maxOffset);
    syncTimelineControls();
  } else if (time > viewEnd - margin) {
    editorState.timeline.offset = clamp(time - visible + margin, 0, maxOffset);
    syncTimelineControls();
  }
}

function fitTimeline() {
  editorState.timeline.zoom = 1;
  editorState.timeline.offset = 0;
  syncTimelineControls();
  renderWaveform();
}

function setPlayhead(value, options = {}) {
  const shouldSnap = options.snap !== false;
  const next = clamp(value, 0, getTimelineDuration());
  editorState.timeline.playhead = shouldSnap ? snapTime(next) : next;
  $("#playheadInput").value = editorState.timeline.playhead.toFixed(2);
  if (options.follow) ensurePlayheadVisible(editorState.timeline.playhead);
  syncEditorQuickState();
  if (options.render !== false) renderWaveform();
}

function syncTimelineControls() {
  $("#snapTimeline").checked = editorState.timeline.snap;
  $("#snapGridSize").value = String(editorState.timeline.grid);
  $("#playheadInput").value = editorState.timeline.playhead.toFixed(2);
  const zoomRange = $("#timelineZoomRange");
  if (zoomRange) zoomRange.value = String(editorState.timeline.zoom);
  const zoomLabel = $("#timelineZoomLabel");
  if (zoomLabel) zoomLabel.textContent = `缩放 ${editorState.timeline.zoom.toFixed(1)}x`;
  const offsetInput = $("#timelineOffset");
  if (offsetInput) {
    const projectDuration = getTimelineDuration();
    const maxOffset = Math.max(0, projectDuration - getVisibleTimelineDuration(projectDuration));
    offsetInput.max = maxOffset.toFixed(2);
    offsetInput.value = Math.min(editorState.timeline.offset, maxOffset).toFixed(2);
    offsetInput.disabled = maxOffset <= 0.01;
  }
  $("#timelinePanLeft")?.toggleAttribute("disabled", editorState.timeline.offset <= 0.01);
  $("#timelinePanRight")?.toggleAttribute("disabled", Number($("#timelineOffset")?.max || 0) <= editorState.timeline.offset + 0.01);
  $("#undoEdit").disabled = !editorState.undoStack.length && !getActiveTrack().sourceHistory?.length;
  $("#redoEdit").disabled = !editorState.redoStack.length;
  syncEditorQuickState();
}

function syncEditorPlaybackButtons(isPlaying = editorState.playingNodes.length > 0) {
  const playButtons = ["#transportPlay", "#previewTimelineMix", "#quickPreviewMix"];
  playButtons.forEach((selector) => {
    const button = $(selector);
    if (!button) return;
    button.classList.toggle("playing", isPlaying);
    if (selector === "#transportPlay") button.textContent = isPlaying ? "暂停" : "播放";
    if (selector === "#previewTimelineMix" || selector === "#quickPreviewMix") button.textContent = isPlaying ? "暂停" : "预听";
  });
}

function syncTrackControls(trackId) {
  const track = getTrack(trackId);
  $$(`[data-track-volume="${track.id}"]`).forEach((input) => {
    input.value = String(track.volume);
  });
  $$(`[data-track-mute="${track.id}"]`).forEach((input) => {
    input.checked = track.muted;
  });
  $$(`[data-track-solo="${track.id}"]`).forEach((input) => {
    input.checked = track.solo;
  });
}

function syncEditorQuickState() {
  editorState.tracks.forEach((track) => {
    const status = $(`#simpleTrackStatus${track.id}`);
    if (status) {
      status.textContent = track.buffer
        ? `${track.fileName || "已导入"}｜${formatSeconds(track.buffer.duration)}`
        : "空轨";
    }
  });
  $$(".simple-track").forEach((button) => {
    const selected = button.dataset.trackCard === editorState.activeTrackId;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-selected", selected ? "true" : "false");
  });
  const selectionLength = Math.max(0, editorState.selection.sourceEnd - editorState.selection.sourceStart);
  const selectionInfo = $("#quickSelectionInfo");
  if (selectionInfo) selectionInfo.textContent = `选区 ${formatSeconds(selectionLength)}`;
  const clipCount = $("#quickClipCount");
  const selectedClip = getSelectedClip();
  if (clipCount) {
    clipCount.textContent = selectedClip ? `片段 ${editorState.clips.length}｜选中 ${selectedClip.name}` : `片段 ${editorState.clips.length}`;
  }
  updateSelectedClipControls(selectedClip);
  const playhead = $("#quickPlayheadInfo");
  if (playhead) playhead.textContent = `播放头 ${formatSeconds(editorState.timeline.playhead)}`;
  const transportPlayhead = $("#transportPlayheadLabel");
  if (transportPlayhead) transportPlayhead.textContent = formatSeconds(editorState.timeline.playhead);
  const transportDuration = $("#transportDurationLabel");
  if (transportDuration) transportDuration.textContent = `总长 ${formatSeconds(getTimelineDuration())}`;
  const micToggle = $("#quickMicToggle");
  if (micToggle) {
    const recording = editorState.micRecorder?.state === "recording";
    micToggle.textContent = recording ? "停止录音" : "录音";
    micToggle.classList.toggle("primary", recording);
    micToggle.classList.toggle("secondary", !recording);
  }
  const active = getActiveTrack();
  const undoImport = $("#quickUndoImport");
  if (undoImport) undoImport.disabled = !active.sourceHistory?.length;
  const clearTrack = $("#quickClearTrack");
  if (clearTrack) clearTrack.disabled = !active.buffer && !active.url;
  syncEditorPlaybackButtons();
}

function setEditorContext(name = "studio") {
  document.body.dataset.editorPanel = name || "studio";
}

function setEditorPanel(name = "") {
  setEditorContext(name || "studio");
  $$("[data-editor-panel]").forEach((button) => {
    const active = button.dataset.editorPanel === name;
    button.classList.toggle("active", active);
    button.setAttribute("aria-expanded", active ? "true" : "false");
  });
  $$("[data-editor-drawer]").forEach((drawer) => {
    const active = drawer.dataset.editorDrawer === name;
    drawer.classList.toggle("active", active);
  });
  renderWaveform();
}

function setActiveTrack(trackId) {
  editorState.activeTrackId = trackId;
  editorState.micTrackId = trackId;
  if ($("#editorMicTrack")) $("#editorMicTrack").value = trackId;
  editorState.selection.trackId = trackId;
  const track = getActiveTrack();
  const duration = track.buffer?.duration || 0;
  if (duration) {
    const length = Math.min(30, duration);
    editorState.selection.sourceStart = clamp(editorState.selection.sourceStart, 0, Math.max(0, duration - 0.1));
    editorState.selection.sourceEnd = clamp(editorState.selection.sourceEnd || length, Math.min(duration, editorState.selection.sourceStart + 0.1), duration);
  }
  $("#editorPreview").src = track.url || "";
  updateEditorSourceInfo();
  setClipInputs(editorState.selection.sourceStart, editorState.selection.sourceEnd, editorState.selection.timelineStart);
  renderWaveform();
}

function setClipInputs(start, end, timelineStart = editorState.selection.timelineStart) {
  const duration = getEditorDuration(editorState.selection.trackId);
  const safeStart = clamp(start, 0, Math.max(0, duration));
  const safeEnd = clamp(end, safeStart, Math.max(0, duration));
  editorState.selection.sourceStart = Math.min(safeStart, safeEnd);
  editorState.selection.sourceEnd = Math.max(safeStart, safeEnd);
  editorState.selection.timelineStart = Math.max(0, Number(timelineStart) || 0);
  $("#clipStart").value = editorState.selection.sourceStart.toFixed(2);
  $("#clipEnd").value = editorState.selection.sourceEnd.toFixed(2);
  $("#clipTimelineStart").value = editorState.selection.timelineStart.toFixed(2);
  syncEditorQuickState();
  renderWaveform();
}

function getClipInputs() {
  return {
    trackId: editorState.selection.trackId,
    start: editorState.selection.sourceStart,
    end: editorState.selection.sourceEnd,
    timelineStart: editorState.selection.timelineStart
  };
}

function getSelectedClip() {
  return editorState.clips.find((clip) => clip.id === editorState.selectedClipId) || null;
}

function updateSelectedClipControls(selectedClip = getSelectedClip()) {
  const label = $("#selectedClipLabel");
  if (label) {
    label.textContent = selectedClip
      ? `${selectedClip.name}｜${formatSeconds(selectedClip.timelineStart)}｜${formatSeconds(selectedClip.sourceEnd - selectedClip.sourceStart)}`
      : "未选中片段";
  }
  [
    "#quickPreviewClip",
    "#nudgeClipLeft",
    "#nudgeClipRight",
    "#duplicateSelectedClip",
    "#deleteSelectedClip",
    "#copySelectedClip",
    "#cutSelectedClip",
    "#toggleSelectedClipMute",
    "#fadeInSelectedClip",
    "#fadeOutSelectedClip"
  ].forEach((selector) => {
    const button = $(selector);
    if (button) button.disabled = !selectedClip;
  });
  const pasteButton = $("#pasteClipAtPlayhead");
  if (pasteButton) pasteButton.disabled = !editorState.clipboardClip;
  const duration = selectedClip ? Math.max(0.1, selectedClip.sourceEnd - selectedClip.sourceStart) : 0;
  const inspectorFields = [
    ["#selectedClipVolume", "#selectedClipVolumeLabel", selectedClip?.volume ?? 1, "volume"],
    ["#selectedClipFadeIn", "#selectedClipFadeInLabel", selectedClip?.fadeIn ?? 0, "fade"],
    ["#selectedClipFadeOut", "#selectedClipFadeOutLabel", selectedClip?.fadeOut ?? 0, "fade"]
  ];
  inspectorFields.forEach(([inputSelector, labelSelector, value, type]) => {
    const input = $(inputSelector);
    const output = $(labelSelector);
    if (input) {
      input.disabled = !selectedClip;
      input.max = type === "fade" ? Math.max(0.1, Math.min(5, duration / 2)).toFixed(1) : input.max;
      input.value = type === "fade" ? Number(value).toFixed(1) : Number(value).toFixed(2);
    }
    if (output) output.textContent = type === "fade" ? `${Number(value).toFixed(1)}s` : Number(value).toFixed(2);
  });
  const muteButton = $("#toggleSelectedClipMute");
  if (muteButton && selectedClip) muteButton.textContent = selectedClip.muted ? "取消静音" : "静音";
}

function getClipDuration(clip) {
  return Math.max(0, (clip?.sourceEnd || 0) - (clip?.sourceStart || 0));
}

function ensureClipVisible(clip) {
  if (!clip) return;
  const projectDuration = getTimelineDuration();
  const visible = getVisibleTimelineDuration(projectDuration);
  const clipStart = clip.timelineStart;
  const clipEnd = clip.timelineStart + getClipDuration(clip);
  const viewStart = editorState.timeline.offset;
  const viewEnd = viewStart + visible;
  if (clipStart >= viewStart && clipEnd <= viewEnd) return;
  const nextOffset = clipStart < viewStart
    ? clipStart - visible * 0.12
    : clipEnd - visible * 0.88;
  editorState.timeline.offset = clamp(nextOffset, 0, Math.max(0, projectDuration - visible));
  syncTimelineControls();
}

function cloneClipForTimeline(clip, timelineStart = clip.timelineStart, suffix = "") {
  return {
    ...clip,
    id: `clip-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: suffix ? `${clip.name} ${suffix}` : clip.name,
    timelineStart: Math.max(0, Number(timelineStart) || 0)
  };
}

function copySelectedClip({ silent = false } = {}) {
  const clip = getSelectedClip();
  if (!clip) {
    if (!silent) showToast("请先点选一个片段。", "fail");
    return false;
  }
  editorState.clipboardClip = { ...clip };
  updateSelectedClipControls(clip);
  if (!silent) showToast("已复制片段，可移动播放头后粘贴。", "ok");
  return true;
}

function cutSelectedClip() {
  if (!copySelectedClip({ silent: true })) return;
  removeSelectedClip({ silent: true });
  showToast("已剪切片段，可在播放头位置粘贴。", "ok");
}

function pasteClipAtPlayhead() {
  const source = editorState.clipboardClip;
  if (!source) {
    showToast("还没有复制片段。", "fail");
    return;
  }
  const trackId = getTrack(source.trackId)?.buffer ? source.trackId : editorState.activeTrackId;
  if (!getTrack(trackId)?.buffer) {
    showToast("目标轨道还没有音频，无法粘贴。", "fail");
    return;
  }
  pushEditorHistory();
  const clip = cloneClipForTimeline({ ...source, trackId }, editorState.timeline.playhead, "粘贴");
  editorState.clips.push(clip);
  selectEditorClip(clip);
  showToast("已粘贴到播放头位置。", "ok");
}

function setSelectedClipField(field, value, { silent = false } = {}) {
  const clip = getSelectedClip();
  if (!clip) {
    if (!silent) showToast("请先点选一个片段。", "fail");
    return;
  }
  pushEditorHistory();
  const duration = getClipDuration(clip);
  if (field === "volume") clip.volume = clamp(Number(value), 0, 2);
  if (field === "fadeIn") clip.fadeIn = clamp(Number(value), 0, Math.max(0, duration / 2));
  if (field === "fadeOut") clip.fadeOut = clamp(Number(value), 0, Math.max(0, duration / 2));
  if (field === "muted") clip.muted = Boolean(value);
  renderClipList();
  renderWaveform();
}

function toggleSelectedClipMute() {
  const clip = getSelectedClip();
  if (!clip) {
    showToast("请先点选一个片段。", "fail");
    return;
  }
  setSelectedClipField("muted", !clip.muted, { silent: true });
  showToast(clip.muted ? "片段已静音。" : "片段已取消静音。", "ok");
}

function applySelectedClipFade(type) {
  const clip = getSelectedClip();
  if (!clip) {
    showToast("请先点选一个片段。", "fail");
    return;
  }
  const value = Math.min(1.2, Math.max(0.2, getClipDuration(clip) / 5));
  setSelectedClipField(type === "in" ? "fadeIn" : "fadeOut", value, { silent: true });
  showToast(type === "in" ? "已给片段加淡入。" : "已给片段加淡出。", "ok");
}

function nudgeSelectedClip(direction = 1, multiplier = 1) {
  const clip = getSelectedClip();
  if (!clip) {
    showToast("请先点选一个片段。", "fail");
    return;
  }
  const step = editorState.timeline.snap ? Math.max(0.01, Number(editorState.timeline.grid) || 0.5) : 0.25;
  pushEditorHistory();
  clip.timelineStart = Math.max(0, Number((clip.timelineStart + direction * multiplier * step).toFixed(2)));
  setPlayhead(clip.timelineStart);
  renderClipList();
  renderWaveform();
}

function duplicateSelectedClip() {
  const clip = getSelectedClip();
  if (!clip) {
    showToast("请先点选一个片段。", "fail");
    return;
  }
  const duration = Math.max(0.1, getClipDuration(clip));
  const gap = editorState.timeline.snap ? Math.max(0.01, Number(editorState.timeline.grid) || 0.5) : 0.25;
  pushEditorHistory();
  const copy = cloneClipForTimeline(clip, Number((clip.timelineStart + duration + gap).toFixed(2)), "副本");
  editorState.clips.push(copy);
  selectEditorClip(copy);
  showToast("已复制到当前片段后方。", "ok");
}

function removeSelectedClip({ silent = false } = {}) {
  const clip = getSelectedClip();
  if (!clip) {
    if (!silent) showToast("请先点选一个片段。", "fail");
    return;
  }
  pushEditorHistory();
  const index = editorState.clips.findIndex((item) => item.id === clip.id);
  editorState.clips = editorState.clips.filter((item) => item.id !== clip.id);
  editorState.selectedClipId = editorState.clips[Math.min(index, editorState.clips.length - 1)]?.id || "";
  renderClipList();
  renderWaveform();
  if (!silent) showToast("已删除片段，可撤销。", "ok");
}

function previewSelectedClip() {
  const clip = getSelectedClip();
  if (!clip) {
    showToast("请先点选一个片段。", "fail");
    return;
  }
  playEditorClip(clip.id);
}

function selectEditorClip(clipOrId, { openPanel = false, notify = false } = {}) {
  const clip = typeof clipOrId === "string"
    ? editorState.clips.find((item) => item.id === clipOrId)
    : clipOrId;
  if (!clip) return;
  editorState.selectedClipId = clip.id;
  setActiveTrack(clip.trackId);
  setClipInputs(clip.sourceStart, clip.sourceEnd, clip.timelineStart);
  ensureClipVisible(clip);
  setPlayhead(clip.timelineStart);
  if (openPanel) setEditorPanel("clips");
  else setEditorContext("clips");
  renderClipList();
  renderWaveform();
  if (notify) showToast("已选中片段，可在波形上长按拖动。", "ok");
}

function updateEditorSourceInfo() {
  editorState.tracks.forEach((track) => {
    const info = $(`#trackInfo${track.id}`);
    if (!info) return;
    if (!track.buffer) {
      info.textContent = "还没有载入音频。";
      return;
    }
    info.textContent = `${track.fileName}｜${formatSeconds(track.buffer.duration)}｜${track.buffer.numberOfChannels} 声道｜${track.buffer.sampleRate} Hz`;
  });
  const active = getActiveTrack();
  $("#editorSourceInfo").textContent = `当前选中：${active.name}｜${active.label}${active.buffer ? `｜${formatSeconds(active.buffer.duration)}` : ""}`;
  $$("[data-track-card]").forEach((card) => {
    const selected = card.dataset.trackCard === editorState.activeTrackId;
    card.classList.toggle("active", selected);
    card.setAttribute("aria-selected", selected ? "true" : "false");
  });
  editorState.tracks.forEach((track) => syncTrackControls(track.id));
  syncEditorQuickState();
}

function snapshotTrackSource(track) {
  return {
    buffer: track.buffer,
    url: track.url,
    fileName: track.fileName
  };
}

function pushTrackSourceHistory(track) {
  track.sourceHistory = track.sourceHistory || [];
  track.sourceHistory.push(snapshotTrackSource(track));
  track.sourceHistory = track.sourceHistory.slice(-20);
}

function pruneClipsForTrack(trackId) {
  const track = getTrack(trackId);
  const duration = track.buffer?.duration || 0;
  editorState.clips = editorState.clips.filter((clip) => {
    if (clip.trackId !== trackId) return true;
    if (!duration) return false;
    clip.sourceStart = clamp(clip.sourceStart, 0, Math.max(0, duration - 0.1));
    clip.sourceEnd = clamp(clip.sourceEnd, clip.sourceStart + 0.1, duration);
    return clip.sourceEnd > clip.sourceStart;
  });
  if (editorState.selectedClipId && !editorState.clips.some((clip) => clip.id === editorState.selectedClipId)) {
    editorState.selectedClipId = "";
  }
}

function restoreTrackSource(trackId, source) {
  const track = getTrack(trackId);
  track.buffer = source?.buffer || null;
  track.url = source?.url || "";
  track.fileName = source?.fileName || "";
  pruneClipsForTrack(trackId);
  setActiveTrack(trackId);
  setClipInputs(0, Math.min(track.buffer?.duration || 0, 30), 0);
  updateEditorSourceInfo();
  renderClipList();
  renderWaveform();
  syncTimelineControls();
}

function undoTrackImport(trackId, options = {}) {
  const track = getTrack(trackId);
  if (!track.sourceHistory?.length) {
    if (!options.silent) showToast(`${track.name} 没有可撤销的导入。`, "fail");
    return;
  }
  restoreTrackSource(trackId, track.sourceHistory.pop());
  if (!options.silent) showToast(`已撤销 ${track.name} 的上一次导入。`, "ok");
}

function clearTrackSource(trackId) {
  const track = getTrack(trackId);
  if (!track.buffer && !track.url) return;
  pushTrackSourceHistory(track);
  restoreTrackSource(trackId, null);
  showToast(`已移除 ${track.name} 音频，可撤销。`, "ok");
}

function createWholeTrackClip(trackId) {
  const track = getTrack(trackId);
  if (!track?.buffer) return;
  editorState.clips = editorState.clips.filter((clip) => clip.trackId !== trackId);
  const clip = {
    id: `clip-${Date.now()}-${trackId}-${Math.random().toString(16).slice(2)}`,
    name: `${track.name} 整轨`,
    trackId,
    sourceStart: 0,
    sourceEnd: track.buffer.duration,
    timelineStart: 0,
    volume: 1,
    fadeIn: 0,
    fadeOut: 0,
    muted: false
  };
  editorState.clips.push(clip);
  editorState.selectedClipId = clip.id;
}

async function setEditorSource({ arrayBuffer, url, name, trackId = editorState.activeTrackId, remember = true }) {
  const context = getEditorAudioContext();
  const track = getTrack(trackId);
  const buffer = await context.decodeAudioData(arrayBuffer.slice(0));
  if (remember) pushTrackSourceHistory(track);
  track.buffer = buffer;
  track.url = url;
  track.fileName = name || "未命名音频";
  editorState.sourceBuffer = buffer;
  editorState.sourceUrl = url;
  editorState.sourceName = track.fileName;
  setActiveTrack(trackId);
  setClipInputs(0, Math.min(buffer.duration, 30), 0);
  createWholeTrackClip(trackId);
  updateEditorSourceInfo();
  renderClipList();
  renderWaveform();
  syncTimelineControls();
}

async function loadEditorFile(file, trackId = editorState.activeTrackId) {
  if (!file) return;
  const arrayBuffer = await file.arrayBuffer();
  const url = URL.createObjectURL(file);
  await setEditorSource({ arrayBuffer, url, name: file.name, trackId });
  setEditorPanel("");
  showToast(`已导入到 ${getTrack(trackId).name}：${file.name}`, "ok");
}

async function startEditorMicRecording() {
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
    showToast("当前环境不支持麦克风录音。", "fail");
    return;
  }
  const trackId = $("#editorMicTrack")?.value || editorState.activeTrackId;
  editorState.micTrackId = trackId;
  editorState.micChunks = [];
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    }
  });
  const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
    ? "audio/webm;codecs=opus"
    : "audio/webm";
  const recorder = new MediaRecorder(stream, { mimeType });
  editorState.micStream = stream;
  editorState.micRecorder = recorder;
  editorState.micMimeType = mimeType;
  recorder.addEventListener("dataavailable", (event) => {
    if (event.data?.size) editorState.micChunks.push(event.data);
  });
  recorder.addEventListener("stop", async () => {
    try {
      const blob = new Blob(editorState.micChunks, { type: editorState.micMimeType });
      if (!blob.size) throw new Error("没有录到声音。");
      const name = `麦克风录音-${new Date().toISOString().replace(/[:.]/g, "-")}.webm`;
      await setEditorSource({
        arrayBuffer: await blob.arrayBuffer(),
        url: URL.createObjectURL(blob),
        name,
        trackId: editorState.micTrackId
      });
      $("#editorMicStatus").textContent = `录音已导入 ${getTrack(editorState.micTrackId).name}。`;
      setEditorPanel("");
      showToast("麦克风录音已导入轨道。", "ok");
    } catch (error) {
      $("#editorMicStatus").textContent = `录音导入失败：${error.message}`;
      showToast(`录音导入失败：${error.message}`, "fail");
    } finally {
      editorState.micStream?.getTracks().forEach((track) => track.stop());
      editorState.micStream = null;
      editorState.micRecorder = null;
      $("#startEditorMic").disabled = false;
      $("#stopEditorMic").disabled = true;
      syncEditorQuickState();
    }
  });
  recorder.start();
  $("#startEditorMic").disabled = true;
  $("#stopEditorMic").disabled = false;
  $("#editorMicStatus").textContent = `正在录音到 ${getTrack(trackId).name}，停止后会自动导入。`;
  syncEditorQuickState();
  showToast(`正在录音到 ${getTrack(trackId).name}。`);
}

function stopEditorMicRecording() {
  if (editorState.micRecorder?.state === "recording") {
    editorState.micRecorder.stop();
  }
}

async function loadEditorFromPlayer() {
  const player = $("#mainPlayer");
  if (!player?.src) {
    showToast("播放器里还没有可导入的音频。", "fail");
    return;
  }
  try {
    const response = await fetch(player.src);
    const arrayBuffer = await response.arrayBuffer();
    await setEditorSource({
      arrayBuffer,
      url: player.src,
      name: $("#playerTitle")?.textContent?.trim() || "播放器音频",
      trackId: editorState.activeTrackId
    });
    setEditorPanel("");
    showView("editor");
    showToast("已把播放器音频导入剪辑轨道。", "ok");
  } catch {
    showToast("这个音频地址无法直接导入，请先下载到本机再上传。", "fail");
  }
}

function makeDemoBuffer({ frequency = 220, duration = 8, pulse = false, noise = false }) {
  const context = getEditorAudioContext();
  const sampleRate = 44100;
  const buffer = context.createBuffer(1, sampleRate * duration, sampleRate);
  const channel = buffer.getChannelData(0);
  for (let i = 0; i < channel.length; i++) {
    const time = i / sampleRate;
    const tone = Math.sin(2 * Math.PI * frequency * time) * 0.13 + Math.sin(2 * Math.PI * frequency * 2 * time) * 0.05;
    const beat = pulse ? (Math.sin(2 * Math.PI * 2 * time) > 0 ? 1 : 0.42) : 1;
    const wind = noise ? (Math.random() * 2 - 1) * 0.045 : 0;
    const fade = Math.min(1, time / 0.4, (duration - time) / 0.6);
    channel[i] = (tone * beat + wind) * Math.max(0, fade);
  }
  return buffer;
}

async function loadDemoEditorAudio() {
  const main = makeDemoBuffer({ frequency: 220, duration: 10, pulse: true });
  const bg = makeDemoBuffer({ frequency: 110, duration: 12, noise: true });
  for (const [trackId, buffer, name] of [["A", main, "演示人声主轨.wav"], ["B", bg, "演示环境配乐.wav"]]) {
    const blob = audioBufferToWav(buffer);
    await setEditorSource({
      arrayBuffer: await blob.arrayBuffer(),
      url: URL.createObjectURL(blob),
      name,
      trackId
    });
  }
  setActiveTrack("A");
  editorState.clips = [];
  addEditorClip(0, Math.min(6, getEditorDuration("A")), 0, "A");
  addEditorClip(0, Math.min(8, getEditorDuration("B")), 0, "B");
  setEditorPanel("");
}

function getTrackLayout(height) {
  const totalWeight = editorState.tracks.reduce((sum, track) => sum + Math.max(0.45, track.heightWeight || 1), 0) || editorState.tracks.length;
  let top = 0;
  return editorState.tracks.map((track, index) => {
    const isLast = index === editorState.tracks.length - 1;
    const laneHeight = isLast ? Math.max(1, height - top) : Math.max(1, (height * Math.max(0.45, track.heightWeight || 1)) / totalWeight);
    const item = { track, index, top, height: laneHeight };
    top += laneHeight;
    return item;
  });
}

function canvasTimelineInfo(canvas) {
  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const width = canvas.width;
  const height = canvas.height;
  const layout = getTrackLayout(height);
  const laneHeight = height / editorState.tracks.length;
  const projectDuration = getTimelineDuration();
  const visibleDuration = getVisibleTimelineDuration(projectDuration);
  editorState.timeline.offset = clamp(editorState.timeline.offset, 0, Math.max(0, projectDuration - visibleDuration));
  return { ratio, rect, width, height, laneHeight, layout, duration: visibleDuration, projectDuration, offset: editorState.timeline.offset };
}

function timeToX(time, width, duration, offset = 0) {
  return ((time - offset) / Math.max(0.01, duration)) * width;
}

function xToTime(x, width, duration, offset = 0, projectDuration = duration) {
  return clamp(offset + (x / Math.max(1, width)) * duration, 0, projectDuration);
}

function drawTrackWaveform(ctx, track, laneTop, laneHeight, width, visibleDuration, offset, projectDuration, ratio) {
  ctx.fillStyle = track.id === editorState.activeTrackId ? "rgba(255, 253, 247, 0.92)" : "rgba(255, 253, 247, 0.62)";
  ctx.fillRect(0, laneTop, width, laneHeight);
  ctx.fillStyle = "rgba(31, 33, 31, 0.72)";
  ctx.font = `${12 * ratio}px Microsoft YaHei, sans-serif`;
  ctx.fillText(`${track.name} · ${track.label}`, 14 * ratio, laneTop + 22 * ratio);
  ctx.strokeStyle = "rgba(31, 33, 31, 0.14)";
  ctx.beginPath();
  ctx.moveTo(0, laneTop + laneHeight / 2);
  ctx.lineTo(width, laneTop + laneHeight / 2);
  ctx.stroke();

  if (!track.buffer) {
    ctx.fillStyle = "rgba(116, 111, 99, 0.78)";
    ctx.fillText("导入音频后显示波形", 14 * ratio, laneTop + laneHeight / 2 + 6 * ratio);
    return;
  }

  const visibleStart = Math.max(0, Math.floor((offset / track.buffer.duration) * track.buffer.length));
  const visibleEnd = Math.min(track.buffer.length, Math.ceil(((offset + visibleDuration) / track.buffer.duration) * track.buffer.length));
  const data = track.buffer.getChannelData(0);
  if (visibleStart >= visibleEnd) return;
  const samplesPerPixel = Math.max(1, Math.floor(Math.max(1, visibleEnd - visibleStart) / width));
  ctx.strokeStyle = track.id === "A" ? "#315f4c" : "#6f1f1b";
  ctx.lineWidth = Math.max(1, ratio);
  ctx.beginPath();
  for (let x = 0; x < width; x += 1) {
    let min = 1;
    let max = -1;
    const start = visibleStart + Math.floor(x * samplesPerPixel);
    for (let i = 0; i < samplesPerPixel && start + i < visibleEnd; i += 1) {
      const sample = data[start + i];
      if (sample < min) min = sample;
      if (sample > max) max = sample;
    }
    const y1 = laneTop + ((1 - max) * laneHeight) / 2;
    const y2 = laneTop + ((1 - min) * laneHeight) / 2;
    ctx.moveTo(x, y1);
    ctx.lineTo(x, y2);
  }
  ctx.stroke();
}

function renderWaveform() {
  const canvas = $("#waveformCanvas");
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  const width = Math.max(360, Math.floor(rect.width * ratio));
  const height = Math.max(260, Math.floor(rect.height * ratio));
  $(".waveform-wrap")?.classList.toggle("clip-selected", Boolean(editorState.selectedClipId));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const { layout, duration, projectDuration, offset } = canvasTimelineInfo(canvas);
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "rgba(255, 250, 238, 0.86)";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(49, 95, 76, 0.14)";
  ctx.lineWidth = 1;
  const gridStep = Math.max(Number(editorState.timeline.grid) || 0.5, duration / 8);
  const firstTick = Math.ceil(offset / gridStep) * gridStep;
  for (let time = firstTick; time <= offset + duration + 0.001; time += gridStep) {
    const x = timeToX(time, width, duration, offset);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
    ctx.fillStyle = "rgba(116, 111, 99, 0.75)";
    ctx.font = `${10 * ratio}px Microsoft YaHei, sans-serif`;
    ctx.fillText(formatSeconds(time), x + 4 * ratio, 12 * ratio);
  }

  layout.forEach((lane) => {
    drawTrackWaveform(ctx, lane.track, lane.top, lane.height, width, duration, offset, projectDuration, ratio);
  });

  ctx.strokeStyle = "rgba(31, 33, 31, 0.22)";
  ctx.lineWidth = Math.max(1, ratio);
  layout.slice(0, -1).forEach((lane) => {
    const y = lane.top + lane.height;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
    ctx.fillStyle = "rgba(49, 95, 76, 0.28)";
    ctx.fillRect(0, y - 3 * ratio, width, 6 * ratio);
  });

  editorState.clips.forEach((clip) => {
    const lane = layout.find((item) => item.track.id === clip.trackId);
    if (!lane) return;
    const clipEnd = clip.timelineStart + clip.sourceEnd - clip.sourceStart;
    if (clipEnd < offset || clip.timelineStart > offset + duration) return;
    const x = timeToX(clip.timelineStart, width, duration, offset);
    const w = Math.max(3 * ratio, ((clip.sourceEnd - clip.sourceStart) / duration) * width);
    const clipHeight = Math.min(40 * ratio, Math.max(24 * ratio, lane.height - 44 * ratio));
    const y = lane.top + lane.height - clipHeight - 10 * ratio;
    const selected = clip.id === editorState.selectedClipId;
    ctx.fillStyle = clip.muted
      ? "rgba(116, 111, 99, 0.28)"
      : selected
        ? "rgba(184, 139, 74, 0.34)"
        : "rgba(49, 95, 76, 0.2)";
    ctx.strokeStyle = selected ? "rgba(184, 139, 74, 0.95)" : clip.trackId === "A" ? "rgba(49, 95, 76, 0.72)" : "rgba(111, 31, 27, 0.72)";
    ctx.lineWidth = selected ? 2 * ratio : 1 * ratio;
    ctx.fillRect(x, y, w, clipHeight);
    ctx.strokeRect(x, y, w, clipHeight);
    if (selected) {
      ctx.fillStyle = "rgba(255, 250, 238, 0.9)";
      ctx.fillRect(x, y, Math.min(8 * ratio, w / 3), clipHeight);
      ctx.fillRect(x + w - Math.min(8 * ratio, w / 3), y, Math.min(8 * ratio, w / 3), clipHeight);
    }
    if (w > 70 * ratio) {
      ctx.fillStyle = "rgba(31, 33, 31, 0.72)";
      ctx.font = `${11 * ratio}px Microsoft YaHei, sans-serif`;
      ctx.fillText(clip.name, x + 8 * ratio, y + 23 * ratio);
    }
  });

  const selection = editorState.selection;
  const track = getTrack(selection.trackId);
  if (track?.buffer && selection.sourceEnd > selection.sourceStart) {
    const lane = layout.find((item) => item.track.id === selection.trackId);
    if (!lane) return;
    const selectionDuration = Math.max(0, selection.sourceEnd - selection.sourceStart);
    const selectionStart = Number.isFinite(selection.timelineStart) ? selection.timelineStart : selection.sourceStart;
    const x1 = timeToX(selectionStart, width, duration, offset);
    const x2 = timeToX(selectionStart + selectionDuration, width, duration, offset);
    const y = lane.top;
    ctx.fillStyle = "rgba(111, 31, 27, 0.16)";
    ctx.fillRect(x1, y, Math.max(2 * ratio, x2 - x1), lane.height);
    ctx.strokeStyle = "rgba(111, 31, 27, 0.82)";
    ctx.lineWidth = 2 * ratio;
    ctx.strokeRect(x1, y + 1 * ratio, Math.max(2 * ratio, x2 - x1), lane.height - 2 * ratio);
  }

  const playheadX = timeToX(editorState.timeline.playhead, width, duration, offset);
  if (playheadX >= 0 && playheadX <= width) {
    ctx.strokeStyle = "rgba(31, 33, 31, 0.85)";
    ctx.lineWidth = 2 * ratio;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, height);
    ctx.stroke();
    const handleY = height - 15 * ratio;
    ctx.fillStyle = "rgba(31, 33, 31, 0.92)";
    ctx.beginPath();
    ctx.arc(playheadX, handleY, 10 * ratio, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fffaf0";
    ctx.beginPath();
    ctx.moveTo(playheadX - 4 * ratio, handleY - 3 * ratio);
    ctx.lineTo(playheadX + 4 * ratio, handleY);
    ctx.lineTo(playheadX - 4 * ratio, handleY + 3 * ratio);
    ctx.closePath();
    ctx.fill();
  }
}

function getCanvasPointer(event) {
  const canvas = $("#waveformCanvas");
  const info = canvasTimelineInfo(canvas);
  const x = (event.clientX - info.rect.left) * info.ratio;
  const y = (event.clientY - info.rect.top) * info.ratio;
  const lane = info.layout.find((item) => y >= item.top && y <= item.top + item.height) || info.layout[info.layout.length - 1];
  const trackIndex = lane?.index ?? 0;
  const track = lane?.track || editorState.tracks[trackIndex];
  const time = xToTime(x, info.width, info.duration, info.offset, info.projectDuration);
  return { canvas, ...info, x, y, lane, trackIndex, track, time };
}

function hitTestClip(point) {
  const handleSize = 18 * point.ratio;
  for (let index = editorState.clips.length - 1; index >= 0; index -= 1) {
    const clip = editorState.clips[index];
    if (clip.trackId !== point.track.id) continue;
    const lane = point.layout.find((item) => item.track.id === clip.trackId);
    if (!lane) continue;
    const start = clip.timelineStart;
    const end = clip.timelineStart + clip.sourceEnd - clip.sourceStart;
    const x1 = timeToX(start, point.width, point.duration, point.offset);
    const x2 = timeToX(end, point.width, point.duration, point.offset);
    const y1 = lane.top;
    const y2 = y1 + lane.height;
    if (point.x < x1 || point.x > x2 || point.y < y1 || point.y > y2) continue;
    const edge = Math.abs(point.x - x1) < handleSize ? "clip-left" : Math.abs(point.x - x2) < handleSize ? "clip-right" : "clip-move";
    return { clip, edge };
  }
  return null;
}

function hitTestPlayheadHandle(point) {
  const playheadX = timeToX(editorState.timeline.playhead, point.width, point.duration, point.offset);
  const nearHandle = Math.abs(point.x - playheadX) <= 22 * point.ratio;
  return nearHandle && point.y >= point.height - 44 * point.ratio;
}

function getClipSourceAtTimelineTime(clip, timelineTime) {
  const sourceTime = clip.sourceStart + (timelineTime - clip.timelineStart);
  return clamp(sourceTime, clip.sourceStart, clip.sourceEnd);
}

function hitTestTrackDivider(point) {
  const threshold = 10 * point.ratio;
  for (let index = 0; index < point.layout.length - 1; index += 1) {
    const boundary = point.layout[index].top + point.layout[index].height;
    if (Math.abs(point.y - boundary) <= threshold) return index;
  }
  return -1;
}

function beginTrackResize(boundaryIndex, point) {
  editorState.drag = {
    type: "track-resize",
    boundaryIndex,
    startY: point.y,
    originalWeights: editorState.tracks.map((track) => track.heightWeight || 1)
  };
  setTimelineDragClass("resizing-track", true);
}

function moveTrackResize(point) {
  const drag = editorState.drag;
  const upper = editorState.tracks[drag.boundaryIndex];
  const lower = editorState.tracks[drag.boundaryIndex + 1];
  if (!upper || !lower) return;
  const totalWeight = drag.originalWeights.reduce((sum, value) => sum + value, 0) || editorState.tracks.length;
  const deltaWeight = ((point.y - drag.startY) / Math.max(1, point.height)) * totalWeight;
  const upperNext = clamp(drag.originalWeights[drag.boundaryIndex] + deltaWeight, 0.45, 3.2);
  const lowerNext = clamp(drag.originalWeights[drag.boundaryIndex + 1] - deltaWeight, 0.45, 3.2);
  upper.heightWeight = upperNext;
  lower.heightWeight = lowerNext;
  renderWaveform();
}

function expandActiveTrackHeight() {
  const active = getActiveTrack();
  editorState.tracks.forEach((track) => {
    track.heightWeight = track.id === active.id ? 1.85 : 0.8;
  });
  renderWaveform();
  showToast(`已放大 ${active.name}，也可以拖动轨道分隔线。`, "ok");
}

function resetTrackHeights() {
  editorState.tracks.forEach((track) => {
    track.heightWeight = 1;
  });
  renderWaveform();
  showToast("轨道高度已均分。", "ok");
}

function setTimelineDragClass(className, enabled) {
  $(".waveform-wrap")?.classList.toggle(className, enabled);
}

function beginClipDrag(hit, point) {
  pushEditorHistory();
  editorState.drag = {
    type: hit.edge,
    trackId: hit.clip.trackId,
    clipId: hit.clip.id,
    startTime: point.time,
    originalTimelineStart: hit.clip.timelineStart,
    originalSourceStart: hit.clip.sourceStart,
    originalSourceEnd: hit.clip.sourceEnd
  };
  setTimelineDragClass("long-press-armed", false);
  setTimelineDragClass("dragging", true);
  setPlayhead(point.time);
}

function beginClipRangeSelect(hit, point) {
  const sourceTime = getClipSourceAtTimelineTime(hit.clip, point.time);
  editorState.drag = {
    type: "clip-range-select",
    trackId: hit.clip.trackId,
    clipId: hit.clip.id,
    anchorSource: sourceTime,
    clipSourceStart: hit.clip.sourceStart,
    clipSourceEnd: hit.clip.sourceEnd,
    clipTimelineStart: hit.clip.timelineStart
  };
  setTimelineDragClass("long-press-armed", false);
  setTimelineDragClass("range-selecting", true);
  setClipInputs(sourceTime, sourceTime, point.time);
  setPlayhead(point.time, { snap: false });
}

function placePlayheadInClip(hit, point, { notify = false } = {}) {
  selectEditorClip(hit.clip);
  setPlayhead(point.time, { snap: false, follow: true });
  if (notify) showToast("播放头已放到片段内部。", "ok");
}

function handleTimelineDoubleTap(point, hit) {
  const now = Date.now();
  const previous = editorState.lastTimelineTap;
  editorState.lastTimelineTap = {
    time: now,
    x: point.x,
    y: point.y,
    clipId: hit?.clip?.id || ""
  };
  if (!hit || !previous) return false;
  const sameClip = previous.clipId === hit.clip.id;
  const closeInTime = now - previous.time <= 900;
  const closeInSpace = Math.hypot(point.x - previous.x, point.y - previous.y) <= 28 * point.ratio;
  if (!sameClip || !closeInTime || !closeInSpace) return false;
  clearPendingTimelineDrag();
  placePlayheadInClip(hit, point, { notify: true });
  return true;
}

function clearPendingTimelineDrag() {
  clearTimeout(editorState.longPressTimer);
  editorState.longPressTimer = null;
  editorState.pendingDrag = null;
  setTimelineDragClass("long-press-armed", false);
}

function startTimelineDrag(event) {
  const point = getCanvasPointer(event);
  event.preventDefault();
  if (hitTestPlayheadHandle(point)) {
    point.canvas.setPointerCapture?.(event.pointerId);
    editorState.drag = { type: "playhead" };
    setTimelineDragClass("playhead-dragging", true);
    setPlayhead(point.time, { snap: false, follow: true });
    return;
  }
  const dividerIndex = hitTestTrackDivider(point);
  if (dividerIndex >= 0) {
    point.canvas.setPointerCapture?.(event.pointerId);
    beginTrackResize(dividerIndex, point);
    return;
  }
  if (!point.track?.buffer) return;
  setActiveTrack(point.track.id);
  const hit = hitTestClip(point);
  if (hit) {
    point.canvas.setPointerCapture?.(event.pointerId);
    selectEditorClip(hit.clip);
    setPlayhead(point.time, { snap: false, follow: true });
    if (handleTimelineDoubleTap(point, hit)) return;
    if (event.pointerType === "touch") {
      editorState.pendingDrag = { mode: "touch-range", hit, point, x: point.x, y: point.y };
      setTimelineDragClass("long-press-armed", true);
      clearTimeout(editorState.longPressTimer);
      editorState.longPressTimer = window.setTimeout(() => {
        if (!editorState.pendingDrag || editorState.drag) return;
        const pending = editorState.pendingDrag;
        clearPendingTimelineDrag();
        beginClipRangeSelect(pending.hit, pending.point);
      }, 360);
      return;
    }
    editorState.pendingDrag = { mode: "mouse-clip-drag", hit, point, x: point.x, y: point.y };
    return;
  }
  const selection = editorState.selection;
  const handleSize = 18 * point.ratio;
  const x1 = timeToX(selection.sourceStart, point.width, point.duration, point.offset);
  const x2 = timeToX(selection.sourceEnd, point.width, point.duration, point.offset);
  const inside = point.track.id === selection.trackId && point.x >= x1 && point.x <= x2;
  const type = Math.abs(point.x - x1) < handleSize ? "left" : Math.abs(point.x - x2) < handleSize ? "right" : inside ? "move" : "create";
  editorState.drag = {
    type,
    trackId: point.track.id,
    startTime: point.time,
    originalStart: selection.sourceStart,
    originalEnd: selection.sourceEnd,
    originalTimelineStart: selection.timelineStart
  };
  if (type === "create") setClipInputs(snapTime(point.time), snapTime(point.time), snapTime(point.time));
  setPlayhead(point.time);
  point.canvas.setPointerCapture?.(event.pointerId);
}

function moveTimelineDrag(event) {
  const point = getCanvasPointer(event);
  if (editorState.pendingDrag && !editorState.drag) {
    const pending = editorState.pendingDrag;
    const movement = Math.hypot(point.x - pending.x, point.y - pending.y);
    if (pending.mode === "mouse-clip-drag") {
      if (movement <= 4 * point.ratio) return;
      editorState.pendingDrag = null;
      beginClipDrag(pending.hit, pending.point);
    } else {
      if (movement > 14 * point.ratio) clearPendingTimelineDrag();
      return;
    }
  }
  if (!editorState.drag) return;
  const drag = editorState.drag;
  if (drag.type === "playhead") {
    setPlayhead(point.time, { snap: false, follow: true });
    return;
  }
  if (drag.type === "track-resize") {
    moveTrackResize(point);
    return;
  }
  const track = getTrack(drag.trackId);
  const maxTime = track.buffer?.duration || 0;
  if (!maxTime) return;
  if (drag.type === "clip-range-select") {
    const clip = editorState.clips.find((item) => item.id === drag.clipId);
    if (!clip) return;
    const sourceTime = getClipSourceAtTimelineTime(clip, point.time);
    const start = Math.min(drag.anchorSource, sourceTime);
    const end = Math.max(drag.anchorSource, sourceTime);
    const timelineStart = clip.timelineStart + (start - clip.sourceStart);
    setClipInputs(start, end, timelineStart);
    setPlayhead(point.time, { snap: false });
    return;
  }
  if (drag.type.startsWith("clip-")) {
    const clip = editorState.clips.find((item) => item.id === drag.clipId);
    if (!clip) return;
    const delta = snapTime(point.time) - snapTime(drag.startTime);
    const sourceLength = Math.max(0.1, drag.originalSourceEnd - drag.originalSourceStart);
    if (drag.type === "clip-move") {
      clip.timelineStart = Math.max(0, snapTime(drag.originalTimelineStart + delta));
    } else if (drag.type === "clip-left") {
      const nextStart = clamp(drag.originalSourceStart + delta, 0, drag.originalSourceEnd - 0.1);
      const moved = nextStart - drag.originalSourceStart;
      clip.sourceStart = snapTime(nextStart);
      clip.timelineStart = Math.max(0, snapTime(drag.originalTimelineStart + moved));
    } else if (drag.type === "clip-right") {
      clip.sourceEnd = clamp(snapTime(drag.originalSourceEnd + delta), drag.originalSourceStart + 0.1, maxTime);
    }
    setPlayhead(point.time);
    renderClipList();
    renderWaveform();
    return;
  }
  if (drag.type === "create") {
    const start = Math.min(snapTime(drag.startTime), snapTime(point.time));
    const end = Math.max(snapTime(drag.startTime), snapTime(point.time));
    setClipInputs(start, end, start);
  } else if (drag.type === "left") {
    const start = clamp(snapTime(point.time), 0, drag.originalEnd - 0.1);
    setClipInputs(start, drag.originalEnd, start);
  } else if (drag.type === "right") {
    setClipInputs(drag.originalStart, clamp(snapTime(point.time), drag.originalStart + 0.1, maxTime), editorState.selection.timelineStart);
  } else if (drag.type === "move") {
    const length = Math.max(0.1, drag.originalEnd - drag.originalStart);
    const delta = snapTime(point.time) - snapTime(drag.startTime);
    const start = clamp(drag.originalStart + delta, 0, Math.max(0, maxTime - length));
    const timelineStart = Math.max(0, snapTime((drag.originalTimelineStart || 0) + delta));
    setClipInputs(start, start + length, timelineStart);
  }
  setPlayhead(point.time);
}

function endTimelineDrag() {
  clearPendingTimelineDrag();
  editorState.drag = null;
  setTimelineDragClass("dragging", false);
  setTimelineDragClass("resizing-track", false);
  setTimelineDragClass("range-selecting", false);
  setTimelineDragClass("playhead-dragging", false);
}

function handleTimelineWheel(event) {
  if (document.body.dataset.view !== "editor") return;
  event.preventDefault();
  if (event.ctrlKey || event.metaKey) {
    setTimelineZoom(editorState.timeline.zoom * (event.deltaY < 0 ? 1.18 : 0.85));
    return;
  }
  const visible = getVisibleTimelineDuration();
  const delta = (Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY) / 400;
  setTimelineOffset(editorState.timeline.offset + delta * visible);
}

function handleTimelineDoubleClick(event) {
  if (document.body.dataset.view !== "editor") return;
  const point = getCanvasPointer(event);
  const hit = hitTestClip(point);
  if (!hit) return;
  event.preventDefault();
  placePlayheadInClip(hit, point);
}

function handleTimelineClick(event) {
  if (document.body.dataset.view !== "editor") return;
  const point = getCanvasPointer(event);
  const hit = hitTestClip(point);
  if (!hit) return;
  const now = Date.now();
  const previous = editorState.lastTimelineClick;
  editorState.lastTimelineClick = {
    time: now,
    x: point.x,
    y: point.y,
    clipId: hit.clip.id
  };
  const isDoubleClick = event.detail >= 2 || (
    previous
    && previous.clipId === hit.clip.id
    && now - previous.time <= 900
    && Math.hypot(point.x - previous.x, point.y - previous.y) <= 28 * point.ratio
  );
  if (!isDoubleClick) return;
  event.preventDefault();
  placePlayheadInClip(hit, point, { notify: true });
}

function handleTimelineMouseDown(event) {
  if (event.detail < 2) return;
  handleTimelineDoubleClick(event);
}

function addEditorClip(start, end, timelineStart = editorState.selection.timelineStart, trackId = editorState.selection.trackId) {
  const track = getTrack(trackId);
  if (!track?.buffer) {
    showToast("请先给当前轨道导入音频。", "fail");
    setEditorPanel("import");
    return;
  }
  const safeStart = clamp(start, 0, track.buffer.duration);
  const safeEnd = clamp(end, safeStart, track.buffer.duration);
  if (safeEnd - safeStart < 0.1) {
    showToast("片段太短，请至少保留 0.1 秒。", "fail");
    return;
  }
  pushEditorHistory();
  const clip = {
    id: `clip-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: `${track.name} 片段 ${editorState.clips.filter((clip) => clip.trackId === trackId).length + 1}`,
    trackId,
    sourceStart: safeStart,
    sourceEnd: safeEnd,
    timelineStart: Math.max(0, Number(timelineStart) || 0),
    volume: 1,
    fadeIn: 0,
    fadeOut: 0,
    muted: false
  };
  editorState.clips.push(clip);
  editorState.selectedClipId = clip.id;
  setEditorContext("clips");
  renderClipList();
  renderWaveform();
  showToast(`已加入 ${track.name} 片段。`, "ok");
  return clip;
}

function renderClipList() {
  const list = $("#clipList");
  if (!list) return;
  if (!editorState.clips.length) {
    list.innerHTML = "<p class=\"clip-empty\">还没有时间线片段。拖拽轨道选区后点“加入选区”，或直接导出整轨混音。</p>";
    syncEditorQuickState();
    return;
  }
  list.innerHTML = "";
  editorState.clips
    .slice()
    .sort((a, b) => a.timelineStart - b.timelineStart || a.trackId.localeCompare(b.trackId))
    .forEach((clip, index) => {
      const duration = Math.max(0, clip.sourceEnd - clip.sourceStart);
      const trackOptions = editorState.tracks.map((track) => `<option value="${track.id}" ${track.id === clip.trackId ? "selected" : ""}>${track.name}</option>`).join("");
      const article = document.createElement("article");
      article.className = `clip-item${clip.id === editorState.selectedClipId ? " selected" : ""}`;
      article.dataset.clipId = clip.id;
      article.innerHTML = `
        <div class="clip-head">
          <div>
            <strong>${index + 1}. ${clip.name}</strong>
            <span>${getTrack(clip.trackId).name}｜源 ${formatSeconds(clip.sourceStart)} - ${formatSeconds(clip.sourceEnd)}｜时间线 ${formatSeconds(clip.timelineStart)}｜${formatSeconds(duration)}</span>
          </div>
          <label><input type="checkbox" data-clip-field="muted" ${clip.muted ? "checked" : ""} /> 静音</label>
        </div>
        <div class="clip-fields clip-fields-wide">
          <label>轨道<select data-clip-field="trackId">${trackOptions}</select></label>
          <label>源起点<input type="number" step="0.01" min="0" data-clip-field="sourceStart" value="${clip.sourceStart.toFixed(2)}" /></label>
          <label>源终点<input type="number" step="0.01" min="0" data-clip-field="sourceEnd" value="${clip.sourceEnd.toFixed(2)}" /></label>
          <label>位置<input type="number" step="0.01" min="0" data-clip-field="timelineStart" value="${clip.timelineStart.toFixed(2)}" /></label>
          <label>音量<input type="number" step="0.05" min="0" max="2" data-clip-field="volume" value="${clip.volume.toFixed(2)}" /></label>
          <label>淡入<input type="number" step="0.1" min="0" data-clip-field="fadeIn" value="${clip.fadeIn.toFixed(1)}" /></label>
          <label>淡出<input type="number" step="0.1" min="0" data-clip-field="fadeOut" value="${clip.fadeOut.toFixed(1)}" /></label>
        </div>
        <div class="clip-actions">
          <button class="secondary" data-clip-action="preview">试听</button>
          <button class="secondary" data-clip-action="select">载入选区</button>
          <button class="secondary" data-clip-action="remove">删除</button>
        </div>
      `;
      list.appendChild(article);
    });
  syncEditorQuickState();
}

function updateClipField(clipId, field, value, checked) {
  const clip = editorState.clips.find((item) => item.id === clipId);
  if (!clip) return;
  pushEditorHistory();
  editorState.selectedClipId = clip.id;
  if (field === "muted") {
    clip.muted = checked;
  } else if (field === "trackId") {
    clip.trackId = value;
    const duration = getEditorDuration(value);
    clip.sourceStart = clamp(clip.sourceStart, 0, Math.max(0, duration - 0.1));
    clip.sourceEnd = clamp(clip.sourceEnd, clip.sourceStart + 0.1, duration);
  } else {
    const duration = getEditorDuration(clip.trackId);
    const numeric = Number(value);
    if (field === "sourceStart") clip.sourceStart = clamp(numeric, 0, Math.max(0, clip.sourceEnd - 0.1));
    if (field === "sourceEnd") clip.sourceEnd = clamp(numeric, Math.min(duration, clip.sourceStart + 0.1), duration);
    if (field === "timelineStart") clip.timelineStart = Math.max(0, numeric || 0);
    if (field === "volume") clip.volume = clamp(numeric, 0, 2);
    if (field === "fadeIn") clip.fadeIn = clamp(numeric, 0, Math.max(0, clip.sourceEnd - clip.sourceStart));
    if (field === "fadeOut") clip.fadeOut = clamp(numeric, 0, Math.max(0, clip.sourceEnd - clip.sourceStart));
  }
  renderClipList();
  renderWaveform();
}

function stopEditorPlayback() {
  clearTimeout(editorState.clipTimer);
  cancelAnimationFrame(editorState.playheadRaf);
  editorState.playheadRaf = 0;
  editorState.playingNodes.forEach((node) => {
    try { node.stop(); } catch {}
  });
  editorState.playingNodes = [];
  syncEditorPlaybackButtons(false);
}

function animatePreviewPlayhead() {
  cancelAnimationFrame(editorState.playheadRaf);
  const tick = () => {
    const next = editorState.playbackStartPlayhead + Math.max(0, Date.now() / 1000 - editorState.playbackStartClock);
    setPlayhead(Math.min(editorState.playbackDuration, next), { snap: false, follow: true });
    if (next < editorState.playbackDuration && editorState.playingNodes.length) {
      editorState.playheadRaf = requestAnimationFrame(tick);
    } else {
      editorState.playheadRaf = 0;
      setPlayhead(editorState.playbackDuration, { snap: false });
      syncEditorPlaybackButtons(false);
    }
  };
  editorState.playheadRaf = requestAnimationFrame(tick);
}

function playEditorClip(clipId) {
  const clip = editorState.clips.find((item) => item.id === clipId);
  const track = getTrack(clip?.trackId);
  if (!clip || !track?.buffer) return;
  stopEditorPlayback();
  const context = getEditorAudioContext();
  if (context.state === "suspended") context.resume();
  const source = context.createBufferSource();
  const gain = context.createGain();
  source.buffer = track.buffer;
  gain.gain.value = clip.muted || track.muted ? 0 : clamp(clip.volume * track.volume, 0, 2);
  source.connect(gain).connect(context.destination);
  source.start(0, clip.sourceStart, Math.max(0.1, clip.sourceEnd - clip.sourceStart));
  editorState.playingNodes = [source];
}

function handleClipAction(clipId, action) {
  const clip = editorState.clips.find((item) => item.id === clipId);
  if (!clip) return;
  if (action === "preview") playEditorClip(clipId);
  if (action === "select") {
    selectEditorClip(clip);
    setEditorPanel("select");
    showToast("已把片段载入选区。", "ok");
  }
  if (action === "remove") {
    pushEditorHistory();
    editorState.clips = editorState.clips.filter((item) => item.id !== clipId);
    if (editorState.selectedClipId === clipId) editorState.selectedClipId = "";
    renderClipList();
    renderWaveform();
    showToast("已删除片段，可撤销。", "ok");
  }
}

function splitClipAtPlayhead() {
  const playhead = editorState.timeline.playhead;
  const clip = editorState.clips.find((item) => {
    if (item.trackId !== editorState.activeTrackId) return false;
    const duration = item.sourceEnd - item.sourceStart;
    return playhead > item.timelineStart + 0.05 && playhead < item.timelineStart + duration - 0.05;
  });
  if (!clip) {
    showToast("请把播放头放在当前轨道某个片段内部。", "fail");
    return;
  }
  pushEditorHistory();
  const sourceSplit = clip.sourceStart + (playhead - clip.timelineStart);
  const right = {
    ...clip,
    id: `clip-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: `${clip.name} B`,
    sourceStart: sourceSplit,
    timelineStart: playhead
  };
  clip.name = `${clip.name} A`;
  clip.sourceEnd = sourceSplit;
  editorState.clips.push(right);
  editorState.selectedClipId = right.id;
  renderClipList();
  renderWaveform();
  showToast("已在播放头处分割片段。", "ok");
}

function getRenderableClips() {
  const loadedTracks = editorState.tracks.filter((track) => track.buffer);
  if (!loadedTracks.length) throw new Error("请先给至少一条轨道导入音频。");
  const soloTracks = editorState.tracks.filter((track) => track.solo).map((track) => track.id);
  const sourceClips = editorState.clips.length
    ? editorState.clips
    : loadedTracks.map((track) => ({
        id: `whole-${track.id}`,
        name: `${track.name} 整轨`,
        trackId: track.id,
        sourceStart: 0,
        sourceEnd: track.buffer.duration,
        timelineStart: 0,
        volume: 1,
        fadeIn: 0,
        fadeOut: 0,
        muted: false
      }));
  const clips = sourceClips.filter((clip) => {
    const track = getTrack(clip.trackId);
    if (!track?.buffer || clip.muted || track.muted) return false;
    return !soloTracks.length || soloTracks.includes(track.id);
  });
  if (!clips.length) throw new Error("所有轨道或片段都被静音了。");
  return { clips, loadedTracks };
}

async function renderEditorMixBuffer() {
  const { clips, loadedTracks } = getRenderableClips();
  const sampleRate = loadedTracks[0].buffer.sampleRate || 44100;
  const totalDuration = clips.reduce((max, clip) => Math.max(max, clip.timelineStart + Math.max(0, clip.sourceEnd - clip.sourceStart)), 0);
  if (totalDuration <= 0) throw new Error("没有可导出的有效时长。");
  const offline = new OfflineAudioContext(2, Math.ceil(totalDuration * sampleRate), sampleRate);
  for (const clip of clips) {
    const track = getTrack(clip.trackId);
    const duration = Math.max(0, clip.sourceEnd - clip.sourceStart);
    if (duration <= 0) continue;
    const source = offline.createBufferSource();
    const gain = offline.createGain();
    source.buffer = track.buffer;
    const volume = clamp((clip.volume || 1) * (track.volume || 1), 0, 2);
    const fadeIn = Math.min(duration, Math.max(0, clip.fadeIn || 0));
    const fadeOut = Math.min(duration, Math.max(0, clip.fadeOut || 0));
    const startAt = Math.max(0, clip.timelineStart);
    gain.gain.setValueAtTime(fadeIn > 0 ? 0 : volume, startAt);
    if (fadeIn > 0) gain.gain.linearRampToValueAtTime(volume, startAt + fadeIn);
    gain.gain.setValueAtTime(volume, Math.max(startAt, startAt + duration - fadeOut));
    if (fadeOut > 0) gain.gain.linearRampToValueAtTime(0, startAt + duration);
    source.connect(gain).connect(offline.destination);
    source.start(startAt, clip.sourceStart, duration);
  }
  return offline.startRendering();
}

async function previewTimelineMix() {
  if (editorState.playingNodes.length) {
    stopEditorPlayback();
    return;
  }
  stopEditorPlayback();
  try {
    const { clips } = getRenderableClips();
    const context = getEditorAudioContext();
    if (context.state === "suspended") context.resume();
    const totalDuration = clips.reduce((max, clip) => Math.max(max, clip.timelineStart + getClipDuration(clip)), 0);
    const currentPlayhead = editorState.timeline.playhead >= totalDuration - 0.05 ? 0 : editorState.timeline.playhead;
    const startAt = Math.min(currentPlayhead, Math.max(0, totalDuration - 0.05));
    const now = context.currentTime;
    const nodes = [];
    clips.forEach((clip) => {
      const track = getTrack(clip.trackId);
      if (!track?.buffer) return;
      const clipDuration = getClipDuration(clip);
      const clipEnd = clip.timelineStart + clipDuration;
      if (clipEnd <= startAt) return;
      const delay = Math.max(0, clip.timelineStart - startAt);
      const skipped = Math.max(0, startAt - clip.timelineStart);
      const sourceOffset = clip.sourceStart + skipped;
      const duration = Math.max(0.05, clip.sourceEnd - sourceOffset);
      const source = context.createBufferSource();
      const gain = context.createGain();
      const volume = clamp((clip.volume || 1) * (track.volume || 1), 0, 2);
      const startTime = now + delay;
      source.buffer = track.buffer;
      gain.gain.setValueAtTime(volume, startTime);
      if (clip.fadeIn > 0 && skipped < clip.fadeIn) {
        const initial = clamp(skipped / clip.fadeIn, 0, 1) * volume;
        gain.gain.setValueAtTime(initial, startTime);
        gain.gain.linearRampToValueAtTime(volume, startTime + Math.max(0.01, clip.fadeIn - skipped));
      }
      if (clip.fadeOut > 0) {
        const fadeStartInClip = Math.max(0, clipDuration - clip.fadeOut);
        const fadeStart = startTime + Math.max(0, fadeStartInClip - skipped);
        if (fadeStart < startTime + duration) {
          gain.gain.setValueAtTime(volume, fadeStart);
          gain.gain.linearRampToValueAtTime(0, startTime + duration);
        }
      }
      source.connect(gain).connect(context.destination);
      source.onended = () => {
        editorState.playingNodes = editorState.playingNodes.filter((node) => node !== source);
        if (!editorState.playingNodes.length) {
          cancelAnimationFrame(editorState.playheadRaf);
          editorState.playheadRaf = 0;
          setPlayhead(editorState.playbackDuration, { snap: false });
          syncEditorPlaybackButtons(false);
          syncEditorQuickState();
        }
      };
      source.start(startTime, sourceOffset, duration);
      nodes.push(source);
    });
    if (!nodes.length) throw new Error("播放头后面没有可预听的片段。");
    editorState.playingNodes = nodes;
    editorState.playbackStartClock = Date.now() / 1000;
    editorState.playbackStartPlayhead = startAt;
    editorState.playbackDuration = totalDuration;
    syncEditorPlaybackButtons(true);
    animatePreviewPlayhead();
  } catch (error) {
    showToast(`预听失败：${error.message}`, "fail");
  }
}

function audioBufferToWav(buffer) {
  const numberOfChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const sampleCount = buffer.length;
  const bytesPerSample = 2;
  const blockAlign = numberOfChannels * bytesPerSample;
  const dataSize = sampleCount * blockAlign;
  const arrayBuffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(arrayBuffer);
  const writeString = (offset, value) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
  };
  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, dataSize, true);
  let offset = 44;
  const channels = Array.from({ length: numberOfChannels }, (_, channel) => buffer.getChannelData(channel));
  for (let i = 0; i < sampleCount; i++) {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, channels[channel][i] || 0));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([arrayBuffer], { type: "audio/wav" });
}

async function exportEditorMix() {
  setButtonBusy("#exportMix", true, "导出中...");
  setButtonBusy("#quickExportMix", true, "导出中...");
  $("#editorResult").classList.add("hidden");
  try {
    const rendered = await renderEditorMixBuffer();
    const blob = audioBufferToWav(rendered);
    if (editorState.renderedUrl) URL.revokeObjectURL(editorState.renderedUrl);
    editorState.renderedUrl = URL.createObjectURL(blob);
    const fileName = "白泽声工坊-双轨混音.wav";
    $("#editorResult").classList.remove("hidden");
    $("#editorResult").innerHTML = `
      <strong>混音完成：</strong>${fileName}<br />
      <audio controls src="${editorState.renderedUrl}"></audio>
      <div class="actions">
        <button data-play-src="${editorState.renderedUrl}" data-play-title="${fileName}">送到播放器</button>
        <a download="${fileName}" href="${editorState.renderedUrl}">下载 WAV</a>
      </div>
    `;
    showToast("双轨混音导出完成。", "ok");
    if (blob.size <= 3500000) {
      saveLocalHistory({
        jobId: `edit-${Date.now()}`,
        title: fileName,
        createdAt: new Date().toISOString(),
        finalAudioDataUrl: await fileToDataUrl(blob),
        manifest: ""
      });
    }
  } catch (error) {
    $("#editorResult").classList.remove("hidden");
    $("#editorResult").innerHTML = `<strong>导出失败：</strong>${error.message}`;
    showToast(`导出失败：${error.message}`, "fail");
  } finally {
    setButtonBusy("#exportMix", false);
    setButtonBusy("#quickExportMix", false);
  }
}

function getVoiceReferences() {
  try {
    return JSON.parse(localStorage.getItem(voiceRefsKey) || "[]");
  } catch {
    return [];
  }
}

function saveVoiceReferences(references) {
  localStorage.setItem(voiceRefsKey, JSON.stringify(references.slice(0, 12)));
  renderVoiceReferences();
}

function renderVoiceReferences() {
  const box = $("#voiceRefList");
  if (!box) return;
  const references = getVoiceReferences();
  if (!references.length) {
    box.innerHTML = "<p class=\"hint\">还没有角色音色参考。添加后，完整创作和直接生成音频都会自动带上这些参考。</p>";
    return;
  }
  box.innerHTML = "";
  references.forEach((item) => {
    const row = document.createElement("article");
    row.className = "voice-ref-item";
    row.innerHTML = `
      <div>
        <strong>${item.role}</strong>
        <span>${item.fileName || "参考音频"}</span>
      </div>
      <audio controls src="${item.dataUrl}"></audio>
      <button class="secondary" data-remove-voice-ref="${item.id}">删除</button>
    `;
    box.appendChild(row);
  });
}

async function addVoiceReference() {
  const role = $("#voiceRoleInput").value.trim();
  const file = $("#voiceRefFile").files?.[0];
  if (!role) {
    showToast("请先填写角色名。", "fail");
    $("#voiceRoleInput").focus();
    return;
  }
  if (!file) {
    showToast("请先选择参考音频文件。", "fail");
    return;
  }
  const dataUrl = await fileToDataUrl(file);
  const references = getVoiceReferences();
  references.unshift({
    id: `voice-${Date.now()}`,
    role,
    fileName: file.name,
    mimeType: file.type || "audio/wav",
    dataUrl
  });
  $("#voiceRoleInput").value = "";
  $("#voiceRefFile").value = "";
  saveVoiceReferences(references);
  showToast(`已添加 ${role} 的音色参考。`, "ok");
}

function fillDirectPromptDemo() {
  $("#directPromptInput").value = `【音频类型】广播剧片段
【时长】约 60 秒
【整体情绪】雨夜、悬疑、克制，情绪逐步压低。
【场景空间】旧档案室，室内安静，窗外雨声和远处车流。
【音乐设计】低音量悬疑铺底，不要歌词，关键对白时音乐退后。
【环境声】雨声贯穿，偶尔有远处车辆经过。
【角色声线】旁白沉稳，林舟压低声线，沈清紧张克制。
【对白内容】
旁白：雨下得很密，旧城区的路灯像隔着一层雾。
林舟（压低声音）：这件事……我本来不想再提。
沈清（短吸气）：可现在，已经来不及了。
【音效时间线】18 秒门轴轻响，42 秒杯子轻碰桌面。
【混音要求】对白始终靠前，雨声和音乐在背景层。
【禁止事项】不要朗诵腔，不要模仿真实名人声线。`;
  saveCreatorDraft();
  showToast("已填入提示词示例。", "ok");
}

async function loadSamplePrompt(details) {
  if (!details?.open) return;
  const target = details.querySelector("[data-prompt-src]");
  if (!target || target.dataset.loaded === "true") return;
  try {
    const response = await fetch(target.dataset.promptSrc);
    if (!response.ok) throw new Error("load failed");
    target.textContent = await response.text();
    target.dataset.loaded = "true";
  } catch {
    target.textContent = "提示词加载失败，请检查示例资源是否已打包。";
  }
}

async function runDirectAudio() {
  const promptText = $("#directPromptInput").value.trim();
  const title = $("#titleInput").value.trim() || "直接提示词音频";
  if (!promptText) {
    showToast("请先上传或粘贴音频提示词。", "fail");
    $("#directPromptInput").focus();
    return;
  }

  setButtonBusy("#runDirectAudioButton", true, "生成中...");
  $("#directResultBox").classList.add("hidden");
  $("#directResultBox").textContent = "";
  try {
    const config = getConfig();
    config.voiceReferences = getVoiceReferences();
    let result;
    try {
      result = await apiJson("/api/audio-direct", { title, promptText, config }, config);
    } catch (error) {
      if (getRelayBaseUrl(config)) {
        throw new Error(`后端中转不可用：${error.message}`);
      }
      result = await runDirectAudioPipeline({ title, promptText, config });
    }

    const links = normalizeResultLinks(result, payload.config);
    let savedDownloads = null;
    try {
      savedDownloads = await saveGeneratedSegmentsToDownloads(result, links);
    } catch (error) {
      showToast(`音频已生成，但自动保存到下载文件夹失败：${error.message || error}`, "fail");
    }
    $("#directResultBox").classList.remove("hidden");
    $("#directResultBox").innerHTML = `
      <strong>${result.title}</strong><br />
      已跳过编剧流程，直接生成音频。${savedDownloads?.count ? `<br />已按顺序保存 ${savedDownloads.count} 段音频到：${escapeHtml(savedDownloads.folder || "下载文件夹")}` : ""}<br />
      <a href="${links.audioPrompts}" target="_blank">查看使用的提示词</a>　
      ${links.finalAudio ? `<button data-play-src="${links.finalAudio}" data-play-title="${result.title}">在播放器收听</button>　<a href="${links.finalAudio}" target="_blank">下载音频</a>　` : ""}
      <a href="${links.manifest}" target="_blank">查看任务详情</a>
    `;
    showToast(savedDownloads?.count ? "直接音频生成完成，已保存到下载文件夹。" : "直接音频生成完成。", "ok");
    if (links.finalAudio) playInApp(links.finalAudio, result.title);
    saveLocalHistory({
      jobId: result.jobId,
      title: result.title,
      createdAt: new Date().toISOString(),
      finalAudio: links.finalAudio,
      finalAudioDataUrl: links.finalAudioDataUrl,
      manifest: links.manifest
    });
  } catch (error) {
    $("#directResultBox").classList.remove("hidden");
    $("#directResultBox").innerHTML = `<strong>生成失败：</strong>${error.message}`;
    showToast(`生成失败：${error.message}`, "fail");
  } finally {
    setButtonBusy("#runDirectAudioButton", false);
  }
}

function loadConfigIntoForm() {
  const config = getConfig();
  if (config.network?.profile === "vpn") config.network.profile = "proxy";
  $$("[data-config]").forEach((field) => {
    field.value = getByPath(config, field.dataset.config) || "";
  });
  markConfigDirty(localStorage.getItem(configDirtyKey) === "yes");
}

function saveConfigFromForm() {
  const config = getConfig();
  $$("[data-config]").forEach((field) => {
    setByPath(config, field.dataset.config, field.value.trim());
  });
  localStorage.setItem("apiConfig", JSON.stringify(config));
  markConfigDirty(false);
  showToast("配置已保存在本机。正式产品建议改为服务端加密保存。", "ok");
}

function saveConfigObject(config) {
  localStorage.setItem("apiConfig", JSON.stringify(config));
  markConfigDirty(false);
  loadConfigIntoForm();
}

function applyNetworkPreset(profile) {
  const config = getConfig();
  const useProxy = profile === "proxy" || profile === "vpn";
  config.network ||= {};
  config.network.profile = useProxy ? "proxy" : profile;
  config.network.timeoutSeconds = useProxy ? "180" : "120";
  config.network.retryCount = useProxy ? "2" : "1";
  if (profile === "china") {
    config.doubao.baseUrl = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";
    config.qwen.baseUrl = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";
    config.kimi.baseUrl = "https://api.moonshot.cn/v1/chat/completions";
    config.audio.endpoint = "https://openspeech.bytedance.com/api/v3/tts/create";
    config.audio.model = "seed-audio-1.0";
  }
  if (useProxy) {
    config.gpt.baseUrl = "https://api.openai.com/v1/chat/completions";
    config.gemini.endpoint = "";
    config.doubao.baseUrl = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";
    config.qwen.baseUrl = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";
    config.kimi.baseUrl = "https://api.moonshot.cn/v1/chat/completions";
    config.audio.endpoint = "https://openspeech.bytedance.com/api/v3/tts/create";
  }
  saveConfigObject(config);
  const label = useProxy ? "系统代理优先" : "中国大陆优先";
  $("#networkStatus").innerHTML = `<p class="ok">已套用「${label}」线路预设，记得保存或继续填写 API Key。</p>`;
  showToast(`已套用「${label}」线路预设。`, "ok");
}

function getProbeUrl(label, config) {
  if (label === "GPT") return config.gpt?.baseUrl || defaultConfig.gpt.baseUrl;
  if (label === "Gemini") return config.gemini?.endpoint || "https://generativelanguage.googleapis.com/";
  if (label === "豆包文本") return config.doubao?.baseUrl || defaultConfig.doubao.baseUrl;
  if (label === "千问") return config.qwen?.baseUrl || defaultConfig.qwen.baseUrl;
  if (label === "Kimi") return config.kimi?.baseUrl || defaultConfig.kimi.baseUrl;
  if (label === "豆包音频") return config.audio?.endpoint || defaultConfig.audio.endpoint;
  if (label === "Grok") return config.grok?.baseUrl || defaultConfig.grok.baseUrl;
  if (label === "中转服务") return config.network?.relayBaseUrl || "";
  return "";
}

async function probeNetwork(label, url, timeoutMs) {
  if (!url) return { label, ok: false, message: "未填写地址，已跳过" };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();
  try {
    const target = new URL(url);
    await fetch(target.href, {
      method: "GET",
      mode: "no-cors",
      cache: "no-store",
      signal: controller.signal
    });
    return {
      label,
      ok: true,
      message: `${target.host} 可发起连接，约 ${Date.now() - startedAt}ms`
    };
  } catch (error) {
    return {
      label,
      ok: false,
      message: `${error.name === "AbortError" ? "连接超时" : "当前网络不可达"}：${url}`
    };
  } finally {
    clearTimeout(timer);
  }
}

async function testNetworkRoutes() {
  const config = getConfig();
  setButtonBusy("#testNetwork", true, "诊断中...");
  try {
    $("#networkStatus").innerHTML = "<p>正在诊断当前网络线路...</p>";
    const timeoutMs = Math.max(5000, Math.min(300000, Number(config.network?.timeoutSeconds || 120) * 1000));
    const labels = ["GPT", "Gemini", "豆包文本", "千问", "Kimi", "豆包音频", "Grok"];
    if (config.network?.relayBaseUrl) labels.push("中转服务");
    let results = [];
    let serverManaged = null;
    if (getRelayBaseUrl(config)) {
      const serverResult = await apiJson("/api/network-test", { config, labels: ["GPT", "Gemini", "豆包文本", "千问", "Kimi", "豆包音频", "Grok"] }, config);
      results = serverResult.results || [];
      serverManaged = serverResult.serverManaged;
    } else {
      for (const label of labels) {
        results.push(await probeNetwork(label, getProbeUrl(label, config), timeoutMs));
      }
    }
    const serverSummary = serverManaged ? `
      <p class="ok"><strong>后端中转</strong>：已连接。服务端 Key 状态：豆包文本 ${serverManaged.doubao?.hasApiKey ? "已配置" : "未配置"}，千问 ${serverManaged.qwen?.hasApiKey ? "已配置" : "未配置"}，Kimi ${serverManaged.kimi?.hasApiKey ? "已配置" : "未配置"}，豆包音频 ${serverManaged.audio?.hasApiKey ? "已配置" : "未配置"}。</p>
    ` : "";
    $("#networkStatus").innerHTML = results.map((item) => `
      <p class="${item.ok ? "ok" : "fail"}"><strong>${item.label}</strong>：${item.message}</p>
    `).join("") + serverSummary;
    showToast("联网诊断完成。", "ok");
  } catch (error) {
    $("#networkStatus").innerHTML = `<p class="fail">诊断失败：${error.message}</p>`;
    showToast(`联网诊断失败：${error.message}`, "fail");
  } finally {
    setButtonBusy("#testNetwork", false);
  }
}

function isMidnightUnlocked() {
  return localStorage.getItem(midnightUnlockKey) === "yes";
}

function isMidnightRemoved() {
  return localStorage.getItem(midnightRemovedKey) === "yes";
}

function getMidnightFailCount() {
  return Number(localStorage.getItem(midnightFailKey) || 0);
}

function setAppIntroModal(open) {
  $("#appIntroModal")?.classList.toggle("hidden", !open);
  document.body.classList.toggle("modal-open", open || !$("#midnightModal")?.classList.contains("hidden"));
  if (open) requestAnimationFrame(() => $("#closeAppIntro")?.focus());
}

function showAppIntroIfNeeded() {
  if (localStorage.getItem(appIntroSeenKey) === "yes") return;
  setAppIntroModal(true);
}

function closeAppIntroModal() {
  if ($("#dontShowAppIntro")?.checked) localStorage.setItem(appIntroSeenKey, "yes");
  setAppIntroModal(false);
}

function setMidnightModal(open) {
  $("#midnightModal").classList.toggle("hidden", !open);
  document.body.classList.toggle("modal-open", open || !$("#appIntroModal")?.classList.contains("hidden"));
  updateMidnightState();
  if (open) requestAnimationFrame(() => $("#closeMidnightModal")?.focus());
}

async function openMidnightGate() {
  setMidnightModal(true);
  if (!isMidnightUnlocked() && !isMidnightRemoved()) {
    await startMidnightQuiz();
  }
}

function updateMidnightState() {
  const unlocked = isMidnightUnlocked();
  const removed = isMidnightRemoved();
  $("#midnightCatButton")?.classList.toggle("hidden", removed);
  $("#grokProvider")?.classList.toggle("hidden", removed);
  $("#midnightGate")?.classList.toggle("hidden", unlocked || removed);
  $("#midnightUnlocked")?.classList.toggle("hidden", !unlocked || removed);
  $("#grokProvider")?.classList.toggle("locked", !unlocked);
  $$("[data-config^='grok.']").forEach((field) => {
    field.disabled = !unlocked || removed;
  });
  const configButton = $("#openMidnightGateFromConfig");
  if (configButton) {
    configButton.disabled = removed;
    configButton.textContent = removed ? "本机已隐藏" : unlocked ? "已解锁" : "打开门禁";
  }
  if (removed && !$("#midnightModal")?.classList.contains("hidden")) {
    $("#midnightQuizResult").innerHTML = "<p class=\"fail\">连续 6 次未通过，本机已隐藏午夜猫娘入口。</p>";
  }
}

function bytesFromBase64(value) {
  const raw = atob(value);
  const bytes = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) {
    bytes[index] = raw.charCodeAt(index);
  }
  return bytes;
}

async function decryptMidnightQuiz(payload) {
  const encoder = new TextEncoder();
  const keyBytes = await crypto.subtle.digest("SHA-256", encoder.encode(midnightQuizSecret));
  const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["decrypt"]);
  const body = bytesFromBase64(payload.data);
  const tag = bytesFromBase64(payload.tag);
  const encrypted = new Uint8Array(body.length + tag.length);
  encrypted.set(body);
  encrypted.set(tag, body.length);
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: bytesFromBase64(payload.iv) },
    key,
    encrypted
  );
  return JSON.parse(new TextDecoder().decode(plain));
}

async function loadMidnightQuizBank() {
  if (midnightQuizState.bank.length) return midnightQuizState.bank;
  if (midnightQuizState.loading) return midnightQuizState.loading;
  midnightQuizState.loading = fetch(midnightQuizUrl, { cache: "no-store" })
    .then((response) => {
      if (!response.ok) throw new Error(`题库读取失败：${response.status}`);
      return response.json();
    })
    .then((payload) => decryptMidnightQuiz(payload))
    .then((bank) => {
      midnightQuizState.bank = Array.isArray(bank.questions) ? bank.questions : [];
      if (midnightQuizState.bank.length < 7) throw new Error("题库数量不足，至少需要 7 题。");
      return midnightQuizState.bank;
    })
    .finally(() => {
      midnightQuizState.loading = null;
    });
  return midnightQuizState.loading;
}

function pickRandomQuestions(bank, count = 7) {
  const copy = [...bank];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy.slice(0, count);
}

function getStoredQuizSession(bank) {
  try {
    const ids = JSON.parse(localStorage.getItem(midnightQuizSessionKey) || "[]");
    const selected = ids
      .map((id) => bank.find((question) => question.id === id))
      .filter(Boolean);
    return selected.length === 7 ? selected : [];
  } catch {
    return [];
  }
}

function createMidnightQuizSession(bank) {
  const selected = pickRandomQuestions(bank, 7);
  localStorage.setItem(midnightQuizSessionKey, JSON.stringify(selected.map((question) => question.id)));
  midnightQuizState.selected = selected;
  return selected;
}

function renderMidnightQuiz() {
  const list = $("#midnightQuizList");
  if (!list) return;
  list.innerHTML = midnightQuizState.selected.map((question, index) => `
    <fieldset class="quiz-question" data-quiz-id="${question.id}">
      <legend>${index + 1}. ${question.stem}</legend>
      ${question.options.map((option) => `
        <label>
          <input type="checkbox" value="${option.id}" />
          ${option.id}. ${option.text}
        </label>
      `).join("")}
    </fieldset>
  `).join("");
  const remaining = Math.max(0, 6 - getMidnightFailCount());
  $("#midnightAttemptStatus").textContent = `剩余机会：${remaining} 次`;
  $("#midnightQuestionStatus").textContent = "本次随机抽取 7 道题，全部答对才会解锁。";
}

async function startMidnightQuiz(forceNew = false) {
  if (isMidnightUnlocked() || isMidnightRemoved()) {
    updateMidnightState();
    return;
  }
  $("#midnightAttemptStatus").textContent = "正在读取加密题库...";
  $("#midnightQuestionStatus").textContent = "题库会在本机解密后随机抽题。";
  $("#midnightQuizResult").textContent = "";
  try {
    const bank = await loadMidnightQuizBank();
    midnightQuizState.selected = forceNew ? [] : getStoredQuizSession(bank);
    if (!midnightQuizState.selected.length) createMidnightQuizSession(bank);
    renderMidnightQuiz();
  } catch (error) {
    $("#midnightAttemptStatus").textContent = "题库加载失败";
    $("#midnightQuizResult").innerHTML = `<p class="fail">${error.message}</p>`;
  }
}

function selectedQuizValues(questionId) {
  return $$(`[data-quiz-id="${questionId}"] input:checked`).map((input) => input.value).sort();
}

function sameValues(a, b) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function questionPassed(question) {
  return sameValues(selectedQuizValues(question.id), [...question.correct].sort());
}

function hideMidnightEntranceLocally() {
  localStorage.setItem(midnightRemovedKey, "yes");
  localStorage.removeItem(midnightUnlockKey);
  localStorage.removeItem(midnightQuizSessionKey);
  $("#midnightQuizList").innerHTML = "";
  $("#midnightQuizResult").innerHTML = "<p class=\"fail\">连续 6 次未通过，本机已隐藏午夜猫娘入口。重新安装或清除 App 数据前不会再显示。</p>";
  updateMidnightState();
}

async function submitMidnightQuiz() {
  if (!midnightQuizState.selected.length) await startMidnightQuiz();
  if (!midnightQuizState.selected.length) return;
  const results = midnightQuizState.selected.map((question) => ({
    question,
    ok: questionPassed(question)
  }));
  const passed = results.every((result) => result.ok);
  if (!passed) {
    const failCount = getMidnightFailCount() + 1;
    localStorage.setItem(midnightFailKey, String(failCount));
    if (failCount >= 6) {
      hideMidnightEntranceLocally();
      return;
    }
    const wrong = results
      .filter((result) => !result.ok)
      .map((result) => `<p class="fail"><strong>${result.question.category}</strong>未通过：${result.question.explanation}</p>`)
      .join("");
    $("#midnightQuizResult").innerHTML = `${wrong}<p class="fail">本次未通过，已记录 ${failCount}/6 次。系统已重新抽题，请认真阅读后再答。</p>`;
    createMidnightQuizSession(await loadMidnightQuizBank());
    renderMidnightQuiz();
    return;
  }
  localStorage.setItem(midnightUnlockKey, "yes");
  localStorage.removeItem(midnightFailKey);
  localStorage.removeItem(midnightQuizSessionKey);
  applyMidnightPlayerBackground();
  $("#midnightQuizResult").innerHTML = "<p class=\"ok\">门禁已通过。请继续填写 Grok API Key，并只用于合规的成年人成熟向氛围改编。</p>";
  updateMidnightState();
}

function lockMidnightMode() {
  localStorage.removeItem(midnightUnlockKey);
  $("#midnightResult").classList.add("hidden");
  $("#midnightResult").textContent = "";
  updateMidnightState();
}

function getMidnightSource() {
  return $("#midnightSource").value.trim()
    || $("#directPromptInput")?.value.trim()
    || $("#novelInput")?.value.trim()
    || "";
}

function midnightSystemPrompt() {
  return [
    "你是广播剧成人向氛围改编顾问。",
    "只允许处理虚构、成年、明确自愿的角色关系。",
    "输出应偏向成熟关系张力、边界沟通、声场氛围、音乐、呼吸、停顿和情绪推进。",
    "禁止露骨性行为细节、未成年人、年龄不明、胁迫、醉酒/失去意识、药物控制、剥削、违法或隐私侵犯内容。",
    "如果素材存在风险，先拒绝风险部分，再改写为健康、合规、非露骨的成熟向氛围提示词。",
    "输出格式：标题、适用前提、角色年龄与同意声明、分段音频提示词、禁止事项。"
  ].join("\n");
}

async function callGrokRewrite(source, config) {
  try {
    return await apiJson("/api/midnight-nekomata", { source, config }, config);
  } catch (error) {
    if (getRelayBaseUrl(config)) {
      throw new Error(`后端中转不可用：${error.message}`);
    }
    // Android packaged app has no local Node service; fall back to direct API below.
  }
  const grok = config.grok || {};
  const response = await fetch(grok.baseUrl || defaultConfig.grok.baseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${grok.apiKey}`
    },
    body: JSON.stringify({
      model: grok.model,
      temperature: 0.55,
      messages: [
        { role: "system", content: midnightSystemPrompt() },
        {
          role: "user",
          content: `请把以下素材改写为合规的“午夜猫娘”成熟向广播剧音频提示词。所有角色必须是虚构成年人并明确自愿；不要输出露骨性行为细节。\n\n${source.slice(0, 12000)}`
        }
      ]
    })
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Grok 调用失败：${response.status} ${text.slice(0, 300)}`);
  const data = JSON.parse(text);
  return {
    text: data.choices?.[0]?.message?.content?.trim() || JSON.stringify(data, null, 2)
  };
}

async function runMidnightRewrite() {
  if (!isMidnightUnlocked()) {
    await openMidnightGate();
    return;
  }
  const source = getMidnightSource();
  if (!source) {
    showToast("请先粘贴改编素材，或在创作页/直接提示词里填入内容。", "fail");
    $("#midnightSource")?.focus();
    return;
  }
  const config = getConfig();
  if (!config.grok?.apiKey || !config.grok?.model) {
    showToast("请先在 API 页面填写 Grok API Key 和模型 ID。", "fail");
    showView("config");
    return;
  }
  setButtonBusy("#runMidnightRewrite", true, "生成中...");
  $("#midnightResult").classList.add("hidden");
  try {
    const result = await callGrokRewrite(source, config);
    const text = result.text || "";
    $("#midnightResult").classList.remove("hidden");
    $("#midnightResult").innerHTML = `
      <strong>午夜猫娘已生成：</strong><br />
      <textarea class="short-textarea">${text.replace(/</g, "&lt;")}</textarea>
      <div class="actions">
        <button id="useMidnightPrompt" class="primary">放入直接提示词</button>
      </div>
    `;
    $("#useMidnightPrompt").addEventListener("click", () => {
      $("#directPromptInput").value = text;
      setMidnightModal(false);
      showView("create");
      showToast("已放入直接提示词。", "ok");
    });
    showToast("午夜猫娘提示词已生成。", "ok");
  } catch (error) {
    $("#midnightResult").classList.remove("hidden");
    $("#midnightResult").innerHTML = `<strong>生成失败：</strong>${error.message}`;
    showToast(`生成失败：${error.message}`, "fail");
  } finally {
    setButtonBusy("#runMidnightRewrite", false);
  }
}

function renderStages(active = false, doneCount = 0) {
  const list = $("#stageList");
  list.innerHTML = "";
  stageNames.forEach((name, index) => {
    const li = document.createElement("li");
    li.textContent = active && index === doneCount ? `${name}（进行中）` : name;
    if (index < doneCount) li.classList.add("done");
    list.appendChild(li);
  });
}

function saveLocalHistory(item) {
  const history = readLocalHistory();
  history.unshift(item);
  localStorage.setItem("localHistory", JSON.stringify(history.slice(0, 30)));
}

async function loadHistory() {
  const box = $("#historyList");
  const config = getConfig();
  setButtonBusy("#refreshHistory", true, "刷新中...");
  try {
    box.innerHTML = "<p>正在读取历史...</p>";
    let serverHistory = [];
    try {
      serverHistory = await apiGetJson("/api/history", config);
    } catch {
      serverHistory = [];
    }
    const localHistory = readLocalHistory();
    const merged = [...serverHistory, ...localHistory].filter((item, index, arr) =>
      arr.findIndex((other) => other.jobId === item.jobId) === index
    ).map((item) => normalizeHistoryItem(item, config));

    if (!merged.length) {
      box.innerHTML = "<p>还没有创作记录。完成一次自动生成后，这里会出现脚本、提示词和音频下载入口。</p>";
      return;
    }

    box.innerHTML = "";
    merged.forEach((item) => {
      const audioSrc = item.finalAudio || item.finalAudioDataUrl;
      const article = document.createElement("article");
      article.className = "history-item";
      article.innerHTML = `
        <div>
          <h3>${item.title || "未命名作品"}</h3>
          <p>${item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}</p>
        </div>
        <div class="actions">
          ${audioSrc ? `<button data-play-src="${audioSrc}" data-play-title="${item.title || "未命名作品"}">播放</button>` : ""}
          ${audioSrc ? `<a href="${audioSrc}" target="_blank">下载</a>` : ""}
          ${item.manifest ? `<a href="${item.manifest}" target="_blank">详情</a>` : ""}
        </div>
      `;
      box.appendChild(article);
    });
    showToast(`已读取 ${merged.length} 条历史记录。`, "ok");
  } catch (error) {
    box.innerHTML = `<p class="fail">历史读取失败：${error.message}</p>`;
    showToast(`历史读取失败：${error.message}`, "fail");
  } finally {
    setButtonBusy("#refreshHistory", false);
  }
}

async function loadPlan() {
  const planStrip = $("#planStrip");
  if (!planStrip) return;
  try {
    const plan = await apiGetJson("/api/plan");
    planStrip.innerHTML = `
      <h3>${plan.title}</h3>
      <ol>${plan.stages.map((stage) => `<li>${stage}</li>`).join("")}</ol>
    `;
  } catch {
    planStrip.innerHTML = `
      <h3>${optimizedPlan.title}</h3>
      <ol>${optimizedPlan.stages.map((stage) => `<li>${stage}</li>`).join("")}</ol>
    `;
  }
}

function fillDemo() {
  $("#titleInput").value = "雨夜旧案 第一集";
  $("#novelInput").value = `第一章 雨夜

雨下得很密，旧城区的路灯像隔着一层雾。林舟站在档案室门口，手里攥着那封没有署名的信。

信上只有一句话：十年前的案子，没有结束。

他本来已经决定离开这座城市。可当门轴发出轻微的响声时，他听见身后有人说：“你终于来了。”

林舟没有回头。他太熟悉这个声音了。那是沈清，十年前唯一相信他的人，也是后来亲手把他推开的人。

“你不该回来。”沈清的声音很低，像怕惊动什么。

林舟笑了一下，笑意很短：“那你为什么给我写信？”

窗外一辆车急刹，刺耳的声音划破雨夜。档案室里，两个人同时沉默。`;
  saveCreatorDraft();
  showToast("已填入演示小说片段。", "ok");
}

async function runPipeline() {
  const title = $("#titleInput").value.trim() || "未命名作品";
  const novelText = $("#novelInput").value.trim();
  if (!novelText) {
    showToast("请先上传或粘贴小说内容。", "fail");
    $("#novelInput").focus();
    return;
  }

  setButtonBusy("#runButton", true, "生成中...");
  $("#runStatusPanel").classList.remove("hidden");
  $("#runStatusPanel").scrollIntoView({ block: "start", behavior: "smooth" });
  $("#runStatus").textContent = "正在执行";
  $("#resultBox").classList.add("hidden");
  $("#stageList").innerHTML = "";

  try {
    const payload = {
      title,
      novelText,
      config: getConfig()
    };
    payload.config.voiceReferences = getVoiceReferences();
    let result;
    try {
      result = await apiJson("/api/run", payload, payload.config);
    } catch (error) {
      if (getRelayBaseUrl(payload.config)) {
        throw new Error(`后端中转不可用：${error.message}`);
      }
      result = await runStandalonePipeline(payload);
    }

    renderStages(false, stageNames.length);
    $("#runStatus").textContent = "已完成";

    const links = normalizeResultLinks(result, payload.config);
    let savedDownloads = null;
    try {
      savedDownloads = await saveGeneratedSegmentsToDownloads(result, links);
    } catch (error) {
      showToast(`音频已生成，但自动保存到下载文件夹失败：${error.message || error}`, "fail");
    }
    $("#resultBox").classList.remove("hidden");
    $("#resultBox").innerHTML = `
      <strong>${result.title}</strong><br />
      剧本、提示词和音频已生成。${savedDownloads?.count ? `<br />已按顺序保存 ${savedDownloads.count} 段音频到：${escapeHtml(savedDownloads.folder || "下载文件夹")}` : ""}<br />
      <a href="${links.script2}" target="_blank">下载剧本 2</a>　
      <a href="${links.audioPrompts}" target="_blank">查看音频提示词</a>　
      ${links.finalAudio ? `<button data-play-src="${links.finalAudio}" data-play-title="${result.title}">在播放器收听</button>　<a href="${links.finalAudio}" target="_blank">下载音频</a>　` : ""}
      <a href="${links.manifest}" target="_blank">查看任务详情</a>
    `;
    if (links.finalAudio) playInApp(links.finalAudio, result.title);
    saveLocalHistory({
      jobId: result.jobId,
      title: result.title,
      createdAt: new Date().toISOString(),
      finalAudio: links.finalAudio,
      finalAudioDataUrl: links.finalAudioDataUrl,
      manifest: links.manifest
    });
    showToast(savedDownloads?.count ? "广播剧生成完成，分段音频已保存到下载文件夹。" : "广播剧生成完成，已保存到历史。", "ok");
  } catch (error) {
    $("#runStatus").textContent = "失败";
    $("#resultBox").classList.remove("hidden");
    $("#resultBox").innerHTML = `<strong>生成失败：</strong>${error.message}`;
    showToast(`生成失败：${error.message}`, "fail");
  } finally {
    setButtonBusy("#runButton", false);
  }
}

function initWaterRippleTouch() {
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
  let lastRippleAt = 0;
  document.addEventListener("pointerdown", (event) => {
    if (reducedMotion?.matches) return;
    if (event.button && event.button !== 0) return;
    if (event.isPrimary === false) return;
    const now = Date.now();
    if (now - lastRippleAt < 34) return;
    lastRippleAt = now;
    const ripple = document.createElement("span");
    ripple.className = "water-ripple";
    ripple.style.setProperty("--ripple-x", `${event.clientX}px`);
    ripple.style.setProperty("--ripple-y", `${event.clientY}px`);
    document.body.appendChild(ripple);
    const ripples = Array.from(document.querySelectorAll(".water-ripple"));
    ripples.slice(0, Math.max(0, ripples.length - 10)).forEach((item) => item.remove());
    ripple.addEventListener("animationend", () => ripple.remove(), { once: true });
  }, { capture: true, passive: true });
}

function bindEvents() {
  $$(".nav-item").forEach((item) => item.addEventListener("click", () => showView(item.dataset.view)));
  $("#appLanguageSelect")?.addEventListener("change", (event) => applyAppLanguage(event.target.value));
  $$(".sample-prompt").forEach((details) => details.addEventListener("toggle", () => loadSamplePrompt(details)));
  $$("[data-jump]").forEach((button) => button.addEventListener("click", () => {
    showView(button.dataset.jump);
    if (button.closest("#appIntroModal")) closeAppIntroModal();
  }));
  ["#titleInput", "#novelInput", "#directPromptInput", "#voiceRoleInput"].forEach((selector) => {
    $(selector)?.addEventListener("input", saveCreatorDraft);
  });
  $$("[data-config]").forEach((field) => {
    field.addEventListener("input", () => markConfigDirty(true));
    field.addEventListener("change", () => markConfigDirty(true));
  });
  $("#saveConfig").addEventListener("click", saveConfigFromForm);
  $("#demoButton").addEventListener("click", fillDemo);
  $("#runButton").addEventListener("click", runPipeline);
  $("#addVoiceRef").addEventListener("click", addVoiceReference);
  $("#clearVoiceRefs").addEventListener("click", () => {
    saveVoiceReferences([]);
    showToast("已清空角色音色参考。", "ok");
  });
  $("#startVoiceRecord").addEventListener("click", () => startVoiceRecording().catch((error) => {
    $("#voiceRecordStatus").textContent = `录音失败：${error.message}`;
    showToast(`录音失败：${error.message}`, "fail");
    $("#startVoiceRecord").disabled = false;
    $("#stopVoiceRecord").disabled = true;
  }));
  $("#stopVoiceRecord").addEventListener("click", stopVoiceRecording);
  $("#saveVoiceRecord").addEventListener("click", saveRecordedVoiceReference);
  $("#fillDirectPromptDemo").addEventListener("click", fillDirectPromptDemo);
  $("#runDirectAudioButton").addEventListener("click", runDirectAudio);
  $("#refreshHistory").addEventListener("click", loadHistory);
  $("#loadPlayerAudio").addEventListener("click", loadEditorFromPlayer);
  $("#quickImportA")?.addEventListener("click", () => $("#editorAudioFileA")?.click());
  $("#quickImportB")?.addEventListener("click", () => $("#editorAudioFileB")?.click());
  $("#quickMicToggle")?.addEventListener("click", () => {
    if (editorState.micRecorder?.state === "recording") {
      stopEditorMicRecording();
      return;
    }
    startEditorMicRecording().catch((error) => {
      $("#editorMicStatus").textContent = `录音失败：${error.message}`;
      showToast(`录音失败：${error.message}`, "fail");
      $("#startEditorMic").disabled = false;
      $("#stopEditorMic").disabled = true;
      editorState.micStream?.getTracks().forEach((track) => track.stop());
      editorState.micStream = null;
      editorState.micRecorder = null;
      syncEditorQuickState();
    });
  });
  $("#quickUndoImport")?.addEventListener("click", () => undoTrackImport(editorState.activeTrackId));
  $("#quickClearTrack")?.addEventListener("click", () => clearTrackSource(editorState.activeTrackId));
  $("#quickAddSelection")?.addEventListener("click", () => {
    const { start, end, timelineStart, trackId } = getClipInputs();
    addEditorClip(start, end, timelineStart, trackId);
  });
  $("#quickSplitClip")?.addEventListener("click", splitClipAtPlayhead);
  $("#quickPreviewMix")?.addEventListener("click", previewTimelineMix);
  $("#quickExportMix")?.addEventListener("click", exportEditorMix);
  $("#transportPlay")?.addEventListener("click", previewTimelineMix);
  $("#transportStop")?.addEventListener("click", stopEditorPlayback);
  $("#transportRecord")?.addEventListener("click", () => $("#quickMicToggle")?.click());
  $("#transportSplit")?.addEventListener("click", splitClipAtPlayhead);
  $("#expandActiveTrack")?.addEventListener("click", expandActiveTrackHeight);
  $("#resetTrackHeights")?.addEventListener("click", resetTrackHeights);
  $("#quickPreviewClip")?.addEventListener("click", previewSelectedClip);
  $("#nudgeClipLeft")?.addEventListener("click", () => nudgeSelectedClip(-1));
  $("#nudgeClipRight")?.addEventListener("click", () => nudgeSelectedClip(1));
  $("#duplicateSelectedClip")?.addEventListener("click", duplicateSelectedClip);
  $("#deleteSelectedClip")?.addEventListener("click", removeSelectedClip);
  $("#copySelectedClip")?.addEventListener("click", copySelectedClip);
  $("#cutSelectedClip")?.addEventListener("click", cutSelectedClip);
  $("#pasteClipAtPlayhead")?.addEventListener("click", pasteClipAtPlayhead);
  $("#toggleSelectedClipMute")?.addEventListener("click", toggleSelectedClipMute);
  $("#fadeInSelectedClip")?.addEventListener("click", () => applySelectedClipFade("in"));
  $("#fadeOutSelectedClip")?.addEventListener("click", () => applySelectedClipFade("out"));
  $("#selectedClipVolume")?.addEventListener("input", (event) => {
    $("#selectedClipVolumeLabel").textContent = Number(event.target.value || 0).toFixed(2);
  });
  $("#selectedClipVolume")?.addEventListener("change", (event) => setSelectedClipField("volume", event.target.value));
  $("#selectedClipFadeIn")?.addEventListener("input", (event) => {
    $("#selectedClipFadeInLabel").textContent = `${Number(event.target.value || 0).toFixed(1)}s`;
  });
  $("#selectedClipFadeIn")?.addEventListener("change", (event) => setSelectedClipField("fadeIn", event.target.value));
  $("#selectedClipFadeOut")?.addEventListener("input", (event) => {
    $("#selectedClipFadeOutLabel").textContent = `${Number(event.target.value || 0).toFixed(1)}s`;
  });
  $("#selectedClipFadeOut")?.addEventListener("change", (event) => setSelectedClipField("fadeOut", event.target.value));
  $$("[data-editor-panel]").forEach((button) => {
    button.addEventListener("click", () => setEditorPanel(button.dataset.editorPanel));
  });
  $$("[data-close-editor-drawer]").forEach((button) => {
    button.addEventListener("click", () => setEditorPanel(""));
  });
  $("#editorMicTrack").addEventListener("change", (event) => {
    editorState.micTrackId = event.target.value;
    setActiveTrack(event.target.value);
  });
  $("#startEditorMic").addEventListener("click", () => startEditorMicRecording().catch((error) => {
    $("#editorMicStatus").textContent = `录音失败：${error.message}`;
    showToast(`录音失败：${error.message}`, "fail");
    $("#startEditorMic").disabled = false;
    $("#stopEditorMic").disabled = true;
    editorState.micStream?.getTracks().forEach((track) => track.stop());
    editorState.micStream = null;
  }));
  $("#stopEditorMic").addEventListener("click", stopEditorMicRecording);
  $$("[data-undo-import]").forEach((button) => {
    button.addEventListener("click", () => undoTrackImport(button.dataset.undoImport));
  });
  $$("[data-clear-track]").forEach((button) => {
    button.addEventListener("click", () => clearTrackSource(button.dataset.clearTrack));
  });
  $("#editorAudioFileA").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await loadEditorFile(file, "A");
    } catch (error) {
      showToast(`音频读取失败：${error.message}`, "fail");
    } finally {
      event.target.value = "";
    }
  });
  $("#editorAudioFileB").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await loadEditorFile(file, "B");
    } catch (error) {
      showToast(`音频读取失败：${error.message}`, "fail");
    } finally {
      event.target.value = "";
    }
  });
  $$("[data-select-track]").forEach((button) => button.addEventListener("click", () => setActiveTrack(button.dataset.selectTrack)));
  $$("[data-track-volume]").forEach((input) => input.addEventListener("input", () => {
    getTrack(input.dataset.trackVolume).volume = Number(input.value) || 0;
    syncTrackControls(input.dataset.trackVolume);
    renderWaveform();
  }));
  $$("[data-track-mute]").forEach((input) => input.addEventListener("change", () => {
    getTrack(input.dataset.trackMute).muted = input.checked;
    syncTrackControls(input.dataset.trackMute);
    renderWaveform();
  }));
  $$("[data-track-solo]").forEach((input) => input.addEventListener("change", () => {
    getTrack(input.dataset.trackSolo).solo = input.checked;
    syncTrackControls(input.dataset.trackSolo);
    renderWaveform();
  }));
  $("#clipStart").addEventListener("input", () => setClipInputs(Number($("#clipStart").value), editorState.selection.sourceEnd, editorState.selection.timelineStart));
  $("#clipEnd").addEventListener("input", () => setClipInputs(editorState.selection.sourceStart, Number($("#clipEnd").value), editorState.selection.timelineStart));
  $("#clipTimelineStart").addEventListener("input", () => setClipInputs(editorState.selection.sourceStart, editorState.selection.sourceEnd, Number($("#clipTimelineStart").value)));
  $("#undoEdit").addEventListener("click", undoEditor);
  $("#redoEdit").addEventListener("click", redoEditor);
  $("#zoomOutTimeline").addEventListener("click", () => setTimelineZoom(editorState.timeline.zoom / 1.35));
  $("#zoomInTimeline").addEventListener("click", () => setTimelineZoom(editorState.timeline.zoom * 1.35));
  $("#fitTimeline").addEventListener("click", fitTimeline);
  $("#timelineZoomRange")?.addEventListener("input", (event) => setTimelineZoom(Number(event.target.value) || 1));
  $("#timelineOffset").addEventListener("input", (event) => setTimelineOffset(Number(event.target.value) || 0));
  $("#timelinePanLeft").addEventListener("click", () => panTimeline(-1));
  $("#timelinePanRight").addEventListener("click", () => panTimeline(1));
  $("#snapTimeline").addEventListener("change", (event) => {
    editorState.timeline.snap = event.target.checked;
    syncTimelineControls();
  });
  $("#snapGridSize").addEventListener("change", (event) => {
    editorState.timeline.grid = Number(event.target.value) || 0.5;
    syncTimelineControls();
    renderWaveform();
  });
  $("#playheadInput").addEventListener("input", (event) => setPlayhead(Number(event.target.value)));
  $("#splitAtPlayhead").addEventListener("click", splitClipAtPlayhead);
  $("#previewTimelineMix").addEventListener("click", previewTimelineMix);
  $("#stopTimelineMix").addEventListener("click", stopEditorPlayback);
  $("#waveformCanvas").addEventListener("pointerdown", startTimelineDrag);
  $("#waveformCanvas").addEventListener("pointermove", moveTimelineDrag);
  $("#waveformCanvas").addEventListener("pointerup", endTimelineDrag);
  $("#waveformCanvas").addEventListener("pointercancel", endTimelineDrag);
  $("#waveformCanvas").addEventListener("pointerleave", endTimelineDrag);
  $("#waveformCanvas").addEventListener("mousedown", handleTimelineMouseDown);
  $("#waveformCanvas").addEventListener("click", handleTimelineClick);
  $("#waveformCanvas").addEventListener("dblclick", handleTimelineDoubleClick);
  $("#waveformCanvas").addEventListener("wheel", handleTimelineWheel, { passive: false });
  $("#setClipStartFromPlayer").addEventListener("click", () => {
    const preview = $("#editorPreview");
    const { end } = getClipInputs();
    setClipInputs(preview.currentTime || 0, end, editorState.selection.timelineStart);
  });
  $("#setClipEndFromPlayer").addEventListener("click", () => {
    const preview = $("#editorPreview");
    const { start } = getClipInputs();
    setClipInputs(start, preview.currentTime || 0, editorState.selection.timelineStart);
  });
  $("#addClip").addEventListener("click", () => {
    const { start, end, timelineStart, trackId } = getClipInputs();
    addEditorClip(start, end, timelineStart, trackId);
  });
  $("#addWholeClip").addEventListener("click", () => {
    const track = getActiveTrack();
    addEditorClip(0, track.buffer?.duration || 0, editorState.selection.timelineStart, track.id);
  });
  $("#loadDemoAudio").addEventListener("click", loadDemoEditorAudio);
  $("#clearClips").addEventListener("click", () => {
    if (editorState.clips.length) pushEditorHistory();
    editorState.clips = [];
    editorState.selectedClipId = "";
    renderClipList();
    renderWaveform();
    showToast("已清空时间线片段。", "ok");
  });
  $("#clipList").addEventListener("change", (event) => {
    const field = event.target.dataset.clipField;
    if (!field) return;
    const clipId = event.target.closest("[data-clip-id]")?.dataset.clipId;
    updateClipField(clipId, field, event.target.value, event.target.checked);
  });
  $("#clipList").addEventListener("click", (event) => {
    const action = event.target.dataset.clipAction;
    const clipId = event.target.closest("[data-clip-id]")?.dataset.clipId;
    if (!clipId) return;
    if (!action) {
      selectEditorClip(clipId);
      return;
    }
    handleClipAction(clipId, action);
  });
  $("#exportMix").addEventListener("click", exportEditorMix);
  $("#applyChinaNetwork").addEventListener("click", () => applyNetworkPreset("china"));
  $("#applyVpnNetwork").addEventListener("click", () => applyNetworkPreset("proxy"));
  $("#testNetwork").addEventListener("click", testNetworkRoutes);
  $("#openBluetoothSettings").addEventListener("click", openBluetoothSettings);
  $("#testBluetoothAudio").addEventListener("click", testBluetoothAudio);
  $("#toggleAudioGuard").addEventListener("click", toggleAudioGuard);
  $("#exportPlaybackRecord").addEventListener("click", exportPlaybackRecord);
  $("#scanDownloadsButton").addEventListener("click", scanDownloadsToPlaylist);
  $("#midnightCatButton").addEventListener("click", openMidnightGate);
  $("#openMidnightGateFromConfig").addEventListener("click", openMidnightGate);
  $("#closeMidnightModal").addEventListener("click", () => setMidnightModal(false));
  $("#midnightModal").addEventListener("click", (event) => {
    if (event.target.id === "midnightModal") setMidnightModal(false);
  });
  $("#submitMidnightQuiz").addEventListener("click", submitMidnightQuiz);
  $("#lockMidnightMode").addEventListener("click", lockMidnightMode);
  $("#runMidnightRewrite").addEventListener("click", runMidnightRewrite);
  window.addEventListener("resize", renderWaveform);
  document.addEventListener("click", (event) => {
    const helpButton = event.target.closest("[data-api-help]");
    if (helpButton) {
      const key = helpButton.dataset.apiHelp;
      const panel = $(`[data-api-help-panel="${key}"]`);
      const open = panel?.classList.contains("hidden") === true;
      closeApiHelpPanels(key);
      panel?.classList.toggle("hidden", !open);
      helpButton.setAttribute("aria-expanded", open ? "true" : "false");
      return;
    }
    if (!event.target.closest(".api-input-row, .api-help")) {
      closeApiHelpPanels();
    }
    const removeVoiceRefButton = event.target.closest("[data-remove-voice-ref]");
    if (removeVoiceRefButton) {
      saveVoiceReferences(getVoiceReferences().filter((item) => item.id !== removeVoiceRefButton.dataset.removeVoiceRef));
      showToast("已删除音色参考。", "ok");
      return;
    }
    const button = event.target.closest("[data-play-src]");
    if (!button) return;
    playInApp(button.dataset.playSrc, button.dataset.playTitle);
  });
  $("#playerBgFile").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      const value = String(reader.result || "");
      localStorage.setItem(playerBgKey, value);
      setPlayerBackground(value);
      showToast("播放器背景已更新。", "ok");
    });
    reader.readAsDataURL(file);
    event.target.value = "";
  });
  $("#playerAudioFile").addEventListener("change", async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    for (const [index, file] of files.entries()) {
      await importPlayerAudio(file, { play: false, select: index === 0 });
    }
    event.target.value = "";
  });
  $("#playerFolderInput").addEventListener("change", async (event) => {
    await importPlayerFolder(event.target.files);
    event.target.value = "";
  });
  $("#lyricFile").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await importLyrics(file);
    event.target.value = "";
  });
  $("#fullScreenPlayer").addEventListener("click", togglePlayerFullscreen);
  $("#lyricPanel").addEventListener("pointerdown", startFullscreenLyricScrub);
  $("#lyricPanel").addEventListener("pointermove", moveFullscreenLyricScrub);
  $("#lyricPanel").addEventListener("pointerup", endFullscreenLyricScrub);
  $("#lyricPanel").addEventListener("pointercancel", stopLyricScrub);
  $("#playerPlaylist").addEventListener("click", (event) => {
    const action = event.target.closest("[data-playlist-action]")?.dataset.playlistAction;
    if (!action) return;
    const itemId = event.target.closest("[data-playlist-id]")?.dataset.playlistId;
    if (action === "play") playPlaylistItem(itemId);
    if (action === "remove") removePlaylistItem(itemId);
  });
  $("#clearPlaylist").addEventListener("click", clearPlayerPlaylist);
  $("#playerArt").addEventListener("pointerdown", startPlayerFullscreenGesture);
  $("#playerArt").addEventListener("mousedown", startPlayerFullscreenGesture);
  $("#playerArt").addEventListener("touchstart", startPlayerFullscreenTouch, { passive: true });
  $("#playerArt").addEventListener("dblclick", exitPlayerFullscreenOnDoubleTap);
  $("#playerArt").addEventListener("pointerup", exitPlayerFullscreenOnDoubleTap);
  $("#playerArt").addEventListener("mouseup", exitPlayerFullscreenOnDoubleTap);
  $("#playerArt").addEventListener("touchend", exitPlayerFullscreenOnTouchEnd);
  document.addEventListener("fullscreenchange", syncPlayerFullscreenUi);
  document.addEventListener("keydown", handlePlayerFullscreenKey);
  document.addEventListener("keydown", handleEditorShortcut);
  document.addEventListener("touchstart", handleRouteSwipeStart, { passive: true });
  document.addEventListener("touchend", handleRouteSwipeEnd, { passive: true });
  document.addEventListener("touchcancel", () => {
    routeSwipe = null;
  }, { passive: true });
  $("#playerPlayPause").addEventListener("click", togglePlayerPlayback);
  $("#playerPrev").addEventListener("click", playPreviousPlaylistItem);
  $("#playerNext").addEventListener("click", playNextPlaylistItem);
  $("#playerLoopMode").addEventListener("click", togglePlayerLoopMode);
  $("#playerRate").addEventListener("change", (event) => setPlayerPlaybackRate(event.target.value));
  $("#playerSeek").addEventListener("pointerdown", beginPlayerSeek);
  $("#playerSeek").addEventListener("touchstart", beginPlayerSeek, { passive: true });
  $("#playerSeek").addEventListener("mousedown", beginPlayerSeek);
  $("#playerSeek").addEventListener("input", (event) => {
    if (!playerState.seeking) beginPlayerSeek();
    previewPlayerSeekTime(event.target.value);
  });
  $("#playerSeek").addEventListener("change", (event) => {
    if (!playerState.seeking) beginPlayerSeek();
    previewPlayerSeekTime(event.target.value);
    finishPlayerSeek("seek");
  });
  ["pointerup", "pointercancel", "touchend", "touchcancel", "mouseup", "blur"].forEach((eventName) => {
    $("#playerSeek").addEventListener(eventName, () => {
      if (playerState.seeking) finishPlayerSeek("seek");
    });
  });
  $("#playerSeek").addEventListener("keyup", (event) => {
    if (["Enter", " ", "Spacebar"].includes(event.key) && playerState.seeking) finishPlayerSeek("seek");
  });
  $("#playerVolume").addEventListener("input", (event) => {
    const player = $("#mainPlayer");
    if (player) player.volume = Math.max(0, Math.min(1, Number(event.target.value) || 0));
  });
  $("#mainPlayer").addEventListener("timeupdate", (event) => {
    syncLyrics(event.target.currentTime);
    syncPlayerControls();
    syncCurrentPlaybackRecord(false);
  });
  $("#mainPlayer").addEventListener("loadedmetadata", () => {
    syncPlayerControls();
    syncCurrentPlaybackRecord(true);
  });
  $("#mainPlayer").addEventListener("durationchange", syncPlayerControls);
  $("#mainPlayer").addEventListener("play", handlePlayerPlayEvent);
  $("#mainPlayer").addEventListener("pause", handlePlayerPauseEvent);
  $("#mainPlayer").addEventListener("ended", handlePlayerEndedEvent);
  $("#applyBgUrl").addEventListener("click", () => {
    const value = $("#playerBgUrl").value.trim();
    if (!value) {
      showToast("请先粘贴图片链接。", "fail");
      $("#playerBgUrl").focus();
      return;
    }
    localStorage.setItem(playerBgKey, value);
    setPlayerBackground(value);
    showToast("播放器背景链接已应用。", "ok");
  });
  $("#clearBg").addEventListener("click", () => {
    localStorage.removeItem(playerBgKey);
    $("#playerBgUrl").value = "";
    $("#playerBgFile").value = "";
    setPlayerBackground("");
    showToast("已恢复默认播放器背景。", "ok");
  });
  $("#closeAppIntro").addEventListener("click", closeAppIntroModal);
  $("#closeAppIntroTop").addEventListener("click", closeAppIntroModal);
  $("#appIntroModal").addEventListener("click", (event) => {
    if (event.target.id === "appIntroModal") setAppIntroModal(false);
  });
  $("#fileInput").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    $("#novelInput").value = text;
    if (!$("#titleInput").value.trim()) {
      $("#titleInput").value = file.name.replace(/\.[^.]+$/, "");
    }
    saveCreatorDraft();
    showToast(`已导入小说文本：${file.name}`, "ok");
    event.target.value = "";
  });
  $("#directPromptFile").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    $("#directPromptInput").value = await file.text();
    if (!$("#titleInput").value.trim()) {
      $("#titleInput").value = file.name.replace(/\.[^.]+$/, "");
    }
    saveCreatorDraft();
    showToast(`已导入提示词文件：${file.name}`, "ok");
    event.target.value = "";
  });
}

decorateApiHelpFields();
document.body.dataset.view = "discover";
setEditorContext("studio");
loadConfigIntoForm();
restoreCreatorDraft();
loadPlayerBackground();
loadPlayerPlaylist();
renderPlayerImportLocation();
applyPlayerPlaybackSettings();
renderAudioGuardUi();
renderVoiceReferences();
renderClipList();
renderWaveform();
loadPlan();
updateMidnightState();
bindEvents();
initWaterRippleTouch();
syncPlayerControls();
initRouteNavigation();
registerNativeBackHandler();
registerPlaybackInterruptionHandlers();
syncPlayerFullscreenUi();
syncTimelineControls();
applyAppLanguage();
showAppIntroIfNeeded();
