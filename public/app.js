import { optimizedPlan, runDirectAudioPipeline, runStandalonePipeline } from './mobile-pipeline.js';

const defaultConfig = {
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
  "GPT 生成项目资料包",
  "Gemini 扩展分场大纲",
  "豆包优化对白方向",
  "GPT 生成剧本 1",
  "豆包二次优化台词",
  "GPT 生成剧本 2",
  "GPT 生成影视级音频提示词",
  "豆包音频生成 seed-audio-1.0 生成并合成音频"
];

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));
const playerBgKey = "playerBackgroundImage";
const defaultPlayerBg = "/assets/player-default-bg.png";
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
    { id: "A", name: "轨道 1", label: "人声/主轨", buffer: null, url: "", fileName: "", volume: 1, muted: false, solo: false },
    { id: "B", name: "轨道 2", label: "音乐/环境", buffer: null, url: "", fileName: "", volume: 0.75, muted: false, solo: false }
  ],
  activeTrackId: "A",
  selection: { trackId: "A", sourceStart: 0, sourceEnd: 0, timelineStart: 0 },
  drag: null,
  sourceBuffer: null,
  sourceUrl: "",
  sourceName: "",
  clips: [],
  pickNext: "start",
  clipTimer: null,
  playingNodes: [],
  renderedUrl: ""
};
const recorderState = {
  stream: null,
  recorder: null,
  chunks: [],
  dataUrl: "",
  mimeType: "audio/webm"
};

const apiHelp = {
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
    text: "进入 Google AI Studio 的 API Key 页面创建 Key。大陆用户通常需要系统 VPN 或中转线路。"
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

function showView(name) {
  $$(".view").forEach((view) => view.classList.toggle("active", view.id === name));
  $$(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.view === name));
  if (name === "history") loadHistory();
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
    button.textContent = "?";
    row.appendChild(button);
    const panel = document.createElement("div");
    panel.className = "api-help hidden";
    panel.dataset.apiHelpPanel = field.dataset.config;
    panel.innerHTML = `<strong>${help.title}</strong><br />${help.text}<br /><a href="${help.url}" target="_blank" rel="noreferrer">打开官网/文档</a>`;
    label.appendChild(panel);
  });
}

