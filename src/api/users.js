/**
 * 用户与权限接口（Mock 实现）
 *
 * 本文件是用户表的唯一所有者：账号的读写、字段归一化、角色与模块权限
 * 的校验都在这里，登录/注册（api/auth.js）也复用本表的查询与写入。
 * 后续接入真实后端时，仅需将各方法替换为 HTTP 请求。
 */

const STORAGE_KEY = 'agent-platform-users'

/** 角色 */
export const ROLE_ADMIN = '管理员'
export const ROLE_USER = '普通用户'
export const ROLE_OPTIONS = [ROLE_ADMIN, ROLE_USER]
export const ROLE_TAG_MAP = {
  [ROLE_ADMIN]: { type: 'warning' },
  [ROLE_USER]: { type: 'info' },
}

/** 所属组织 */
export const DEFAULT_ORG = '未分配'
export const ORG_OPTIONS = ['管理层', '研发部', '市场部', '运营部', '客户服务部']

/** 业务模块权限：键与路由 meta.permission 一一对应 */
export const PERMISSION_KEYS = ['agents', 'knowledge', 'workflow', 'chat', 'models']
export const PERMISSION_MAP = {
  agents: { label: '智能体管理' },
  knowledge: { label: '知识库' },
  workflow: { label: '工作流编排' },
  chat: { label: '对话调试' },
  models: { label: '模型市场' },
}

/** 账号状态 */
export const STATUS_MAP = {
  active: { label: '正常', type: 'success' },
  disabled: { label: '已停用', type: 'danger' },
}

// 演示账号：首次运行时写入 localStorage，此后以 localStorage 中的数据为准
const DEMO_USERS = [
  {
    username: 'admin',
    password: 'admin123',
    nickname: '管理员',
    role: ROLE_ADMIN,
    org: '管理层',
    permissions: [...PERMISSION_KEYS],
    status: 'active',
  },
  {
    username: 'user',
    password: 'user123',
    nickname: '演示用户',
    role: ROLE_USER,
    org: '未分配',
    permissions: [...PERMISSION_KEYS],
    status: 'active',
  },
]

let seedDone = false

/** 首次运行时写入演示账号 */
function seed() {
  if (seedDone) return
  seedDone = true
  if (localStorage.getItem(STORAGE_KEY)) return
  const now = Date.now()
  writeAll(DEMO_USERS.map((u) => ({ ...u, createdAt: now, updatedAt: now })))
}

/**
 * 补齐老数据的缺失字段
 * 早期版本只存了账号/密码/昵称/角色，读取时统一补上组织、模块权限与状态，
 * 保证升级前的浏览器里的数据也能正常参与权限判断。
 */
function normalize(raw) {
  const role = raw.role || ROLE_USER
  const isAdmin = role === ROLE_ADMIN
  // 只看字段是否存在：空数组是「权限被管理员全部取消」的合法状态，
  // 不能当成缺失来回填成全量，否则取消权限的账号会在下次读取时被悄悄恢复
  const hasPermsField = Array.isArray(raw.permissions)
  return {
    ...raw,
    role,
    // 管理员默认归入管理层，其余账号待管理员分配
    org: raw.org || (isAdmin ? '管理层' : DEFAULT_ORG),
    // 管理员恒为全量权限，忽略存量值
    permissions: isAdmin ? [...PERMISSION_KEYS] : hasPermsField ? raw.permissions : [...PERMISSION_KEYS],
    status: raw.status === 'disabled' ? 'disabled' : 'active',
    createdAt: raw.createdAt || Date.now(),
    updatedAt: raw.updatedAt || Date.now(),
  }
}

function readAll() {
  seed()
  let raw
  try {
    raw = JSON.parse(localStorage.getItem(STORAGE_KEY)) || []
  } catch {
    return []
  }
  const list = raw.map(normalize)
  // 仅在实际补齐了字段时回写一次，避免每次读取都重写 localStorage
  if (JSON.stringify(list) !== JSON.stringify(raw)) writeAll(list)
  return list
}

function writeAll(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

function adminCount(list) {
  return list.filter((u) => u.role === ROLE_ADMIN).length
}

function delay(result, ms = 320) {
  return new Promise((resolve) => setTimeout(() => resolve(result), ms))
}

function fail(message, ms = 320) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms))
}

/* ---------- 查询 ---------- */

/**
 * 按账号同步查询用户（无模拟延迟）
 * 供登录校验与路由守卫同步会话使用。
 */
export function findUser(username) {
  return readAll().find((u) => u.username === username) || null
}

/**
 * 分页查询用户
 * @param {{keyword?: string, role?: string, org?: string, status?: string, page?: number, pageSize?: number}} params
 */
