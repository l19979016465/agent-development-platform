<template>
  <el-dialog
    v-model="visible"
    title="多模型同步比对测试"
    width="min(1120px, 94vw)"
    top="6vh"
    :close-on-click-modal="false"
    @closed="handleClosed"
  >
    <!-- 测试条件 -->
    <div class="compare-bar">
      <el-select
        v-model="selectedIds"
        multiple
        collapse-tags
        collapse-tags-tooltip
        :multiple-limit="4"
        placeholder="选择 2~4 个已上线的大语言模型"
        class="compare-bar__models"
      >
        <el-option
          v-for="m in store.comparable"
          :key="m.id"
          :label="m.displayName"
          :value="m.id"
        />
      </el-select>

      <el-input
        v-model="question"
        placeholder="输入同一个问题，观察各模型的回答差异，如：出差住宿标准是多少"
        clearable
        @keyup.enter="handleRun"
      />

      <el-button v-if="running" type="danger" plain :icon="VideoPause" @click="store.stopCompare()">
        停止
      </el-button>
      <el-button v-else type="primary" :icon="VideoPlay" @click="handleRun">开始比对</el-button>
    </div>

    <p class="compare-hint">
      多个模型同时接收同一问题并流式返回，可对比回答内容、响应速度与 Token 消耗。
    </p>

    <!-- 并排结果 -->
    <div v-if="answers.length" class="compare-grid" :style="{ '--cols': answers.length }">
      <div v-for="a in answers" :key="a.modelId" class="compare-col">
        <div class="compare-col__head">
          <span class="compare-col__name" :title="a.displayName">{{ a.displayName }}</span>
          <el-tag v-if="a.streaming" type="warning" size="small" effect="light">生成中</el-tag>
          <el-tag v-else type="success" size="small" effect="light">已完成</el-tag>
        </div>
        <div class="compare-col__provider">{{ a.provider }}</div>

        <div class="compare-col__body">
          <p class="compare-col__text">{{ a.content }}<span v-if="a.streaming" class="cursor"></span></p>
        </div>

        <div class="compare-col__foot">
          <span>耗时 <b>{{ a.elapsed }}</b> ms</span>
          <span>Token <b>{{ a.tokens }}</b></span>
        </div>
      </div>
    </div>

    <el-empty
      v-else
      description="选择模型并输入问题后点击「开始比对」，可并排查看多个模型的回答"
      :image-size="80"
    />

    <template #footer>
      <el-button @click="visible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { VideoPlay, VideoPause } from '@element-plus/icons-vue'
import { useModelStore } from '../../../stores/model'

const store = useModelStore()

const selectedIds = ref([])
const question = ref('出差住宿标准是多少')

const visible = computed({
  get: () => store.compare.visible,
  set: (v) => {
    store.compare.visible = v
  },
})

const answers = computed(() => store.compare.answers)
const running = computed(() => store.compare.running)

/** 从列表页点某个模型的「比对测试」进入时，预选该模型 */
watch(
  () => store.compare.visible,
  (v) => {
    if (!v) return
    // store.openCompare 传入的预选模型放在 presetIds
    selectedIds.value = store.compare.presetIds?.length
      ? [...store.compare.presetIds]
      : store.comparable.slice(0, 3).map((m) => m.id)
  }
)

function handleRun() {
  if (selectedIds.value.length < 2) {
    ElMessage.warning('请至少选择 2 个模型才能进行比对')
    return
  }
  if (!question.value.trim()) {
    ElMessage.warning('请输入测试问题')
    return
  }
  const models = store.comparable.filter((m) => selectedIds.value.includes(m.id))
  store.runCompare(question.value.trim(), models)
}

function handleClosed() {
  store.closeCompare()
  selectedIds.value = []
}
</script>

<style scoped>
.compare-bar {
  display: flex;
  align-items: center;
  gap: 10px;
}

.compare-bar__models {
  width: 340px;
  flex-shrink: 0;
}

.compare-hint {
  margin: 10px 0 16px;
  font-size: 12px;
  color: #a0aec0;
}

.compare-grid {
  display: grid;
  grid-template-columns: repeat(var(--cols, 3), minmax(0, 1fr));
  gap: 12px;
}

.compare-col {
  display: flex;
  flex-direction: column;
  border-radius: 11px;
  border: 1px solid #eef0f4;
  background: #fff;
  overflow: hidden;
}

.compare-col__head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px 0;
}

.compare-col__name {
  flex: 1;
  min-width: 0;
  font-size: 13.5px;
  font-weight: 600;
  color: #1e293b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.compare-col__provider {
  padding: 3px 14px 10px;
  font-size: 11.5px;
  color: #a0aec0;
  border-bottom: 1px solid #f4f6f9;
}

.compare-col__body {
  flex: 1;
  min-height: 210px;
  max-height: 340px;
  overflow-y: auto;
  padding: 12px 14px;
}

.compare-col__text {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.75;
  color: #475569;
  white-space: pre-wrap;
  word-break: break-word;
}

.cursor {
  display: inline-block;
  width: 2px;
  height: 13px;
  margin-left: 2px;
  vertical-align: -2px;
  background: #6366f1;
  animation: blink 1s steps(2, start) infinite;
}

@keyframes blink {
  to {
    visibility: hidden;
  }
}

.compare-col__foot {
  display: flex;
  gap: 16px;
  padding: 10px 14px;
  border-top: 1px solid #f4f6f9;
  background: #fafbfc;
  font-size: 11.5px;
  color: #94a3b8;
}

.compare-col__foot b {
  color: #6366f1;
}
</style>
