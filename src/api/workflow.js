/**
 * 工作流编排接口（Mock 实现）
 *
 * 对应招标书「工作流智能体」要求：
 *   - 以工作流画布的方式搭建智能应用，采用拖拉拽的交互方式在画布中还原业务流程
 *   - 可编排节点包括：大模型、组件、API、意图识别、全局跳转、循环、分支器、
 *     MCP Server、代码、知识库、记忆变量、文本处理、query 多轮改写、信息收集、
 *     流式数据处理等（见 NODE_TYPES）
 *   - #支持 MCP Server 节点，支持用户在工作流内引入 MCP-SSE 的 Server
 *   - 支持应用复制、导出和导入；发布范围可选个人、组织或公开
 *
 * 原型阶段用 localStorage 模拟后端，接入真实后端时替换本文件即可。
 */

const FLOW_KEY = 'agent-platform-workflows'

/* ------------------------------------------------------------------ */
/* 节点目录                                                            */
/* ------------------------------------------------------------------ */

/**
 * 节点类型目录
 * fields 为该节点的配置项，右侧配置面板按 type 渲染对应控件。
 */
export const NODE_GROUPS = [
  { key: 'basic', label: '基础节点' },
  { key: 'tool', label: '工具节点' },
  { key: 'logic', label: '逻辑节点' },
]

