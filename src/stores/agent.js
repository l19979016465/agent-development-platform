import { defineStore } from 'pinia'
import {
  listAgentsApi,
  listAllAgentsApi,
  createAgentApi,
  updateAgentApi,
  deleteAgentApi,
  toggleAgentStatusApi,
} from '../api/agent'

export const useAgentStore = defineStore('agent', {
  state: () => ({
    /** 当前页智能体列表 */
    list: [],
    /** 全量数据（工作台统计用） */
    all: [],
    /** 总条数 */
    total: 0,
    loading: false,
    /** 查询条件 */
    query: {
      keyword: '',
      status: '',
      category: '',
      page: 1,
      pageSize: 8,
    },
  }),

  getters: {
    /** 工作台统计：总数 / 已发布 / 草稿 / 累计对话数 */
    stats: (state) => ({
      total: state.all.length,
      published: state.all.filter((a) => a.status === 'published').length,
      draft: state.all.filter((a) => a.status === 'draft').length,
      conversations: state.all.reduce((sum, a) => sum + (a.conversations || 0), 0),
    }),
  },

  actions: {
    /** 拉取智能体列表（按当前查询条件） */
    async fetchList() {
      this.loading = true
      try {
        const { list, total } = await listAgentsApi(this.query)
        this.list = list
        this.total = total
      } finally {
        this.loading = false
      }
    },

    /** 拉取全量数据（工作台统计用，不参与筛选） */
    async fetchAll() {
      this.all = await listAllAgentsApi()
    },

    /** 新增智能体 */
    async create(data) {
      await createAgentApi(data)
      this.query.page = 1
      await this.fetchList()
      await this.fetchAll()
    },

    /** 更新智能体 */
    async update(id, data) {
      await updateAgentApi(id, data)
      await this.fetchList()
      await this.fetchAll()
    },

    /** 删除智能体 */
    async remove(id) {
      await deleteAgentApi(id)
      // 删除后若当前页为空，回退一页
      if (this.list.length === 1 && this.query.page > 1) {
        this.query.page -= 1
      }
      await this.fetchList()
      await this.fetchAll()
    },

    /** 切换上下线 */
    async toggleStatus(id) {
      await toggleAgentStatusApi(id)
      await this.fetchList()
      await this.fetchAll()
    },

    /** 重置查询条件 */
    resetQuery() {
      this.query.keyword = ''
      this.query.status = ''
      this.query.category = ''
      this.query.page = 1
    },
  },
})
