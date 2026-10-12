import { defineStore } from 'pinia'
import { loginApi, registerApi } from '../api/auth'
import { findUser, ROLE_ADMIN } from '../api/users'

const TOKEN_KEY = 'agent-platform-token'
const USER_KEY = 'agent-platform-user'

function readUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY))
  } catch {
    return null
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem(TOKEN_KEY) || '',
    user: readUser(),
  }),

  getters: {
    isLoggedIn: (state) => !!state.token,
    displayName: (state) => state.user?.nickname || state.user?.username || '',
    isAdmin: (state) => state.user?.role === ROLE_ADMIN,

    /** 是否拥有某个业务模块的权限；管理员恒为 true */
    can: (state) => (permission) =>
      state.user?.role === ROLE_ADMIN ||
      (state.user?.permissions || []).includes(permission),
  },

  actions: {
    /** 登录：调用登录接口并持久化会话 */
    async login(form) {
      this.setSession(await loginApi(form))
    },

    /** 注册：注册成功后直接写入会话，实现自动登录 */
    async register(form) {
      this.setSession(await registerApi(form))
    },

    /** 登录与注册共用的会话写入（供内部调用） */
    setSession({ token, user }) {
      this.token = token
      this.user = user
      localStorage.setItem(TOKEN_KEY, token)
      localStorage.setItem(USER_KEY, JSON.stringify(user))
    },

    /**
     * 用用户表的最新数据同步会话快照（同步方法，供路由守卫每次导航调用）
     *
     * 作用有两个：一是角色被调整、模块权限被收回、账号被停用或删除时立即生效，
     * 不必等用户重新登录；二是补齐旧版本会话快照里没有的 permissions 字段。
     * @returns {boolean} 会话是否仍然有效
     */
    refresh() {
      if (!this.user?.username) return false
      const fresh = findUser(this.user.username)
      if (!fresh || fresh.status !== 'active') {
        this.logout()
        return false
      }
      this.user = {
        username: fresh.username,
        nickname: fresh.nickname,
        role: fresh.role,
        org: fresh.org,
        permissions: fresh.permissions,
        status: fresh.status,
      }
      localStorage.setItem(USER_KEY, JSON.stringify(this.user))
      return true
    },

    /** 退出登录：清除本地会话 */
    logout() {
      this.token = ''
      this.user = null
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
    },
  },
})