export function listUsersApi(params = {}) {
  const { keyword = '', role = '', org = '', status = '', page = 1, pageSize = 8 } = params
  let list = readAll()

  if (keyword.trim()) {
    const kw = keyword.trim().toLowerCase()
    list = list.filter(
      (u) =>
        u.username.toLowerCase().includes(kw) || (u.nickname || '').toLowerCase().includes(kw)
    )
  }
  if (role) list = list.filter((u) => u.role === role)
  if (org) list = list.filter((u) => u.org === org)
  if (status) list = list.filter((u) => u.status === status)

  list.sort((a, b) => b.updatedAt - a.updatedAt)

  const total = list.length
  const start = (page - 1) * pageSize
  return delay({ list: list.slice(start, start + pageSize), total })
}

/** 查询全部用户（用于统计管理员数量） */
export function listAllUsersApi() {
  return delay(readAll(), 120)
}

/* ---------- 增删改 ---------- */

/**
 * 新增用户
 * 管理员在用户管理里新建时可一次指定角色、组织与模块权限；
 * 注册入口只传账号/密码/昵称，此时按默认值落库（普通用户 + 全权限 + 未分配）。
 */
export function createUserApi({
  username,
  password,
  nickname = '',
  role = ROLE_USER,
  org = DEFAULT_ORG,
  permissions,
} = {}) {
  const name = String(username || '').trim()
  if (String(password || '').length < 6 || String(password || '').length > 20) {
    return fail('密码长度为 6-20 位')
  }
  const list = readAll()
  if (list.some((u) => u.username === name)) {
    return fail('该账号已被注册，请更换账号')
  }
  const now = Date.now()
  const finalRole = role === ROLE_ADMIN ? ROLE_ADMIN : ROLE_USER
  const user = {
    username: name,
    password,
    nickname: String(nickname || '').trim() || name,
    role: finalRole,
    org: org || DEFAULT_ORG,
    // 管理员恒为全量权限；未指定权限（注册入口）时默认全开，
    // 管理员明确传入空数组则按「暂不开放任何模块」保存
    permissions:
      finalRole === ROLE_ADMIN || !Array.isArray(permissions)
        ? [...PERMISSION_KEYS]
        : [...permissions],
    status: 'active',
    createdAt: now,
    updatedAt: now,
  }
  list.push(user)
  writeAll(list)
  return delay(user)
}

/**
 * 修改用户
 * @param {string} username 目标账号
 * @param {object} data 待更新字段
 * @param {{operator?: {username: string}}} options 操作人（用于自我保护校验）
 */
export function updateUserApi(username, data, { operator } = {}) {
  const list = readAll()
  const idx = list.findIndex((u) => u.username === username)
  if (idx === -1) return fail('用户不存在')

  const target = list[idx]
  const isSelf = operator?.username === username

  if (isSelf && data.role && data.role !== target.role) {
    return fail('不能修改自己的角色')
  }
  if (
    isSelf &&
    Array.isArray(data.permissions) &&
    JSON.stringify([...data.permissions].sort()) !== JSON.stringify([...target.permissions].sort())
  ) {
    return fail('不能修改自己的模块权限')
  }
  if (data.role && data.role !== target.role && target.role === ROLE_ADMIN && adminCount(list) === 1) {
    return fail('系统至少需要保留一名管理员')
  }

  const next = { ...target, ...data, updatedAt: Date.now() }
  // 升为管理员时强制拥有全部模块权限
  if (next.role === ROLE_ADMIN) next.permissions = [...PERMISSION_KEYS]
  list[idx] = next
  writeAll(list)
  return delay(next)
}

export function deleteUserApi(username, { operator } = {}) {
  const list = readAll()
  const target = list.find((u) => u.username === username)
  if (!target) return fail('用户不存在')

  if (operator?.username === username) return fail('不能删除当前登录账号')
  if (target.role === ROLE_ADMIN && adminCount(list) === 1) {
    return fail('系统至少需要保留一名管理员')
  }

  writeAll(list.filter((u) => u.username !== username))
  return delay({ success: true })
}

export function resetPasswordApi(username, password) {
  const list = readAll()
  const idx = list.findIndex((u) => u.username === username)
  if (idx === -1) return fail('用户不存在')
  if (String(password || '').length < 6 || String(password || '').length > 20) {
    return fail('密码长度为 6-20 位')
  }

  list[idx] = { ...list[idx], password, updatedAt: Date.now() }
  writeAll(list)
  return delay({ success: true })
}

/** 停用 / 启用账号 */
export function toggleStatusApi(username, { operator } = {}) {
  const list = readAll()
  const idx = list.findIndex((u) => u.username === username)
  if (idx === -1) return fail('用户不存在')

  const target = list[idx]
  if (operator?.username === username && target.status === 'active') {
    return fail('不能停用当前登录账号')
  }

  list[idx] = {
    ...target,
    status: target.status === 'active' ? 'disabled' : 'active',
    updatedAt: Date.now(),
  }
  writeAll(list)
  return delay(list[idx])
}