export const NODE_TYPES = [
  /* ---------- 基础节点 ---------- */
  {
    type: 'start',
    label: '开始',
    icon: 'VideoPlay',
    color: '#10b981',
    group: 'basic',
    desc: '工作流的起点，定义用户输入变量',
    inputs: 0,
    outputs: 1,
    fields: [
      {
        key: 'inputs',
        label: '输入变量',
        type: 'variables',
        default: [{ name: 'query', desc: '用户提问' }],
        hint: '定义工作流运行时的入参，可在后续节点中通过 {{变量名}} 引用',
      },
    ],
  },
  {
    type: 'llm',
    label: '大模型',
    icon: 'MagicStick',
    color: '#6366f1',
    group: 'basic',
    desc: '调用大语言模型生成内容',
    inputs: 1,
    outputs: 1,
    fields: [
      { key: 'model', label: '选择模型', type: 'model', default: '' },
      { key: 'temperature', label: '创造性', type: 'slider', default: 0.5, hint: '数值越高回答越发散' },
      {
        key: 'prompt',
        label: '提示词',
        type: 'textarea',
        default: '请根据以下信息回答用户问题：\n\n用户问题：{{query}}',
        hint: '支持用 {{变量名}} 引用上游节点的输出',
      },
      { key: 'output', label: '输出变量', type: 'input', default: 'llm_output' },
    ],
  },
  {
    type: 'knowledge',
    label: '知识库',
    icon: 'Collection',
    color: '#0ea5e9',
    group: 'basic',
    desc: '在知识库中检索相关内容',
    inputs: 1,
    outputs: 1,
    fields: [
      { key: 'kbIds', label: '关联知识库', type: 'knowledge', default: [] },
      {
        key: 'searchType',
        label: '检索策略',
        type: 'select',
        default: 'hybrid',
        options: [
          { label: '混合检索', value: 'hybrid' },
          { label: '全文检索', value: 'fulltext' },
          { label: '语义检索', value: 'semantic' },
        ],
      },
      { key: 'topK', label: '召回数量', type: 'number', default: 5, min: 1, max: 20 },
      { key: 'threshold', label: '匹配分阈值', type: 'slider', default: 0.3 },
      { key: 'output', label: '输出变量', type: 'input', default: 'knowledge_output' },
    ],
  },
  {
    type: 'agent',
    label: '智能体',
    icon: 'Cpu',
    color: '#8b5cf6',
    group: 'basic',
    desc: '调用已发布的智能体',
    inputs: 1,
    outputs: 1,
    fields: [
      { key: 'agentId', label: '选择智能体', type: 'agent', default: null, hint: '仅可添加已发布的智能体' },
      { key: 'output', label: '输出变量', type: 'input', default: 'agent_output' },
    ],
  },

  /* ---------- 工具节点 ---------- */
  {
    type: 'component',
    label: '组件',
    icon: 'Grid',
    color: '#f59e0b',
    group: 'tool',
    desc: '调用平台预置或自定义组件',
    inputs: 1,
    outputs: 1,
    fields: [
      {
        key: 'component',
        label: '选择组件',
        type: 'select',
        default: 'similar_question',
        options: [
          { label: '相似问生成', value: 'similar_question' },
          { label: '会话小结', value: 'summary' },
          { label: '问答对挖掘', value: 'qa_mining' },
          { label: '多轮改写', value: 'rewrite' },
          { label: '语义匹配', value: 'semantic_match' },
          { label: '标签抽取', value: 'tag_extract' },
        ],
      },
      { key: 'output', label: '输出变量', type: 'input', default: 'component_output' },
    ],
  },
  {
    type: 'api',
    label: 'API 调用',
    icon: 'Link',
    color: '#14b8a6',
    group: 'tool',
    desc: '调用外部 HTTP 接口',
    inputs: 1,
    outputs: 1,
    fields: [
      {
        key: 'method',
        label: '请求方法',
        type: 'select',
        default: 'GET',
        options: [
          { label: 'GET', value: 'GET' },
          { label: 'POST', value: 'POST' },
          { label: 'PUT', value: 'PUT' },
        ],
      },
      { key: 'url', label: '接口地址', type: 'input', default: '', placeholder: 'https://api.example.com/data' },
      { key: 'headers', label: '请求头', type: 'textarea', default: '{\n  "Content-Type": "application/json"\n}' },
      { key: 'output', label: '输出变量', type: 'input', default: 'api_output' },
    ],
  },
  {
    type: 'mcp',
    label: 'MCP Server',
    icon: 'Connection',
    color: '#ec4899',
    group: 'tool',
    desc: '引入 MCP-SSE Server 并串联到业务流程',
    inputs: 1,
    outputs: 1,
    fields: [
      {
        key: 'transport',
        label: '传输方式',
        type: 'select',
        default: 'sse',
        options: [
          { label: 'MCP-SSE', value: 'sse' },
          { label: 'MCP-stdio', value: 'stdio' },
        ],
        hint: '招标书要求支持在工作流内引入 MCP-SSE 的 Server',
      },
      {
        key: 'serverUrl',
        label: 'Server 地址',
        type: 'input',
        default: '',
        placeholder: 'https://mcp.example.com/sse',
      },
      {
        key: 'tools',
        label: '可用工具',
        type: 'tools',
        default: [],
        hint: '连接成功后自动拉取该 Server 暴露的工具，选择需要在本节点调用的工具',
      },
      { key: 'timeout', label: '超时时间', type: 'number', default: 30, min: 5, max: 120, hint: '单位：秒' },
      { key: 'output', label: '输出变量', type: 'input', default: 'mcp_output' },
    ],
  },
  {
    type: 'code',
    label: '代码',
    icon: 'Document',
    color: '#64748b',
    group: 'tool',
    desc: '执行 Python 代码处理数据',
    inputs: 1,
    outputs: 1,
    fields: [
      {
        key: 'code',
        label: '代码',
        type: 'code',
        default: 'def main(query: str) -> dict:\n    # 在这里编写处理逻辑\n    return {"result": query.strip()}',
      },
      { key: 'output', label: '输出变量', type: 'input', default: 'code_output' },
    ],
  },
  {
    type: 'database',
    label: '数据库',
    icon: 'Coin',
    color: '#0891b2',
    group: 'tool',
    desc: '查询数据库或本地数据表',
    inputs: 1,
    outputs: 1,
    fields: [
      {
        key: 'mode',
        label: '查询方式',
        type: 'select',
        default: 'nl2sql',
        options: [
          { label: '自然语言转 SQL', value: 'nl2sql' },
          { label: '自然语言转 Pandas', value: 'nl2pandas' },
          { label: '直接编写 SQL', value: 'sql' },
        ],
      },
      { key: 'source', label: '数据源', type: 'input', default: '', placeholder: '选择已接入的数据库或数据表' },
      { key: 'question', label: '查询内容', type: 'textarea', default: '{{query}}' },
      { key: 'output', label: '输出变量', type: 'input', default: 'db_output' },
    ],
  },
  {
    type: 'text',
    label: '文本处理',
    icon: 'EditPen',
    color: '#a855f7',
    group: 'tool',
    desc: '拼接、截取或替换文本',
    inputs: 1,
    outputs: 1,
    fields: [
      {
        key: 'action',
        label: '处理方式',
        type: 'select',
        default: 'concat',
        options: [
          { label: '拼接', value: 'concat' },
          { label: '截取', value: 'slice' },
          { label: '替换', value: 'replace' },
        ],
      },
      { key: 'input', label: '输入内容', type: 'textarea', default: '{{llm_output}}' },
      { key: 'output', label: '输出变量', type: 'input', default: 'text_output' },
    ],
  },
  {
    type: 'rewrite',
    label: 'query 多轮改写',
    icon: 'Refresh',
    color: '#7c3aed',
    group: 'tool',
    desc: '结合上下文把追问改写为完整问题',
    inputs: 1,
    outputs: 1,
    fields: [
      { key: 'model', label: '改写模型', type: 'model', default: '' },
      { key: 'rounds', label: '参考对话轮数', type: 'number', default: 3, min: 1, max: 10 },
      { key: 'output', label: '输出变量', type: 'input', default: 'rewritten_query' },
    ],
  },

  /* ---------- 逻辑节点 ---------- */
  {
    type: 'intent',
    label: '意图识别',
    icon: 'Aim',
    color: '#eab308',
    group: 'logic',
    desc: '识别用户意图并分流到不同分支',
    inputs: 1,
    outputs: 3,
    fields: [
      { key: 'model', label: '识别模型', type: 'model', default: '' },
      {
        key: 'intents',
        label: '意图列表',
        type: 'variables',
        default: [
          { name: '制度咨询', desc: '询问公司制度、流程' },
          { name: '业务办理', desc: '需要查询或办理具体业务' },
        ],
      },
    ],
  },
  {
    type: 'branch',
    label: '条件分支',
    icon: 'Share',
    color: '#f97316',
    group: 'logic',
    desc: '按条件判断走不同分支',
    inputs: 1,
    outputs: 2,
    fields: [
      {
        key: 'cases',
        label: '分支条件',
        type: 'variables',
        default: [
          { name: '条件一', desc: '{{score}} >= 0.6' },
          { name: '否则', desc: '默认分支' },
        ],
      },
    ],
  },
  {
    type: 'loop',
    label: '循环',
    icon: 'RefreshRight',
    color: '#06b6d4',
    group: 'logic',
    desc: '对数组逐项执行子流程',
    inputs: 1,
    outputs: 1,
    fields: [
      { key: 'array', label: '循环数组', type: 'input', default: '{{knowledge_output}}' },
      { key: 'maxLoop', label: '最大循环次数', type: 'number', default: 10, min: 1, max: 100 },
    ],
  },
  {
    type: 'jump',
    label: '全局跳转',
    icon: 'Position',
    color: '#3b82f6',
    group: 'logic',
    desc: '跳转到指定的节点继续执行',
    inputs: 1,
    outputs: 1,
    fields: [
      { key: 'target', label: '目标节点', type: 'input', default: '', placeholder: '选择要跳转到的节点' },
    ],
  },
  {
    type: 'collect',
    label: '信息收集',
    icon: 'ChatDotSquare',
    color: '#22c55e',
    group: 'logic',
    desc: '向用户追问并收集必要信息',
    inputs: 1,
    outputs: 1,
    fields: [
      { key: 'question', label: '追问内容', type: 'textarea', default: '请补充您要查询的具体信息：' },
      { key: 'output', label: '输出变量', type: 'input', default: 'user_input' },
    ],
  },
  {
    type: 'memory',
    label: '记忆变量',
    icon: 'Files',
    color: '#78716c',
    group: 'logic',
    desc: '读写会话级记忆变量',
    inputs: 1,
    outputs: 1,
    fields: [
      {
        key: 'action',
        label: '操作',
        type: 'select',
        default: 'write',
        options: [
          { label: '写入', value: 'write' },
          { label: '读取', value: 'read' },
        ],
      },
      { key: 'name', label: '变量名', type: 'input', default: 'history' },
      { key: 'value', label: '变量值', type: 'textarea', default: '{{llm_output}}' },
    ],
  },
  {
    type: 'stream',
    label: '流式数据处理',
    icon: 'DataLine',
    color: '#d946ef',
    group: 'logic',
    desc: '对流式输出做过滤、脱敏或格式化',
    inputs: 1,
    outputs: 1,
    fields: [
      {
        key: 'action',
        label: '处理方式',
        type: 'select',
        default: 'format',
        options: [
          { label: '格式化', value: 'format' },
          { label: '敏感词过滤', value: 'filter' },
          { label: '分段输出', value: 'chunk' },
        ],
      },
      { key: 'output', label: '输出变量', type: 'input', default: 'stream_output' },
    ],
  },
  {
    type: 'end',
    label: '结束',
    icon: 'SwitchButton',
    color: '#ef4444',
    group: 'logic',
    desc: '工作流的终点，定义最终输出',
    inputs: 1,
    outputs: 0,
    fields: [
      { key: 'output', label: '最终输出', type: 'textarea', default: '{{llm_output}}' },
    ],
  },
]

