<template>
  <el-dialog
    v-model="visible"
    title="接入第三方模型"
    width="680px"
    :close-on-click-modal="false"
    @closed="handleClosed"
  >
    <el-alert type="info" :closable="false" class="access-tip">
      按标准 OpenAPI 规范接入，支持大语言模型、embedding 模型与 rerank 排序模型，
      显示名称可自定义。接入后服务默认为「未上线」，需手动上线后才会出现在智能体与知识库的可选模型中。
    </el-alert>

    <el-form ref="formRef" :model="form" :rules="rules" label-width="112px">
      <el-form-item label="模型类型" prop="type">
        <el-radio-group v-model="form.type">
          <el-radio-button v-for="t in MODEL_TYPES" :key="t.value" :value="t.value">
            {{ t.label }}
          </el-radio-button>
        </el-radio-group>
        <span class="form-hint">{{ typeDesc }}</span>
      </el-form-item>

      <el-form-item label="显示名称" prop="displayName">
        <el-input
          v-model.trim="form.displayName"
          placeholder="自定义名称，如：公司制度问答模型（SFT）"
          maxlength="30"
          show-word-limit
        />
        <span class="form-hint">展示在模型市场、智能体与知识库配置中，可任意自定义</span>
      </el-form-item>

      <el-form-item label="模型标识" prop="name">
        <el-input v-model.trim="form.name" placeholder="调用时传给接口的 model 字段，如 my-finetuned-llm" />
      </el-form-item>

      <el-form-item label="接口规范" prop="spec">
        <el-select v-model="form.spec" class="full-width">
          <el-option v-for="s in API_SPECS" :key="s.value" :label="s.label" :value="s.value" />
        </el-select>
      </el-form-item>

      <el-form-item label="接入协议" prop="protocol">
        <el-select v-model="form.protocol" class="full-width">
          <el-option v-for="p in PROTOCOLS" :key="p.value" :label="p.label" :value="p.value" />
        </el-select>
      </el-form-item>

      <el-form-item label="接口地址" prop="endpoint">
        <el-input v-model.trim="form.endpoint" placeholder="https://your-domain.com/v1/chat/completions" />
      </el-form-item>

      <el-form-item label="API Key" prop="apiKey">
        <el-input
          v-model.trim="form.apiKey"
          type="password"
          show-password
          placeholder="用于鉴权的密钥，至少 8 位"
        />
      </el-form-item>

      <el-form-item v-if="form.type === 'llm'" label="参数量">
        <el-input v-model.trim="form.size" placeholder="如 13B，不确定可留空" />
      </el-form-item>

      <el-form-item label="上下文长度">
        <el-input-number v-model="form.contextLength" :min="512" :max="1048576" :step="1024" />
        <span class="form-hint">单位：Token</span>
      </el-form-item>

      <el-form-item label="TPS 超分比例">
        <el-input-number v-model="form.tps" :min="0.5" :max="5" :step="0.5" :precision="1" />
        <span class="form-hint">超过 1 表示按比例提升并发处理能力，用于提高服务利用率</span>
      </el-form-item>
    </el-form>

    <!-- 连通性测试结果 -->
    <div v-if="testResult" class="test-result" :class="testResult.success ? 'is-ok' : 'is-fail'">
      <el-icon><component :is="testResult.success ? CircleCheck : CircleClose" /></el-icon>
      <span>{{ testResult.message }}</span>
      <span v-if="testResult.success" class="test-result__latency">
        响应耗时 {{ testResult.latency }} ms
      </span>
    </div>

    <template #footer>
      <el-button :loading="testing" @click="handleTest">连通性测试</el-button>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="handleSubmit">确认接入</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { CircleCheck, CircleClose } from '@element-plus/icons-vue'
import { MODEL_TYPES, PROTOCOLS, API_SPECS, testConnectionApi } from '../../../api/model'
import { useModelStore } from '../../../stores/model'

const store = useModelStore()

const visible = ref(false)
const saving = ref(false)
const testing = ref(false)
const testResult = ref(null)
const formRef = ref(null)

const emptyForm = () => ({
  type: 'llm',
  displayName: '',
  name: '',
  spec: 'openai',
  protocol: 'http',
  endpoint: '',
  apiKey: '',
  size: '',
  contextLength: 8192,
  tps: 1,
})

const form = reactive(emptyForm())

const rules = {
  type: [{ required: true, message: '请选择模型类型', trigger: 'change' }],
  displayName: [{ required: true, message: '请输入显示名称', trigger: 'blur' }],
  name: [
    { required: true, message: '请输入模型标识', trigger: 'blur' },
    {
      pattern: /^[a-zA-Z0-9._-]+$/,
      message: '模型标识仅支持字母、数字、点、下划线与短横线',
      trigger: 'blur',
    },
  ],
  endpoint: [
    { required: true, message: '请输入接口地址', trigger: 'blur' },
    {
      pattern: /^https?:\/\/.+/i,
      message: '接口地址需以 http:// 或 https:// 开头',
      trigger: 'blur',
    },
  ],
  apiKey: [
    { required: true, message: '请输入 API Key', trigger: 'blur' },
    { min: 8, message: 'API Key 长度不少于 8 位', trigger: 'blur' },
  ],
}

const typeDesc = computed(
  () => MODEL_TYPES.find((t) => t.value === form.type)?.desc || ''
)

function open() {
  Object.assign(form, emptyForm())
  testResult.value = null
  visible.value = true
}

// 地址或密钥改动后，上一次的测试结论不再可信，清除以免误导
watch([() => form.endpoint, () => form.apiKey], () => {
  testResult.value = null
})

async function handleTest() {
  try {
    await formRef.value.validateField(['endpoint', 'apiKey'])
  } catch {
    return
  }
  testing.value = true
  try {
    testResult.value = await testConnectionApi({ endpoint: form.endpoint, apiKey: form.apiKey })
  } finally {
    testing.value = false
  }
}

async function handleSubmit() {
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  saving.value = true
  try {
    await store.create({ ...form })
    ElMessage.success(`模型「${form.displayName}」接入成功，请上线后使用`)
    visible.value = false
  } catch (err) {
    ElMessage.error(err.message || '接入失败，请重试')
  } finally {
    saving.value = false
  }
}

function handleClosed() {
  formRef.value?.resetFields()
  testResult.value = null
}

defineExpose({ open })
</script>

<style scoped>
.full-width {
  width: 100%;
}

.access-tip {
  margin-bottom: 18px;
}

.form-hint {
  display: block;
  font-size: 12px;
  line-height: 1.5;
  color: #a0aec0;
}

.test-result {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 4px 112px;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 12.5px;
}

.test-result.is-ok {
  color: #047857;
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
}

.test-result.is-fail {
  color: #b91c1c;
  background: #fef2f2;
  border: 1px solid #fecaca;
}

.test-result__latency {
  margin-left: auto;
  color: #059669;
}
</style>
