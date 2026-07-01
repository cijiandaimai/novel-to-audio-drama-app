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
  sourceBuffer: null,
  sourceUrl: "",
  sourceName: "",
  clips: [],
  pickNext: "start",
  clipTimer: null,
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

function getEditorDuration() {
  return editorState.sourceBuffer?.duration || 0;
}

function setClipInputs(start, end) {
  const duration = getEditorDuration();
  $("#clipStart").value = clamp(start, 0, duration).toFixed(2);
  $("#clipEnd").value = clamp(end, 0, duration).toFixed(2);
  renderWaveform();
}

function getClipInputs() {
  const duration = getEditorDuration();
  const start = clamp($("#clipStart").value, 0, duration);
  const end = clamp($("#clipEnd").value, 0, duration);
  return { start: Math.min(start, end), end: Math.max(start, end) };
}

function updateEditorSourceInfo() {
  const info = $("#editorSourceInfo");
  if (!info) return;
  if (!editorState.sourceBuffer) {
    info.textContent = "还没有载入音频。";
    return;
  }
  const duration = editorState.sourceBuffer.duration;
  info.textContent = `${editorState.sourceName}｜${formatSeconds(duration)}｜${editorState.sourceBuffer.numberOfChannels} 声道｜${editorState.sourceBuffer.sampleRate} Hz`;
}

async function setEditorSource({ arrayBuffer, url, name }) {
  const context = getEditorAudioContext();
  const buffer = await context.decodeAudioData(arrayBuffer.slice(0));
  if (editorState.sourceUrl && editorState.sourceUrl.startsWith("blob:")) {
    URL.revokeObjectURL(editorState.sourceUrl);
  }
  editorState.sourceBuffer = buffer;
  editorState.sourceUrl = url;
  editorState.sourceName = name || "未命名音频";
  editorState.clips = [];
  $("#editorPreview").src = url;
  setClipInputs(0, Math.min(buffer.duration, 30));
  updateEditorSourceInfo();
  renderClipList();
  renderWaveform();
}

async function loadEditorFile(file) {
  if (!file) return;
  const arrayBuffer = await file.arrayBuffer();
  const url = URL.createObjectURL(file);
  await setEditorSource({ arrayBuffer, url, name: file.name });
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
      name: $("#playerTitle")?.textContent?.trim() || "播放器音频"
    });
    showView("editor");
  } catch {
    alert("这个音频地址无法直接导入。请先下载到本机，再从剪辑工作台上传。");
  }
}

async function loadDemoEditorAudio() {
  const context = getEditorAudioContext();
  const sampleRate = 44100;
  const duration = 8;
  const buffer = context.createBuffer(1, sampleRate * duration, sampleRate);
  const channel = buffer.getChannelData(0);
  for (let i = 0; i < channel.length; i++) {
    const time = i / sampleRate;
    const tone = Math.sin(2 * Math.PI * 220 * time) * 0.16 + Math.sin(2 * Math.PI * 440 * time) * 0.08;
    const pulse = Math.sin(2 * Math.PI * 2 * time) > 0 ? 1 : 0.45;
    const fade = Math.min(1, time / 0.4, (duration - time) / 0.6);
    channel[i] = tone * pulse * Math.max(0, fade);
  }
  const blob = audioBufferToWav(buffer);
  const url = URL.createObjectURL(blob);
  await setEditorSource({
    arrayBuffer: await blob.arrayBuffer(),
    url,
    name: "演示音频.wav"
  });
}

function renderWaveform() {
  const canvas = $("#waveformCanvas");
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  const width = Math.max(320, Math.floor(rect.width * ratio));
  const height = Math.max(160, Math.floor(rect.height * ratio));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "rgba(255, 250, 238, 0.86)";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(49, 95, 76, 0.16)";
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 64 * ratio) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(31, 33, 31, 0.18)";
  ctx.beginPath();
  ctx.moveTo(0, height / 2);
  ctx.lineTo(width, height / 2);
  ctx.stroke();

  const buffer = editorState.sourceBuffer;
  if (!buffer) {
    ctx.fillStyle = "rgba(116, 111, 99, 0.78)";
    ctx.font = `${14 * ratio}px Microsoft YaHei, sans-serif`;
    ctx.fillText("上传音频后这里会显示波形", 18 * ratio, 34 * ratio);
    return;
  }

  const data = buffer.getChannelData(0);
  const samplesPerPixel = Math.max(1, Math.floor(data.length / width));
  ctx.strokeStyle = "#315f4c";
  ctx.lineWidth = Math.max(1, ratio);
  ctx.beginPath();
  for (let x = 0; x < width; x++) {
    let min = 1;
    let max = -1;
    const start = x * samplesPerPixel;
    for (let i = 0; i < samplesPerPixel && start + i < data.length; i++) {
      const sample = data[start + i];
      if (sample < min) min = sample;
      if (sample > max) max = sample;
    }
    const y1 = ((1 - max) * height) / 2;
    const y2 = ((1 - min) * height) / 2;
    ctx.moveTo(x, y1);
    ctx.lineTo(x, y2);
  }
  ctx.stroke();

  const { start, end } = getClipInputs();
  if (end > start) {
    const x1 = (start / buffer.duration) * width;
    const x2 = (end / buffer.duration) * width;
    ctx.fillStyle = "rgba(111, 31, 27, 0.16)";
    ctx.fillRect(x1, 0, Math.max(2, x2 - x1), height);
    ctx.strokeStyle = "rgba(111, 31, 27, 0.72)";
    ctx.lineWidth = 2 * ratio;
    ctx.strokeRect(x1, 0, Math.max(2, x2 - x1), height);
  }
}