/** 按类型取节点定义 */
export function nodeMeta(type) {
  return NODE_TYPES.find((n) => n.type === type)
}

/* ------------------------------------------------------------------ */
/* 演示数据                                                            */
/* ------------------------------------------------------------------ */

let nodeSeq = 0
function node(type, x, y, config = {}) {
  const meta = nodeMeta(type)
  const defaults = {}
  meta.fields.forEach((f) => {
    defaults[f.key] = f.default
  })
  return {
    id: `n${++nodeSeq}`,
    type,
    name: meta.label,
    x,
    y,
    config: { ...defaults, ...config },
  }
}

/** 首次运行写入演示数据 */
function seed() {
  if (localStorage.getItem(FLOW_KEY)) return

  // 工作流一：知识库问答（线性流程）
  const n1 = node('start', 80, 260)
  const n2 = node('rewrite', 300, 260, { rounds: 3 })
  const n3 = node('knowledge', 520, 260, { kbIds: [1], topK: 5, threshold: 0.3 })
  const n4 = node('llm', 760, 260, {
    model: 'qwen-max',
    temperature: 0.3,
    prompt: '请依据以下知识库内容回答用户问题，并标注出处。\n\n知识库内容：{{knowledge_output}}\n\n用户问题：{{rewritten_query}}',
  })
  const n5 = node('end', 1000, 260, { output: '{{llm_output}}' })

  // 工作流二：差旅报销助手（意图识别 + 条件分支 + MCP Server）
  const m1 = node('start', 80, 300, {
    inputs: [{ name: 'query', desc: '用户提问' }],
  })
  const m2 = node('intent', 300, 300, {
    model: 'deepseek-v3',
    intents: [
      { name: '制度咨询', desc: '询问报销标准与流程' },
      { name: '业务办理', desc: '提交或查询报销单' },
    ],
  })
  const m3 = node('knowledge', 540, 170, { kbIds: [1], topK: 3 })
  const m4 = node('mcp', 540, 430, {
    transport: 'sse',
    serverUrl: 'https://mcp.internal.example.com/sse',
    tools: [
      { name: 'query_expense_record', desc: '查询员工的报销单记录', enabled: true },
      { name: 'submit_expense', desc: '提交一张新的报销单', enabled: true },
      { name: 'check_approval_status', desc: '查询报销单的审批状态', enabled: false },
    ],
    timeout: 30,
  })
  const m5 = node('llm', 790, 300, {
    model: 'deepseek-v3',
    temperature: 0.3,
    prompt: '根据以下信息为用户办理差旅报销业务：\n\n制度依据：{{knowledge_output}}\n\n业务系统返回：{{mcp_output}}\n\n用户问题：{{query}}',
  })
  const m6 = node('end', 1030, 300, { output: '{{llm_output}}' })

  const flows = [
    {
      id: 1,
      name: '制度知识问答工作流',
      description: '用户提问经多轮改写后检索知识库，由大模型依据检索结果作答并标注出处。',
      status: 'published',
      publishScope: 'organization',
      cover: '📚',
      nodes: [n1, n2, n3, n4, n5],
      edges: [
        { from: n1.id, to: n2.id },
        { from: n2.id, to: n3.id },
        { from: n3.id, to: n4.id },
        { from: n4.id, to: n5.id },
      ],
      runs: 326,
      createdAt: Date.now() - 22 * 24 * 3600 * 1000,
      updatedAt: Date.now() - 3 * 24 * 3600 * 1000,
    },
    {
      id: 2,
      name: '差旅报销助手',
      description: '先识别用户意图，制度咨询走知识库检索，业务办理则通过 MCP Server 调用报销系统接口。',
      status: 'published',
      publishScope: 'organization',
      cover: '🧾',
      nodes: [m1, m2, m3, m4, m5, m6],
      edges: [
        { from: m1.id, to: m2.id },
        { from: m2.id, to: m3.id },
        { from: m2.id, to: m4.id },
        { from: m3.id, to: m5.id },
        { from: m4.id, to: m5.id },
        { from: m5.id, to: m6.id },
      ],
      runs: 158,
      createdAt: Date.now() - 14 * 24 * 3600 * 1000,
      updatedAt: Date.now() - 2 * 3600 * 1000,
    },
    {
      id: 3,
      name: '会议纪要整理工作流',
      description: '上传会议记录后抽取标签、生成摘要，输出结构化的会议纪要。',
      status: 'draft',
      publishScope: 'personal',
      cover: '📝',
      nodes: [
        node('start', 80, 240),
        node('text', 320, 240, { action: 'concat' }),
        node('llm', 560, 240, { model: 'glm-4-plus', temperature: 0.6 }),
        node('end', 800, 240),
      ],
      edges: [],
      runs: 0,
      createdAt: Date.now() - 5 * 24 * 3600 * 1000,
      updatedAt: Date.now() - 5 * 24 * 3600 * 1000,
    },
  ]
  // 第三个工作流演示「草稿但未连线」的状态，这里补上连线
  const f3 = flows[2]
  f3.edges = [
    { from: f3.nodes[0].id, to: f3.nodes[1].id },
    { from: f3.nodes[1].id, to: f3.nodes[2].id },
    { from: f3.nodes[2].id, to: f3.nodes[3].id },
  ]

  localStorage.setItem(FLOW_KEY, JSON.stringify(flows))
}

