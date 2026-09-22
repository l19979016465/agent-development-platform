/**
 * 登录接口（Mock 实现）
 *
 * 原型阶段使用前端模拟登录；后续接入真实后端时，
 * 仅需将 loginApi 替换为真实的 HTTP 请求（如 axios），
 * 页面与状态管理代码无需改动。
 */

// 模拟用户表：后续可替换为后端数据库查询
const MOCK_USERS = [
  { username: 'admin', password: 'admin123', nickname: '管理员', role: '管理员' },
  { username: 'user', password: 'user123', nickname: '演示用户', role: '普通用户' },
]

/**
 * 登录
 * @param {{username: string, password: string}} form 登录表单
 * @returns {Promise<{token: string, user: object}>}
 */
export function loginApi({ username, password }) {
  return new Promise((resolve, reject) => {
    // 模拟网络延迟
    setTimeout(() => {
      const found = MOCK_USERS.find(
        (u) => u.username === username && u.password === password
      )
      if (found) {
        resolve({
          token: `mock-token-${Date.now()}`,
          user: {
            username: found.username,
            nickname: found.nickname,
            role: found.role,
          },
        })
      } else {
        reject(new Error('账号或密码错误'))
      }
    }, 600)
  })
}
