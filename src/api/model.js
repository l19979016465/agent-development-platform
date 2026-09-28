/**
 * 模型市场接口（Mock 实现）
 *
 * 对应招标书「模型接入」要求：
 *   - 平台预制 Qwen、Ernie、DeepSeek 等不同类型、不同版本模型
 *   - 支持按照标准 OpenAPI 规范接入第三方大模型，包括大语言模型、
 *     embedding 模型、rerank 排序模型，支持自定义模型的显示名称
 *   - 支持对纳管的服务进行管理（查询、筛选、删除、上线、下线、版本更新和重启）
 *   - 支持设置 TPS 超分比例
 *   - 支持可视化问答界面，支持多模型同步比对测试
 *
 * 原型阶段用 localStorage 模拟后端，接入真实后端时替换本文件即可。
 */

const MODEL_KEY = 'agent-platform-models'

/** 模型类型 */
export const MODEL_TYPES = [
  { label: '大语言模型', value: 'llm', color: '#6366f1', desc: '用于对话生成、推理与内容创作' },
  { label: '向量模型', value: 'embedding', color: '#10b981', desc: '将文本转换为向量，用于知识库检索' },
  { label: '排序模型', value: 'rerank', color: '#f59e0b', desc: '对召回结果重排序，提升检索准确率' },
]

/** 接入协议 */
export const PROTOCOLS = [
  { label: 'HTTP / RESTful', value: 'http' },
  { label: 'WebSocket', value: 'websocket' },
  { label: 'gRPC', value: 'grpc' },
]

/** 接口规范 */
export const API_SPECS = [
  { label: 'OpenAI 兼容规范', value: 'openai' },
  { label: '标准 OpenAPI 规范', value: 'openapi' },
  { label: '自定义规范', value: 'custom' },
]

/** 服务状态 */
export const SERVICE_STATUS = {
  running: { label: '服务运行中', type: 'success' },
  offline: { label: '未上线', type: 'info' },
  error: { label: '接入异常', type: 'danger' },
}

/** 模型来源 */
export const SOURCES = {
  preset: { label: '平台预置', type: 'primary' },
  thirdparty: { label: '第三方接入', type: 'warning' },
}

/* ------------------------------------------------------------------ */
/* 演示数据                                                            */
/* ------------------------------------------------------------------ */

/** 预置模型的应答风格，用于「多模型同步比对测试」中体现差异 */
const REPLY_STYLES = {
  concise: { label: '简洁直接', opener: '直接回答：', points: 2, tail: '' },
  structured: { label: '结构化分点', opener: '为您梳理如下：', points: 3, tail: '如需展开某一条，可以继续追问。' },
  reasoning: { label: '带推理过程', opener: '先看问题本身：', points: 3, tail: '综上，建议按上述路径处理。' },
}

/** 针对演示问题的分点素材，命中关键词时使用 */
const TOPIC_POINTS = [
  {
    keys: ['住宿', '差旅', '报销'],
    points: [
      '住宿费按城市级别划分：一线城市每人每晚不超过 600 元',
      '二线城市不超过 400 元，其他城市不超过 300 元',
      '超标部分由个人承担，报销单需经主管、部门负责人、财务三级审批',
    ],
  },
  {
    keys: ['考勤', '打卡', '迟到'],
    points: [
      '标准工时为上午九时至下午六时，午休一小时',
      '上下班须通过企业办公系统打卡，漏卡应在三个工作日内提交补卡申请',
      '每月补卡申请不得超过三次，迟到 30 分钟以内扣当月绩效分一分',
    ],
  },
  {
    keys: ['请假', '年休', '病假'],
    points: [
      '请假须提前一个工作日在系统内提交申请',
      '病假需附二级以上医院证明，年休假需提前三个工作日申请',
      '事假由直属主管审批，审批通过后生效',
    ],
  },
  {
    keys: ['知识库', '切片', '检索', '命中'],
    points: [
      '知识库支持导入 doc、docx、pdf、ppt、txt、md、wps、ofd 等格式',
      '提供默认切分、自定义切片、整文件切片三种切片策略',
      '支持查看切片对应原文并高亮定位，可在知识库或文件层级做命中测试',
    ],
  },
  {
    keys: ['模型', '接入', 'openapi'],
    points: [
      '平台预置 Qwen、Ernie、DeepSeek、Llama 等主流模型，覆盖不同尺寸与模态',
      '支持按标准 OpenAPI 规范接入第三方大语言模型、embedding 模型与 rerank 排序模型',
      '接入时可自定义模型的显示名称，并配置服务协议、TPS 超分比例等参数',
    ],
  },
]

