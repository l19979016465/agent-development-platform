<template>
  <div class="chat-view">
    <!-- 左栏：智能体选择 -->
    <AgentSelector :active-id="chat.activeAgentId" @select="handleSelect" />

    <!-- 右栏：对话区 -->
    <div class="chat-panel">
      <template v-if="agent">
        <!-- 会话头部 -->
        <div class="chat-head">
          <span class="chat-head__avatar">{{ agent.avatar }}</span>
          <div class="chat-head__info">
            <div class="chat-head__name">
              <b>{{ agent.name }}</b>
              <el-tag :type="STATUS_MAP[agent.status].type" size="small" effect="light" round>
                {{ STATUS_MAP[agent.status].label }}
              </el-tag>
            </div>
            <span class="chat-head__meta">
              {{ baseModelLabel }} · 创造性 {{ agent.temperature }} · 已对话 {{ chat.roundCount }} 轮
            </span>
          </div>

          <el-popover placement="bottom-end" :width="320" trigger="click">
            <template #reference>
              <el-button size="small" :icon="Setting" circle />
            </template>
            <div class="prompt-view">
              <b>系统提示词</b>
              <p>{{ agent.systemPrompt || '（未设置）' }}</p>
            </div>
          </el-popover>

          <el-button size="small" :icon="Delete" @click="handleClear">清空对话</el-button>
        </div>

        <!-- 消息区 -->
        <div ref="scrollRef" class="chat-messages">
          <MessageBubble
            v-for="m in chat.messages"
            :key="m.id"
            :message="m"
            :agent="agent"
            :user-char="userChar"
          />
        </div>

        <!-- 推荐问题 -->
        <div v-if="chat.roundCount === 0" class="chat-suggests">
          <span class="chat-suggests__label">试试这样问：</span>
          <el-tag
            v-for="s in suggests"
            :key="s"
            class="suggest-tag"
            effect="plain"
            @click="handleSend(s)"
          >
            {{ s }}
          </el-tag>
        </div>

        <!-- 输入区 -->
        <div class="chat-input">
          <el-input
            v-model="draft"
            type="textarea"
            :rows="2"
            resize="none"
            placeholder="输入消息，Enter 发送，Shift + Enter 换行"
            :disabled="chat.sending"
            @keydown.enter.exact.prevent="handleSend()"
          />
          <div class="chat-input__actions">
            <span class="chat-input__hint">回复由模拟引擎生成，仅用于演示</span>
            <el-button v-if="chat.sending" :icon="VideoPause" @click="chat.stopGenerating()">
              停止生成
            </el-button>
            <el-button
              type="primary"
              :icon="Promotion"
              :disabled="!draft.trim() || chat.sending"
              @click="handleSend()"
            >
              发送
            </el-button>
          </div>
        </div>
      </template>

      <!-- 未选择智能体 -->
      <el-empty v-else description="请从左侧选择一个智能体开始调试" :image-size="110" class="chat-empty" />
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Setting, Delete, Promotion, VideoPause } from '@element-plus/icons-vue'

import AgentSelector from './components/AgentSelector.vue'
import MessageBubble from './components/MessageBubble.vue'
import { useAgentStore } from '../../stores/agent'
import { useChatStore } from '../../stores/chat'
import { useAuthStore } from '../../stores/auth'
import { STATUS_MAP } from '../../api/agent'
import { modelLabel } from '../../api/model'

const route = useRoute()
const agentStore = useAgentStore()
const chat = useChatStore()
const auth = useAuthStore()

const draft = ref('')
const scrollRef = ref(null)

const agent = computed(() => chat.activeAgent)
const userChar = computed(() => auth.displayName.charAt(0) || '我')
const baseModelLabel = computed(() => modelLabel(agent.value?.model))

