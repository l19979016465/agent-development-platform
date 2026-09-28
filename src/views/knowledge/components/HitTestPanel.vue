<template>
  <div class="hit-test">
    <!-- 检索条件 -->
    <div class="hit-test__form">
      <el-input
        v-model="query"
        placeholder="输入一个问题，测试知识库的检索效果，如：出差住宿标准是多少"
        :prefix-icon="Search"
        clearable
        @keyup.enter="handleSearch"
      />

      <div class="hit-test__params">
        <span class="param-label">召回数量</span>
        <el-slider v-model="topK" :min="1" :max="10" class="param-slider" />
        <span class="param-value">{{ topK }}</span>

        <span class="param-label">匹配分阈值</span>
        <el-slider v-model="threshold" :min="0" :max="0.9" :step="0.05" class="param-slider" />
        <span class="param-value">{{ threshold.toFixed(2) }}</span>

        <el-button type="primary" :icon="Search" :loading="loading" @click="handleSearch">
          检索
        </el-button>
      </div>
    </div>

    <!-- 结果 -->
    <div v-loading="loading" class="hit-test__result">
      <template v-if="result">
        <p class="hit-test__summary">
          命中 <b>{{ result.list.length }}</b> 条切片（候选 {{ result.total }} 条）
        </p>

        <div v-if="result.list.length" class="hit-list">
          <div v-for="(item, i) in result.list" :key="item.chunkId" class="hit-item">
            <div class="hit-item__head">
              <span class="hit-item__rank">{{ i + 1 }}</span>
              <span class="hit-item__doc">{{ item.docName }} · 切片 #{{ item.chunkIndex }}</span>
              <span class="hit-item__score" :style="{ color: scoreColor(item.score) }">
                {{ (item.score * 100).toFixed(1) }}%
              </span>
            </div>
            <p class="hit-item__text">{{ item.text }}</p>
            <el-button link type="primary" size="small" @click="$emit('locate', item)">
              查看原文位置
            </el-button>
          </div>
        </div>

        <el-empty v-else description="没有命中的切片，试试调低匹配分阈值或换个问法" :image-size="80" />
      </template>

      <el-empty v-else description="输入问题后点击「检索」，可查看知识库的召回效果" :image-size="90" />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Search } from '@element-plus/icons-vue'

defineProps({
  loading: { type: Boolean, default: false },
  result: { type: Object, default: null },
})

const emit = defineEmits(['search', 'locate'])

const query = ref('')
const topK = ref(5)
const threshold = ref(0)

function handleSearch() {
  const q = query.value.trim()
  if (!q) return
  emit('search', { query: q, topK: topK.value, threshold: threshold.value })
}

function scoreColor(score) {
  if (score >= 0.6) return '#10b981'
  if (score >= 0.35) return '#f59e0b'
  return '#94a3b8'
}
</script>

<style scoped>
.hit-test {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.hit-test__form {
  padding: 16px 18px;
  border-radius: 12px;
  background: #fafbfc;
  border: 1px solid #f1f5f9;
}

.hit-test__params {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 14px;
  flex-wrap: wrap;
}

.param-label {
  font-size: 12.5px;
  color: #64748b;
  white-space: nowrap;
}

.param-slider {
  width: 130px;
}

.param-value {
  width: 38px;
  font-size: 12.5px;
  font-weight: 600;
  color: #6366f1;
}

.hit-test__summary {
  margin: 0 0 14px;
  font-size: 13px;
  color: #94a3b8;
}

.hit-test__summary b {
  color: #6366f1;
  font-size: 15px;
  margin: 0 2px;
}

.hit-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.hit-item {
  padding: 13px 16px;
  border-radius: 10px;
  border: 1px solid #eef0f4;
  background: #fff;
  transition: border-color 0.2s;
}

.hit-item:hover {
  border-color: #c7d2fe;
}

.hit-item__head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.hit-item__rank {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  border-radius: 6px;
  font-size: 11.5px;
  font-weight: 600;
  color: #6366f1;
  background: #eef2ff;
}

.hit-item__doc {
  flex: 1;
  font-size: 12px;
  color: #94a3b8;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hit-item__score {
  font-size: 13.5px;
  font-weight: 600;
}

.hit-item__text {
  margin: 0 0 6px;
  font-size: 13px;
  line-height: 1.7;
  color: #475569;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
