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
  $("#fillDirectPromptDemo").addEventListener("click", fillDirectPromptDemo);
  $("#runDirectAudioButton").addEventListener("click", runDirectAudio);
  $("#refreshHistory").addEventListener("click", loadHistory);
  document.addEventListener("click", (event) => {
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

loadConfigIntoForm();
loadPlayerBackground();
renderVoiceReferences();
loadPlan();
renderStages();
bindEvents();
