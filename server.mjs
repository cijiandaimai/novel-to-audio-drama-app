import http from "node:http";
import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "public");
const outputsDir = path.join(__dirname, "outputs");
const promptGuidePath = path.join(__dirname, "AI影视级音频提示词写作指导.md");
const PORT = Number(process.env.PORT || 4173);

const OPTIMIZED_PLAN = {
  title: "小说转广播剧自动流水线",
  stages: [
    "GPT 读取小说样本并生成故事骨架、角色表、改编策略",
    "Gemini 基于骨架扩展场景与戏剧冲突",
    "豆包文本模型润色中文对白与角色语气",
    "GPT 汇总生成广播剧剧本 1",
    "豆包文本模型只优化台词，不改剧情结构",
    "GPT 生成最终录制版剧本 2",
    "GPT 按影视级音频提示词规范拆成分段提示词",
    "Doubao-Seed-Audio 1.0 逐段生成音频",
    "后台音频引擎统一响度、拼接、导出"
  ],
  principles: [
    "不在每一步传整本小说，改为传项目资料包和当前章节上下文",
    "每一步都保留结构化中间产物，方便重试和人工校对",
    "台词优化模型不得擅自改人物关系、主线剧情和关键伏笔",
    "音频提示词按 30-90 秒拆段，复杂多人戏短一点更稳",
    "音频合成失败时只重试失败段，不重跑完整项目"
  ]
};

await fs.mkdir(outputsDir, { recursive: true });

function sendJson(res, status, data) {
  const body = JSON.stringify(data, null, 2);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body)
  });
  res.end(body);
}

function sendText(res, status, text, contentType = "text/plain; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": contentType,
    "Content-Length": Buffer.byteLength(text)
  });
  res.end(text);
}

async function readBody(req, limit = 20 * 1024 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) {
      throw new Error("请求内容过大，请先拆分小说文档。");
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function readJson(req) {
  const body = await readBody(req);
  return body ? JSON.parse(body) : {};
}

function safeName(name) {
  return String(name || "未命名作品")
    .replace(/[\\/:*?"<>|]+/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80) || "未命名作品";
}

function pickText(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeChatUrl(baseUrl) {
  const url = pickText(baseUrl);
  if (!url) return "";
  if (url.endsWith("/chat/completions")) return url;
  if (url.endsWith("/v1")) return `${url}/chat/completions`;
  if (url.endsWith("/api/v3")) return `${url}/chat/completions`;
  return url;
}

function chunkNovel(text, maxChars = 5200) {
  const clean = String(text || "")
    .replace(/\r/g, "")
    .replace(/\n{4,}/g, "\n\n")
    .trim();
  if (!clean) return [];

  const lines = clean.split("\n");
  const chapters = [];
  let current = [];
  const chapterPattern = /^\s*(第[一二三四五六七八九十百千万\d]+[章节卷回]|Chapter\s+\d+|CHAPTER\s+\d+)/;

  for (const line of lines) {
    if (chapterPattern.test(line) && current.join("\n").trim()) {
      chapters.push(current.join("\n").trim());
      current = [line];
    } else {
      current.push(line);
    }
  }
  if (current.join("\n").trim()) chapters.push(current.join("\n").trim());

  const source = chapters.length > 1 ? chapters : [clean];
  const chunks = [];
  for (const part of source) {
    if (part.length <= maxChars) {
      chunks.push(part);
      continue;
    }
    for (let i = 0; i < part.length; i += maxChars) {
      chunks.push(part.slice(i, i + maxChars));
    }
  }
  return chunks;
}

function buildNovelContext(novelText) {
  const chunks = chunkNovel(novelText);
  const head = chunks.slice(0, 2).join("\n\n---\n\n");
  const middle = chunks.length > 4 ? chunks[Math.floor(chunks.length / 2)] : "";
  const tail = chunks.length > 2 ? chunks.slice(-1)[0] : "";
  return {
    chunkCount: chunks.length,
    charCount: novelText.length,
    context: [
      `全文字符数：${novelText.length}`,
      `自动拆分段数：${chunks.length}`,
      "【开头样本】",
      head,
      middle ? "【中段样本】\n" + middle : "",
      tail ? "【结尾样本】\n" + tail : ""
    ].filter(Boolean).join("\n\n")
  };
}

function missingProvider(provider) {
  return !provider || !provider.apiKey || !provider.model;
}

async function callOpenAICompatible(provider, messages, temperature = 0.4) {
  const url = normalizeChatUrl(provider.baseUrl);
  if (!url) throw new Error("缺少接口地址");
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${provider.apiKey}`
    },
    body: JSON.stringify({
      model: provider.model,
      messages,
      temperature
    })
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`模型接口调用失败：${response.status} ${text.slice(0, 800)}`);
  }
  const data = JSON.parse(text);
  return data.choices?.[0]?.message?.content?.trim()
    || data.output_text?.trim()
    || JSON.stringify(data, null, 2);
}

async function callGemini(provider, system, user, temperature = 0.5) {
  const model = encodeURIComponent(provider.model);
  const endpoint = pickText(provider.endpoint)
    || `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(provider.apiKey)}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: `${system}\n\n${user}` }]
        }
      ],
      generationConfig: { temperature }
    })
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Gemini 调用失败：${response.status} ${text.slice(0, 800)}`);
  }
  const data = JSON.parse(text);
  return data.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("\n").trim()
    || JSON.stringify(data, null, 2);
}

async function invokeChat({ providerName, provider, system, user, temperature, mock }) {
  if (missingProvider(provider)) return mock;
  if (providerName === "gemini") return callGemini(provider, system, user, temperature);
  return callOpenAICompatible(provider, [
    { role: "system", content: system },
    { role: "user", content: user }
  ], temperature);
}

async function readPromptGuide() {
  try {
    const guide = await fs.readFile(promptGuidePath, "utf8");
    return guide.slice(0, 18000);
  } catch {
    return "影视级音频提示词需要包含：音频类型、时长、整体情绪、场景空间、音乐设计、环境声、角色声线、对白内容、表演要求、音效时间线、混音要求、禁止事项。";
  }
}

function mockProjectBible(title, novelContext) {
  return `# ${title} 广播剧项目资料包（演示模式）

