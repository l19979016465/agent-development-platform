<template>
  <el-drawer
    v-model="visible"
    title="工作流试运行"
    size="520px"
    @closed="handleClosed"
  >
    <!-- 运行输入 -->
    <div class="run-input">
      <el-input
        v-model="query"
        type="textarea"
        :rows="2"
        placeholder="输入测试问题，如：出差住宿标准是多少"
      />
      <div class="run-input__ops">
        <el-button
          v-if="store.run.running"
          type="danger"
          plain
          :icon="VideoPause"
          @click="store.stopRun()"
        >
          停止运行
        </el-button>
        <el-button
          v-else
          type="primary"
          :icon="VideoPlay"
          :disabled="!store.nodes.length"
          @click="handleRun"
        >
          开始运行
        </el-button>
        <span class="run-input__hint">
          共 {{ store.nodes.length }} 个节点，按拓扑顺序依次执行
        </span>
      </div>
    </div>

    <el-alert v-if="store.run.error" type="error" :closable="false" class="run-error">
      {{ store.run.error }}
    </el-alert>

    <!-- 执行轨迹 -->
    <div v-if="store.run.trace.length" class="trace">
      <div class="trace__head">
        <span>执行轨迹</span>
        <span class="trace__count">已执行 {{ store.run.trace.length }} / {{ store.nodes.length }} 个节点</span>
      </div>

      <div
        v-for="(t, i) in store.run.trace"
        :key="t.nodeId"
        class="trace-item"
        :class="{ 'is-last': i === store.run.trace.length - 1 && store.run.running }"
      >
        <div class="trace-item__head">
          <span class="trace-item__index">{{ i + 1 }}</span>
          <span class="trace-item__name">{{ nameOf(t.nodeId) }}</span>
          <el-tag size="small" type="success" effect="light">成功</el-tag>
          <span class="trace-item__ms">{{ t.ms }} ms</span>
        </div>
        <p class="trace-item__output">{{ t.output }}</p>
        <el-button link type="primary" size="small" @click="focusNode(t.nodeId)">
          在画布中定位
        </el-button>
      </div>

      <div v-if="store.run.running" class="trace-running">
        <el-icon class="is-loading"><Loading /></el-icon>
        正在执行下一个节点…
      </div>
    </div>

    <el-empty
      v-else
      description="点击「开始运行」，可查看每个节点的执行过程与输出"
      :image-size="80"
    />

    <!-- 最终输出 -->
    <div v-if="store.run.result && !store.run.result.stopped" class="final">
      <h4>运行结果</h4>
      <div class="final__box">
        <p class="final__meta">
          共执行 {{ store.run.result.trace.length }} 个节点 · 总耗时 {{ store.run.result.elapsed }} ms
        </p>
        <p class="final__text">{{ finalOutput }}</p>
      </div>
    </div>
  </el-drawer>
</template>

<script setup>
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { VideoPlay, VideoPause, Loading } from '@element-plus/icons-vue'
import { useWorkflowStore } from '../../../stores/workflow'

const emit = defineEmits(['focus'])

const store = useWorkflowStore()

const visible = ref(false)
const query = ref('出差住宿标准是多少')

/** 取最后一个节点的输出作为最终结果 */
const finalOutput = computed(() => {
  const trace = store.run.result?.trace || []
  return trace.length ? trace[trace.length - 1].output : ''
})

function open() {
  visible.value = true
}

function nameOf(nodeId) {
  return store.nodes.find((n) => n.id === nodeId)?.name || nodeId
}

async function handleRun() {
  try {
    await store.runFlow({ query: query.value.trim() })
    ElMessage.success('运行完成')
  } catch (err) {
    ElMessage.error(err.message || '运行失败')
  }
}

function focusNode(nodeId) {
  store.selectNode(nodeId)
  emit('focus', nodeId)
}

function handleClosed() {
  store.stopRun()
}

defineExpose({ open })
</script>

<style scoped>
.run-input {
  padding: 14px 16px;
  border-radius: 11px;
  background: #fafbfc;
  border: 1px solid #f1f5f9;
}

.run-input__ops {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
}

.run-input__hint {
  font-size: 11.5px;
  color: #a0aec0;
}

.run-error {
  margin-top: 14px;
}

/* ---------- 轨迹 ---------- */
.trace {
  margin-top: 18px;
}

.trace__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 10px;
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
}

.trace__count {
  font-size: 11.5px;
  font-weight: 400;
  color: #a0aec0;
}

.trace-item {
  position: relative;
  padding: 12px 14px;
  margin-bottom: 9px;
  border-radius: 10px;
  border: 1px solid #eef0f4;
  background: #fff;
}

.trace-item.is-last {
  border-color: #fcd34d;
  background: #fffdf5;
}

.trace-item__head {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 8px;
}

.trace-item__index {
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

.trace-item__name {
  flex: 1;
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
}

.trace-item__ms {
  font-size: 11.5px;
  color: #a0aec0;
}

.trace-item__output {
  margin: 0 0 4px;
  font-size: 12.5px;
  line-height: 1.7;
  color: #475569;
  white-space: pre-wrap;
  word-break: break-word;
}

.trace-running {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 11px 14px;
  border-radius: 10px;
  border: 1px dashed #fcd34d;
  background: #fffdf5;
  font-size: 12.5px;
  color: #b45309;
}

/* ---------- 最终输出 ---------- */
.final {
  margin-top: 20px;
}

.final h4 {
  margin: 0 0 10px;
  font-size: 13.5px;
  color: #1e293b;
}

.final__box {
  padding: 14px 16px;
  border-radius: 11px;
  background: #f6fefa;
  border: 1px solid #a7f3d0;
}

.final__meta {
  margin: 0 0 9px;
  font-size: 11.5px;
  color: #059669;
}

.final__text {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.75;
  color: #334155;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
