/**
 * 登录 / 注册接口（Mock 实现）
 *
 * 原型阶段使用前端模拟登录，用户表用 localStorage 持久化，
 * 保证注册的新账号刷新页面后仍可登录。
 * 后续接入真实后端时，仅需将各方法替换为真实的 HTTP 请求（如 axios），
 * 页面与状态管理代码无需改动。
 */

const STORAGE_KEY = 'agent-platform-users'

// 演示账号：首次运行时写入 localStorage，此后以 localStorage 中的数据为准
const DEMO_USERS = [
  { username: 'admin', password: 'admin123', nickname: '管理员', role: '管理员' },
  { username: 'user', password: 'user123', nickname: '演示用户', role: '普通用户' },
]

let seedDone = false

/** 首次运行时写入演示账号 */
function seed() {
  if (seedDone) return
  seedDone = true
  if (localStorage.getItem(STORAGE_KEY)) return
  writeAll(DEMO_USERS)
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

/** 会话信息：登录与注册成功时返回的结构一致，便于调用方复用 */
function sessionOf(user) {
  return {
    token: `mock-token-${Date.now()}`,
    user: { username: user.username, nickname: user.nickname, role: user.role },
  }
}

/**
 * 登录
 * @param {{username: string, password: string}} form 登录表单
 * @returns {Promise<{token: string, user: object}>}
 */
export function loginApi({ username, password }) {
  return new Promise((resolve, reject) => {
    // 模拟网络延迟
    setTimeout(() => {
      const found = readAll().find(
        (u) => u.username === username && u.password === password
      )
      if (found) {
        resolve(sessionOf(found))
      } else {
        reject(new Error('账号或密码错误'))
      }
    }, 600)
  })
}

/**
 * 注册
 *
 * 新用户角色固定为「普通用户」；昵称留空时回退为账号。
 * 注册成功直接返回会话，调用方可据此自动登录。
 * @param {{username: string, password: string, nickname?: string}} form
 * @returns {Promise<{token: string, user: object}>}
 */
export function registerApi({ username, password, nickname = '' }) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const name = username.trim()
      const list = readAll()
      // 与 loginApi 保持一致的精确匹配规则
      if (list.some((u) => u.username === name)) {
        reject(new Error('该账号已被注册，请更换账号'))
        return
      }
      const user = {
        username: name,
        password,
        nickname: nickname.trim() || name,
        role: '普通用户',
      }
      list.push(user)
      writeAll(list)
      resolve(sessionOf(user))
    }, 600)
  })
}
