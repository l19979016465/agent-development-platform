/**
 * 知识库接口（Mock 实现）
 *
 * 原型阶段用 localStorage 模拟后端数据表。
 * 文档解析、切片、命中测试均为前端模拟，后续接入真实后端时替换本文件。
 */

const KB_KEY = 'agent-platform-knowledge-bases'
const DOC_KEY = 'agent-platform-knowledge-docs'

/** 向量模型（招标书：支持内置向量化模型与第三方向量模型接入） */
export const VECTOR_MODELS = [
  { label: 'bge-large-zh-v1.5（内置）', value: 'bge-large-zh' },
  { label: 'text-embedding-v3（阿里云）', value: 'text-embedding-v3' },
  { label: 'm3e-base（第三方）', value: 'm3e-base' },
]

/** 知识库群组（招标书：按知识库群组、部门组织快速选择） */
export const KB_GROUPS = ['综合管理', '技术研发', '市场营销', '客户服务']

/** 切片策略（招标书：默认切分 / 自定义切片 / 整文件切片） */
export const CHUNK_STRATEGIES = [
  { label: '默认切分', value: 'auto' },
  { label: '自定义切片', value: 'custom' },
  { label: '整文件切片', value: 'whole' },
]

/** 解析清洗策略（招标书：文字提取、图片文字识别、版面分析、文档图片解析） */
export const PARSE_POLICIES = [
  { key: 'text', label: '文字提取', desc: '提取文档中的文本内容', default: true },
  { key: 'ocr', label: '图片文字识别', desc: '识别图片中的文字（OCR）', default: true },
  { key: 'layout', label: '版面分析', desc: '还原标题、段落、表格结构', default: true },
  { key: 'image', label: '文档图片解析', desc: '解析图文混排与图片说明', default: false },
]

/** 支持的文档格式（招标书列举） */
export const SUPPORTED_EXT = ['doc', 'docx', 'txt', 'pdf', 'ppt', 'pptx', 'md', 'wps', 'ofd']

/** 导入模板（招标书：简历文档、PPT 幻灯片、论文文档、结构化问答对） */
export const IMPORT_TEMPLATES = [
  { label: '通用文档', value: 'general' },
  { label: '简历文档', value: 'resume' },
  { label: 'PPT 幻灯片', value: 'ppt' },
  { label: '论文文档', value: 'paper' },
  { label: '结构化问答对', value: 'qa' },
]

/* ------------------------------------------------------------------ */
/* 演示数据                                                            */
/* ------------------------------------------------------------------ */

/** 生成演示用的原文与切片，切片带原文偏移量以支持「选中切片高亮原文」 */
function buildDoc(id, name, ext, size, content, tags, status = 'ready', hoursAgo = 0) {
  const chunks = []
  const paragraphs = content.split('\n').filter((p) => p.trim())
  let cursor = 0
  paragraphs.forEach((p, i) => {
    const start = content.indexOf(p, cursor)
    const end = start + p.length
    cursor = end
    // 过长的段落按 60 字再切分，模拟真实切片
    if (p.length > 80) {
      for (let s = start; s < end; s += 60) {
        const e = Math.min(s + 60, end)
        chunks.push({
          id: `${id}-${chunks.length + 1}`,
          index: chunks.length + 1,
          text: content.slice(s, e),
          start: s,
          end: e,
          tokens: Math.ceil((e - s) * 1.6),
        })
      }
    } else {
      chunks.push({
        id: `${id}-${chunks.length + 1}`,
        index: chunks.length + 1,
        text: p,
        start,
        end,
        tokens: Math.ceil(p.length * 1.6),
      })
    }
  })
  return {
    id,
    name,
    ext,
    size,
    tags,
    status,
    chunkCount: chunks.length,
    uploadedAt: Date.now() - hoursAgo * 3600 * 1000,
    content,
    chunks,
  }
}