## 故事骨架
- 从原著样本提取主线冲突、关键人物关系和章节推进节奏。
- 保留原著核心事件，改编为以声音驱动的场景。
- 每集围绕一个清晰目标推进，结尾留下情绪钩子或剧情悬念。

## 角色表
- 主角：承担主要视角，台词要有内心变化。
- 对手/阻力角色：推动冲突升级。
- 旁白：只补充必要信息，不抢对白戏。

## 改编策略
- 将大段心理描写拆成旁白、停顿、呼吸、环境声和角色反应。
- 将动作描写转换成脚步、衣料、开门、碰撞、远近变化。
- 所有新增台词必须服务原著冲突。

## 小说上下文摘要
${novelContext.context.slice(0, 2600)}`;
}

function fallbackAudioPrompts(scriptText, title, promptGuide) {
  const compact = scriptText.replace(/\n{3,}/g, "\n\n").trim();
  const chunks = [];
  for (let i = 0; i < compact.length; i += 1800) {
    chunks.push(compact.slice(i, i + 1800));
  }
  const limited = chunks.slice(0, 8);
  return limited.map((chunk, index) => ({
    id: `scene-${String(index + 1).padStart(2, "0")}`,
    title: `${title} 片段 ${index + 1}`,
    durationSeconds: Math.min(90, Math.max(35, Math.ceil(chunk.length / 24))),
    prompt: [
      "【音频类型】广播剧片段",
      `【时长】约 ${Math.min(90, Math.max(35, Math.ceil(chunk.length / 24)))} 秒`,
      "【整体情绪】根据剧情自然递进，保留戏剧张力。",
      "【场景空间】根据剧本文字建立清晰空间感，人声靠前。",
      "【音乐设计】背景音乐低于对白，不出现清晰歌词，关键台词处让音乐退后。",
      "【环境声】环境声服务场景，不遮挡关键词。",
      "【角色声线】使用原创合成声线，不模仿任何真实人物。",
      "【对白内容】",
      chunk,
      "【表演要求】保留停顿、呼吸、轻笑、哽咽、压低声线等可听见的表演变化。",
      "【混音要求】对白始终为前景主声部，音乐和环境声在背景层，关键音效短暂突出后退回。",
      "【禁止事项】不要朗诵腔，不要让背景声盖住人声，不要生成真实名人声线。"
    ].join("\n")
  }));
}

function parsePromptArray(text, title, promptGuide) {
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed) && parsed.length) {
        return parsed.map((item, index) => ({
          id: item.id || `scene-${String(index + 1).padStart(2, "0")}`,
          title: item.title || `${title} 片段 ${index + 1}`,
          durationSeconds: Number(item.durationSeconds || item.duration_seconds || 60),
          prompt: String(item.prompt || item.text || "").trim()
        })).filter((item) => item.prompt);
      }
    } catch {
      // Fall back to deterministic segmentation below.
    }
  }
  return fallbackAudioPrompts(text, title, promptGuide);
}

function normalizeAudioPrompts(input, title, promptGuide) {
  if (Array.isArray(input)) {
    return input.map((item, index) => ({
      id: item.id || `scene-${String(index + 1).padStart(2, "0")}`,
      title: item.title || `${title} 片段 ${index + 1}`,
      durationSeconds: Number(item.durationSeconds || item.duration_seconds || 60),
      prompt: String(item.prompt || item.text || item.content || "").trim()
    })).filter((item) => item.prompt);
  }
  const text = String(input || "").trim();
  if (!text) return [];
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    try {
      return normalizeAudioPrompts(JSON.parse(jsonMatch[0]), title, promptGuide);
    } catch {
      // Treat as plain text below.
    }
  }
  const blocks = text
    .split(/\n\s*(?:---+|###\s*|片段\s*\d+[:：]?|Scene\s*\d+[:：]?)\s*\n/gi)
    .map((block) => block.trim())
    .filter(Boolean);
  const source = blocks.length > 1 ? blocks : text.split(/\n{3,}/).map((block) => block.trim()).filter(Boolean);
  return source.map((prompt, index) => ({
    id: `direct-${String(index + 1).padStart(2, "0")}`,
    title: `${title} 提示词 ${index + 1}`,
    durationSeconds: Math.min(90, Math.max(30, Math.ceil(prompt.length / 28))),
    prompt
  }));
}

function normalizeVoiceReferences(references = []) {
  return (Array.isArray(references) ? references : [])
    .map((item, index) => {
      const dataUrl = String(item.dataUrl || item.url || "");
      const base64 = dataUrl.includes(",") ? dataUrl.split(",").pop() : String(item.audio_base64 || item.base64 || "");
      return {
        id: item.id || `voice-${index + 1}`,
        role: String(item.role || item.name || `角色 ${index + 1}`).trim(),
        fileName: String(item.fileName || item.file_name || "voice-reference.wav").trim(),
        mimeType: String(item.mimeType || item.mime_type || "audio/wav").trim(),
        audioBase64: base64
      };
    })
    .filter((item) => item.role && item.audioBase64);
}

function createWavBuffer(durationSeconds = 3, frequency = 0) {
  const sampleRate = 16000;
  const channels = 1;
  const bytesPerSample = 2;
  const sampleCount = Math.max(sampleRate, Math.floor(durationSeconds * sampleRate));
  const dataSize = sampleCount * channels * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * channels * bytesPerSample, 28);
  buffer.writeUInt16LE(channels * bytesPerSample, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < sampleCount; i++) {
    const sample = frequency
      ? Math.round(Math.sin((2 * Math.PI * frequency * i) / sampleRate) * 900)
      : 0;
    buffer.writeInt16LE(sample, 44 + i * 2);
  }
  return buffer;
}

async function writeMockAudio(jobDir, segment, index) {
  const duration = Math.min(12, Math.max(2, Math.round((segment.durationSeconds || 45) / 15)));
  const fileName = `${String(index + 1).padStart(2, "0")}-${segment.id}.wav`;
  const filePath = path.join(jobDir, fileName);
  await fs.writeFile(filePath, createWavBuffer(duration, 0));
  return {
    ...segment,
    mode: "mock",
    fileName,
    note: "演示模式生成静音占位 WAV；配置 Doubao-Seed-Audio 1.0 后会生成真实音频。"
  };
}

async function callAudioEndpoint(audioConfig, segment, jobDir, index, voiceReferences = []) {
  const normalizedVoiceReferences = normalizeVoiceReferences(voiceReferences).slice(0, 3);
  const requestId = crypto.randomUUID();
  const body = {
    model: audioConfig.model || "seed-audio-1.0",
    text_prompt: segment.prompt,
    original_duration: Math.min(120, Number(segment.durationSeconds || 60)),
    audio_config: {
      format: "wav",
      sample_rate: 24000
    }
  };
  if (normalizedVoiceReferences.length) {
    body.references = normalizedVoiceReferences.map((item) => ({
      audio_data: item.audioBase64
    }));
  }
  const response = await fetch(audioConfig.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": audioConfig.apiKey,
      "X-Api-Request-Id": requestId
    },
    body: JSON.stringify(body)
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Doubao Audio 调用失败：${response.status} ${text.slice(0, 800)}`);
  }
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  if (typeof data.code === "number" && data.code !== 0) {
    throw new Error(`Doubao Audio 返回错误：${data.code} ${data.message || ""}`.trim());
  }

  const base64 = data.audio || data.audio_base64 || data.data?.audio || data.data?.audio_base64 || data.result?.audio || data.result?.audio_base64;
  const audioUrl = data.url || data.audio_url || data.data?.url || data.data?.audio_url || data.result?.url || data.result?.audio_url;
  const fileName = `${String(index + 1).padStart(2, "0")}-${segment.id}.wav`;
  const filePath = path.join(jobDir, fileName);

  if (base64) {
    await fs.writeFile(filePath, Buffer.from(base64, "base64"));
    return { ...segment, mode: "remote", fileName };
  }
  if (audioUrl) {
    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) throw new Error(`音频下载失败：${audioResponse.status}`);
    await fs.writeFile(filePath, Buffer.from(await audioResponse.arrayBuffer()));
    return { ...segment, mode: "remote", fileName, sourceUrl: audioUrl };
  }

  await fs.writeFile(path.join(jobDir, `${segment.id}-audio-response.json`), JSON.stringify(data, null, 2));
  return {
    ...segment,
    mode: "remote-response",
    note: "接口返回中未识别到 audio 或 url，已保存原始响应。"
  };
}