/** 按智能体分类给出推荐提问 */
const suggests = computed(() => {
  const map = {
    客服问答: ['我想查一下订单进度', '退货需要什么条件？', '运费怎么计算？'],
    文档处理: ['报销流程是怎样的？', '年假可以提前多久申请？', '出差标准是多少？'],
    代码开发: ['帮我看看这段代码有什么问题', '这段逻辑怎么优化性能？', '如何补充异常处理？'],
    数据分析: ['分析一下近三个月的销售趋势', '哪个渠道的转化率最高？', '用户分层怎么划分？'],
    办公助手: ['帮我整理一下会议纪要', '把这段需求拆成用户故事', '生成一份周报大纲'],
  }
  return map[agent.value?.category] || ['你好，介绍一下你的能力', '你能帮我做什么？']
})

onMounted(async () => {
  await agentStore.fetchAll()
  // 支持从智能体管理页的「调试」按钮带参跳转
  const targetId = Number(route.query.agentId)
  const fallback = agentStore.all[0]?.id
  const id = agentStore.all.some((a) => a.id === targetId) ? targetId : fallback
  if (id) chat.setActiveAgent(id)
})

// 新消息到达时自动滚动到底部
watch(
  () => chat.messages.map((m) => m.content).join(''),
  () => nextTick(scrollToBottom)
)

watch(
  () => chat.activeAgentId,
  () => nextTick(scrollToBottom)
)

function scrollToBottom() {
  const el = scrollRef.value
  if (el) el.scrollTop = el.scrollHeight
}

function handleSelect(agentId) {
  if (agentId === chat.activeAgentId) return
  chat.setActiveAgent(agentId)
}

async function handleSend(preset) {
  const text = typeof preset === 'string' ? preset : draft.value
  if (!text.trim() || chat.sending) return
  draft.value = ''
  await chat.send(text)
}

async function handleClear() {
  try {
    await ElMessageBox.confirm('确定要清空当前会话吗？', '提示', {
      confirmButtonText: '清空',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }
  chat.clearConversation()
  ElMessage.success('会话已清空')
}
</script>

<style scoped>
.chat-view {
  display: flex;
  gap: 16px;
  height: calc(100vh - 108px);
  max-width: 1300px;
  margin: 0 auto;
}

/* ---------- 右侧对话面板 ---------- */
.chat-panel {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid #eef0f4;
  border-radius: 14px;
  overflow: hidden;
}

.chat-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  border-bottom: 1px solid #f1f5f9;
}

.chat-head__avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  font-size: 20px;
  border-radius: 11px;
  background: linear-gradient(135deg, #eef2ff, #f3e8ff);
}

.chat-head__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.chat-head__name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.chat-head__name b {
  font-size: 15px;
  color: #1e293b;
}

.chat-head__meta {
  font-size: 12px;
  color: #94a3b8;
}

.prompt-view b {
  font-size: 13px;
  color: #1e293b;
}

.prompt-view p {
  margin: 8px 0 0;
  font-size: 12.5px;
  line-height: 1.7;
  color: #64748b;
  white-space: pre-wrap;
}

/* ---------- 消息区 ---------- */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 22px 24px 8px;
  background: #fafbfc;
}

.chat-empty {
  margin: auto;
}

/* ---------- 推荐提问 ---------- */
.chat-suggests {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 24px 0;
}

.chat-suggests__label {
  font-size: 12.5px;
  color: #94a3b8;
}

.suggest-tag {
  cursor: pointer;
}

.suggest-tag:hover {
  color: #6366f1;
  border-color: #c7d2fe;
}

/* ---------- 输入区 ---------- */
.chat-input {
  padding: 14px 20px 16px;
  border-top: 1px solid #f1f5f9;
}

.chat-input__actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
}

.chat-input__hint {
  flex: 1;
  font-size: 11.5px;
  color: #cbd5e1;
}

@media (max-width: 900px) {
  .chat-view {
    flex-direction: column;
    height: auto;
  }

  .chat-panel {
    height: 70vh;
  }
}
</style>
