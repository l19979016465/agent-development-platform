<template>
  <el-drawer
    v-model="visible"
    :title="model?.displayName || '模型详情'"
    size="560px"
    @closed="handleClosed"
  >
    <template v-if="model">
      <!-- 概要 -->
      <div class="summary">
        <div class="summary__row">
          <el-tag :type="sourceTag.type" size="small" effect="plain">{{ sourceTag.label }}</el-tag>
          <el-tag size="small" :color="typeColor.bg" class="type-tag">{{ typeLabel }}</el-tag>
          <span class="dot" :class="`dot--${model.status}`"></span>
          <span class="summary__status">{{ statusTag.label }}</span>
        </div>
        <p class="summary__calls">
          累计调用 <b>{{ model.calls.toLocaleString('zh-CN') }}</b> 次 ·
          最近更新 {{ formatDate(model.updatedAt) }}
        </p>
      </div>

      <!-- 基本信息 -->
      <h4 class="section-title">基本信息</h4>
      <el-descriptions :column="2" border size="small">
        <el-descriptions-item label="模型标识">{{ model.name }}</el-descriptions-item>
        <el-descriptions-item label="提供方">{{ model.provider }}</el-descriptions-item>
        <el-descriptions-item label="参数量">{{ model.size }}</el-descriptions-item>
        <el-descriptions-item label="上下文长度">{{ model.contextLength }} Token</el-descriptions-item>
        <el-descriptions-item label="当前版本">{{ currentVersion }}</el-descriptions-item>
        <el-descriptions-item label="模型类型">{{ typeLabel }}</el-descriptions-item>
      </el-descriptions>

      <!-- 接入配置（第三方） -->
      <template v-if="model.source === 'thirdparty'">
        <h4 class="section-title">接入配置</h4>
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="接口地址">
            <span class="mono">{{ model.endpoint }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="接入协议">{{ protocolLabel }}</el-descriptions-item>
          <el-descriptions-item label="接口规范">{{ specLabel }}</el-descriptions-item>
        </el-descriptions>
      </template>

      <!-- 服务管理 -->
      <h4 class="section-title">服务管理</h4>
      <div class="service-box">
        <div class="service-box__ops">
          <el-button
            v-if="model.status !== 'running'"
            type="success"
            size="small"
            :icon="VideoPlay"
            :loading="acting === 'online'"
            @click="operate('online')"
          >
            服务上线
          </el-button>
          <el-button
            v-else
            type="warning"
            size="small"
            :icon="VideoPause"
            :loading="acting === 'offline'"
            @click="operate('offline')"
          >
            服务下线
          </el-button>
          <el-button
            size="small"
            :icon="RefreshRight"
            :loading="acting === 'restart'"
            @click="operate('restart')"
          >
            重启服务
          </el-button>
        </div>

        <div class="tps-row">
          <span class="tps-row__label">TPS 超分比例</span>
          <el-slider
            v-model="tps"
            :min="0.5"
            :max="5"
            :step="0.5"
            class="tps-row__slider"
            @change="saveTps"
          />
          <span class="tps-row__value">{{ tps.toFixed(1) }}</span>
        </div>
        <p class="hint">比例大于 1 表示按倍数提升并发处理能力，用于提高服务利用率。</p>
      </div>

      <!-- 版本管理 -->
      <h4 class="section-title">
        版本管理
        <el-button link type="primary" size="small" :icon="Plus" @click="versionDialog = true">
          新增版本
        </el-button>
      </h4>
      <div class="version-list">
        <div
          v-for="v in model.versions"
          :key="v.version"
          class="version-item"
          :class="{ 'is-current': v.current }"
        >
          <div class="version-item__main">
            <b>{{ v.version }}</b>
            <el-tag v-if="v.current" type="success" size="small" effect="light">当前版本</el-tag>
            <span class="version-item__date">{{ formatDate(v.releasedAt) }}</span>
          </div>
          <p class="version-item__note">{{ v.note }}</p>
          <el-button
            v-if="!v.current"
            link
            type="primary"
            size="small"
            :loading="switching === v.version"
            @click="switchVersion(v.version)"
          >
            切换到此版本
          </el-button>
        </div>
      </div>

      <!-- 评估指标 -->
      <template v-if="model.type === 'llm'">
        <h4 class="section-title">
          评估指标
          <span class="section-title__hint">人工评估维度最多 5 个</span>
        </h4>
        <div class="eval-box">
          <div class="eval-auto">
            <span class="eval-auto__label">自动规则评估得分</span>
            <span class="eval-auto__score">{{ model.evalScore ? model.evalScore.toFixed(1) : '—' }}</span>
            <span class="eval-auto__unit">/ 100</span>
          </div>

          <div class="eval-dims">
            <div v-for="(d, i) in dims" :key="i" class="eval-dim">
              <el-input
                v-model.trim="d.name"
                size="small"
                placeholder="维度名称"
                class="eval-dim__name"
              />
              <el-rate v-model="d.score" :max="5" allow-half size="small" />
              <el-button
                link
                type="danger"
                size="small"
                :icon="Delete"
                :disabled="dims.length <= 1"
                @click="dims.splice(i, 1)"
              />
            </div>
            <el-button
              link
              type="primary"
              size="small"
              :icon="Plus"
              :disabled="dims.length >= 5"
              @click="dims.push({ name: '', score: 4 })"
            >
              添加评估维度
            </el-button>
          </div>

          <div class="eval-summary">
            <div class="eval-summary__item">
              <span class="eval-summary__label">平均分</span>
              <b>{{ humanAvg }}</b>
            </div>
            <div class="eval-summary__item">
              <span class="eval-summary__label">正向示例占比</span>
              <b>{{ model.humanEval.positive }}%</b>
            </div>
            <el-button
              type="primary"
              size="small"
              :loading="savingEval"
              @click="saveEval"
            >
              保存评估结果
            </el-button>
          </div>
        </div>
      </template>
    </template>

    <!-- 新增版本 -->
    <el-dialog v-model="versionDialog" title="新增模型版本" width="440px" append-to-body>
      <el-form label-width="80px">
        <el-form-item label="版本号">
          <el-input v-model.trim="newVersion.version" placeholder="如 v2.2" />
        </el-form-item>
        <el-form-item label="版本说明">
          <el-input v-model.trim="newVersion.note" type="textarea" :rows="2" placeholder="本次版本的主要变更" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="versionDialog = false">取消</el-button>
        <el-button type="primary" :loading="addingVersion" @click="submitVersion">确认新增</el-button>
      </template>
    </el-dialog>
  </el-drawer>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Delete, VideoPlay, VideoPause, RefreshRight } from '@element-plus/icons-vue'