async function mergeSimpleWav(jobDir, segments) {
  const wavSegments = [];
  for (const segment of segments) {
    if (!segment.fileName || !segment.fileName.endsWith(".wav")) continue;
    const buffer = await fs.readFile(path.join(jobDir, segment.fileName));
    if (buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WAVE") {
      continue;
    }
    wavSegments.push(buffer);
  }
  if (!wavSegments.length) return null;

  const dataParts = wavSegments.map((buffer) => buffer.subarray(44));
  const dataSize = dataParts.reduce((sum, part) => sum + part.length, 0);
  const out = Buffer.alloc(44 + dataSize);
  wavSegments[0].copy(out, 0, 0, 44);
  out.writeUInt32LE(36 + dataSize, 4);
  out.writeUInt32LE(dataSize, 40);
  let offset = 44;
  for (const part of dataParts) {
    part.copy(out, offset);
    offset += part.length;
  }
  const fileName = "final-broadcast-drama.wav";
  await fs.writeFile(path.join(jobDir, fileName), out);
  return fileName;
}

async function generateAudioSegments(audioConfig, prompts, jobDir, voiceReferences = []) {
  const generated = [];
  for (let i = 0; i < prompts.length; i++) {
    const segment = prompts[i];
    if (audioConfig?.mode === "http" && audioConfig.endpoint && audioConfig.apiKey) {
      try {
        generated.push(await callAudioEndpoint(audioConfig, segment, jobDir, i, voiceReferences));
      } catch (error) {
        const fallback = await writeMockAudio(jobDir, segment, i);
        generated.push({ ...fallback, error: error.message });
      }
    } else {
      generated.push(await writeMockAudio(jobDir, segment, i));
    }
  }
  const finalAudio = await mergeSimpleWav(jobDir, generated);
  return { generated, finalAudio };
}