function readFlows() {
  seed()
  try {
    return JSON.parse(localStorage.getItem(FLOW_KEY)) || []
  } catch {
    return []
  }
}

function writeFlows(list) {
  localStorage.setItem(FLOW_KEY, JSON.stringify(list))
}

function delay(result, ms = 300) {
  return new Promise((resolve) => setTimeout(() => resolve(result), ms))
}

/* ------------------------------------------------------------------ */
/* 工作流增删改查                                                      */
/* ------------------------------------------------------------------ */

export function listWorkflowsApi() {
  const list = readFlows().map(({ nodes, edges, ...rest }) => ({
    ...rest,
    nodeCount: nodes.length,
  }))
  return delay(list.sort((a, b) => b.updatedAt - a.updatedAt))
}

export function getWorkflowApi(id) {
  const flow = readFlows().find((f) => f.id === id)
  if (!flow) return Promise.reject(new Error('工作流不存在'))
  return delay(flow, 200)
}

export function createWorkflowApi(data) {
  const list = readFlows()
  const id = list.reduce((max, f) => Math.max(max, f.id), 0) + 1
  const now = Date.now()
  const start = node('start', 120, 240)
  const flow = {
    id,
    ...data,
    status: 'draft',
    publishScope: 'personal',
    cover: '🧩',
    nodes: [start],
    edges: [],
    runs: 0,
    createdAt: now,
    updatedAt: now,
  }
  list.push(flow)
  writeFlows(list)
  return delay(flow, 400)
}

