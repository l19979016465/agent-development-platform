<template>
  <div class="message" :class="`message--${message.role}`">
    <span class="message__avatar">{{ isUser ? userChar : agentEmoji }}</span>

    <div class="message__body">
      <div class="message__meta">
        <b>{{ isUser ? '我' : agentName }}</b>
        <span>{{ timeText }}</span>
      </div>

      <div class="message__bubble">
        <span class="message__text">{{ message.content }}</span>
        <span v-if="message.streaming" class="message__cursor" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  message: { type: Object, required: true },
  agent: { type: Object, default: null },
  userChar: { type: String, default: '我' },
})

const isUser = computed(() => props.message.role === 'user')
const agentName = computed(() => props.agent?.name || '智能体')
const agentEmoji = computed(() => props.agent?.avatar || '🤖')

const timeText = computed(() =>
  new Date(props.message.time).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  })
)
</script>

<style scoped>
.message {
  display: flex;
  gap: 12px;
  margin-bottom: 22px;
}

.message--user {
  flex-direction: row-reverse;
}

.message__avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  font-size: 17px;
  border-radius: 10px;
  background: linear-gradient(135deg, #eef2ff, #f3e8ff);
}

.message--user .message__avatar {
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
}

.message__body {
  max-width: 76%;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.message--user .message__body {
  align-items: flex-end;
}

.message__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #94a3b8;
}

.message__meta b {
  font-size: 12.5px;
  color: #64748b;
}

.message__bubble {
  padding: 11px 15px;
  border-radius: 12px;
  font-size: 13.5px;
  line-height: 1.75;
  background: #fff;
  border: 1px solid #eef0f4;
  color: #334155;
  word-break: break-word;
}

.message--assistant .message__bubble {
  border-top-left-radius: 3px;
}

.message--user .message__bubble {
  border-top-right-radius: 3px;
  color: #fff;
  border: none;
  background: linear-gradient(120deg, #6366f1, #8b5cf6);
}

.message__text {
  white-space: pre-wrap;
}

/* 流式输出光标 */
.message__cursor {
  display: inline-block;
  width: 7px;
  height: 14px;
  margin-left: 3px;
  vertical-align: -2px;
  background: #6366f1;
  animation: blink 0.9s steps(2, start) infinite;
}

@keyframes blink {
  to {
    visibility: hidden;
  }
}
</style>