function topicPoints(question) {
  const q = question.toLowerCase()
  const hit = TOPIC_POINTS.find((t) => t.keys.some((k) => q.includes(k)))
  return (
    hit?.points || [
      '该问题可以从背景、现状与建议三个层面拆解',
      '建议先明确目标与约束条件，再分步推进验证',
      '过程中保留关键指标数据，便于后续复盘与调优',
    ]
  )
}

/** 按模型风格组装一条模拟回复 */
function buildModelReply(model, question) {
  const q = question.trim()
  const short = q.length > 16 ? `${q.slice(0, 16)}…` : q
  const style = REPLY_STYLES[model.style] || REPLY_STYLES.structured
  const points = topicPoints(q).slice(0, style.points)

  const lines = [style.opener, `关于「${short}」，`, '']
  points.forEach((p, i) => lines.push(`${i + 1}. ${p}`))
  if (style.tail) {
    lines.push('', style.tail)
  }
  return lines.join('\n')
}

/** 生成一个模型的演示数据 */
function buildModel(config) {
  const {
    id,
    displayName,
    name,
    provider,
    type,
    size,
    contextLength,
    source,
    style,
    status = 'running',
    calls = 0,
    versions,
    endpoint = '',
    protocol = 'http',
    spec = 'openapi',
    tps = 1,
    latency = 40,
    evalScore = 0,
    hoursAgo = 0,
  } = config

  return {
    id,
    /** 模型标识（调用时传给后端的 model 字段） */
    name,
    /** 显示名称，第三方接入时可自定义 */
    displayName,
    provider,
    type,
    size,
    contextLength,
    source,
    style,
    status,
    calls,
    endpoint,
    protocol,
    spec,
    tps,
    /** 模拟的推流间隔（毫秒），用于比对测试中体现速度差异 */
    latency,
    /** 自动评估得分（0~100） */
    evalScore,
    /** 人工评估：平均分与正向示例占比 */
    humanEval: { dims: [], avg: 0, positive: 0 },
    versions: versions || [
      { version: 'v1.0', note: '初始版本', releasedAt: Date.now() - 60 * 24 * 3600 * 1000, current: true },
    ],
    createdAt: Date.now() - 90 * 24 * 3600 * 1000,
    updatedAt: Date.now() - hoursAgo * 3600 * 1000,
  }
}

