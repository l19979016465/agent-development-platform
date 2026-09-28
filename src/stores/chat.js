import { defineStore } from 'pinia'
import { useAgentStore } from './agent'
import { streamChatApi } from '../api/chat'
import { modelLabel } from '../api/model'

let messageId = 0
const nextId = () => ++messageId

export const useChatStore = defineStore('chat', {
  state: () => ({
    /** 当前选中的智能体 id */
    activeAgentId: null,
    /** 各智能体的独立会话：{ [agentId]: Message[] } */
    conversations: {},
    /** 是否正在生成回复 */
    sending: false,
    /** 当前流式请求的控制器 */
    controller: null,
  }),

  getters: {
    activeAgent(state) {
      const agentStore = useAgentStore()
      return agentStore.all.find((a) => a.id === state.activeAgentId) || null
    },

    /** 当前会话的消息列表 */
    messages(state) {
      return state.conversations[state.activeAgentId] || []
    },

    /** 当前会话的用户提问轮次 */
    roundCount(state) {
      return (state.conversations[state.activeAgentId] || []).filter((m) => m.role === 'user').length
    },
  },

  actions: {
    /** 切换要调试的智能体；若该智能体还没有会话则自动生成欢迎语 */
    setActiveAgent(agentId) {
      this.stopGenerating()
      this.activeAgentId = agentId
      if (!this.conversations[agentId]) {
        const agentStore = useAgentStore()
        const agent = agentStore.all.find((a) => a.id === agentId)
        const baseModel = modelLabel(agent?.model)
        this.conversations[agentId] = [
          {
            id: nextId(),
            role: 'assistant',
            content: agent
              ? `你好，我是「${agent.name}」。${agent.description}\n\n已加载基座模型 ${baseModel}，创造性参数 ${agent.temperature}。有什么可以帮你的吗？`
              : '你好，有什么可以帮你的吗？',
            time: Date.now(),
            welcome: true,
          },
        ]
      }
    },

    /** 发送一条消息并接收流式回复 */
    async send(text) {
      const content = text.trim()
      if (!content || this.sending || !this.activeAgentId) return

      const agentId = this.activeAgentId
      const list = this.conversations[agentId]

      list.push({ id: nextId(), role: 'user', content, time: Date.now() })
      list.push({ id: nextId(), role: 'assistant', content: '', time: Date.now(), streaming: true })

      // 注意：必须通过 reactive 数组取下标赋值（list[idx].xxx = ...），
      // 若持有 push 进去的原始对象再改属性，会绕过 Proxy，视图不会更新。
      const replyIndex = list.length - 1
      this.sending = true

      const { promise, stop } = streamChatApi({
        agent: this.activeAgent,
        question: content,
        onChunk: (partial) => {
          list[replyIndex].content = partial
        },
      })
      this.controller = { stop }

      try {
        await promise
      } finally {
        list[replyIndex].streaming = false
        list[replyIndex].time = Date.now()
        this.sending = false
        this.controller = null
      }
    },

    /** 中断当前生成 */
    stopGenerating() {
      if (this.controller) {
        this.controller.stop()
        this.controller = null
      }
      this.sending = false
    },

    /** 清空当前智能体的会话（保留欢迎语） */
    clearConversation() {
      this.stopGenerating()
      const agentId = this.activeAgentId
      if (!agentId) return
      delete this.conversations[agentId]
      this.setActiveAgent(agentId)
    },
  },
})