async function runDirectAudio(input) {
  const title = safeName(input.title || "直接提示词音频");
  const config = input.config || {};
  const guide = await readPromptGuide();
  const audioPrompts = normalizeAudioPrompts(input.prompts || input.promptText || input.text, title, guide);
  if (!audioPrompts.length) throw new Error("请先上传或粘贴音频提示词。");

  const jobId = `${new Date().toISOString().replace(/[:.]/g, "-")}-${crypto.randomBytes(4).toString("hex")}`;
  const jobDir = path.join(outputsDir, jobId);
  await fs.mkdir(jobDir, { recursive: true });

  const audio = await generateAudioSegments(config.audio || {}, audioPrompts, jobDir, config.voiceReferences || []);
  const artifacts = [];
  artifacts.push(await writeArtifact(jobDir, "01-direct-audio-prompts.json", JSON.stringify(audioPrompts, null, 2)));
  const manifest = {
    jobId,
    title,
    createdAt: new Date().toISOString(),
    mode: "direct-audio",
    voiceReferences: normalizeVoiceReferences(config.voiceReferences || []).map(({ audioBase64, ...rest }) => rest),
    artifacts,
    audioSegments: audio.generated,
    finalAudio: audio.finalAudio
  };
  await writeArtifact(jobDir, "manifest.json", JSON.stringify(manifest, null, 2));

  return {
    jobId,
    title,
    manifest,
    links: {
      manifest: `/outputs/${jobId}/manifest.json`,
      audioPrompts: `/outputs/${jobId}/01-direct-audio-prompts.json`,
      finalAudio: audio.finalAudio ? `/outputs/${jobId}/${audio.finalAudio}` : null,
      outputFolder: `/outputs/${jobId}/`
    }
  };
}