/** 首次运行写入演示数据 */
function seed() {
  if (localStorage.getItem(MODEL_KEY)) return

  const models = [
    /* ---------- 预置大语言模型 ---------- */
    buildModel({
      id: 1, name: 'qwen-max', displayName: '通义千问 Qwen-Max', provider: '阿里云',
      type: 'llm', size: '72B', contextLength: 32768, source: 'preset', style: 'structured',
      calls: 8421, latency: 34, evalScore: 88.5, hoursAgo: 3,
      versions: [
        { version: 'v2.1', note: '提升长文本理解与函数调用准确率', releasedAt: Date.now() - 20 * 24 * 3600 * 1000, current: true },
        { version: 'v2.0', note: '上下文扩展至 32K', releasedAt: Date.now() - 70 * 24 * 3600 * 1000, current: false },
      ],
    }),
    buildModel({
      id: 2, name: 'ernie-4.0', displayName: '文心一言 ERNIE-4.0', provider: '百度智能云',
      type: 'llm', size: '260B', contextLength: 8192, source: 'preset', style: 'concise',
      calls: 5106, latency: 46, evalScore: 85.2, hoursAgo: 6,
    }),
    buildModel({
      id: 3, name: 'deepseek-v3', displayName: 'DeepSeek-V3', provider: '深度求索',
      type: 'llm', size: '671B', contextLength: 65536, source: 'preset', style: 'reasoning',
      calls: 9264, latency: 52, evalScore: 91.3, hoursAgo: 1,
      versions: [
        { version: 'v3.1', note: '增强数学与代码推理能力', releasedAt: Date.now() - 8 * 24 * 3600 * 1000, current: true },
        { version: 'v3.0', note: '上下文扩展至 64K', releasedAt: Date.now() - 55 * 24 * 3600 * 1000, current: false },
        { version: 'v2.5', note: '首个接入平台的版本', releasedAt: Date.now() - 120 * 24 * 3600 * 1000, current: false },
      ],
    }),
    buildModel({
      id: 4, name: 'glm-4-plus', displayName: 'GLM-4-Plus', provider: '智谱AI',
      type: 'llm', size: '130B', contextLength: 131072, source: 'preset', style: 'structured',
      calls: 3187, latency: 41, evalScore: 86.7, hoursAgo: 12,
    }),
    buildModel({
      id: 5, name: 'llama-3.1-70b', displayName: 'Llama-3.1-70B', provider: 'Meta',
      type: 'llm', size: '70B', contextLength: 131072, source: 'preset', style: 'concise',
      calls: 1245, latency: 58, evalScore: 82.4, status: 'offline', hoursAgo: 48,
    }),

    /* ---------- 预置向量 / 排序模型 ---------- */
    buildModel({
      id: 6, name: 'bge-large-zh', displayName: 'bge-large-zh-v1.5', provider: '平台内置',
      type: 'embedding', size: '326M', contextLength: 512, source: 'preset',
      calls: 20418, latency: 12, evalScore: 84.1, hoursAgo: 2,
    }),
    buildModel({
      id: 7, name: 'bge-reranker-v2', displayName: 'bge-reranker-v2-m3', provider: '平台内置',
      type: 'rerank', size: '568M', contextLength: 8192, source: 'preset',
      calls: 7620, latency: 18, evalScore: 83.6, hoursAgo: 2,
    }),
    buildModel({
      id: 10, name: 'text-embedding-v3', displayName: 'text-embedding-v3', provider: '阿里云',
      type: 'embedding', size: '—', contextLength: 8192, source: 'preset',
      calls: 9315, latency: 14, evalScore: 85.0, hoursAgo: 8,
    }),

    /* ---------- 第三方接入 ---------- */
    buildModel({
      id: 8, name: 'my-finetuned-llm', displayName: '公司制度问答模型（SFT）', provider: '第三方接入',
      type: 'llm', size: '13B', contextLength: 8192, source: 'thirdparty', style: 'structured',
      calls: 862, latency: 66, evalScore: 79.8, hoursAgo: 5,
      endpoint: 'https://llm.internal.example.com/v1/chat/completions',
      protocol: 'http', spec: 'openai', tps: 1.5,
    }),
    buildModel({
      id: 9, name: 'custom-embedding-v2', displayName: '自研向量模型 v2', provider: '第三方接入',
      type: 'embedding', size: '110M', contextLength: 1024, source: 'thirdparty',
      calls: 1840, latency: 16, evalScore: 80.2, status: 'error', hoursAgo: 30,
      endpoint: 'https://embed.internal.example.com/v1/embeddings',
      protocol: 'grpc', spec: 'openapi', tps: 1,
    }),
    buildModel({
      id: 11, name: 'm3e-base', displayName: 'm3e-base', provider: '第三方接入',
      type: 'embedding', size: '110M', contextLength: 512, source: 'thirdparty',
      calls: 2260, latency: 15, evalScore: 78.4, hoursAgo: 18,
      endpoint: 'https://m3e.internal.example.com/v1/embeddings',
      protocol: 'http', spec: 'openai', tps: 1,
    }),
  ]

  // 人工评估指标（招标书：评估维度可由用户自定义添加，最多 5 个；
  // 系统根据评分维度默认提供平均分与正向示例占比指标）
  const HUMAN_DIMS = ['准确性', '完整性', '可用性']
  models.forEach((m) => {
    if (m.type !== 'llm') return
    m.humanEval = {
      dims: HUMAN_DIMS.map((d) => ({ name: d, score: Number((m.evalScore / 20).toFixed(1)) })),
      avg: Number((m.evalScore / 20).toFixed(2)),
      positive: Math.round(m.evalScore - 8),
    }
  })

  localStorage.setItem(MODEL_KEY, JSON.stringify(models))
}

function readModels() {
  seed()
  try {
    return JSON.parse(localStorage.getItem(MODEL_KEY)) || []
  } catch {
    return []
  }
}

function writeModels(list) {
  localStorage.setItem(MODEL_KEY, JSON.stringify(list))
}

function delay(result, ms = 300) {
  return new Promise((resolve) => setTimeout(() => resolve(result), ms))
}

/* ------------------------------------------------------------------ */
/* 模型列表与接入                                                      */
/* ------------------------------------------------------------------ */

/**
 * 模型列表
 * @param {{type?: string, source?: string, keyword?: string, status?: string}} query
 */
