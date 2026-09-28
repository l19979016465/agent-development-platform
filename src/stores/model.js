import { defineStore } from 'pinia'
import {
  listModelsApi,
  modelStatsApi,
  createThirdPartyModelApi,
  deleteModelApi,
  operateServiceApi,
  switchVersionApi,
  addVersionApi,
  updateTpsApi,
  evaluateModelApi,
  compareModelsApi,
} from '../api/model'

/** 比对测试结果里的一条回答 */
function emptyAnswer(model) {
  return {
    modelId: model.id,
    displayName: model.displayName,
    provider: model.provider,
    content: '',
    streaming: true,
    elapsed: 0,
    tokens: 0,
  }
}

export const useModelStore = defineStore('model', {
  state: () => ({
    /** 模型列表 */
    list: [],
    listLoading: false,

    /** 列表筛选条件 */
    query: { type: '', source: '', keyword: '', status: '' },

    /** 概览统计 */
    stats: null,

    /** 当前查看详情的模型 */
    current: null,
    detailVisible: false,

    /** 多模型比对 */
    compare: {
      visible: false,
      question: '',
      running: false,
      /** 从模型卡片进入时预选中的模型 id */
      presetIds: [],
      /** 每个模型一条回答，按发起比对时的模型顺序排列 */
      answers: [],
    },
  }),

  getters: {
    /** 过滤后的模型列表（筛选在前端完成，便于切换 tab 时即时响应） */
    filtered(state) {
      const { type, source, keyword, status } = state.query
      const k = keyword.trim().toLowerCase()
      return state.list.filter((m) => {
        if (type && m.type !== type) return false
        if (source && m.source !== source) return false
        if (status && m.status !== status) return false
        if (
          k &&
          !m.displayName.toLowerCase().includes(k) &&
          !m.name.toLowerCase().includes(k) &&
          !m.provider.toLowerCase().includes(k)
        ) {
          return false
        }
        return true
      })
    },

    /** 可用于比对的模型：已上线的大语言模型 */
    comparable(state) {
      return state.list.filter((m) => m.type === 'llm' && m.status === 'running')
    },
  },

  actions: {
    async fetchList() {
      this.listLoading = true
      try {
        const [list, stats] = await Promise.all([listModelsApi(), modelStatsApi()])
        this.list = list
        this.stats = stats
      } finally {
        this.listLoading = false
      }
    },

    setQuery(patch) {
      Object.assign(this.query, patch)
    },

    resetQuery() {
      this.query = { type: '', source: '', keyword: '', status: '' }
    },

    /** 打开模型详情抽屉 */
    openDetail(model) {
      this.current = model
      this.detailVisible = true
    },

    async create(data) {
      await createThirdPartyModelApi(data)
      await this.fetchList()
    },

    async remove(id) {
      await deleteModelApi(id)
      if (this.current?.id === id) this.detailVisible = false
      await this.fetchList()
    },

    /**
     * 服务上线 / 下线 / 重启
     * 注意：必须通过 reactive 数组取下标赋值，若持有 api 返回的原始对象改属性，
     * 会绕过 Proxy 导致视图不更新。
     */
    async operateService(id, action) {
      const result = await operateServiceApi(id, action)
      await this.fetchList()
      const idx = this.list.findIndex((m) => m.id === id)
      if (idx > -1) this.current = this.list[idx]
      return result
    },

    async switchVersion(id, version) {
      await switchVersionApi(id, version)
      await this.fetchList()
      const idx = this.list.findIndex((m) => m.id === id)
      if (idx > -1) this.current = this.list[idx]
    },

    async addVersion(id, payload) {
      await addVersionApi(id, payload)
      await this.fetchList()
      const idx = this.list.findIndex((m) => m.id === id)
      if (idx > -1) this.current = this.list[idx]
    },

    async updateTps(id, tps) {
      await updateTpsApi(id, tps)
      await this.fetchList()
      const idx = this.list.findIndex((m) => m.id === id)
      if (idx > -1) this.current = this.list[idx]
    },

    async evaluate(id, dims) {
      await evaluateModelApi(id, dims)
      await this.fetchList()
      const idx = this.list.findIndex((m) => m.id === id)
      if (idx > -1) this.current = this.list[idx]
    },

    /* ---------- 多模型同步比对测试 ---------- */

    /** @param {number[]} presetIds 从模型卡片进入时预选的模型 */
    openCompare(presetIds = []) {
      this.compare = { visible: true, question: '', running: false, presetIds, answers: [] }
    },

    /** 发起比对：每个模型一条回答，并行推流 */
    runCompare(question, models) {
      this.compare.question = question
      this.compare.answers = models.map(emptyAnswer)
      this.compare.running = true

      const { promise, stop } = compareModelsApi({
        question,
        models,
        onChunk: (modelId, text) => {
          const idx = this.compare.answers.findIndex((a) => a.modelId === modelId)
          // 通过数组下标赋值，保证响应式更新
          if (idx > -1) this.compare.answers[idx].content = text
        },
        onDone: (modelId, info) => {
          const idx = this.compare.answers.findIndex((a) => a.modelId === modelId)
          if (idx > -1) {
            this.compare.answers[idx].streaming = false
            this.compare.answers[idx].elapsed = info.elapsed
            this.compare.answers[idx].tokens = info.tokens
          }
        },
      })

      this._stopCompare = stop
      promise.finally(() => {
        this.compare.running = false
        this._stopCompare = null
      })
    },

    stopCompare() {
      this._stopCompare?.()
    },

    closeCompare() {
      this.stopCompare()
      this.compare.visible = false
      this.compare.running = false
    },

    /** 清空某条回答，便于单独重跑 */
    clearAnswer(modelId) {
      const idx = this.compare.answers.findIndex((a) => a.modelId === modelId)
      if (idx > -1) {
        this.compare.answers[idx].content = ''
        this.compare.answers[idx].elapsed = 0
        this.compare.answers[idx].tokens = 0
      }
    },
  },
})
