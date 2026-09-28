<template>
  <div class="model-card" :class="{ 'is-offline': model.status !== 'running' }">
    <!-- 头部：提供方 + 名称 + 来源 -->
    <div class="model-card__head">
      <span class="model-card__logo" :style="{ background: typeColor.bg, color: typeColor.fg }">
        {{ model.displayName.slice(0, 1) }}
      </span>
      <div class="model-card__title">
        <div class="model-card__name" :title="model.displayName">{{ model.displayName }}</div>
        <div class="model-card__sub">{{ model.provider }} · {{ typeLabel }}</div>
      </div>
      <el-tag :type="sourceTag.type" size="small" effect="plain">{{ sourceTag.label }}</el-tag>
    </div>

    <!-- 状态 -->
    <div class="model-card__status">
      <span class="dot" :class="`dot--${model.status}`"></span>
      <span class="model-card__status-text">{{ statusTag.label }}</span>
      <span class="model-card__calls">累计调用 {{ formatNumber(model.calls) }}</span>
    </div>

    <!-- 关键参数 -->
    <div class="model-card__specs">
      <div class="spec">
        <span class="spec__label">参数量</span>
        <span class="spec__value">{{ model.size }}</span>
      </div>
      <div class="spec">
        <span class="spec__label">上下文</span>
        <span class="spec__value">{{ formatContext(model.contextLength) }}</span>
      </div>
      <div class="spec">
        <span class="spec__label">版本</span>
        <span class="spec__value">{{ currentVersion }}</span>
      </div>
    </div>

    <!-- 操作 -->
    <div class="model-card__foot">
      <el-button
        v-if="model.type === 'llm' && model.status === 'running'"
        link
        type="primary"
        size="small"
        :icon="DataAnalysis"
        @click="$emit('compare', model)"
      >
        比对测试
      </el-button>
      <el-button
        v-if="model.status === 'running'"
        link
        type="warning"
        size="small"
        @click="$emit('operate', model, 'offline')"
      >
        服务下线
      </el-button>
      <el-button
        v-else
        link
        type="success"
        size="small"
        @click="$emit('operate', model, 'online')"
      >
        服务上线
      </el-button>
      <span class="model-card__spacer"></span>
      <el-button link size="small" @click="$emit('detail', model)">详情 →</el-button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { DataAnalysis } from '@element-plus/icons-vue'
import { MODEL_TYPES, SERVICE_STATUS, SOURCES } from '../../../api/model'

const props = defineProps({
  model: { type: Object, required: true },
})

defineEmits(['detail', 'compare', 'operate'])

const TYPE_COLORS = {
  llm: { bg: '#eef2ff', fg: '#6366f1' },
  embedding: { bg: '#ecfdf5', fg: '#10b981' },
  rerank: { bg: '#fffbeb', fg: '#f59e0b' },
}

const typeColor = computed(() => TYPE_COLORS[props.model.type] || TYPE_COLORS.llm)
const typeLabel = computed(
  () => MODEL_TYPES.find((t) => t.value === props.model.type)?.label || props.model.type
)
const statusTag = computed(() => SERVICE_STATUS[props.model.status] || SERVICE_STATUS.offline)
const sourceTag = computed(() => SOURCES[props.model.source] || SOURCES.preset)
const currentVersion = computed(
  () => props.model.versions?.find((v) => v.current)?.version || '-'
)

function formatNumber(n) {
  return n >= 10000 ? `${(n / 10000).toFixed(1)} 万` : n.toLocaleString('zh-CN')
}

function formatContext(n) {
  return n >= 1024 ? `${Math.round(n / 1024)}K` : String(n)
}
</script>

<style scoped>
.model-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 18px 18px 12px;
  border-radius: 14px;
  background: #fff;
  border: 1px solid #eef0f4;
  transition: box-shadow 0.2s, transform 0.2s, border-color 0.2s;
}

.model-card:hover {
  border-color: #c7d2fe;
  box-shadow: 0 8px 22px rgba(99, 102, 241, 0.09);
  transform: translateY(-2px);
}

.model-card.is-offline {
  background: #fcfcfd;
}

/* ---------- 头部 ---------- */
.model-card__head {
  display: flex;
  align-items: flex-start;
  gap: 11px;
}

.model-card__logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: 11px;
  font-size: 17px;
  font-weight: 600;
}

.model-card__title {
  flex: 1;
  min-width: 0;
}

.model-card__name {
  font-size: 14.5px;
  font-weight: 600;
  color: #1e293b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.model-card__sub {
  margin-top: 3px;
  font-size: 12px;
  color: #94a3b8;
}

/* ---------- 状态 ---------- */
.model-card__status {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12.5px;
  color: #64748b;
}

.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.dot--running {
  background: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
}

.dot--offline {
  background: #cbd5e1;
}

.dot--error {
  background: #ef4444;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);
}

.model-card__calls {
  margin-left: auto;
  font-size: 11.5px;
  color: #a0aec0;
}

/* ---------- 参数 ---------- */
.model-card__specs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  padding: 11px 0;
  border-top: 1px dashed #f1f5f9;
  border-bottom: 1px dashed #f1f5f9;
}

.spec {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.spec__label {
  font-size: 11.5px;
  color: #a0aec0;
}

.spec__value {
  font-size: 13px;
  font-weight: 600;
  color: #475569;
}

/* ---------- 操作 ---------- */
.model-card__foot {
  display: flex;
  align-items: center;
  gap: 2px;
}

.model-card__spacer {
  flex: 1;
}
</style>