function addEditorClip(start, end) {
  if (!editorState.sourceBuffer) {
    alert("请先上传或导入音频。");
    return;
  }
  const duration = getEditorDuration();
  const safeStart = clamp(start, 0, duration);
  const safeEnd = clamp(end, 0, duration);
  if (safeEnd - safeStart < 0.1) {
    alert("片段太短，请至少保留 0.1 秒。");
    return;
  }
  editorState.clips.push({
    id: `clip-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: `片段 ${editorState.clips.length + 1}`,
    start: safeStart,
    end: safeEnd,
    volume: 1,
    fadeIn: 0,
    fadeOut: 0,
    muted: false
  });
  renderClipList();
}

function renderClipList() {
  const list = $("#clipList");
  if (!list) return;
  if (!editorState.clips.length) {
    list.innerHTML = "<p class=\"clip-empty\">还没有剪辑片段。选择起点和终点后点“添加片段”。</p>";
    return;
  }
  list.innerHTML = "";
  editorState.clips.forEach((clip, index) => {
    const duration = Math.max(0, clip.end - clip.start);
    const article = document.createElement("article");
    article.className = "clip-item";
    article.dataset.clipId = clip.id;
    article.innerHTML = `
      <div class="clip-head">
        <div>
          <strong>${index + 1}. ${clip.name}</strong>
          <span>${formatSeconds(clip.start)} - ${formatSeconds(clip.end)}｜${formatSeconds(duration)}</span>
        </div>
        <label><input type="checkbox" data-clip-field="muted" ${clip.muted ? "checked" : ""} /> 静音</label>
      </div>
      <div class="clip-fields">
        <label>起点<input type="number" step="0.01" min="0" data-clip-field="start" value="${clip.start.toFixed(2)}" /></label>
        <label>终点<input type="number" step="0.01" min="0" data-clip-field="end" value="${clip.end.toFixed(2)}" /></label>
        <label>音量<input type="number" step="0.05" min="0" max="2" data-clip-field="volume" value="${clip.volume.toFixed(2)}" /></label>
        <label>淡入<input type="number" step="0.1" min="0" data-clip-field="fadeIn" value="${clip.fadeIn.toFixed(1)}" /></label>
        <label>淡出<input type="number" step="0.1" min="0" data-clip-field="fadeOut" value="${clip.fadeOut.toFixed(1)}" /></label>
      </div>
      <div class="clip-actions">
        <button class="secondary" data-clip-action="preview">试听</button>
        <button class="secondary" data-clip-action="select">选中范围</button>
        <button class="secondary" data-clip-action="up">上移</button>
        <button class="secondary" data-clip-action="down">下移</button>
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
  } else {
    const duration = getEditorDuration();
    const numeric = Number(value);
    if (field === "start") clip.start = clamp(numeric, 0, Math.max(0, clip.end - 0.1));
    if (field === "end") clip.end = clamp(numeric, Math.min(duration, clip.start + 0.1), duration);
    if (field === "volume") clip.volume = clamp(numeric, 0, 2);
    if (field === "fadeIn") clip.fadeIn = clamp(numeric, 0, Math.max(0, clip.end - clip.start));
    if (field === "fadeOut") clip.fadeOut = clamp(numeric, 0, Math.max(0, clip.end - clip.start));
  }
  renderClipList();
}

function moveClip(clipId, direction) {
  const index = editorState.clips.findIndex((item) => item.id === clipId);
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= editorState.clips.length) return;
  const [clip] = editorState.clips.splice(index, 1);
  editorState.clips.splice(nextIndex, 0, clip);
  renderClipList();
}