async function writeArtifact(jobDir, name, content) {
  const filePath = path.join(jobDir, name);
  await fs.writeFile(filePath, content, "utf8");
  return name;
}

async function runPipeline(input) {
  const title = safeName(input.title);
  const novelText = pickText(input.novelText);
  if (!novelText) throw new Error("请先上传或粘贴小说内容。");

  const jobId = `${new Date().toISOString().replace(/[:.]/g, "-")}-${crypto.randomBytes(4).toString("hex")}`;
  const jobDir = path.join(outputsDir, jobId);
  await fs.mkdir(jobDir, { recursive: true });

  const config = input.config || {};
  const novelContext = buildNovelContext(novelText);
  const guide = await readPromptGuide();
  const stages = [];

  const gptSystem = "你是资深广播剧总编剧和制作统筹。你只输出可执行、结构清晰、便于进入下一制作环节的内容。";
  const geminiSystem = "你是长篇小说改编编剧，擅长扩写场景、补足戏剧冲突、保持原著设定一致。";
  const doubaoSystem = "你是中文广播剧台词导演，只优化中文对白、语气、节奏和可听表演，不擅自改变剧情事实。";

  const projectBible = await invokeChat({
    providerName: "gpt",
    provider: config.gpt,
    system: gptSystem,
    temperature: 0.35,
    user: `请把小说改编成广播剧项目资料包。必须包含：故事骨架、角色小传、人物关系、场景列表、广播剧改编策略、不得改动的关键设定。\n\n${novelContext.context}`,
    mock: mockProjectBible(title, novelContext)
  });
  stages.push({ name: "GPT 生成项目资料包", output: projectBible });

  const expansion = await invokeChat({
    providerName: "gemini",
    provider: config.gemini,
    system: geminiSystem,
    temperature: 0.55,
    user: `基于下面项目资料包扩展成广播剧分场大纲。要求：增强冲突、补足场景动作、标注每场情绪曲线，不要改核心剧情。\n\n${projectBible}`,
    mock: `# 分场扩展大纲（演示模式）\n\n1. 开场：用环境声建立世界和人物状态。\n2. 冲突引入：用对话替代大段叙述，让角色目标碰撞。\n3. 情绪升级：增加停顿、走动、物品声和近远变化。\n4. 章节钩子：以一句关键台词或突发音效收束。\n\n${projectBible.slice(0, 1800)}`
  });
  stages.push({ name: "Gemini 扩展分场大纲", output: expansion });

  const dialogueBrief = await invokeChat({
    providerName: "doubao",
    provider: config.doubao,
    system: doubaoSystem,
    temperature: 0.45,
    user: `请把分场大纲中的角色对白方向优化成中文广播剧口语表达。输出：角色语气规则、台词风格禁忌、每场关键对白建议。\n\n${expansion}`,
    mock: `# 中文台词优化方向（演示模式）\n\n- 旁白少解释，多留声音空间。\n- 主角台词短句化，遇到情绪转折时加入停顿和呼吸。\n- 配角台词承担信息推进，避免所有人说同一种书面腔。\n- 所有台词保留原著关系和事件。\n\n${expansion.slice(0, 1600)}`
  });
  stages.push({ name: "豆包优化对白方向", output: dialogueBrief });

  const script1 = await invokeChat({
    providerName: "gpt",
    provider: config.gpt,
    system: gptSystem,
    temperature: 0.42,
    user: `请生成广播剧剧本 1。格式必须包含：场次编号、场景空间、角色、旁白、对白、音效、音乐、情绪提示、预计时长。\n\n【项目资料包】\n${projectBible}\n\n【分场大纲】\n${expansion}\n\n【台词方向】\n${dialogueBrief}`,
    mock: `# 广播剧剧本 1（演示模式）\n\n## 场 1：开场\n场景空间：室内，夜晚，远处有低弱环境声。\n音乐：低音量悬疑铺底，不盖对白。\n旁白：故事从一个安静却不寻常的夜晚开始。\n主角（压低声音）：这件事，我本来不想再提。\n配角（短暂停顿）：可现在，已经来不及了。\n音效：远处门轴轻响，随后停顿。\n预计时长：60 秒。\n\n## 场 2：冲突升级\n主角：你到底瞒了我多久？\n配角：从一开始。\n音效：杯子碰到桌面，声音短促。\n预计时长：70 秒。`
  });
  stages.push({ name: "GPT 生成剧本 1", output: script1 });

  const script1Dialogue = await invokeChat({
    providerName: "doubao",
    provider: config.doubao,
    system: doubaoSystem,
    temperature: 0.38,
    user: `只优化下面剧本的台词和表演语气，不改剧情、不改场次、不删除音效和音乐标注。输出完整优化稿。\n\n${script1}`,
    mock: `${script1}\n\n## 台词二次优化备注（演示模式）\n- 主角台词减少书面表达，增加压低声线和停顿。\n- 配角在关键句前加入短吸气，增强广播剧听感。`
  });
  stages.push({ name: "豆包二次优化台词", output: script1Dialogue });

  const script2 = await invokeChat({
    providerName: "gpt",
    provider: config.gpt,
    system: gptSystem,
    temperature: 0.35,
    user: `请根据二次优化稿生成最终录制版剧本 2。要求：分段清楚、可直接进入音频提示词生成；保留角色声线、音效时间线、混音要求。\n\n${script1Dialogue}`,
    mock: `# 广播剧剧本 2（最终录制版，演示模式）\n\n## 片段 1：夜晚的开场\n时长：约 60 秒\n场景：室内夜晚，空间安静，有远处低弱风声。\n角色声线：\n- 旁白：中性声音，沉稳，语速慢。\n- 主角：青年声音，压低声线，带隐忍。\n- 配角：青年声音，紧张，回答前有短吸气。\n音乐：低音量悬疑铺底。\n音效时间线：0-8 秒风声；18 秒门轴轻响；42 秒杯子轻碰桌面。\n对白：\n旁白：故事从一个安静却不寻常的夜晚开始。\n主角（压低声音，停半拍）：这件事……我本来不想再提。\n配角（短吸气）：可现在，已经来不及了。\n\n## 片段 2：追问\n时长：约 70 秒\n场景：同一房间，距离更近，压迫感增强。\n主角（声量升高但克制）：你到底瞒了我多久？\n配角（明显停顿）：从一开始。\n音效：杯子碰到桌面，短促，随后音乐低沉一拍。`
  });
  stages.push({ name: "GPT 生成剧本 2", output: script2 });

  const audioPromptRaw = await invokeChat({
    providerName: "gpt",
    provider: config.gpt,
    system: "你是影视级音频提示词工程师。你必须输出 JSON 数组，不要输出解释。",
    temperature: 0.25,
    user: `请根据提示词写作指导，把广播剧剧本拆成 Doubao-Seed-Audio 1.0 可用的分段音频提示词。每段 30-90 秒，复杂多人戏拆短。每个元素格式：{"id":"scene-01","title":"片段名","durationSeconds":60,"prompt":"完整提示词"}。\n\n【提示词指导】\n${guide}\n\n【剧本 2】\n${script2}`,
    mock: JSON.stringify(fallbackAudioPrompts(script2, title, guide), null, 2)
  });
  const audioPrompts = parsePromptArray(audioPromptRaw, title, guide);
  stages.push({ name: "GPT 生成影视级音频提示词", output: JSON.stringify(audioPrompts, null, 2) });

  const audio = await generateAudioSegments(config.audio || {}, audioPrompts, jobDir, config.voiceReferences || []);
  stages.push({ name: "Doubao-Seed-Audio 1.0 生成并合成音频", output: JSON.stringify(audio, null, 2) });

  const artifacts = [];
  artifacts.push(await writeArtifact(jobDir, "01-project-bible.md", projectBible));
  artifacts.push(await writeArtifact(jobDir, "02-expanded-treatment.md", expansion));
  artifacts.push(await writeArtifact(jobDir, "03-dialogue-brief.md", dialogueBrief));
  artifacts.push(await writeArtifact(jobDir, "04-script-1.md", script1));
  artifacts.push(await writeArtifact(jobDir, "05-dialogue-pass.md", script1Dialogue));
  artifacts.push(await writeArtifact(jobDir, "06-script-2.md", script2));
  artifacts.push(await writeArtifact(jobDir, "07-audio-prompts.json", JSON.stringify(audioPrompts, null, 2)));

  const manifest = {
    jobId,
    title,
    createdAt: new Date().toISOString(),
    plan: OPTIMIZED_PLAN,
    stages: stages.map((stage) => ({ name: stage.name, preview: stage.output.slice(0, 1000) })),
    artifacts,
    audioSegments: audio.generated,
    finalAudio: audio.finalAudio
  };
  await writeArtifact(jobDir, "manifest.json", JSON.stringify(manifest, null, 2));
  await writeArtifact(jobDir, "stage-log.md", stages.map((stage) => `# ${stage.name}\n\n${stage.output}`).join("\n\n---\n\n"));

  return {
    jobId,
    title,
    stages,
    manifest,
    links: {
      manifest: `/outputs/${jobId}/manifest.json`,
      script2: `/outputs/${jobId}/06-script-2.md`,
      audioPrompts: `/outputs/${jobId}/07-audio-prompts.json`,
      finalAudio: audio.finalAudio ? `/outputs/${jobId}/${audio.finalAudio}` : null,
      outputFolder: `/outputs/${jobId}/`
    }
  };
}

