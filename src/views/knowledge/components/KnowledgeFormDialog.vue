<template>
  <el-dialog
    v-model="visible"
    title="新建知识库"
    width="560px"
    :close-on-click-modal="false"
    @closed="handleClosed"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="96px">
      <el-form-item label="知识库名称" prop="name">
        <el-input v-model.trim="form.name" placeholder="如：公司制度知识库" maxlength="30" show-word-limit />
      </el-form-item>

      <el-form-item label="所属群组" prop="group">
        <el-select v-model="form.group" placeholder="请选择群组" class="full-width">
          <el-option v-for="g in KB_GROUPS" :key="g" :label="g" :value="g" />
        </el-select>
      </el-form-item>

      <el-form-item label="向量模型" prop="vectorModel">
        <el-select v-model="form.vectorModel" placeholder="请选择向量模型" class="full-width">
          <el-option v-for="m in vectorModels" :key="m.value" :label="m.label" :value="m.value" />
        </el-select>
        <span class="form-hint">用于将文档切片转换为向量，创建后不建议修改</span>
      </el-form-item>

      <el-form-item label="切片策略" prop="chunkStrategy">
        <el-radio-group v-model="form.chunkStrategy">
          <el-radio v-for="s in CHUNK_STRATEGIES" :key="s.value" :value="s.value">
            {{ s.label }}
          </el-radio>
        </el-radio-group>
        <span class="form-hint">默认切分按语义段落自动切分；自定义切片可配置分隔符与长度</span>
      </el-form-item>

      <el-form-item label="描述" prop="description">
        <el-input
          v-model.trim="form.description"
          type="textarea"
          :rows="2"
          maxlength="100"
          show-word-limit
          placeholder="说明该知识库收录的内容与用途"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="handleSubmit">确认创建</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { KB_GROUPS, CHUNK_STRATEGIES } from '../../../api/knowledge'
import { embeddingOptions } from '../../../api/model'
import { useKnowledgeStore } from '../../../stores/knowledge'

const store = useKnowledgeStore()

const visible = ref(false)
const saving = ref(false)
const formRef = ref(null)

/** 可选的向量模型来自「模型市场」中已上线的向量模型，打开弹窗时实时获取 */
const vectorModels = ref([])

const emptyForm = () => ({
  name: '',
  group: '综合管理',
  vectorModel: 'bge-large-zh',
  chunkStrategy: 'auto',
  description: '',
})

const form = reactive(emptyForm())

const rules = {
  name: [{ required: true, message: '请输入知识库名称', trigger: 'blur' }],
  group: [{ required: true, message: '请选择群组', trigger: 'change' }],
  vectorModel: [{ required: true, message: '请选择向量模型', trigger: 'change' }],
  description: [{ required: true, message: '请输入描述', trigger: 'blur' }],
}

function open() {
  Object.assign(form, emptyForm())
  vectorModels.value = embeddingOptions()
  // 默认选中第一个可用模型，避免默认值恰好已被下线
  form.vectorModel = vectorModels.value[0]?.value || ''
  visible.value = true
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
    ElMessage.success('知识库创建成功')
    visible.value = false
  } catch (err) {
    ElMessage.error(err.message || '创建失败，请重试')
  } finally {
    saving.value = false
  }
}

function handleClosed() {
  formRef.value?.resetFields()
}

defineExpose({ open })
</script>

<style scoped>
.full-width {
  width: 100%;
}

.form-hint {
  display: block;
  font-size: 12px;
  line-height: 1.5;
  color: #a0aec0;
}
</style>