import { MODEL_TYPES, PROTOCOLS, API_SPECS, SERVICE_STATUS, SOURCES } from '../../../api/model'
import { useModelStore } from '../../../stores/model'

const store = useModelStore()

const visible = ref(false)
const acting = ref('')
const switching = ref('')
const savingEval = ref(false)
const versionDialog = ref(false)
const addingVersion = ref(false)

const tps = ref(1)
const dims = ref([])
const newVersion = reactive({ version: '', note: '' })

/** 直接取 store 中的当前模型，保证服务操作后抽屉内容同步刷新 */
const model = computed(() => store.current)

const typeColor = computed(() => {
  const map = { llm: '#eef2ff', embedding: '#ecfdf5', rerank: '#fffbeb' }
  return { bg: map[model.value?.type] || '#eef2ff' }
})
const typeLabel = computed(
  () => MODEL_TYPES.find((t) => t.value === model.value?.type)?.label || '-'
)
const statusTag = computed(() => SERVICE_STATUS[model.value?.status] || SERVICE_STATUS.offline)
const sourceTag = computed(() => SOURCES[model.value?.source] || SOURCES.preset)
const protocolLabel = computed(
  () => PROTOCOLS.find((p) => p.value === model.value?.protocol)?.label || '-'
)
const specLabel = computed(
  () => API_SPECS.find((s) => s.value === model.value?.spec)?.label || '-'
)
const currentVersion = computed(
  () => model.value?.versions?.find((v) => v.current)?.version || '-'
)
const humanAvg = computed(() => {
  if (!dims.value.length) return '—'
  const avg = dims.value.reduce((s, d) => s + d.score, 0) / dims.value.length
  return avg.toFixed(2)
})

// 抽屉打开或模型数据刷新时，同步本地编辑态
watch(
  [() => store.detailVisible, model],
  () => {
    if (!model.value) return
    tps.value = model.value.tps
    dims.value = (model.value.humanEval?.dims || []).map((d) => ({ ...d }))
    if (!dims.value.length && model.value.type === 'llm') {
      dims.value = [
        { name: '准确性', score: 4 },
        { name: '完整性', score: 4 },
      ]
    }
  },
  { immediate: true }
)

watch(
  () => store.detailVisible,
  (v) => {
    visible.value = v
  }
)

function open() {
  visible.value = true
}

function handleClosed() {
  store.detailVisible = false
}

function formatDate(ts) {
  const diff = Date.now() - ts
  const day = 24 * 3600 * 1000
  if (diff < 3600 * 1000) return `${Math.max(1, Math.floor(diff / 60000))} 分钟前`
  if (diff < day) return `${Math.floor(diff / 3600000)} 小时前`
  if (diff < 30 * day) return `${Math.floor(diff / day)} 天前`
  return new Date(ts).toLocaleDateString('zh-CN')
}

async function operate(action) {
  acting.value = action
  try {
    const { message } = await store.operateService(model.value.id, action)
    ElMessage.success(message)
  } catch (err) {
    ElMessage.error(err.message || '操作失败')
  } finally {
    acting.value = ''
  }
}