async function listHistory() {
  const entries = await fs.readdir(outputsDir, { withFileTypes: true }).catch(() => []);
  const manifests = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    try {
      const manifest = JSON.parse(await fs.readFile(path.join(outputsDir, entry.name, "manifest.json"), "utf8"));
      manifests.push({
        jobId: manifest.jobId,
        title: manifest.title,
        createdAt: manifest.createdAt,
        finalAudio: manifest.finalAudio ? `/outputs/${manifest.jobId}/${manifest.finalAudio}` : null,
        manifest: `/outputs/${manifest.jobId}/manifest.json`
      });
    } catch {
      // Ignore incomplete jobs.
    }
  }
  return manifests.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4"
};

async function serveStatic(res, root, requestPath) {
  const decoded = decodeURIComponent(requestPath.split("?")[0]);
  const relative = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "");
  const filePath = path.normalize(path.join(root, relative));
  if (!filePath.startsWith(root)) {
    sendText(res, 403, "Forbidden");
    return;
  }
  try {
    const stat = await fs.stat(filePath);
    if (stat.isDirectory()) {
      const files = await fs.readdir(filePath);
      sendJson(res, 200, files);
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const data = await fs.readFile(filePath);
    res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
    res.end(data);
  } catch {
    sendText(res, 404, "Not found");
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    if (req.method === "GET" && url.pathname === "/api/plan") {
      sendJson(res, 200, OPTIMIZED_PLAN);
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/history") {
      sendJson(res, 200, await listHistory());
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/run") {
      const input = await readJson(req);
      const result = await runPipeline(input);
      sendJson(res, 200, result);
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/audio-direct") {
      const input = await readJson(req);
      const result = await runDirectAudio(input);
      sendJson(res, 200, result);
      return;
    }
    if (req.method === "GET" && url.pathname.startsWith("/outputs/")) {
      await serveStatic(res, outputsDir, url.pathname.replace(/^\/outputs\/?/, "/"));
      return;
    }
    if (req.method === "GET") {
      await serveStatic(res, publicDir, url.pathname);
      return;
    }
    sendText(res, 405, "Method not allowed");
  } catch (error) {
    sendJson(res, 500, { error: error.message || String(error) });
  }
});

server.listen(PORT, () => {
  console.log(`小说转广播剧 App 已启动：http://localhost:${PORT}`);
});