const POLICY_TEXT = `员工考勤管理制度

第一条 工作时间
公司实行标准工时制，每日工作时间为上午九时至下午六时，其中午休一小时。因业务需要调整作息时间的部门，须报人力资源部备案后执行。

第二条 考勤方式
全体员工须通过企业办公系统进行上下班打卡。忘记打卡的，应当在三个工作日内提交补卡申请，经直属主管审批后生效。每月补卡申请不得超过三次。

第三条 迟到与早退
迟到或早退三十分钟以内的，每次扣减当月绩效分一分；超过三十分钟不足两小时的，按事假半日处理；超过两小时的，按事假一日处理。

第四条 请假流程
员工请假须提前一个工作日在系统内提交申请。事假需经直属主管审批；病假需附二级以上医院证明；年休假需提前三个工作日申请，以便部门安排工作交接。

第五条 加班与调休
因工作需要加班的，须提前提交加班申请并获得审批。加班时长可折算为调休，调休应当在当季度内使用完毕，逾期作废。`

const EXPENSE_TEXT = `差旅费报销管理办法

第一条 适用范围
本办法适用于公司全体员工因公出差所产生的交通费、住宿费、伙食补助费及公杂费的报销。

第二条 报销标准
住宿费标准按城市级别划分：一线城市每人每晚不超过六百元；二线城市不超过四百元；其他城市不超过三百元。超标部分由个人承担。

第三条 交通费
出差交通优先选择高铁二等座或经济舱。市内交通费凭票据实报销，单日不超过一百元。自驾出差的，按实际里程每公里一元八角核算，不再报销油费与过路费。

第四条 报销时限
出差结束后应当在十五个工作日内提交报销单据。逾期未提交的，需附书面说明并经部门负责人审批。跨年度报销原则上不予受理。

第五条 审批流程
报销单须经直属主管、部门负责人、财务部三级审批。单笔金额超过五千元的，还需报总经理审批。`

const PRODUCT_TEXT = `智能体开发平台产品手册

一、产品定位
本平台面向企业 AI 应用开发场景，提供从智能体构建、知识库管理到应用发布的一站式能力，帮助业务人员以零代码方式快速搭建专属智能体。

二、核心能力
平台提供自主规划智能体、工作流智能体、写作智能体三类应用框架。自主规划智能体通过自然语言描述自动生成应用配置；工作流智能体以拖拉拽画布方式还原业务流程。

三、知识库增强
平台支持导入 doc、docx、pdf、ppt、txt、md 等格式文档，提供默认切分、自定义切片、整文件切片三种策略，并支持按知识库群组进行管理。

四、模型接入
平台预置通义千问、文心一言、DeepSeek 等主流大模型，同时支持按照标准 OpenAPI 规范接入第三方大语言模型、embedding 模型与 rerank 排序模型。

五、应用发布
应用支持发布到网页、API/SDK、应用广场，并可嵌入第三方网站。发布范围可选择个人、组织或公开。`

/** 首次运行写入演示数据 */
function seed() {
  if (localStorage.getItem(KB_KEY)) return

  const bases = [
    {
      id: 1,
      name: '公司制度知识库',
      description: '收录考勤、报销、假期等内部管理制度，供员工自助查询。',
      group: '综合管理',
      vectorModel: 'bge-large-zh',
      chunkStrategy: 'auto',
      createdAt: Date.now() - 20 * 24 * 3600 * 1000,
      updatedAt: Date.now() - 2 * 24 * 3600 * 1000,
    },
    {
      id: 2,
      name: '产品资料知识库',
      description: '产品手册、白皮书与常见问题，用于售前咨询与客户答疑。',
      group: '市场营销',
      vectorModel: 'text-embedding-v3',
      chunkStrategy: 'custom',
      createdAt: Date.now() - 12 * 24 * 3600 * 1000,
      updatedAt: Date.now() - 1 * 24 * 3600 * 1000,
    },
    {
      id: 3,
      name: '技术文档知识库',
      description: '接口文档与部署指南，支持研发人员检索。',
      group: '技术研发',
      vectorModel: 'bge-large-zh',
      chunkStrategy: 'auto',
      createdAt: Date.now() - 5 * 24 * 3600 * 1000,
      updatedAt: Date.now() - 5 * 3600 * 1000,
    },
  ]

  const docs = [
    buildDoc(101, '员工考勤管理制度.pdf', 'pdf', 245760, POLICY_TEXT, ['制度', '考勤'], 'ready', 2),
    buildDoc(102, '差旅费报销管理办法.docx', 'docx', 189440, EXPENSE_TEXT, ['制度', '财务'], 'ready', 26),
    buildDoc(201, '智能体开发平台产品手册.pdf', 'pdf', 1843200, PRODUCT_TEXT, ['产品', '手册'], 'ready', 4),
    buildDoc(202, '产品常见问题汇总.md', 'md', 40960, '如何创建智能体？\n\n在平台左侧导航进入「智能体管理」页面，点击右上角「新建智能体」按钮，依次填写名称、分类、简介、基座模型与提示词后保存即可。创建完成后可在「对话调试」页面立即测试效果。\n\n支持哪些文档格式？\n\n知识库支持导入 doc、docx、txt、pdf、ppt、pptx、md、wps、ofd 等格式的文档。导入后平台会自动完成解析、清洗与切片。', ['产品', 'FAQ']),
    buildDoc(301, '平台接口文档.pdf', 'pdf', 512000, '接口概览\n\n平台提供 RESTful 风格的开放接口，所有接口需在请求头中携带 Authorization 字段以完成鉴权。接口返回统一采用 JSON 格式，包含 code、message 与 data 三个字段。\n\n应用调用接口\n\n通过 POST /api/v1/agent/chat 接口调用已发布的智能体。请求体需包含 agent_id、query 与 session_id 三个字段，其中 session_id 用于维持多轮对话上下文。', ['技术', '接口'], 'parsing'),
  ]

  localStorage.setItem(KB_KEY, JSON.stringify(bases))
  localStorage.setItem(DOC_KEY, JSON.stringify(docs))
}