export function listModelsApi({ type = '', source = '', keyword = '', status = '' } = {}) {
  let list = readModels()
  if (type) list = list.filter((m) => m.type === type)
  if (source) list = list.filter((m) => m.source === source)
  if (status) list = list.filter((m) => m.status === status)
  if (keyword) {
    const k = keyword.toLowerCase()
    list = list.filter(
      (m) =>
        m.displayName.toLowerCase().includes(k) ||
        m.name.toLowerCase().includes(k) ||
        m.provider.toLowerCase().includes(k)
    )
  }
  return delay(list)
}

/** 模型统计概览 */
export function modelStatsApi() {
  const list = readModels()
  return delay({
    total: list.length,
    preset: list.filter((m) => m.source === 'preset').length,
    thirdparty: list.filter((m) => m.source === 'thirdparty').length,
    running: list.filter((m) => m.status === 'running').length,
    llm: list.filter((m) => m.type === 'llm').length,
    embedding: list.filter((m) => m.type === 'embedding').length,
    rerank: list.filter((m) => m.type === 'rerank').length,
    calls: list.reduce((sum, m) => sum + m.calls, 0),
  })
}

/**
 * 接入第三方模型（按标准 OpenAPI 规范）
 * 接入后默认为「未上线」，需手动上线后才对外提供服务。
 */
