import { defineStore } from 'pinia'
import {
  listUsersApi,
  listAllUsersApi,
  createUserApi,
  updateUserApi,
  deleteUserApi,
  resetPasswordApi,
  toggleStatusApi,
  ROLE_ADMIN,
} from '../api/users'
import { useAuthStore } from './auth'

export const useUsersStore = defineStore('users', {
  state: () => ({
    /** 当前页用户 */
    list: [],
    /** 全部用户，用于统计管理员数量 */
    all: [],
    total: 0,
    loading: false,
    /** 查询条件由 store 统一管理，视图直接双向绑定 */
    query: { keyword: '', role: '', org: '', status: '', page: 1, pageSize: 8 },
  }),

  getters: {
    adminCount: (state) => state.all.filter((u) => u.role === ROLE_ADMIN).length,
  },

  actions: {
    async fetchList() {
      this.loading = true
      try {
        const { list, total } = await listUsersApi(this.query)
        this.list = list
        this.total = total
      } finally {
        this.loading = false
      }
    },

    async fetchAll() {
      this.all = await listAllUsersApi()
    },

    /** 操作人信息：传给接口层做自我保护校验 */
    operator() {
      const auth = useAuthStore()
      return { username: auth.user?.username }
    },

    async create(data) {
      const user = await createUserApi(data)
      this.query.page = 1
      await Promise.all([this.fetchList(), this.fetchAll()])
      return user
    },

    async update(username, data) {
      await updateUserApi(username, data, { operator: this.operator() })
      await Promise.all([this.fetchList(), this.fetchAll()])
    },

    async remove(username) {
      await deleteUserApi(username, { operator: this.operator() })
      // 删除后当前页可能已空，回退一页
      if (this.list.length === 1 && this.query.page > 1) this.query.page -= 1
      await Promise.all([this.fetchList(), this.fetchAll()])
    },

    async toggleStatus(username) {
      await toggleStatusApi(username, { operator: this.operator() })
      await Promise.all([this.fetchList(), this.fetchAll()])
    },

    async resetPassword(username, password) {
      await resetPasswordApi(username, password)
      await this.fetchAll()
    },

    resetQuery() {
      this.query.keyword = ''
      this.query.role = ''
      this.query.org = ''
      this.query.status = ''
      this.query.page = 1
    },
  },
})
