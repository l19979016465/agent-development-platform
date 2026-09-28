<template>
  <div class="model-market">
    <!-- 概览 -->
    <div class="stats">
      <div class="stat">
        <span class="stat__value">{{ stats?.total ?? '-' }}</span>
        <span class="stat__label">模型总数</span>
      </div>
      <div class="stat">
        <span class="stat__value">{{ stats?.preset ?? '-' }}</span>
        <span class="stat__label">平台预置</span>
      </div>
      <div class="stat">
        <span class="stat__value stat__value--accent">{{ stats?.thirdparty ?? '-' }}</span>
        <span class="stat__label">第三方接入</span>
      </div>
      <div class="stat">
        <span class="stat__value stat__value--ok">{{ stats?.running ?? '-' }}</span>
        <span class="stat__label">服务运行中</span>
      </div>
      <div class="stat stat--wide">
        <span class="stat__value">{{ formatCalls(stats?.calls) }}</span>
        <span class="stat__label">累计调用次数</span>
      </div>
    </div>

    <!-- 筛选栏 -->
    <div class="toolbar">
      <el-radio-group v-model="store.query.type" class="toolbar__types">
        <el-radio-button value="">全部</el-radio-button>
        <el-radio-button v-for="t in MODEL_TYPES" :key="t.value" :value="t.value">
          {{ t.label }}
        </el-radio-button>
      </el-radio-group>

      <el-select v-model="store.query.source" placeholder="全部来源" clearable class="toolbar__select">
        <el-option label="平台预置" value="preset" />
        <el-option label="第三方接入" value="thirdparty" />
      </el-select>

      <el-select v-model="store.query.status" placeholder="全部状态" clearable class="toolbar__select">
        <el-option label="服务运行中" value="running" />
        <el-option label="未上线" value="offline" />
        <el-option label="接入异常" value="error" />
      </el-select>

      <el-input
        v-model="store.query.keyword"
        placeholder="搜索模型名称或提供方"
        :prefix-icon="Search"
        clearable
        class="toolbar__search"
      />

      <el-button v-if="hasQuery" link type="primary" @click="store.resetQuery()">重置</el-button>

      <span class="toolbar__spacer"></span>

      <el-button :icon="DataAnalysis" @click="store.openCompare()">模型比对</el-button>
      <el-button type="primary" :icon="Plus" @click="accessRef.open()">接入第三方模型</el-button>
    </div>

    <p class="result-count">
      共 <b>{{ store.filtered.length }}</b> 个模型
      <template v-if="activeTypeDesc"> · {{ activeTypeDesc }}</template>
    </p>

    <!-- 模型网格 -->
    <div v-loading="store.listLoading" class="model-grid-wrap">
      <div v-if="store.filtered.length" class="model-grid">
        <ModelCard
          v-for="m in store.filtered"
          :key="m.id"
          :model="m"
          @detail="openDetail"
          @compare="openCompareWith"
          @operate="handleOperate"
        />
      </div>
      <el-empty v-else description="没有符合条件的模型" :image-size="100" />
    </div>

    <ModelAccessDialog ref="accessRef" />
    <ModelDetailDrawer ref="detailRef" />
    <ModelCompareDialog />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search, DataAnalysis } from '@element-plus/icons-vue'

import ModelCard from './components/ModelCard.vue'
import ModelAccessDialog from './components/ModelAccessDialog.vue'
import ModelDetailDrawer from './components/ModelDetailDrawer.vue'
import ModelCompareDialog from './components/ModelCompareDialog.vue'
import { useModelStore } from '../../stores/model'
import { MODEL_TYPES } from '../../api/model'

const store = useModelStore()

const accessRef = ref(null)
const detailRef = ref(null)

onMounted(() => store.fetchList())

// 筛选条件直接读写 store.query，不再在组件里存一份，
// 避免离开页面再回来时本地控件显示「全部」而 store 里仍是旧条件，
// 导致列表被静默过滤成空。

const stats = computed(() => store.stats)

const activeTypeDesc = computed(
  () => MODEL_TYPES.find((t) => t.value === store.query.type)?.desc || ''
)

const hasQuery = computed(() =>
  Boolean(store.query.type || store.query.source || store.query.status || store.query.keyword)
)

function formatCalls(n) {
  if (!n) return '-'
  return n >= 10000 ? `${(n / 10000).toFixed(1)} 万` : n.toLocaleString('zh-CN')
}

function openDetail(model) {
  store.openDetail(model)
  detailRef.value?.open()
}

function openCompareWith(model) {
  store.openCompare([model.id])
}

async function handleOperate(model, action) {
  const label = action === 'online' ? '上线' : '下线'
  if (action === 'offline') {
    try {
      await ElMessageBox.confirm(
        `下线后「${model.displayName}」将不再出现在智能体与知识库的可选模型中，确定下线吗？`,
        '服务下线确认',
        { confirmButtonText: '确定下线', cancelButtonText: '取消', type: 'warning' }
      )
    } catch {
      return
    }
  }
  try {
    const { message } = await store.operateService(model.id, action)
    ElMessage.success(message)
  } catch (err) {
    ElMessage.error(err.message || `${label}失败`)
  }
}
</script>

<style scoped>
.model-market {
  max-width: 1200px;
  margin: 0 auto;
}

/* ---------- 概览 ---------- */
.stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr) 1.4fr;
  gap: 12px;
  margin-bottom: 16px;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 15px 18px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid #eef0f4;
}

.stat__value {
  font-size: 22px;
  font-weight: 700;
  color: #1e293b;
  line-height: 1.1;
}

.stat__value--accent {
  color: #6366f1;
}

.stat__value--ok {
  color: #10b981;
}

.stat__label {
  font-size: 12px;
  color: #94a3b8;
}

/* ---------- 筛选栏 ---------- */
.toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 14px 16px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid #eef0f4;
}

.toolbar__types {
  flex-wrap: wrap;
}

.toolbar__select {
  width: 132px;
}

.toolbar__search {
  width: 210px;
}

.toolbar__spacer {
  flex: 1;
  min-width: 0;
}

.result-count {
  margin: 14px 0 12px;
  padding-left: 4px;
  font-size: 13px;
  color: #94a3b8;
}

.result-count b {
  color: #6366f1;
  font-size: 15px;
  margin: 0 2px;
}

/* ---------- 网格 ---------- */
.model-grid-wrap {
  min-height: 220px;
}

.model-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 14px;
}

@media (max-width: 900px) {
  .stats {
    grid-template-columns: repeat(2, 1fr);
  }

  .toolbar__search,
  .toolbar__select {
    width: 100%;
  }

  .toolbar__spacer {
    display: none;
  }
}
</style>
