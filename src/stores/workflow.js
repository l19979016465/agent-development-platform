import { defineStore } from 'pinia'
import {
  listWorkflowsApi,
  getWorkflowApi,
  createWorkflowApi,
  updateWorkflowApi,
  deleteWorkflowApi,
  duplicateWorkflowApi,
  publishWorkflowApi,
  saveCanvasApi,
  runWorkflowApi,
  connectMcpServerApi,
  nodeMeta,
} from '../api/workflow'

let nodeSeq = 0
const nextNodeId = () => `n${Date.now().toString(36)}${++nodeSeq}`

export const useWorkflowStore = defineStore('workflow', {
  state: () => ({
    /** 工作流列表 */
    list: [],
    listLoading: false,

    /** 当前编辑的工作流（元信息） */
    current: null,
    /** 画布上的节点与连线，编辑期间的唯一数据源 */
    nodes: [],
    edges: [],
    selectedNodeId: null,
    /** 画布是否有未保存的改动 */
    dirty: false,
    saving: false,

    /** 试运行 */
    run: {
      running: false,
      /** 已执行完的节点轨迹 */
      trace: [],
      /** 当前正在执行的节点 id */
      activeNodeId: null,
      result: null,
      error: '',
    },

    /** MCP Server 的连接状态，按节点 id 记录 */
    mcpState: {},
  }),

  getters: {
    selectedNode: (state) => state.nodes.find((n) => n.id === state.selectedNodeId) || null,

    /** 已执行完的节点 id 集合，用于画布上标记执行状态 */
    doneNodeIds: (state) => state.run.trace.map((t) => t.nodeId),

    traceOf: (state) => (nodeId) => state.run.trace.find((t) => t.nodeId === nodeId) || null,
  },

  actions: {
    async fetchList() {
      this.listLoading = true
      try {
        this.list = await listWorkflowsApi()
      } finally {
        this.listLoading = false
      }
    },

    async create(data) {
      const flow = await createWorkflowApi(data)
      await this.fetchList()
      return flow
    },

    async update(id, data) {
      await updateWorkflowApi(id, data)
      await this.fetchList()
    },

    async remove(id) {
      await deleteWorkflowApi(id)
      await this.fetchList()
    },

    async duplicate(id) {
      await duplicateWorkflowApi(id)
      await this.fetchList()
    },

    async publish(id, payload) {
      await publishWorkflowApi(id, payload)
      await this.fetchList()
    },

    /* ---------- 画布 ---------- */

    /** 进入编排页：把工作流内容复制一份到画布状态，避免直接改动列表里的对象 */
    async openEditor(id) {
      const flow = await getWorkflowApi(id)
      this.current = flow
      this.nodes = flow.nodes.map((n) => ({ ...n, config: { ...n.config } }))
      this.edges = flow.edges.map((e) => ({ ...e }))
      this.selectedNodeId = null
      this.dirty = false
      this.resetRun()
      this.mcpState = {}
    },

    /**
     * 在指定位置新增节点
     * 开始节点全局只能有一个，重复添加时返回 null。
     */
    addNode(type, x, y) {
      const meta = nodeMeta(type)
      if (!meta) return null
      if (type === 'start' && this.nodes.some((n) => n.type === 'start')) return null

      const config = {}
      meta.fields.forEach((f) => {
        config[f.key] = Array.isArray(f.default) ? JSON.parse(JSON.stringify(f.default)) : f.default
      })

      const newNode = { id: nextNodeId(), type, name: meta.label, x, y, config }
      this.nodes.push(newNode)
      this.selectedNodeId = newNode.id
      this.dirty = true
      return newNode
    },

    moveNode(id, x, y) {
      // 通过数组下标赋值，保证响应式更新
      const idx = this.nodes.findIndex((n) => n.id === id)
      if (idx === -1) return
      this.nodes[idx].x = x
      this.nodes[idx].y = y
      this.dirty = true
    },

    removeNode(id) {
      this.nodes = this.nodes.filter((n) => n.id !== id)
      this.edges = this.edges.filter((e) => e.from !== id && e.to !== id)
      if (this.selectedNodeId === id) this.selectedNodeId = null
      delete this.mcpState[id]
      this.dirty = true
    },

    selectNode(id) {
      this.selectedNodeId = id
    },

    renameNode(id, name) {
      const idx = this.nodes.findIndex((n) => n.id === id)
      if (idx === -1) return
      this.nodes[idx].name = name
      this.dirty = true
    },

    updateNodeConfig(id, patch) {
      const idx = this.nodes.findIndex((n) => n.id === id)
      if (idx === -1) return
      Object.assign(this.nodes[idx].config, patch)
      this.dirty = true
    },

    /**
     * 连线
     * 自连、重复连线、形成环路的连线都会被拒绝，返回 false。
     * @param {number} fromPort 从源节点的第几个输出端口拉出（多分支节点用）
     */
    connect(from, to, fromPort = 0) {
      if (from === to) return false
      if (this.edges.some((e) => e.from === from && e.to === to)) return false
      if (this.reaches(to, from)) return false // 会形成环

      const target = this.nodes.find((n) => n.id === to)
      const meta = nodeMeta(target?.type)
      if (meta?.inputs === 0) return false // 开始节点不能作为终点

      this.edges.push({ from, to, fromPort })
      this.dirty = true
      return true
    },

    removeEdge(from, to) {
      this.edges = this.edges.filter((e) => !(e.from === from && e.to === to))
      this.dirty = true
    },

    /** 从 start 出发能否到达 target，用于连线时的环路判断 */
    reaches(start, target) {
      const seen = new Set()
      const stack = [start]
      while (stack.length) {
        const id = stack.pop()
        if (id === target) return true
        if (seen.has(id)) continue
        seen.add(id)
        this.edges.filter((e) => e.from === id).forEach((e) => stack.push(e.to))
      }
      return false
    },

    async save() {
      this.saving = true
      try {
        const result = await saveCanvasApi(this.current.id, { nodes: this.nodes, edges: this.edges })
        // 只更新元信息，画布状态保持原样（重新拉取会丢掉当前的选中与平移缩放）
        if (result?.updatedAt) this.current = { ...this.current, updatedAt: result.updatedAt }
        this.dirty = false
      } finally {
        this.saving = false
      }
    },

    /* ---------- MCP Server ---------- */

    async connectMcp(nodeId, { serverUrl, transport }) {
      this.mcpState[nodeId] = { loading: true, result: null }
      try {
        const result = await connectMcpServerApi({ serverUrl, transport })
        this.mcpState[nodeId] = { loading: false, result }
        if (result.success) {
          // 保留已有工具的勾选状态，新拉取到的工具默认不启用
          const prev = this.selectedNode?.config?.tools || []
          const tools = result.tools.map((t) => ({
            ...t,
            enabled: prev.find((p) => p.name === t.name)?.enabled ?? false,
          }))
          this.updateNodeConfig(nodeId, { tools })
        }
        return result
      } finally {
        if (this.mcpState[nodeId]) this.mcpState[nodeId].loading = false
      }
    },

    /* ---------- 试运行 ---------- */

    resetRun() {
      this.run = { running: false, trace: [], activeNodeId: null, result: null, error: '' }
    },

    /**
     * 按拓扑序执行工作流
     * 每个节点执行完成后写入 trace，用于在画布上标记执行状态。
     */
    runFlow(inputs = {}) {
      this.resetRun()
      this.run.running = true

      const { promise, stop } = runWorkflowApi({
        nodes: this.nodes,
        edges: this.edges,
        inputs,
        onNodeDone: (entry, index) => {
          // trace 既驱动试运行面板的执行轨迹，也是画布上「已完成」标记的来源
          this.run.trace.push(entry)
          const nextId = this.runNextAfter(entry.nodeId, index)
          this.run.activeNodeId = nextId
        },
      })

      this._stopRun = stop
      return promise
        .then((result) => {
          this.run.result = result
          this.run.activeNodeId = null
          return result
        })
        .catch((err) => {
          this.run.error = err.message || '运行失败'
          throw err
        })
        .finally(() => {
          this.run.running = false
          this._stopRun = null
        })
    },

    /** trace 里最后一个节点的下一个节点，作为「正在执行」的高亮目标 */
    runNextAfter(nodeId, index) {
      const order = this.topologicalIds()
      return order[index + 1] || null
    },

    /** 当前画布的拓扑序（供高亮用） */
    topologicalIds() {
      const indegree = {}
      const adj = {}
      this.nodes.forEach((n) => {
        indegree[n.id] = 0
        adj[n.id] = []
      })
      this.edges.forEach((e) => {
        if (adj[e.from] === undefined || indegree[e.to] === undefined) return
        adj[e.from].push(e.to)
        indegree[e.to]++
      })
      const queue = this.nodes.filter((n) => indegree[n.id] === 0).map((n) => n.id)
      const order = []
      while (queue.length) {
        const id = queue.shift()
        order.push(id)
        adj[id].forEach((next) => {
          if (--indegree[next] === 0) queue.push(next)
        })
      }
      return order.length === this.nodes.length ? order : []
    },

    stopRun() {
      this._stopRun?.()
      this.run.running = false
      this.run.activeNodeId = null
    },
  },
})
