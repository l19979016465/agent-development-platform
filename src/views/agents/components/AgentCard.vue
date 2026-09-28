<template>
  <div class="agent-card">
    <div class="agent-card__head">
      <span class="agent-card__avatar">{{ agent.avatar }}</span>
      <div class="agent-card__title">
        <b :title="agent.name">{{ agent.name }}</b>
        <span class="agent-card__meta">{{ agent.category }}</span>
      </div>
      <el-tag :type="status.type" size="small" effect="light" round>
        {{ status.label }}
      </el-tag>
    </div>

    <p class="agent-card__desc">{{ agent.description || '暂无描述' }}</p>

    <div class="agent-card__tags">
      <el-tag size="small" type="info" effect="plain">{{ modelLabel }}</el-tag>
      <el-tag size="small" effect="plain">温度 {{ agent.temperature }}</el-tag>
    </div>

    <div class="agent-card__stats">
      <span><el-icon><ChatDotRound /></el-icon> {{ agent.conversations }} 次对话</span>
      <span><el-icon><Clock /></el-icon> {{ updatedText }}</span>
    </div>

    <div class="agent-card__actions">
      <el-button
        type="primary"
        size="small"
        :icon="EditPen"
        @click="$emit('edit', agent)"
      >
        编辑
      </el-button>
      <el-button size="small" :icon="ChatLineSquare" @click="$emit('debug', agent)">
        调试
      </el-button>

      <el-dropdown trigger="click" @command="onCommand">
        <el-button size="small" :icon="MoreFilled" class="more-btn" />
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="toggle">
              {{ agent.status === 'published' ? '下线' : '发布' }}
            </el-dropdown-item>
            <el-dropdown-item command="copy">复制</el-dropdown-item>
            <el-dropdown-item command="delete" divided>删除</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { EditPen, ChatLineSquare, MoreFilled, ChatDotRound, Clock } from '@element-plus/icons-vue'
import { MODEL_OPTIONS, STATUS_MAP } from '../../../api/agent'

const props = defineProps({
  agent: { type: Object, required: true },
})

const emit = defineEmits(['edit', 'debug', 'toggle', 'copy', 'delete'])

const status = computed(() => STATUS_MAP[props.agent.status] || STATUS_MAP.draft)

const modelLabel = computed(
  () => MODEL_OPTIONS.find((m) => m.value === props.agent.model)?.label || props.agent.model
)

/** 相对时间展示 */
const updatedText = computed(() => {
  const diff = Date.now() - props.agent.updatedAt
  const day = 24 * 60 * 60 * 1000
  if (diff < 60 * 60 * 1000) return '刚刚更新'
  if (diff < day) return `${Math.floor(diff / 3600000)} 小时前`
  if (diff < 30 * day) return `${Math.floor(diff / day)} 天前`
  return new Date(props.agent.updatedAt).toLocaleDateString('zh-CN')
})

function onCommand(command) {
  emit(command, props.agent)
}
</script>

<style scoped>
.agent-card {
  display: flex;
  flex-direction: column;
  padding: 18px 20px;
  border-radius: 14px;
  background: #fff;
  border: 1px solid #eef0f4;
  transition: all 0.25s ease;
}

.agent-card:hover {
  transform: translateY(-4px);
  border-color: #c7d2fe;
  box-shadow: 0 12px 28px rgba(99, 102, 241, 0.14);
}

.agent-card__head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.agent-card__avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: 12px;
  font-size: 22px;
  background: linear-gradient(135deg, #eef2ff, #f3e8ff);
}

.agent-card__title {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.agent-card__title b {
  font-size: 15.5px;
  color: #1e293b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agent-card__meta {
  font-size: 12px;
  color: #94a3b8;
}

.agent-card__desc {
  margin: 14px 0 12px;
  font-size: 12.5px;
  line-height: 1.65;
  color: #64748b;
  height: 42px;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
}

.agent-card__tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.agent-card__stats {
  display: flex;
  justify-content: space-between;
  margin: 14px 0;
  padding-top: 12px;
  font-size: 12px;
  color: #94a3b8;
  border-top: 1px dashed #eef0f4;
}

.agent-card__stats span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.agent-card__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: auto;
}

.more-btn {
  padding: 8px 10px;
}
</style>