export function createThirdPartyModelApi(data) {
  const list = readModels()
  const id = list.reduce((max, m) => Math.max(max, m.id), 0) + 1
  const model = {
    ...buildModel({
      id,
      name: data.name,
      displayName: data.displayName,
      provider: '第三方接入',
      type: data.type,
      size: data.size || '-',
      contextLength: Number(data.contextLength) || 8192,
      source: 'thirdparty',
      style: 'structured',
      status: 'offline',
      latency: 45,
      evalScore: 0,
      hoursAgo: 0,
    }),
    endpoint: data.endpoint,
    protocol: data.protocol,
    spec: data.spec,
    tps: Number(data.tps) || 1,
    apiKey: data.apiKey,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  list.push(model)
  writeModels(list)
  return delay(model, 500)
}

/** 删除模型 */
export function deleteModelApi(id) {
  writeModels(readModels().filter((m) => m.id !== id))
  return delay({ success: true }, 250)
}

/**
 * 连通性测试（模拟）
 *
 * 地址格式与密钥长度由表单校验负责，这里模拟的是校验拦不住的网络层问题。
 * 演示约定：主机名以 .invalid 结尾（RFC 2606 保留域名，永远无法解析）
 * 时返回不可达，用于演示接入失败的分支。
 */
export function testConnectionApi({ endpoint, apiKey }) {
  const url = (endpoint || '').trim()
  const unreachable = /^https?:\/\/[^/]*\.invalid(\/|:|$)/i.test(url)

  if (unreachable) {
    return delay(
      { success: false, message: '无法连接到该地址，请检查服务是否已启动或网络是否可达' },
      1400
    )
  }
  return delay(
    {
      success: true,
      latency: 120 + Math.floor(Math.random() * 260),
      message: '连接成功，服务响应正常',
    },
    900
  )
}

/* ------------------------------------------------------------------ */
/* 服务管理                                                            */
/* ------------------------------------------------------------------ */

/**
 * 服务上线 / 下线 / 重启（招标书：支持服务的上线、下线、版本更新和重启）
 * @param {number} id
 * @param {'online'|'offline'|'restart'} action
 */
export function operateServiceApi(id, action) {
  const list = readModels()
  const model = list.find((m) => m.id === id)
  if (!model) return Promise.reject(new Error('模型不存在'))

  if (action === 'online') {
    model.status = 'running'
  } else if (action === 'offline') {
    model.status = 'offline'
  } else if (action === 'restart') {
    // 重启不改变最终状态，仅刷新更新时间
  }
  model.updatedAt = Date.now()
  writeModels(list)

  const label = { online: '上线', offline: '下线', restart: '重启' }[action]
  return delay({ success: true, message: `服务${label}指令已下发` }, action === 'restart' ? 1200 : 600)
}

/** 版本更新：把指定版本设为当前版本 */
export function switchVersionApi(id, version) {
  const list = readModels()
  const model = list.find((m) => m.id === id)
  if (!model) return Promise.reject(new Error('模型不存在'))
  model.versions.forEach((v) => {
    v.current = v.version === version
  })
  model.updatedAt = Date.now()
  model.status = 'running'
  writeModels(list)
  return delay({ success: true }, 800)
}

/** 新增模型版本 */
export function addVersionApi(id, { version, note }) {
  const list = readModels()
  const model = list.find((m) => m.id === id)
  if (!model) return Promise.reject(new Error('模型不存在'))
  if (model.versions.some((v) => v.version === version)) {
    return Promise.reject(new Error('该版本号已存在'))
  }
  model.versions.unshift({ version, note, releasedAt: Date.now(), current: false })
  model.updatedAt = Date.now()
  writeModels(list)
  return delay({ success: true }, 400)
}

/** 调整 TPS 超分比例（招标书：支持设置 TPS 超分比例以提高服务利用率） */
export function updateTpsApi(id, tps) {
  const list = readModels()
  const model = list.find((m) => m.id === id)
  if (!model) return Promise.reject(new Error('模型不存在'))
  model.tps = tps
  model.updatedAt = Date.now()
  writeModels(list)
  return delay({ success: true }, 300)
}

/** 更新人工评估维度得分，并重算平均分与正向示例占比 */
export function evaluateModelApi(id, dims) {
  const list = readModels()
  const model = list.find((m) => m.id === id)
  if (!model) return Promise.reject(new Error('模型不存在'))
  const avg = dims.length ? dims.reduce((s, d) => s + d.score, 0) / dims.length : 0
  model.humanEval = {
    dims,
    avg: Number(avg.toFixed(2)),
    positive: Math.round((avg / 5) * 100),
  }
  writeModels(list)
  return delay({ success: true }, 350)
}

/* ------------------------------------------------------------------ */
/* 多模型同步比对测试                                                  */
/* ------------------------------------------------------------------ */

/**
 * 多模型同步比对（招标书：支持可视化问答界面，支持对大模型的测试能力，
 * 并可进行多模型同步比对测试）
 *
 * 各模型按各自的 latency 并行推流，速度不同，直观体现差异。
 *
 * @param {object} options
 * @param {string} options.question  测试问题
 * @param {object[]} options.models  参与比对的模型
 * @param {(modelId: number, text: string) => void} options.onChunk 每次推流回调
 * @param {(modelId: number, info: object) => void} options.onDone  单个模型结束时回调
 * @returns {{promise: Promise<void>, stop: () => void}}
 */
export function compareModelsApi({ question, models, onChunk, onDone }) {
  let stopped = false
  const timers = []
  const startedAt = Date.now()

  const tasks = models.map(
    (model) =>
      new Promise((resolve) => {
        const full = buildModelReply(model, question)
        let index = 0

        const timer = setInterval(() => {
          if (stopped) {
            clearInterval(timer)
            onDone(model.id, {
              stopped: true,
              elapsed: Date.now() - startedAt,
              tokens: Math.ceil(index / 1.6),
            })
            resolve()
            return
          }
          index = Math.min(full.length, index + 2 + Math.floor(Math.random() * 4))
          onChunk(model.id, full.slice(0, index))
          if (index >= full.length) {
            clearInterval(timer)
            onDone(model.id, {
              stopped: false,
              elapsed: Date.now() - startedAt,
              tokens: Math.ceil(full.length / 1.6),
            })
            resolve()
          }
        }, model.latency || 45)

        timers.push(timer)
      })
  )

  return {
    promise: Promise.all(tasks).then(() => undefined),
    stop() {
      stopped = true
      timers.forEach(clearInterval)
    },
  }
}

/* ------------------------------------------------------------------ */
/* 供其他模块使用                                                      */
/* ------------------------------------------------------------------ */

/**
 * 可供智能体选择的基座模型：已上线的大语言模型
 * 「智能体管理」的基座模型下拉、「知识库」的向量模型下拉均由此获取，
 * 保证模型市场是平台内模型信息的唯一来源。
 */
export function llmOptions() {
  return readModels()
    .filter((m) => m.type === 'llm' && m.status === 'running')
    .map((m) => ({ label: m.displayName, value: m.name }))
}

/** 可供知识库选择的向量模型：已上线的向量模型 */
export function embeddingOptions() {
  return readModels()
    .filter((m) => m.type === 'embedding' && m.status === 'running')
    .map((m) => ({ label: m.displayName, value: m.name }))
}

/**
 * 按模型标识反查显示名称
 * 供智能体卡片、知识库列表等展示位使用；查不到时回退为标识本身，
 * 保证历史数据在模型被删除后仍能正常显示。
 */
export function modelLabel(nameValue) {
  if (!nameValue) return ''
  return readModels().find((m) => m.name === nameValue)?.displayName || nameValue
}