function readBases() {
  seed()
  try {
    return JSON.parse(localStorage.getItem(KB_KEY)) || []
  } catch {
    return []
  }
}

function readDocs() {
  seed()
  try {
    return JSON.parse(localStorage.getItem(DOC_KEY)) || []
  } catch {
    return []
  }
}

function writeBases(list) {
  localStorage.setItem(KB_KEY, JSON.stringify(list))
}

function writeDocs(list) {
  localStorage.setItem(DOC_KEY, JSON.stringify(list))
}

function delay(result, ms = 300) {
  return new Promise((resolve) => setTimeout(() => resolve(result), ms))
}

/* ------------------------------------------------------------------ */
/* 知识库                                                              */
/* ------------------------------------------------------------------ */

/** 知识库列表（附带文档数与切片数） */
export function listKnowledgeBasesApi() {
  const bases = readBases()
  const docs = readDocs()
  const list = bases.map((b) => {
    const myDocs = docs.filter((d) => Math.floor(d.id / 100) === b.id)
    return {
      ...b,
      docCount: myDocs.length,
      chunkCount: myDocs.reduce((sum, d) => sum + d.chunkCount, 0),
    }
  })
  return delay(list)
}

/** 新建知识库 */
export function createKnowledgeBaseApi(data) {
  const list = readBases()
  const id = list.reduce((max, b) => Math.max(max, b.id), 0) + 1
  const now = Date.now()
  const kb = { id, ...data, createdAt: now, updatedAt: now }
  list.push(kb)
  writeBases(list)
  return delay(kb)
}

/** 删除知识库（连同其下文档） */
export function deleteKnowledgeBaseApi(id) {
  writeBases(readBases().filter((b) => b.id !== id))
  writeDocs(readDocs().filter((d) => Math.floor(d.id / 100) !== id))
  return delay({ success: true })
}

/** 知识库详情 */
export function getKnowledgeBaseApi(id) {
  const kb = readBases().find((b) => b.id === id)
  if (!kb) return Promise.reject(new Error('知识库不存在'))
  return delay(kb, 180)
}

/* ------------------------------------------------------------------ */
/* 文档                                                                */
/* ------------------------------------------------------------------ */

/** 某知识库下的文档列表（不含正文与切片，减小体积） */
export function listDocumentsApi(kbId) {
  const docs = readDocs()
    .filter((d) => Math.floor(d.id / 100) === kbId)
    .map(({ content, chunks, ...rest }) => rest)
  return delay(docs.sort((a, b) => b.uploadedAt - a.uploadedAt), 220)
}

/** 文档详情（含正文与切片） */
export function getDocumentApi(docId) {
  const doc = readDocs().find((d) => d.id === docId)
  if (!doc) return Promise.reject(new Error('文档不存在'))
  return delay(doc, 180)
}

/**
 * 上传文档（模拟解析流程）
 * 上传后先处于「解析中」，延迟后转为「已就绪」并生成切片。
 */
