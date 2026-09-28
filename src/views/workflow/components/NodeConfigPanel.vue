<template>
  <div class="config-panel">
    <template v-if="node">
      <!-- 节点标识 -->
      <div class="config-panel__head">
        <span class="config-panel__icon" :style="{ color: meta.color, background: `${meta.color}14` }">
          <el-icon :size="16"><component :is="iconOf(meta.icon)" /></el-icon>
        </span>
        <div class="config-panel__title">
          <el-input
            v-model.trim="nodeName"
            size="small"
            maxlength="20"
            @change="applyName"
          />
          <span class="config-panel__type">{{ meta.label }} · {{ meta.desc }}</span>
        </div>
      </div>

      <div class="config-panel__body">
        <el-form label-position="top" size="small">
          <el-form-item v-for="f in meta.fields" :key="f.key" :label="f.label">
            <!-- 文本 -->
            <el-input
              v-if="f.type === 'input'"
              v-model="config[f.key]"
              :placeholder="f.placeholder"
              @input="onFieldChange(f.key, $event)"
            />

            <!-- 多行文本 / 代码 -->
            <el-input
              v-else-if="f.type === 'textarea' || f.type === 'code'"
              v-model="config[f.key]"
              type="textarea"
              :rows="f.type === 'code' ? 6 : 4"
              :class="{ 'is-code': f.type === 'code' }"
              @input="onFieldChange(f.key, $event)"
            />

            <!-- 下拉 -->
            <el-select
              v-else-if="f.type === 'select'"
              v-model="config[f.key]"
              class="full-width"
              @change="onFieldChange(f.key, $event)"
            >
              <el-option v-for="o in f.options" :key="o.value" :label="o.label" :value="o.value" />
            </el-select>

            <!-- 大模型（来自模型市场） -->
            <el-select
              v-else-if="f.type === 'model'"
              v-model="config[f.key]"
              class="full-width"
              placeholder="请选择模型"
              @change="onFieldChange(f.key, $event)"
            >
              <el-option v-for="m in models" :key="m.value" :label="m.label" :value="m.value" />
              <template #empty>
                <p class="empty-tip">暂无已上线的模型，请先到「模型市场」上线模型</p>
              </template>
            </el-select>

            <!-- 知识库（多选） -->
            <el-select
              v-else-if="f.type === 'knowledge'"
              v-model="config[f.key]"
              multiple
              collapse-tags
              collapse-tags-tooltip
              class="full-width"
              placeholder="选择知识库"
              @change="onFieldChange(f.key, $event)"
            >
              <el-option v-for="kb in knowledgeBases" :key="kb.id" :label="kb.name" :value="kb.id" />
            </el-select>

            <!-- 智能体 -->
            <el-select
              v-else-if="f.type === 'agent'"
              v-model="config[f.key]"
              class="full-width"
              placeholder="选择已发布的智能体"
              @change="onFieldChange(f.key, $event)"
            >
              <el-option v-for="a in agents" :key="a.id" :label="a.name" :value="a.id" />
              <template #empty>
                <p class="empty-tip">暂无已发布的智能体</p>
              </template>
            </el-select>

            <!-- 数值 -->
            <el-input-number
              v-else-if="f.type === 'number'"
              v-model="config[f.key]"
              :min="f.min ?? 0"
              :max="f.max ?? 9999"
              class="full-width"
              @change="onFieldChange(f.key, $event)"
            />

            <!-- 滑块 -->
            <div v-else-if="f.type === 'slider'" class="slider-row">
              <el-slider
                v-model="config[f.key]"
                :min="0"
                :max="1"
                :step="0.05"
                @change="onFieldChange(f.key, $event)"
              />
              <span class="slider-row__value">{{ Number(config[f.key]).toFixed(2) }}</span>
            </div>

            <!-- 变量列表 -->
            <div v-else-if="f.type === 'variables'" class="var-list">
              <div v-for="(v, i) in config[f.key]" :key="i" class="var-item">
                <el-input v-model="v.name" placeholder="名称" size="small" @input="touch" />
                <el-input v-model="v.desc" placeholder="说明" size="small" @input="touch" />
                <el-button
                  link
                  type="danger"
                  size="small"
                  :icon="Delete"
                  :disabled="config[f.key].length <= 1"
                  @click="removeVar(f.key, i)"
                />
              </div>
              <el-button link type="primary" size="small" :icon="Plus" @click="addVar(f.key)">
                添加一项
              </el-button>
            </div>

            <!-- MCP 工具列表 -->
            <div v-else-if="f.type === 'tools'" class="tools">
              <el-button
                size="small"
                :icon="Connection"
                :loading="mcpLoading"
                :disabled="!config.serverUrl"
                class="full-width"
                @click="handleConnectMcp"
              >
                连接并获取工具
              </el-button>

              <div v-if="mcpResult" class="tools__result" :class="mcpResult.success ? 'is-ok' : 'is-fail'">
                <el-icon><component :is="mcpResult.success ? CircleCheck : CircleClose" /></el-icon>
                <span>{{ mcpResult.message }}</span>
              </div>

              <div v-if="config[f.key]?.length" class="tools__list">
                <el-checkbox
                  v-for="t in config[f.key]"
                  :key="t.name"
                  v-model="t.enabled"
                  @change="touch"
                >
                  <span class="tools__name">{{ t.name }}</span>
                  <span class="tools__desc">{{ t.desc }}</span>
                </el-checkbox>
              </div>
              <p v-else class="hint">尚未获取到工具，请先填写 Server 地址并点击上方按钮</p>
            </div>

            <span v-if="f.hint" class="form-hint">{{ f.hint }}</span>
          </el-form-item>
        </el-form>
      </div>
    </template>

    <el-empty v-else description="选中画布上的节点以编辑配置" :image-size="80" />
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Delete, Connection, CircleCheck, CircleClose } from '@element-plus/icons-vue'
import { nodeMeta } from '../../../api/workflow'
import { llmOptions } from '../../../api/model'
import { listKnowledgeBasesApi } from '../../../api/knowledge'
import { useWorkflowStore } from '../../../stores/workflow'
import { useAgentStore } from '../../../stores/agent'
import { iconOf } from '../icons'

