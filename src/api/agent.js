/**
 * 智能体管理接口（Mock 实现）
 *
 * 原型阶段用 localStorage 模拟后端数据表，保证刷新页面后数据不丢失。
 * 后续接入真实后端时，仅需将本文件各方法替换为 HTTP 请求。
 */

const STORAGE_KEY = 'agent-platform-agents'

/** 可选模型列表：与「模型市场」模块共用 */
export const MODEL_OPTIONS = [
  { label: '通义千问 Qwen-Max', value: 'qwen-max' },
  { label: '文心一言 ERNIE-4.0', value: 'ernie-4.0' },
  { label: 'DeepSeek-V3', value: 'deepseek-v3' },
  { label: 'GLM-4-Plus', value: 'glm-4-plus' },
  { label: 'Llama-3.1-70B', value: 'llama-3.1-70b' },
]

/** 智能体分类 */
export const CATEGORY_OPTIONS = ['客服问答', '文档处理', '代码开发', '数据分析', '办公助手', '其他']

/** 状态字典 */
export const STATUS_MAP = {
  published: { label: '已发布', type: 'success' },
  draft: { label: '草稿', type: 'info' },
  offline: { label: '已下线', type: 'warning' },
}

let seedDone = false

/** 首次运行时写入演示数据 */
function seed() {
  if (seedDone) return
  seedDone = true
  if (localStorage.getItem(STORAGE_KEY)) return

  const now = Date.now()
  const day = 24 * 60 * 60 * 1000
  const demo = [
    {
      id: 1,
      name: '电商客服助手',
      avatar: '🎧',
      description: '解答商品咨询、物流查询与售后问题，支持多轮上下文追问与订单信息核对。',
      category: '客服问答',
      model: 'qwen-max',
      status: 'published',
      temperature: 0.3,
      systemPrompt: '你是一名专业的电商客服，请耐心、准确地解答用户关于商品、物流和售后的疑问。',
      conversations: 1284,
      createdAt: now - 30 * day,
      updatedAt: now - 2 * day,
    },
    {
      id: 2,
      name: '制度文档问答',
      avatar: '📚',
      description: '基于企业内部制度文档知识库，回答员工关于考勤、报销、假期等制度问题并标注出处。',
      category: '文档处理',
      model: 'ernie-4.0',
      status: 'published',
      temperature: 0.2,
      systemPrompt: '你是企业制度助手，回答时必须依据知识库内容，并标注对应的制度条款出处。',
      conversations: 856,
      createdAt: now - 25 * day,
      updatedAt: now - 5 * day,
    },
    {
      id: 3,
      name: '代码审查助手',
      avatar: '💻',
      description: '对提交的代码进行规范检查，识别潜在缺陷并给出修改建议，支持多种主流语言。',
      category: '代码开发',
      model: 'deepseek-v3',
      status: 'published',
      temperature: 0.4,
      systemPrompt: '你是一名资深工程师，请从可读性、健壮性、性能三方面审查代码并给出改进建议。',
      conversations: 432,
      createdAt: now - 18 * day,
      updatedAt: now - 1 * day,
    },
    {
      id: 4,
      name: '经营数据分析师',
      avatar: '📊',
      description: '理解自然语言查询意图，生成数据分析结论与可视化建议，辅助经营决策。',
      category: '数据分析',
      model: 'glm-4-plus',
      status: 'draft',
      temperature: 0.6,
      systemPrompt: '你是数据分析师，请先澄清分析目标，再给出结论、依据与建议。',
      conversations: 0,
      createdAt: now - 9 * day,
      updatedAt: now - 9 * day,
    },
    {
      id: 5,
      name: '会议纪要整理',
      avatar: '📝',
      description: '将会议录音转写文本整理为结构化纪要，自动提取待办事项与责任人。',
      category: '办公助手',
      model: 'qwen-max',
      status: 'offline',
      temperature: 0.5,
      systemPrompt: '你是会议助理，请输出包含议题、结论、待办事项（含责任人）的结构化纪要。',
      conversations: 318,
      createdAt: now - 14 * day,
      updatedAt: now - 7 * day,
    },
    {
      id: 6,
      name: '产品需求分析',
      avatar: '🧭',
      description: '将模糊的业务诉求拆解为结构化需求，输出用户故事与验收标准。',
      category: '办公助手',
      model: 'deepseek-v3',
      status: 'draft',
      temperature: 0.7,
      systemPrompt: '你是产品经理，请把需求拆解为用户故事，并给出可验证的验收标准。',
      conversations: 27,
      createdAt: now - 4 * day,
      updatedAt: now - 3 * day,
    },
  ]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(demo))
}

function readAll() {
  seed()
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []
  } catch {
    return []
  }
}

function writeAll(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

function nextId(list) {
  return list.reduce((max, a) => Math.max(max, a.id), 0) + 1
}

/** 模拟网络延迟 */
function delay(result, ms = 320) {
  return new Promise((resolve) => setTimeout(() => resolve(result), ms))
}

/**
 * 分页查询智能体列表
 * @param {{keyword?: string, status?: string, category?: string, page?: number, pageSize?: number}} params
 */
export function listAgentsApi(params = {}) {
  const { keyword = '', status = '', category = '', page = 1, pageSize = 8 } = params
  let list = readAll()

  if (keyword.trim()) {
    const kw = keyword.trim().toLowerCase()
    list = list.filter(
      (a) => a.name.toLowerCase().includes(kw) || a.description.toLowerCase().includes(kw)
    )
  }
  if (status) list = list.filter((a) => a.status === status)
  if (category) list = list.filter((a) => a.category === category)

  list.sort((a, b) => b.updatedAt - a.updatedAt) // 最近更新在前

  const total = list.length
  const start = (page - 1) * pageSize
  return delay({ list: list.slice(start, start + pageSize), total })
}

/** 查询全部智能体（用于工作台统计） */
export function listAllAgentsApi() {
  return delay(readAll(), 120)
}

/** 新增智能体 */
export function createAgentApi(data) {
  const list = readAll()
  const now = Date.now()
  const agent = {
    id: nextId(list),
    avatar: '🤖',
    conversations: 0,
    status: 'draft',
    temperature: 0.5,
    ...data,
    createdAt: now,
    updatedAt: now,
  }
  list.push(agent)
  writeAll(list)
  return delay(agent)
}

/** 更新智能体 */
export function updateAgentApi(id, data) {
  const list = readAll()
  const idx = list.findIndex((a) => a.id === id)
  if (idx === -1) return Promise.reject(new Error('智能体不存在'))
  list[idx] = { ...list[idx], ...data, updatedAt: Date.now() }
  writeAll(list)
  return delay(list[idx])
}

/** 删除智能体 */
export function deleteAgentApi(id) {
  const list = readAll().filter((a) => a.id !== id)
  writeAll(list)
  return delay({ success: true })
}

/** 切换上下线状态 */
export function toggleAgentStatusApi(id) {
  const list = readAll()
  const agent = list.find((a) => a.id === id)
  if (!agent) return Promise.reject(new Error('智能体不存在'))
  agent.status = agent.status === 'published' ? 'offline' : 'published'
  agent.updatedAt = Date.now()
  writeAll(list)
  return delay(agent)
}