function playInApp(src, title) {
  const player = $("#mainPlayer");
  const playerTitle = $("#playerTitle");
  if (!player || !src) return;
  player.src = src;
  playerTitle.textContent = title || "正在播放广播剧";
  player.play().catch(() => {
    playerTitle.textContent = `${title || "广播剧"}（点击播放）`;
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

async function startVoiceRecording() {
  if (!navigator.mediaDevices?.getUserMedia) {
    alert("当前环境不支持录音，请改用上传参考音频。");
    return;
  }
  const role = $("#voiceRoleInput").value.trim();
  if (!role) {
    alert("请先填写角色名，再开始录音。");
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
    alert("请先填写角色名。");
    return;
  }
  if (!recorderState.dataUrl) {
    alert("还没有可保存的录音。");
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
}

function openBluetoothSettings() {
  $("#bluetoothStatus").textContent = "正在尝试打开系统蓝牙设置；如果没有跳转，请从手机系统设置里配对音箱。";
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

function setActiveTrack(trackId) {
  editorState.activeTrackId = trackId;
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
  $$("[data-track-card]").forEach((card) => card.classList.toggle("active", card.dataset.trackCard === editorState.activeTrackId));
}

async function setEditorSource({ arrayBuffer, url, name, trackId = editorState.activeTrackId }) {
  const context = getEditorAudioContext();
  const track = getTrack(trackId);
  const buffer = await context.decodeAudioData(arrayBuffer.slice(0));
  if (track.url && track.url.startsWith("blob:")) URL.revokeObjectURL(track.url);
  track.buffer = buffer;
  track.url = url;
  track.fileName = name || "未命名音频";
  editorState.sourceBuffer = buffer;
  editorState.sourceUrl = url;
  editorState.sourceName = track.fileName;
  setActiveTrack(trackId);
  setClipInputs(0, Math.min(buffer.duration, 30), 0);
  updateEditorSourceInfo();
  renderClipList();
  renderWaveform();
}

async function loadEditorFile(file, trackId = editorState.activeTrackId) {
  if (!file) return;
  const arrayBuffer = await file.arrayBuffer();
  const url = URL.createObjectURL(file);
  await setEditorSource({ arrayBuffer, url, name: file.name, trackId });
}

async function loadEditorFromPlayer() {
  const player = $("#mainPlayer");
  if (!player?.src) {
    alert("播放器里还没有可导入的音频。");
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
    showView("editor");
  } catch {
    alert("这个音频地址无法直接导入。请先下载到本机，再从剪辑工作台上传。");
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
}

function canvasTimelineInfo(canvas) {
  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const width = canvas.width;
  const height = canvas.height;
  const laneHeight = height / editorState.tracks.length;
  const duration = getTimelineDuration();
  return { ratio, rect, width, height, laneHeight, duration };
}

function timeToX(time, width, duration) {
  return (time / Math.max(0.01, duration)) * width;
}

function xToTime(x, width, duration) {
  return clamp((x / Math.max(1, width)) * duration, 0, duration);
}

function drawTrackWaveform(ctx, track, laneTop, laneHeight, width, projectDuration, ratio) {
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

  const drawWidth = Math.max(1, timeToX(track.buffer.duration, width, projectDuration));
  const data = track.buffer.getChannelData(0);
  const samplesPerPixel = Math.max(1, Math.floor(data.length / drawWidth));
  ctx.strokeStyle = track.id === "A" ? "#315f4c" : "#6f1f1b";
  ctx.lineWidth = Math.max(1, ratio);
  ctx.beginPath();
  for (let x = 0; x < drawWidth; x += 1) {
    let min = 1;
    let max = -1;
    const start = Math.floor(x * samplesPerPixel);
    for (let i = 0; i < samplesPerPixel && start + i < data.length; i += 1) {
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
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const { laneHeight, duration } = canvasTimelineInfo(canvas);
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "rgba(255, 250, 238, 0.86)";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(49, 95, 76, 0.14)";
  ctx.lineWidth = 1;
  const gridStep = Math.max(1, duration / 8);
  for (let time = 0; time <= duration; time += gridStep) {
    const x = timeToX(time, width, duration);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
    ctx.fillStyle = "rgba(116, 111, 99, 0.75)";
    ctx.font = `${10 * ratio}px Microsoft YaHei, sans-serif`;
    ctx.fillText(formatSeconds(time), x + 4 * ratio, 12 * ratio);
  }

  editorState.tracks.forEach((track, index) => {
    drawTrackWaveform(ctx, track, index * laneHeight, laneHeight, width, duration, ratio);
  });

  editorState.clips.forEach((clip) => {
    const trackIndex = editorState.tracks.findIndex((track) => track.id === clip.trackId);
    if (trackIndex < 0) return;
    const x = timeToX(clip.timelineStart, width, duration);
    const w = Math.max(3 * ratio, timeToX(clip.sourceEnd - clip.sourceStart, width, duration));
    const y = trackIndex * laneHeight + laneHeight - 30 * ratio;
    ctx.fillStyle = clip.muted ? "rgba(116, 111, 99, 0.28)" : "rgba(49, 95, 76, 0.2)";
    ctx.strokeStyle = clip.trackId === "A" ? "rgba(49, 95, 76, 0.72)" : "rgba(111, 31, 27, 0.72)";
    ctx.fillRect(x, y, w, 20 * ratio);
    ctx.strokeRect(x, y, w, 20 * ratio);
  });

  const selection = editorState.selection;
  const track = getTrack(selection.trackId);
  if (track?.buffer && selection.sourceEnd > selection.sourceStart) {
    const trackIndex = editorState.tracks.findIndex((item) => item.id === selection.trackId);
    const x1 = timeToX(selection.sourceStart, width, duration);
    const x2 = timeToX(selection.sourceEnd, width, duration);
    const y = trackIndex * laneHeight;
    ctx.fillStyle = "rgba(111, 31, 27, 0.16)";
    ctx.fillRect(x1, y, Math.max(2 * ratio, x2 - x1), laneHeight);
    ctx.strokeStyle = "rgba(111, 31, 27, 0.82)";
    ctx.lineWidth = 2 * ratio;
    ctx.strokeRect(x1, y + 1 * ratio, Math.max(2 * ratio, x2 - x1), laneHeight - 2 * ratio);
  }
}

function getCanvasPointer(event) {
  const canvas = $("#waveformCanvas");
  const info = canvasTimelineInfo(canvas);
  const x = (event.clientX - info.rect.left) * info.ratio;
  const y = (event.clientY - info.rect.top) * info.ratio;
  const trackIndex = clamp(Math.floor(y / info.laneHeight), 0, editorState.tracks.length - 1);
  const track = editorState.tracks[trackIndex];
  const time = xToTime(x, info.width, info.duration);
  return { canvas, ...info, x, y, trackIndex, track, time };
}

function startTimelineDrag(event) {
  const point = getCanvasPointer(event);
  if (!point.track?.buffer) return;
  event.preventDefault();
  setActiveTrack(point.track.id);
  const selection = editorState.selection;
  const handleSize = 10 * point.ratio;
  const x1 = timeToX(selection.sourceStart, point.width, point.duration);
  const x2 = timeToX(selection.sourceEnd, point.width, point.duration);
  const inside = point.track.id === selection.trackId && point.x >= x1 && point.x <= x2;
  const type = Math.abs(point.x - x1) < handleSize ? "left" : Math.abs(point.x - x2) < handleSize ? "right" : inside ? "move" : "create";
  editorState.drag = {
    type,
    trackId: point.track.id,
    startTime: point.time,
    originalStart: selection.sourceStart,
    originalEnd: selection.sourceEnd
  };
  if (type === "create") setClipInputs(point.time, point.time, selection.timelineStart);
  point.canvas.setPointerCapture?.(event.pointerId);
}

function moveTimelineDrag(event) {
  if (!editorState.drag) return;
  const point = getCanvasPointer(event);
  const drag = editorState.drag;
  const track = getTrack(drag.trackId);
  const maxTime = track.buffer?.duration || 0;
  if (!maxTime) return;
  if (drag.type === "create") {
    setClipInputs(Math.min(drag.startTime, point.time), Math.max(drag.startTime, point.time), editorState.selection.timelineStart);
  } else if (drag.type === "left") {
    setClipInputs(clamp(point.time, 0, drag.originalEnd - 0.1), drag.originalEnd, editorState.selection.timelineStart);
  } else if (drag.type === "right") {
    setClipInputs(drag.originalStart, clamp(point.time, drag.originalStart + 0.1, maxTime), editorState.selection.timelineStart);
  } else if (drag.type === "move") {
    const length = Math.max(0.1, drag.originalEnd - drag.originalStart);
    const delta = point.time - drag.startTime;
    const start = clamp(drag.originalStart + delta, 0, Math.max(0, maxTime - length));
    setClipInputs(start, start + length, editorState.selection.timelineStart);
  }
}

function endTimelineDrag() {
  editorState.drag = null;
}

function addEditorClip(start, end, timelineStart = editorState.selection.timelineStart, trackId = editorState.selection.trackId) {
  const track = getTrack(trackId);
  if (!track?.buffer) {
    alert("请先给当前轨道导入音频。");
    return;
  }
  const safeStart = clamp(start, 0, track.buffer.duration);
  const safeEnd = clamp(end, safeStart, track.buffer.duration);
  if (safeEnd - safeStart < 0.1) {
    alert("片段太短，请至少保留 0.1 秒。");
    return;
  }
  editorState.clips.push({
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
  });
  renderClipList();
  renderWaveform();
}

function renderClipList() {
  const list = $("#clipList");
  if (!list) return;
  if (!editorState.clips.length) {
    list.innerHTML = "<p class=\"clip-empty\">还没有时间线片段。拖拽轨道选区后点“加入选区”，或直接导出整轨混音。</p>";
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
      article.className = "clip-item";
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
}

function updateClipField(clipId, field, value, checked) {
  const clip = editorState.clips.find((item) => item.id === clipId);
  if (!clip) return;
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
  editorState.playingNodes.forEach((node) => {
    try { node.stop(); } catch {}
  });
  editorState.playingNodes = [];
}

function playEditorClip(clipId) {
  const clip = editorState.clips.find((item) => item.id === clipId);
  const track = getTrack(clip?.trackId);
  if (!clip || !track?.buffer) return;
  stopEditorPlayback();
  const context = getEditorAudioContext();
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
    setActiveTrack(clip.trackId);
    setClipInputs(clip.sourceStart, clip.sourceEnd, clip.timelineStart);
  }
  if (action === "remove") {
    editorState.clips = editorState.clips.filter((item) => item.id !== clipId);
    renderClipList();
    renderWaveform();
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
  const loadedTracks = editorState.tracks.filter((track) => track.buffer);
  if (!loadedTracks.length) {
    alert("请先给至少一条轨道导入音频。");
    return;
  }
  $("#exportMix").disabled = true;
  $("#editorResult").classList.add("hidden");
  try {
    const sampleRate = loadedTracks[0].buffer.sampleRate || 44100;
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
    const totalDuration = clips.reduce((max, clip) => Math.max(max, clip.timelineStart + Math.max(0, clip.sourceEnd - clip.sourceStart)), 0);
    if (totalDuration <= 0) throw new Error("没有可导出的有效时长。");
    const channels = 2;
    const offline = new OfflineAudioContext(channels, Math.ceil(totalDuration * sampleRate), sampleRate);
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
    const rendered = await offline.startRendering();
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
    playInApp(editorState.renderedUrl, fileName);
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
  } finally {
    $("#exportMix").disabled = false;
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
    alert("请先填写角色名。");
    return;
  }
  if (!file) {
    alert("请先选择参考音频文件。");
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
}

async function runDirectAudio() {
  const promptText = $("#directPromptInput").value.trim();
  const title = $("#titleInput").value.trim() || "直接提示词音频";
  if (!promptText) {
    alert("请先上传或粘贴音频提示词。");
    return;
  }

  $("#runDirectAudioButton").disabled = true;
  $("#directResultBox").classList.add("hidden");
  $("#directResultBox").textContent = "";
  try {
    const config = getConfig();
    config.voiceReferences = getVoiceReferences();
    let result;
    try {
      const response = await fetch("/api/audio-direct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, promptText, config })
      });
      if (!response.ok) throw new Error("本地服务不可用");
      result = await response.json();
    } catch {
      result = await runDirectAudioPipeline({ title, promptText, config });
    }

    const links = result.links || {};
    $("#directResultBox").classList.remove("hidden");
    $("#directResultBox").innerHTML = `
      <strong>${result.title}</strong><br />
      已跳过编剧流程，直接生成音频。<br />
      <a href="${links.audioPrompts}" target="_blank">查看使用的提示词</a>　
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
  } catch (error) {
    $("#directResultBox").classList.remove("hidden");
    $("#directResultBox").innerHTML = `<strong>生成失败：</strong>${error.message}`;
  } finally {
    $("#runDirectAudioButton").disabled = false;
  }
}

function loadConfigIntoForm() {
  const config = getConfig();
  $$("[data-config]").forEach((field) => {
    field.value = getByPath(config, field.dataset.config) || "";
  });
}

function saveConfigFromForm() {
  const config = getConfig();
  $$("[data-config]").forEach((field) => {
    setByPath(config, field.dataset.config, field.value.trim());
  });
  localStorage.setItem("apiConfig", JSON.stringify(config));
  alert("配置已保存在本机浏览器。真实产品中建议改为服务端加密保存。");
}

function saveConfigObject(config) {
  localStorage.setItem("apiConfig", JSON.stringify(config));
  loadConfigIntoForm();
}

function applyNetworkPreset(profile) {
  const config = getConfig();
  config.network ||= {};
  config.network.profile = profile;
  config.network.timeoutSeconds = profile === "vpn" ? "180" : "120";
  config.network.retryCount = profile === "vpn" ? "2" : "1";
  if (profile === "china") {
    config.doubao.baseUrl = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";
    config.audio.endpoint = "https://openspeech.bytedance.com/api/v3/tts/create";
    config.audio.model = "seed-audio-1.0";
  }
  if (profile === "vpn") {
    config.gpt.baseUrl = "https://api.openai.com/v1/chat/completions";
    config.gemini.endpoint = "";
    config.doubao.baseUrl = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";
    config.audio.endpoint = "https://openspeech.bytedance.com/api/v3/tts/create";
  }
  saveConfigObject(config);
  const label = profile === "vpn" ? "系统 VPN 优先" : "中国大陆优先";
  $("#networkStatus").innerHTML = `<p class="ok">已套用「${label}」线路预设，记得保存或继续填写 API Key。</p>`;
}

function getProbeUrl(label, config) {
  if (label === "GPT") return config.gpt?.baseUrl || defaultConfig.gpt.baseUrl;
  if (label === "Gemini") return config.gemini?.endpoint || "https://generativelanguage.googleapis.com/";
  if (label === "豆包文本") return config.doubao?.baseUrl || defaultConfig.doubao.baseUrl;
  if (label === "豆包音频") return config.audio?.endpoint || defaultConfig.audio.endpoint;
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
  $("#networkStatus").innerHTML = "<p>正在诊断当前网络线路...</p>";
  const timeoutMs = Math.max(5000, Math.min(300000, Number(config.network?.timeoutSeconds || 120) * 1000));
  const labels = ["GPT", "Gemini", "豆包文本", "豆包音频"];
  if (config.network?.relayBaseUrl) labels.push("中转服务");
  const results = [];
  for (const label of labels) {
    results.push(await probeNetwork(label, getProbeUrl(label, config), timeoutMs));
  }
  $("#networkStatus").innerHTML = results.map((item) => `
    <p class="${item.ok ? "ok" : "fail"}"><strong>${item.label}</strong>：${item.message}</p>
  `).join("");
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

function setMidnightModal(open) {
  $("#midnightModal").classList.toggle("hidden", !open);
  updateMidnightState();
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
    const response = await fetch("/api/midnight-nekomata", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source, config })
    });
    if (response.ok) return response.json();
  } catch {
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
    alert("请先粘贴改编素材，或在创作页/直接提示词里填入内容。");
    return;
  }
  const config = getConfig();
  if (!config.grok?.apiKey || !config.grok?.model) {
    alert("请先在 API 页面填写 Grok API Key 和模型 ID。");
    showView("config");
    return;
  }
  $("#runMidnightRewrite").disabled = true;
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
    });
  } catch (error) {
    $("#midnightResult").classList.remove("hidden");
    $("#midnightResult").innerHTML = `<strong>生成失败：</strong>${error.message}`;
  } finally {
    $("#runMidnightRewrite").disabled = false;
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
  const history = JSON.parse(localStorage.getItem("localHistory") || "[]");
  history.unshift(item);
  localStorage.setItem("localHistory", JSON.stringify(history.slice(0, 30)));
}

async function loadHistory() {
  const box = $("#historyList");
  box.innerHTML = "<p>正在读取历史...</p>";
  let serverHistory = [];
  try {
    const response = await fetch("/api/history");
    serverHistory = await response.json();
  } catch {
    serverHistory = [];
  }
  const localHistory = JSON.parse(localStorage.getItem("localHistory") || "[]");
  const merged = [...serverHistory, ...localHistory].filter((item, index, arr) =>
    arr.findIndex((other) => other.jobId === item.jobId) === index
  );

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
}

async function loadPlan() {
  try {
    const plan = await fetch("/api/plan").then((res) => res.json());
    $("#planStrip").innerHTML = `
      <h3>${plan.title}</h3>
      <ol>${plan.stages.map((stage) => `<li>${stage}</li>`).join("")}</ol>
    `;
  } catch {
    $("#planStrip").innerHTML = `
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
}

async function runPipeline() {
  const title = $("#titleInput").value.trim() || "未命名作品";
  const novelText = $("#novelInput").value.trim();
  if (!novelText) {
    alert("请先上传或粘贴小说内容。");
    return;
  }

  $("#runButton").disabled = true;
  $("#runStatus").textContent = "自动执行中";
  $("#resultBox").classList.add("hidden");
  renderStages(true, 0);

  const fakeTimer = setInterval(() => {
    const done = $$("#stageList li.done").length;
    if (done < stageNames.length - 1) renderStages(true, done + 1);
  }, 1800);

  try {
    const payload = {
      title,
      novelText,
      config: getConfig()
    };
    payload.config.voiceReferences = getVoiceReferences();
    let result;
    try {
      const response = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error("本地服务不可用");
      result = await response.json();
    } catch {
      result = await runStandalonePipeline(payload);
    }

    clearInterval(fakeTimer);
    renderStages(false, stageNames.length);
    $("#runStatus").textContent = "已完成";

    const links = result.links || {};
    $("#resultBox").classList.remove("hidden");
    $("#resultBox").innerHTML = `
      <strong>${result.title}</strong><br />
      剧本、提示词和音频已生成。<br />
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
  } catch (error) {
    clearInterval(fakeTimer);
    $("#runStatus").textContent = "失败";
    $("#resultBox").classList.remove("hidden");
    $("#resultBox").innerHTML = `<strong>生成失败：</strong>${error.message}`;
  } finally {
    $("#runButton").disabled = false;
  }
}

function bindEvents() {
  $$(".nav-item").forEach((item) => item.addEventListener("click", () => showView(item.dataset.view)));
  $$("[data-jump]").forEach((button) => button.addEventListener("click", () => showView(button.dataset.jump)));
  $("#saveConfig").addEventListener("click", saveConfigFromForm);
  $("#demoButton").addEventListener("click", fillDemo);
  $("#runButton").addEventListener("click", runPipeline);
  $("#addVoiceRef").addEventListener("click", addVoiceReference);
  $("#clearVoiceRefs").addEventListener("click", () => saveVoiceReferences([]));
  $("#startVoiceRecord").addEventListener("click", () => startVoiceRecording().catch((error) => {
    $("#voiceRecordStatus").textContent = `录音失败：${error.message}`;
    $("#startVoiceRecord").disabled = false;
    $("#stopVoiceRecord").disabled = true;
  }));
  $("#stopVoiceRecord").addEventListener("click", stopVoiceRecording);
  $("#saveVoiceRecord").addEventListener("click", saveRecordedVoiceReference);
  $("#fillDirectPromptDemo").addEventListener("click", fillDirectPromptDemo);
  $("#runDirectAudioButton").addEventListener("click", runDirectAudio);
  $("#refreshHistory").addEventListener("click", loadHistory);
  $("#loadPlayerAudio").addEventListener("click", loadEditorFromPlayer);
  $("#editorAudioFileA").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await loadEditorFile(file, "A");
    } catch (error) {
      alert(`音频读取失败：${error.message}`);
    }
  });
  $("#editorAudioFileB").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await loadEditorFile(file, "B");
    } catch (error) {
      alert(`音频读取失败：${error.message}`);
    }
  });
  $$("[data-select-track]").forEach((button) => button.addEventListener("click", () => setActiveTrack(button.dataset.selectTrack)));
  $$("[data-track-volume]").forEach((input) => input.addEventListener("input", () => {
    getTrack(input.dataset.trackVolume).volume = Number(input.value) || 0;
  }));
  $$("[data-track-mute]").forEach((input) => input.addEventListener("change", () => {
    getTrack(input.dataset.trackMute).muted = input.checked;
    renderWaveform();
  }));
  $$("[data-track-solo]").forEach((input) => input.addEventListener("change", () => {
    getTrack(input.dataset.trackSolo).solo = input.checked;
    renderWaveform();
  }));
  $("#clipStart").addEventListener("input", () => setClipInputs(Number($("#clipStart").value), editorState.selection.sourceEnd, editorState.selection.timelineStart));
  $("#clipEnd").addEventListener("input", () => setClipInputs(editorState.selection.sourceStart, Number($("#clipEnd").value), editorState.selection.timelineStart));
  $("#clipTimelineStart").addEventListener("input", () => setClipInputs(editorState.selection.sourceStart, editorState.selection.sourceEnd, Number($("#clipTimelineStart").value)));
  $("#waveformCanvas").addEventListener("pointerdown", startTimelineDrag);
  $("#waveformCanvas").addEventListener("pointermove", moveTimelineDrag);
  $("#waveformCanvas").addEventListener("pointerup", endTimelineDrag);
  $("#waveformCanvas").addEventListener("pointercancel", endTimelineDrag);
  $("#waveformCanvas").addEventListener("pointerleave", endTimelineDrag);
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
    editorState.clips = [];
    renderClipList();
    renderWaveform();
  });
  $("#clipList").addEventListener("change", (event) => {
    const field = event.target.dataset.clipField;
    if (!field) return;
    const clipId = event.target.closest("[data-clip-id]")?.dataset.clipId;
    updateClipField(clipId, field, event.target.value, event.target.checked);
  });
  $("#clipList").addEventListener("click", (event) => {
    const action = event.target.dataset.clipAction;
    if (!action) return;
    const clipId = event.target.closest("[data-clip-id]")?.dataset.clipId;
    handleClipAction(clipId, action);
  });
  $("#exportMix").addEventListener("click", exportEditorMix);
  $("#applyChinaNetwork").addEventListener("click", () => applyNetworkPreset("china"));
  $("#applyVpnNetwork").addEventListener("click", () => applyNetworkPreset("vpn"));
  $("#testNetwork").addEventListener("click", testNetworkRoutes);
  $("#openBluetoothSettings").addEventListener("click", openBluetoothSettings);
  $("#testBluetoothAudio").addEventListener("click", testBluetoothAudio);
  $("#midnightCatButton").addEventListener("click", openMidnightGate);
  $("#openMidnightGateFromConfig").addEventListener("click", openMidnightGate);
  $("#closeMidnightModal").addEventListener("click", () => setMidnightModal(false));
  $("#submitMidnightQuiz").addEventListener("click", submitMidnightQuiz);
  $("#lockMidnightMode").addEventListener("click", lockMidnightMode);
  $("#runMidnightRewrite").addEventListener("click", runMidnightRewrite);
  window.addEventListener("resize", renderWaveform);
  document.addEventListener("click", (event) => {
    const helpButton = event.target.closest("[data-api-help]");
    if (helpButton) {
      const key = helpButton.dataset.apiHelp;
      const panel = $(`[data-api-help-panel="${key}"]`);
      panel?.classList.toggle("hidden");
      return;
    }
    const removeVoiceRefButton = event.target.closest("[data-remove-voice-ref]");
    if (removeVoiceRefButton) {
      saveVoiceReferences(getVoiceReferences().filter((item) => item.id !== removeVoiceRefButton.dataset.removeVoiceRef));
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
    });
    reader.readAsDataURL(file);
  });
  $("#applyBgUrl").addEventListener("click", () => {
    const value = $("#playerBgUrl").value.trim();
    if (!value) return;
    localStorage.setItem(playerBgKey, value);
    setPlayerBackground(value);
  });
  $("#clearBg").addEventListener("click", () => {
    localStorage.removeItem(playerBgKey);
    $("#playerBgUrl").value = "";
    $("#playerBgFile").value = "";
    setPlayerBackground("");
  });
  $("#fileInput").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    $("#novelInput").value = text;
    if (!$("#titleInput").value.trim()) {
      $("#titleInput").value = file.name.replace(/\.[^.]+$/, "");
    }
  });
  $("#directPromptFile").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    $("#directPromptInput").value = await file.text();
    if (!$("#titleInput").value.trim()) {
      $("#titleInput").value = file.name.replace(/\.[^.]+$/, "");
    }
  });
}

decorateApiHelpFields();
loadConfigIntoForm();
loadPlayerBackground();
renderVoiceReferences();
renderClipList();
renderWaveform();
loadPlan();
renderStages();
updateMidnightState();
bindEvents();