export function updateWorkflowApi(id, data) {
  const list = readFlows()
  const flow = list.find((f) => f.id === id)
  if (!flow) return Promise.reject(new Error('工作流不存在'))
  Object.assign(flow, data, { updatedAt: Date.now() })
  writeFlows(list)
  return delay(flow, 250)
}

/**
 * 保存画布（节点与连线）
 * 保存时校验：必须有开始节点、不能存在环、除开始节点外每个节点都要有入边。
 */
export function saveCanvasApi(id, { nodes, edges }) {
  const list = readFlows()
  const flow = list.find((f) => f.id === id)
  if (!flow) return Promise.reject(new Error('工作流不存在'))

  if (!nodes.some((n) => n.type === 'start')) {
    return Promise.reject(new Error('工作流缺少「开始」节点'))
  }
  if (hasCycle(nodes, edges)) {
    return Promise.reject(new Error('节点连线存在环路，请检查后重试'))
  }
  const orphan = nodes.find(
    (n) => n.type !== 'start' && !edges.some((e) => e.to === n.id)
  )
  if (orphan) {
    return Promise.reject(new Error(`节点「${orphan.name}」没有上游连线`))
  }

  flow.nodes = nodes
  flow.edges = edges
  flow.updatedAt = Date.now()
  writeFlows(list)
  // 回传 updatedAt，让编排页头部的时间随之刷新
  return delay({ success: true, updatedAt: flow.updatedAt }, 500)
}

