export const optimizedPlan = {
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
    "应用内音频引擎合成并播放"
  ],
  principles: [
    "安卓端没有本地 Node 服务时，直接在 App 内执行流水线",
    "每一步只传项目资料包和当前上下文，避免反复传整本小说",
    "台词优化只改对白，不改剧情结构",
    "音频提示词按 30-90 秒拆段",
    "没有 API Key 时使用演示模式，方便先试用 App"
  ]
};

function pickText(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function safeName(name) {
  return String(name || "未命名作品")
    .replace(/[\\/:*?"<>|]+/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80) || "未命名作品";
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
    } else {
      for (let i = 0; i < part.length; i += maxChars) chunks.push(part.slice(i, i + maxChars));
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
    body: JSON.stringify({ model: provider.model, messages, temperature })
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`模型接口调用失败：${response.status} ${text.slice(0, 500)}`);
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
      contents: [{ role: "user", parts: [{ text: `${system}\n\n${user}` }] }],
      generationConfig: { temperature }
    })
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Gemini 调用失败：${response.status} ${text.slice(0, 500)}`);
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
    const response = await fetch("/assets/audio-prompt-guide.md");
    if (response.ok) return (await response.text()).slice(0, 12000);
  } catch {
    // Use embedded fallback below.
  }
  return [
    "影视级音频提示词必须调度：人声表演、音乐、环境声、拟音音效、空间感、情绪递进、时间节奏、混音层级。",
    "每段包含：音频类型、时长、整体情绪、场景空间、音乐设计、环境声、角色声线、对白内容、表演要求、音效时间线、混音要求、禁止事项。",
    "对白始终为前景主声部，音乐和环境声保持背景层，关键音效短暂突出后迅速退回。",
    "使用原创合成声线，不模仿真实演员、主播或公众人物。"
  ].join("\n");
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

function fallbackAudioPrompts(scriptText, title) {
  const compact = scriptText.replace(/\n{3,}/g, "\n\n").trim();
  const chunks = [];
  for (let i = 0; i < compact.length; i += 1800) chunks.push(compact.slice(i, i + 1800));
  return chunks.slice(0, 8).map((chunk, index) => {
    const duration = Math.min(90, Math.max(35, Math.ceil(chunk.length / 24)));
    return {
      id: `scene-${String(index + 1).padStart(2, "0")}`,
      title: `${title} 片段 ${index + 1}`,
      durationSeconds: duration,
      prompt: [
        "【音频类型】广播剧片段",
        `【时长】约 ${duration} 秒`,
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
    };
  });
}

function parsePromptArray(text, title) {
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
      // Fall through.
    }
  }
  return fallbackAudioPrompts(text, title);
}

function normalizeAudioPrompts(input, title) {
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
      return normalizeAudioPrompts(JSON.parse(jsonMatch[0]), title);
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

function createWavBlob(durationSeconds = 3, frequency = 0) {
  const sampleRate = 16000;
  const sampleCount = Math.max(sampleRate, Math.floor(durationSeconds * sampleRate));
  const dataSize = sampleCount * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const writeString = (offset, value) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
  };
  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, dataSize, true);
  for (let i = 0; i < sampleCount; i++) {
    const sample = frequency ? Math.round(Math.sin((2 * Math.PI * frequency * i) / sampleRate) * 900) : 0;
    view.setInt16(44 + i * 2, sample, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}

async function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result || "")));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(blob);
  });
}

async function writeMockAudio(segment, index) {
  const duration = Math.min(12, Math.max(2, Math.round((segment.durationSeconds || 45) / 15)));
  const blob = createWavBlob(duration, 0);
  const url = URL.createObjectURL(blob);
  return {
    ...segment,
    mode: "mock",
    fileName: `${String(index + 1).padStart(2, "0")}-${segment.id}.wav`,
    url,
    dataUrl: await blobToDataUrl(blob),
    note: "演示模式生成静音占位 WAV；配置 Doubao-Seed-Audio 1.0 后会生成真实音频。"
  };
}

async function callAudioEndpoint(audioConfig, segment, index, voiceReferences = []) {
  const normalizedVoiceReferences = normalizeVoiceReferences(voiceReferences).slice(0, 3);
  const requestId = globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : `audio-${Date.now()}-${Math.random().toString(16).slice(2)}`;
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
  if (!response.ok) throw new Error(`Doubao Audio 调用失败：${response.status} ${text.slice(0, 500)}`);
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
  if (base64) {
    const dataUrl = `data:audio/wav;base64,${base64}`;
    return { ...segment, mode: "remote", fileName: `${String(index + 1).padStart(2, "0")}-${segment.id}.wav`, url: dataUrl, dataUrl };
  }
  if (audioUrl) {
    return { ...segment, mode: "remote-url", fileName: `${String(index + 1).padStart(2, "0")}-${segment.id}.wav`, url: audioUrl };
  }
  return {
    ...segment,
    mode: "remote-response",
    note: "接口返回中未识别到 audio 或 url。"
  };
}

async function generateAudioSegments(audioConfig, prompts, voiceReferences = []) {
  const generated = [];
  for (let i = 0; i < prompts.length; i++) {
    const segment = prompts[i];
    if (audioConfig?.mode === "http" && audioConfig.endpoint && audioConfig.apiKey) {
      try {
        generated.push(await callAudioEndpoint(audioConfig, segment, i, voiceReferences));
      } catch (error) {
        const fallback = await writeMockAudio(segment, i);
        generated.push({ ...fallback, error: error.message });
      }
    } else {
      generated.push(await writeMockAudio(segment, i));
    }
  }
  return {
    generated,
    finalAudio: generated.find((segment) => segment.url)?.url || null,
    finalAudioDataUrl: generated.find((segment) => segment.dataUrl)?.dataUrl || null
  };
}

function createTextUrl(content, type = "text/plain;charset=utf-8") {
  return URL.createObjectURL(new Blob([content], { type }));
}

export async function runStandalonePipeline(input) {
  const title = safeName(input.title);
  const novelText = pickText(input.novelText);
  if (!novelText) throw new Error("请先上传或粘贴小说内容。");

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
    mock: `# 广播剧剧本 1（演示模式）\n\n## 场 1：开场\n场景空间：室内，夜晚，远处有低弱环境声。\n音乐：低音量悬疑铺底，不盖对白。\n旁白：故事从一个安静却不寻常的夜晚开始。\n主角（压低声音）：这件事，我本来不想再提。\n配角（短暂停顿）：可现在，已经来不及了。\n音效：远处门轴轻响，随后停顿。\n预计时长：60 秒。`
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
    mock: `# 广播剧剧本 2（最终录制版，演示模式）\n\n## 片段 1：夜晚的开场\n时长：约 60 秒\n场景：室内夜晚，空间安静，有远处低弱风声。\n角色声线：\n- 旁白：中性声音，沉稳，语速慢。\n- 主角：青年声音，压低声线，带隐忍。\n- 配角：青年声音，紧张，回答前有短吸气。\n音乐：低音量悬疑铺底。\n音效时间线：0-8 秒风声；18 秒门轴轻响；42 秒杯子轻碰桌面。\n对白：\n旁白：故事从一个安静却不寻常的夜晚开始。\n主角（压低声音，停半拍）：这件事……我本来不想再提。\n配角（短吸气）：可现在，已经来不及了。`
  });
  stages.push({ name: "GPT 生成剧本 2", output: script2 });

  const audioPromptRaw = await invokeChat({
    providerName: "gpt",
    provider: config.gpt,
    system: "你是影视级音频提示词工程师。你必须输出 JSON 数组，不要输出解释。",
    temperature: 0.25,
    user: `请根据提示词写作指导，把广播剧剧本拆成 Doubao-Seed-Audio 1.0 可用的分段音频提示词。每段 30-90 秒，复杂多人戏拆短。每个元素格式：{"id":"scene-01","title":"片段名","durationSeconds":60,"prompt":"完整提示词"}。\n\n【提示词指导】\n${guide}\n\n【剧本 2】\n${script2}`,
    mock: JSON.stringify(fallbackAudioPrompts(script2, title), null, 2)
  });
  const audioPrompts = parsePromptArray(audioPromptRaw, title);
  stages.push({ name: "GPT 生成影视级音频提示词", output: JSON.stringify(audioPrompts, null, 2) });

  const audio = await generateAudioSegments(config.audio || {}, audioPrompts, config.voiceReferences || []);
  stages.push({ name: "Doubao-Seed-Audio 1.0 生成并合成音频", output: JSON.stringify(audio.generated, null, 2) });

  const jobId = `mobile-${Date.now()}`;
  const manifest = {
    jobId,
    title,
    createdAt: new Date().toISOString(),
    plan: optimizedPlan,
    stages: stages.map((stage) => ({ name: stage.name, preview: stage.output.slice(0, 1000) })),
    audioSegments: audio.generated,
    finalAudio: audio.finalAudio
  };

  return {
    jobId,
    title,
    stages,
    manifest,
    links: {
      manifest: createTextUrl(JSON.stringify(manifest, null, 2), "application/json;charset=utf-8"),
      script2: createTextUrl(script2, "text/markdown;charset=utf-8"),
      audioPrompts: createTextUrl(JSON.stringify(audioPrompts, null, 2), "application/json;charset=utf-8"),
      finalAudio: audio.finalAudio,
      finalAudioDataUrl: audio.finalAudioDataUrl,
      outputFolder: null
    }
  };
}

export async function runDirectAudioPipeline(input) {
  const title = safeName(input.title || "直接提示词音频");
  const config = input.config || {};
  const audioPrompts = normalizeAudioPrompts(input.prompts || input.promptText || input.text, title);
  if (!audioPrompts.length) throw new Error("请先上传或粘贴音频提示词。");
  const audio = await generateAudioSegments(config.audio || {}, audioPrompts, config.voiceReferences || []);
  const jobId = `mobile-direct-${Date.now()}`;
  const manifest = {
    jobId,
    title,
    createdAt: new Date().toISOString(),
    mode: "direct-audio",
    voiceReferences: normalizeVoiceReferences(config.voiceReferences || []).map(({ audioBase64, ...rest }) => rest),
    audioSegments: audio.generated,
    finalAudio: audio.finalAudio
  };

  return {
    jobId,
    title,
    manifest,
    links: {
      manifest: createTextUrl(JSON.stringify(manifest, null, 2), "application/json;charset=utf-8"),
      audioPrompts: createTextUrl(JSON.stringify(audioPrompts, null, 2), "application/json;charset=utf-8"),
      finalAudio: audio.finalAudio,
      finalAudioDataUrl: audio.finalAudioDataUrl,
      outputFolder: null
    }
  };
}