const store = useWorkflowStore()
const agentStore = useAgentStore()

const node = computed(() => store.selectedNode)
const meta = computed(() => nodeMeta(node.value?.type) || { fields: [] })
const config = computed(() => node.value?.config || {})

const nodeName = ref('')
const models = ref([])
const knowledgeBases = ref([])

const agents = computed(() => agentStore.all.filter((a) => a.status === 'published'))

const mcpLoading = computed(() => {
  const id = node.value?.id
  return id ? !!store.mcpState[id]?.loading : false
})
const mcpResult = computed(() => {
  const id = node.value?.id
  return id ? store.mcpState[id]?.result || null : null
})

// 切换选中节点时刷新节点名与可选模型
watch(
  node,
  (n) => {
    nodeName.value = n?.name || ''
    models.value = llmOptions()
  },
  { immediate: true }
)

onMounted(async () => {
  if (!agentStore.all.length) await agentStore.fetchAll()
  try {
    knowledgeBases.value = await listKnowledgeBasesApi()
  } catch {
    knowledgeBases.value = []
  }
})

function applyName() {
  if (!node.value) return
  if (!nodeName.value) {
    nodeName.value = node.value.name
    return
  }
  store.renameNode(node.value.id, nodeName.value)
}

function onFieldChange(key, value) {
  store.updateNodeConfig(node.value.id, { [key]: value })
}

/** 变量列表与工具勾选是直接改对象内部的，统一用一个空操作触发脏标记 */
function touch() {
  store.updateNodeConfig(node.value.id, {})
}

function addVar(key) {
  config.value[key].push({ name: '', desc: '' })
  touch()
}

function removeVar(key, index) {
  config.value[key].splice(index, 1)
  touch()
}

async function handleConnectMcp() {
  const result = await store.connectMcp(node.value.id, {
    serverUrl: config.value.serverUrl,
    transport: config.value.transport,
  })
  if (result.success) {
    ElMessage.success(`已获取 ${result.tools.length} 个工具`)
  } else {
    ElMessage.error(result.message)
  }
}
</script>

<style scoped>
.config-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  border-radius: 12px;
  background: #fff;
  border: 1px solid #eef0f4;
  overflow: hidden;
}

.config-panel__head {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 14px;
  border-bottom: 1px solid #f1f5f9;
  background: #fcfcfd;
}

.config-panel__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  border-radius: 8px;
}

.config-panel__title {
  flex: 1;
  min-width: 0;
}

.config-panel__type {
  display: block;
  margin-top: 4px;
  font-size: 11.5px;
  color: #a0aec0;
}

.config-panel__body {
  flex: 1;
  overflow-y: auto;
  padding: 14px 14px 20px;
}

.full-width {
  width: 100%;
}

.form-hint {
  display: block;
  margin-top: 4px;
  font-size: 11.5px;
  line-height: 1.55;
  color: #a0aec0;
}

.hint {
  margin: 6px 0 0;
  font-size: 11.5px;
  color: #a0aec0;
}

.empty-tip {
  padding: 10px 14px;
  font-size: 12px;
  color: #a0aec0;
}

.slider-row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.slider-row .el-slider {
  flex: 1;
}

.slider-row__value {
  width: 36px;
  font-size: 12.5px;
  font-weight: 600;
  color: #6366f1;
}

/* ---------- 变量列表 ---------- */
.var-list {
  display: flex;
  flex-direction: column;
  gap: 7px;
  width: 100%;
}

.var-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* ---------- MCP 工具 ---------- */
.tools {
  width: 100%;
}

.tools__result {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: 9px;
  padding: 8px 11px;
  border-radius: 7px;
  font-size: 12px;
}

.tools__result.is-ok {
  color: #047857;
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
}

.tools__result.is-fail {
  color: #b91c1c;
  background: #fef2f2;
  border: 1px solid #fecaca;
}

.tools__list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 10px;
}

.tools__list .el-checkbox {
  height: auto;
  margin-right: 0;
  padding: 7px 10px;
  border-radius: 7px;
  background: #fafbfc;
  border: 1px solid #f1f5f9;
}

.tools__name {
  font-size: 12.5px;
  color: #334155;
}

.tools__desc {
  display: block;
  font-size: 11px;
  color: #a0aec0;
}

:deep(.is-code .el-textarea__inner) {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  line-height: 1.65;
}
</style>