export function deleteWorkflowApi(id) {
  writeFlows(readFlows().filter((f) => f.id !== id))
  return delay({ success: true }, 250)
}

/** 复制工作流 */
export function duplicateWorkflowApi(id) {
  const list = readFlows()
  const src = list.find((f) => f.id === id)
  if (!src) return Promise.reject(new Error('工作流不存在'))

  const newId = list.reduce((max, f) => Math.max(max, f.id), 0) + 1
  const now = Date.now()
  // 节点与连线都需要重新生成 id，避免与原工作流冲突
  const idMap = {}
  const nodes = src.nodes.map((n) => {
    const newKey = `c${++nodeSeq}`
    idMap[n.id] = newKey
    return { ...n, id: newKey, config: { ...n.config } }
  })
  const edges = src.edges.map((e) => ({ from: idMap[e.from], to: idMap[e.to] }))

  const copy = {
    ...src,
    id: newId,
    name: `${src.name} - 副本`,
    status: 'draft',
    nodes,
    edges,
    runs: 0,
    createdAt: now,
    updatedAt: now,
  }
  list.push(copy)
  writeFlows(list)
  return delay(copy, 400)
}

/** 发布 / 下线 */
export function publishWorkflowApi(id, { status, publishScope }) {
  const list = readFlows()
  const flow = list.find((f) => f.id === id)
  if (!flow) return Promise.reject(new Error('工作流不存在'))

  if (status === 'published') {
    if (!flow.nodes.some((n) => n.type === 'start')) {
      return Promise.reject(new Error('工作流缺少「开始」节点，无法发布'))
    }
    if (flow.nodes.length < 2) {
      return Promise.reject(new Error('工作流至少需要两个节点才能发布'))
    }
  }
  flow.status = status
  if (publishScope) flow.publishScope = publishScope
  flow.updatedAt = Date.now()
  writeFlows(list)
  return delay({ success: true }, 450)
}

/** 导出为 JSON（供「导出」功能下载） */
export function exportWorkflowApi(id) {
  const flow = readFlows().find((f) => f.id === id)
  if (!flow) return Promise.reject(new Error('工作流不存在'))
  return delay(flow, 200)
}

/* ------------------------------------------------------------------ */
/* 校验与试运行                                                        */
/* ------------------------------------------------------------------ */

