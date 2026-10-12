import { defineStore } from 'pinia'
import { loginApi, registerApi } from '../api/auth'

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

    /** 退出登录：清除本地会话 */
    logout() {
      this.token = ''
      this.user = null
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
    },
  },
})