export function uploadDocumentApi({ kbId, name, ext, size, tags = [], template = 'general' }) {
  const docs = readDocs()
  // 文档 id 编码规则：知识库 id * 100 + 序号，保证文档归属于正确的知识库
  const seq = docs.filter((d) => Math.floor(d.id / 100) === kbId).length + 1
  const id = kbId * 100 + seq

  // 用模板内容模拟解析结果
  const templateText = {
    general: `${name} 的内容摘要\n\n本文档由平台自动解析生成切片，用于知识库检索增强。实际部署时此处为文档的真实正文内容。\n\n解析策略已按知识库配置执行：文字提取、图片文字识别与版面分析均已开启，文档结构信息已保留。`,
    resume: `个人简历\n\n教育背景：某大学 计算机科学与技术 硕士\n\n工作经历：负责企业级 AI 应用开发，主导智能体平台的知识库模块设计与实现。\n\n技能特长：熟悉大语言模型应用开发、检索增强生成（RAG）技术栈。`,
    ppt: `${name} 幻灯片\n\n第一页：项目背景与目标\n第二页：整体技术方案\n第三页：实施计划与里程碑\n第四页：风险与应对措施`,
    paper: `${name} 论文摘要\n\n本文研究了面向企业场景的智能体开发平台关键技术，提出了基于检索增强生成的问答框架。\n\n实验结果表明，该框架在制度问答任务上的准确率较基线提升明显。`,
    qa: `问：如何创建智能体？\n答：进入智能体管理页面，点击新建智能体，填写配置后保存即可。\n\n问：支持哪些文档格式？\n答：支持 doc、docx、txt、pdf、ppt、pptx、md 等格式。`,
  }[template] || ''

  const doc = buildDoc(id, name, ext, size, templateText, tags, 'parsing', 0)
  docs.push(doc)
  writeDocs(docs)

  // 模拟异步解析：2 秒后转为已就绪
  setTimeout(() => {
    const all = readDocs()
    const target = all.find((d) => d.id === id)
    if (target && target.status === 'parsing') {
      target.status = 'ready'
      writeDocs(all)
    }
  }, 2000)

  return delay({ ...doc, content: undefined, chunks: undefined }, 400)
}

/** 更新文档标签 */
export function updateDocTagsApi(docId, tags) {
  const docs = readDocs()
  const doc = docs.find((d) => d.id === docId)
  if (!doc) return Promise.reject(new Error('文档不存在'))
  doc.tags = tags
  writeDocs(docs)
  return delay({ success: true }, 200)
}

/** 删除文档 */
export function deleteDocumentApi(docId) {
  writeDocs(readDocs().filter((d) => d.id !== docId))
  return delay({ success: true }, 250)
}

/* ------------------------------------------------------------------ */
/* 命中测试                                                            */
/* ------------------------------------------------------------------ */

/** 简单的字符重合度打分，用于模拟向量检索的匹配分 */
function scoreChunk(query, chunkText) {
  const q = query.trim()
  if (!q) return 0
  // 按 2-gram 计算重合率
  const grams = new Set()
  for (let i = 0; i < q.length - 1; i++) grams.add(q.slice(i, i + 2))
  if (!grams.size) return 0
  let hit = 0
  grams.forEach((g) => {
    if (chunkText.includes(g)) hit++
  })
  return hit / grams.size
}

/**
 * 命中测试：在知识库范围内检索与查询最相关的切片
 * @param {number} kbId
 * @param {string} query
 * @param {{topK?: number, threshold?: number}} options 召回数量与匹配分阈值
 */
export function hitTestApi(kbId, query, { topK = 5, threshold = 0 } = {}) {
  const docs = readDocs().filter((d) => Math.floor(d.id / 100) === kbId && d.status === 'ready')
  const results = []

  docs.forEach((doc) => {
    doc.chunks.forEach((chunk) => {
      // 叠加少量随机扰动，模拟真实向量检索的分数分布
      const raw = scoreChunk(query, chunk.text) + Math.random() * 0.12
      const score = Math.min(0.99, Number(raw.toFixed(4)))
      if (score >= threshold) {
        results.push({
          docId: doc.id,
          docName: doc.name,
          chunkId: chunk.id,
          chunkIndex: chunk.index,
          text: chunk.text,
          start: chunk.start,
          end: chunk.end,
          score,
        })
      }
    })
  })

  results.sort((a, b) => b.score - a.score)
  return delay({ query, total: results.length, list: results.slice(0, topK) }, 450)
}