/** 判断有向图是否存在环（深度优先） */
export function hasCycle(nodes, edges) {
  const adj = {}
  nodes.forEach((n) => {
    adj[n.id] = []
  })
  edges.forEach((e) => {
    if (adj[e.from]) adj[e.from].push(e.to)
  })

  const visiting = new Set()
  const done = new Set()

  function visit(id) {
    if (done.has(id)) return false
    if (visiting.has(id)) return true
    visiting.add(id)
    const cyclic = (adj[id] || []).some((next) => visit(next))
    visiting.delete(id)
    done.add(id)
    return cyclic
  }

  return nodes.some((n) => visit(n.id))
}

/** 拓扑排序，得到节点的执行顺序；存在环时返回 null */
export function topoOrder(nodes, edges) {
  const indegree = {}
  const adj = {}
  nodes.forEach((n) => {
    indegree[n.id] = 0
    adj[n.id] = []
  })
  edges.forEach((e) => {
    if (adj[e.from] === undefined || indegree[e.to] === undefined) return
    adj[e.from].push(e.to)
    indegree[e.to]++
  })

  const queue = nodes.filter((n) => indegree[n.id] === 0).map((n) => n.id)
  const order = []
  while (queue.length) {
    const id = queue.shift()
    order.push(id)
    adj[id].forEach((next) => {
      if (--indegree[next] === 0) queue.push(next)
    })
  }
  return order.length === nodes.length ? order : null
}

/** 按节点类型生成模拟的执行输出 */
/** 把 {{变量}} 替换为运行时的值；变量不存在时保留原样，便于排查漏配的变量 */
function fillVars(template, variables) {
  return String(template).replace(/\{\{(\w+)\}\}/g, (m, key) =>
    variables[key] === undefined ? m : variables[key]
  )
}

function nodeOutput(node, variables) {
  const cfg = node.config || {}
  switch (node.type) {
    case 'start':
      return `接收输入变量：${(cfg.inputs || []).map((v) => `${v.name}（${v.desc}）`).join('、') || '无'}`

    case 'rewrite':
      return `已将追问改写为完整问题：「${variables.query || '差旅费怎么报销'}」\n参考了最近 ${cfg.rounds || 3} 轮对话上下文`

    case 'knowledge':
      return `在 ${(cfg.kbIds || []).length || 1} 个知识库中执行${
        { hybrid: '混合检索', fulltext: '全文检索', semantic: '语义检索' }[cfg.searchType] || '混合检索'
      }，召回 ${cfg.topK || 5} 条切片，过滤后保留 2 条：\n· 住宿费标准按城市级别划分：一线城市每人每晚不超过 600 元\n· 超标部分由个人承担，需经三级审批`

    case 'intent':
      return `意图识别结果：制度咨询（置信度 0.91）\n候选意图：${(cfg.intents || []).map((i) => i.name).join('、')}`

    case 'llm':
      return `模型 ${cfg.model || '默认模型'}（创造性 ${cfg.temperature ?? 0.5}）生成回答：\n住宿费按城市级别划分，一线城市每人每晚不超过 600 元，二线城市不超过 400 元，其他城市不超过 300 元。超标部分由个人承担。`

    case 'agent':
      return `调用智能体完成处理，返回结构化结果`

    case 'component':
      return `组件「${cfg.component || '相似问生成'}」执行完成，产出 3 条结果`

    case 'api': {
      const url = cfg.url || 'https://api.example.com/data'
      return `以 ${cfg.method || 'GET'} 请求 ${url}\n响应状态 200，耗时 186 ms`
    }

    case 'mcp': {
      const enabled = (cfg.tools || []).filter((t) => t.enabled)
      return `已通过 ${
        cfg.transport === 'stdio' ? 'MCP-stdio' : 'MCP-SSE'
      } 连接到 ${cfg.serverUrl || 'MCP Server'}\n拉取到 ${(cfg.tools || []).length} 个工具，本次调用：${
        enabled.map((t) => t.name).join('、') || '（未选择工具）'
      }\n工具返回：报销单号 EXP-20260901-0042，金额 1840.00 元，当前状态「待审批」`
    }

    case 'code':
      return `Python 代码执行完成，返回 {"result": "..."}`

    case 'database':
      return `查询数据源完成，返回 12 行记录`

    case 'text':
      return `文本处理（${cfg.action || 'concat'}）完成`

    case 'loop':
      return `循环执行 ${Math.min(cfg.maxLoop || 10, 2)} 次后结束`

    case 'jump':
      return `跳转到节点「${cfg.target || '未指定'}」`

    case 'collect':
      return `已向用户追问，等待补充信息`

    case 'memory':
      return `记忆变量 ${cfg.name || 'history'} 已${
        cfg.action === 'read' ? '读取' : '写入'
      }`

    case 'stream':
      return `流式数据已按「${
        { format: '格式化', filter: '敏感词过滤', chunk: '分段输出' }[cfg.action] || '格式化'
      }」处理并输出`

    case 'end':
      // 结束节点是唯一会把「最终输出」模板真正求值的节点：
      // 上游节点写入的变量在这里被替换，用户看到的是答案而不是 `{{llm_output}}`
      return `输出最终结果：${fillVars(cfg.output || '{{llm_output}}', variables)}`

    default:
      return '节点执行完成'
  }
}

