/**
 * 登录 / 注册接口（Mock 实现）
 *
 * 用户表由 api/users.js 统一持有，本文件只负责认证语义：
 * 校验账号密码、判断账号状态、签发会话。
 * 后续接入真实后端时，仅需将各方法替换为真实的 HTTP 请求（如 axios）。
 */

import { findUser, createUserApi } from './users'

/**
 * 会话信息：登录与注册成功时返回的结构一致，便于调用方复用。
 * 这里保存的是用户信息的快照，菜单与路由守卫都读它；
 * 用户表发生变化时由 stores/auth.js 的 refresh() 同步。
 */
function sessionOf(user) {
  return {
    token: `mock-token-${Date.now()}`,
    user: {
      username: user.username,
      nickname: user.nickname,
      role: user.role,
      org: user.org,
      permissions: user.permissions,
      status: user.status,
    },
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
      const found = findUser(username)
      // 先校验密码再判断状态：账号不存在或密码错误时给出同样的提示，
      // 避免通过错误文案探测某个账号是否存在、是否被停用
      if (!found || found.password !== password) {
        reject(new Error('账号或密码错误'))
        return
      }
      if (found.status !== 'active') {
        reject(new Error('账号已停用，请联系管理员'))
        return
      }
      resolve(sessionOf(found))
    }, 600)
  })
}

/**
 * 注册
 *
 * 新用户角色固定为「普通用户」（由 createUserApi 保证）；
 * 注册成功直接返回会话，调用方可据此自动登录。
 * @param {{username: string, password: string, nickname?: string}} form
 * @returns {Promise<{token: string, user: object}>}
 */
export async function registerApi(form) {
  const user = await createUserApi({
    username: form.username,
    password: form.password,
    nickname: form.nickname,
  })
  return sessionOf(user)
}