function playEditorClip(clipId) {
  const clip = editorState.clips.find((item) => item.id === clipId);
  const preview = $("#editorPreview");
  if (!clip || !preview) return;
  clearTimeout(editorState.clipTimer);
  preview.currentTime = clip.start;
  preview.play();
  editorState.clipTimer = setTimeout(() => preview.pause(), Math.max(120, (clip.end - clip.start) * 1000));
}

function handleClipAction(clipId, action) {
  const clip = editorState.clips.find((item) => item.id === clipId);
  if (!clip) return;
  if (action === "preview") playEditorClip(clipId);
  if (action === "select") setClipInputs(clip.start, clip.end);
  if (action === "up") moveClip(clipId, -1);
  if (action === "down") moveClip(clipId, 1);
  if (action === "remove") {
    editorState.clips = editorState.clips.filter((item) => item.id !== clipId);
    renderClipList();
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
  if (!editorState.sourceBuffer) {
    alert("请先上传或导入音频。");
    return;
  }
  if (!editorState.clips.length) {
    alert("请先添加至少一个片段。");
    return;
  }
  $("#exportMix").disabled = true;
  $("#editorResult").classList.add("hidden");
  try {
    const sourceBuffer = editorState.sourceBuffer;
    const sampleRate = sourceBuffer.sampleRate;
    const channels = sourceBuffer.numberOfChannels;
    const totalDuration = editorState.clips.reduce((sum, clip) => sum + Math.max(0, clip.end - clip.start), 0);
    const offline = new OfflineAudioContext(channels, Math.ceil(totalDuration * sampleRate), sampleRate);
    let offset = 0;
    for (const clip of editorState.clips) {
      const duration = Math.max(0, clip.end - clip.start);
      if (duration <= 0) continue;
      const source = offline.createBufferSource();
      const gain = offline.createGain();
      source.buffer = sourceBuffer;
      const volume = clip.muted ? 0 : clamp(clip.volume, 0, 2);
      const fadeIn = Math.min(duration, Math.max(0, clip.fadeIn || 0));
      const fadeOut = Math.min(duration, Math.max(0, clip.fadeOut || 0));
      gain.gain.setValueAtTime(fadeIn > 0 ? 0 : volume, offset);
      if (fadeIn > 0) gain.gain.linearRampToValueAtTime(volume, offset + fadeIn);
      gain.gain.setValueAtTime(volume, Math.max(offset, offset + duration - fadeOut));
      if (fadeOut > 0) gain.gain.linearRampToValueAtTime(0, offset + duration);
      source.connect(gain).connect(offline.destination);
      source.start(offset, clip.start, duration);
      offset += duration;
    }
    const rendered = await offline.startRendering();
    const blob = audioBufferToWav(rendered);
    if (editorState.renderedUrl) URL.revokeObjectURL(editorState.renderedUrl);
    editorState.renderedUrl = URL.createObjectURL(blob);
    const fileName = `${(editorState.sourceName || "广播剧剪辑").replace(/\.[^.]+$/, "")}-剪辑版.wav`;
    $("#editorResult").classList.remove("hidden");
    $("#editorResult").innerHTML = `
      <strong>合成完成：</strong>${fileName}<br />
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
  $("#editorAudioFile").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await loadEditorFile(file);
    } catch (error) {
      alert(`音频读取失败：${error.message}`);
    }
  });
  $("#clipStart").addEventListener("input", renderWaveform);
  $("#clipEnd").addEventListener("input", renderWaveform);
  $("#waveformCanvas").addEventListener("click", (event) => {
    if (!editorState.sourceBuffer) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const time = ((event.clientX - rect.left) / rect.width) * getEditorDuration();
    const { start, end } = getClipInputs();
    if (editorState.pickNext === "start") {
      setClipInputs(Math.min(time, end), end || Math.min(getEditorDuration(), time + 30));
      editorState.pickNext = "end";
    } else {
      setClipInputs(start, Math.max(time, start + 0.1));
      editorState.pickNext = "start";
    }
  });
  $("#setClipStartFromPlayer").addEventListener("click", () => {
    const preview = $("#editorPreview");
    const { end } = getClipInputs();
    setClipInputs(preview.currentTime || 0, end);
  });
  $("#setClipEndFromPlayer").addEventListener("click", () => {
    const preview = $("#editorPreview");
    const { start } = getClipInputs();
    setClipInputs(start, preview.currentTime || 0);
  });
  $("#addClip").addEventListener("click", () => {
    const { start, end } = getClipInputs();
    addEditorClip(start, end);
  });
  $("#addWholeClip").addEventListener("click", () => addEditorClip(0, getEditorDuration()));
  $("#loadDemoAudio").addEventListener("click", loadDemoEditorAudio);
  $("#clearClips").addEventListener("click", () => {
    editorState.clips = [];
    renderClipList();
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