/**
 * 试运行工作流
 *
 * 按拓扑序逐个节点执行，每执行完一个节点回调一次，便于界面展示执行轨迹。
 *
 * @param {object} options
 * @param {object[]} options.nodes
 * @param {object[]} options.edges
 * @param {object} options.inputs 运行时输入变量
 * @param {(entry: {nodeId: string, output: string, ms: number}, index: number) => void} options.onNodeDone
 * @returns {{promise: Promise<object>, stop: () => void}}
 */
export function runWorkflowApi({ nodes, edges, inputs = {}, onNodeDone }) {
  const order = topoOrder(nodes, edges)
  if (!order) {
    return {
      promise: Promise.reject(new Error('节点连线存在环路，无法运行')),
      stop() {},
    }
  }

  let stopped = false
  let timer = null
  const startedAt = Date.now()
  const variables = { ...inputs }
  const trace = []

  const promise = new Promise((resolve, reject) => {
    let i = 0
    const step = () => {
      if (stopped) {
        resolve({ stopped: true, trace, elapsed: Date.now() - startedAt, variables })
        return
      }
      if (i >= order.length) {
        resolve({ stopped: false, trace, elapsed: Date.now() - startedAt, variables })
        return
      }
      const id = order[i]
      const current = nodes.find((n) => n.id === id)
      const output = nodeOutput(current, variables)
      const varName = current.config?.output
      // 只有标识符形式的 output 才是「输出变量」；
      // 结束节点的 output 是输出模板（如 {{llm_output}}），不能当作变量名写入
      if (varName && /^[A-Za-z_]\w*$/.test(varName)) variables[varName] = output
      const entry = { nodeId: id, output, status: 'success', ms: 120 + Math.floor(Math.random() * 380) }
      trace.push(entry)
      onNodeDone?.(entry, i)
      i++
      timer = setTimeout(step, 700)
    }
    try {
      timer = setTimeout(step, 300)
    } catch (err) {
      reject(err)
    }
  })

  return {
    promise,
    stop() {
      stopped = true
      clearTimeout(timer)
    },
  }
}

/** 连接 MCP Server 并拉取工具列表（模拟） */
export function connectMcpServerApi({ serverUrl, transport }) {
  const url = (serverUrl || '').trim()
  if (!/^https?:\/\/.+/i.test(url)) {
    return delay({ success: false, message: 'Server 地址格式不正确，需以 http:// 或 https:// 开头' }, 900)
  }
  if (/\.invalid(\/|:|$)/i.test(url.replace(/^https?:\/\//i, ''))) {
    return delay({ success: false, message: '连接 MCP Server 失败，请检查地址或网络' }, 1400)
  }
  return delay(
    {
      success: true,
      message: `已通过 ${transport === 'stdio' ? 'MCP-stdio' : 'MCP-SSE'} 连接成功`,
      tools: [
        { name: 'query_expense_record', desc: '查询员工的报销单记录' },
        { name: 'submit_expense', desc: '提交一张新的报销单' },
        { name: 'check_approval_status', desc: '查询报销单的审批状态' },
        { name: 'list_expense_policy', desc: '获取最新的差旅报销标准' },
      ],
    },
    1100
  )
}