async function saveTps() {
  await store.updateTps(model.value.id, tps.value)
  ElMessage.success('TPS 超分比例已更新')
}

async function switchVersion(version) {
  switching.value = version
  try {
    await store.switchVersion(model.value.id, version)
    ElMessage.success(`已切换到 ${version} 并重新上线`)
  } finally {
    switching.value = ''
  }
}

async function submitVersion() {
  if (!newVersion.version) {
    ElMessage.warning('请输入版本号')
    return
  }
  addingVersion.value = true
  try {
    await store.addVersion(model.value.id, { ...newVersion })
    ElMessage.success('版本已新增')
    versionDialog.value = false
    newVersion.version = ''
    newVersion.note = ''
  } catch (err) {
    ElMessage.error(err.message || '新增失败')
  } finally {
    addingVersion.value = false
  }
}

async function saveEval() {
  if (dims.value.some((d) => !d.name)) {
    ElMessage.warning('请填写完整的维度名称')
    return
  }
  savingEval.value = true
  try {
    await store.evaluate(model.value.id, dims.value.map((d) => ({ ...d })))
    ElMessage.success('评估结果已保存')
  } finally {
    savingEval.value = false
  }
}

defineExpose({ open })
</script>

<style scoped>
.summary {
  padding: 14px 16px;
  border-radius: 10px;
  background: #fafbfc;
  border: 1px solid #f1f5f9;
}

.summary__row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.type-tag {
  border: none;
  color: #475569;
}

.summary__status {
  font-size: 12.5px;
  color: #64748b;
}

.summary__calls {
  margin: 10px 0 0;
  font-size: 12.5px;
  color: #94a3b8;
}

.summary__calls b {
  color: #6366f1;
}

.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
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

.section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 22px 0 10px;
  font-size: 13.5px;
  font-weight: 600;
  color: #1e293b;
}

.section-title__hint {
  font-size: 11.5px;
  font-weight: 400;
  color: #a0aec0;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  word-break: break-all;
}

/* ---------- 服务管理 ---------- */
.service-box {
  padding: 14px 16px;
  border-radius: 10px;
  background: #fafbfc;
  border: 1px solid #f1f5f9;
}

.service-box__ops {
  display: flex;
  gap: 8px;
}

.tps-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
}

.tps-row__label {
  font-size: 12.5px;
  color: #64748b;
  white-space: nowrap;
}

.tps-row__slider {
  flex: 1;
}

.tps-row__value {
  width: 34px;
  font-size: 13px;
  font-weight: 600;
  color: #6366f1;
}

.hint {
  margin: 6px 0 0;
  font-size: 11.5px;
  line-height: 1.5;
  color: #a0aec0;
}

/* ---------- 版本 ---------- */
.version-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.version-item {
  padding: 11px 14px;
  border-radius: 9px;
  border: 1px solid #eef0f4;
  background: #fff;
}

.version-item.is-current {
  border-color: #a7f3d0;
  background: #f6fefa;
}

.version-item__main {
  display: flex;
  align-items: center;
  gap: 9px;
}

.version-item__main b {
  font-size: 13.5px;
  color: #1e293b;
}

.version-item__date {
  margin-left: auto;
  font-size: 11.5px;
  color: #a0aec0;
}

.version-item__note {
  margin: 6px 0 0;
  font-size: 12.5px;
  line-height: 1.6;
  color: #64748b;
}

/* ---------- 评估 ---------- */
.eval-box {
  padding: 14px 16px;
  border-radius: 10px;
  background: #fafbfc;
  border: 1px solid #f1f5f9;
}

.eval-auto {
  display: flex;
  align-items: baseline;
  gap: 6px;
  padding-bottom: 12px;
  border-bottom: 1px dashed #e9edf3;
}

.eval-auto__label {
  font-size: 12.5px;
  color: #64748b;
}

.eval-auto__score {
  margin-left: auto;
  font-size: 19px;
  font-weight: 700;
  color: #6366f1;
}

.eval-auto__unit {
  font-size: 11.5px;
  color: #a0aec0;
}

.eval-dims {
  display: flex;
  flex-direction: column;
  gap: 9px;
  padding: 12px 0;
}

.eval-dim {
  display: flex;
  align-items: center;
  gap: 10px;
}

.eval-dim__name {
  width: 120px;
}

.eval-summary {
  display: flex;
  align-items: center;
  gap: 22px;
  padding-top: 12px;
  border-top: 1px dashed #e9edf3;
}

.eval-summary__item {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.eval-summary__label {
  font-size: 11.5px;
  color: #a0aec0;
}

.eval-summary__item b {
  font-size: 16px;
  color: #1e293b;
}

.eval-summary .el-button {
  margin-left: auto;
}
</style>
