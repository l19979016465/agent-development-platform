<template>
  <el-dialog
    v-model="visible"
    title="上传文档"
    width="640px"
    top="6vh"
    :close-on-click-modal="false"
    @closed="handleClosed"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="96px">
      <!-- 选择文件 -->
      <el-form-item label="选择文件">
        <el-upload
          ref="uploadRef"
          drag
          :auto-upload="false"
          :limit="1"
          :accept="acceptAttr"
          :on-change="handleFileChange"
          :on-remove="handleFileRemove"
          :on-exceed="handleExceed"
          class="uploader"
        >
          <el-icon class="uploader__icon"><UploadFilled /></el-icon>
          <div class="uploader__text">将文件拖到此处，或<em>点击选择</em></div>
          <template #tip>
            <div class="uploader__tip">
              支持 {{ SUPPORTED_EXT.join('、') }} 格式，单个文件不超过 50MB
            </div>
          </template>
        </el-upload>
      </el-form-item>

      <!-- 无文件时提供示例 -->
      <el-form-item v-if="!form.fileName" label=" ">
        <el-button link type="primary" :icon="Document" @click="useSample">
          没有现成文件？使用示例文档演示
        </el-button>
      </el-form-item>

      <el-form-item label="导入模板" prop="template">
        <el-select v-model="form.template" class="full-width">
          <el-option v-for="t in IMPORT_TEMPLATES" :key="t.value" :label="t.label" :value="t.value" />
        </el-select>
        <span class="form-hint">按模板导入可提升解析准确率（简历 / PPT / 论文 / 结构化问答对）</span>
      </el-form-item>

      <el-form-item label="文件标签">
        <el-select
          v-model="form.tags"
          multiple
          filterable
          allow-create
          default-first-option
          placeholder="输入标签后回车，便于后续检索与筛选"
          class="full-width"
        >
          <el-option v-for="t in PRESET_TAGS" :key="t" :label="t" :value="t" />
        </el-select>
      </el-form-item>

      <el-form-item label="解析策略">
        <el-checkbox-group v-model="form.policies">
          <el-checkbox v-for="p in PARSE_POLICIES" :key="p.key" :value="p.key">
            {{ p.label }}
          </el-checkbox>
        </el-checkbox-group>
        <span class="form-hint">按需开启文字提取、OCR、版面分析与图片解析</span>
      </el-form-item>

      <el-form-item label="切片策略">
        <el-radio-group v-model="form.chunkStrategy">
          <el-radio v-for="s in CHUNK_STRATEGIES" :key="s.value" :value="s.value">
            {{ s.label }}
          </el-radio>
        </el-radio-group>
      </el-form-item>

      <!-- 自定义切片参数 -->
      <template v-if="form.chunkStrategy === 'custom'">
        <el-form-item label="分隔符">
          <el-input v-model="form.separator" placeholder="默认为换行符" class="full-width" />
        </el-form-item>
        <el-form-item label="切片长度">
          <div class="param-row">
            <el-slider v-model="form.maxLength" :min="100" :max="1000" :step="50" class="param-slider" />
            <span class="param-value">{{ form.maxLength }} 字</span>
          </div>
        </el-form-item>
        <el-form-item label="重叠占比">
          <div class="param-row">
            <el-slider v-model="form.overlap" :min="0" :max="50" :step="5" class="param-slider" />
            <span class="param-value">{{ form.overlap }}%</span>
          </div>
        </el-form-item>
      </template>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="uploading" @click="handleSubmit">开始上传</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { UploadFilled, Document } from '@element-plus/icons-vue'
import {
  SUPPORTED_EXT,
  IMPORT_TEMPLATES,
  PARSE_POLICIES,
  CHUNK_STRATEGIES,
} from '../../../api/knowledge'
import { useKnowledgeStore } from '../../../stores/knowledge'

const PRESET_TAGS = ['制度', '财务', '技术', '产品', 'FAQ', '手册', '规范']

const store = useKnowledgeStore()

const visible = ref(false)
const uploading = ref(false)
const formRef = ref(null)
const uploadRef = ref(null)

const acceptAttr = SUPPORTED_EXT.map((e) => `.${e}`).join(',')

const emptyForm = () => ({
  fileName: '',
  ext: '',
  size: 0,
  template: 'general',
  tags: [],
  policies: PARSE_POLICIES.filter((p) => p.default).map((p) => p.key),
  chunkStrategy: 'auto',
  separator: '',
  maxLength: 500,
  overlap: 10,
})

const form = reactive(emptyForm())

const rules = {
  template: [{ required: true, message: '请选择导入模板', trigger: 'change' }],
}

function open() {
  Object.assign(form, emptyForm())
  visible.value = true
}

function handleFileChange(file) {
  const name = file.name
  const ext = name.split('.').pop().toLowerCase()
  if (!SUPPORTED_EXT.includes(ext)) {
    ElMessage.error(`不支持的文件格式：.${ext}`)
    uploadRef.value?.clearFiles()
    return
  }
  form.fileName = name
  form.ext = ext
  form.size = file.size || 0
}

function handleFileRemove() {
  form.fileName = ''
  form.ext = ''
  form.size = 0
}

function handleExceed() {
  ElMessage.warning('一次只能上传一个文件，请先移除已选文件')
}

/** 无文件时用示例文档演示 */
function useSample() {
  form.fileName = '员工手册（示例）.docx'
  form.ext = 'docx'
  form.size = 327680
  ElMessage.success('已选择示例文档')
}

async function handleSubmit() {
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  if (!form.fileName) {
    ElMessage.warning('请先选择要上传的文件')
    return
  }

  uploading.value = true
  try {
    await store.upload({
      kbId: store.current.id,
      name: form.fileName,
      ext: form.ext,
      size: form.size,
      tags: form.tags,
      template: form.template,
      chunkStrategy: form.chunkStrategy,
    })
    ElMessage.success('上传成功，正在解析…')
    visible.value = false
  } catch (err) {
    ElMessage.error(err.message || '上传失败，请重试')
  } finally {
    uploading.value = false
  }
}

function handleClosed() {
  uploadRef.value?.clearFiles()
  formRef.value?.resetFields()
}

defineExpose({ open })
</script>

<style scoped>
.full-width {
  width: 100%;
}

.uploader {
  width: 100%;
}

.uploader :deep(.el-upload-dragger) {
  padding: 22px;
}

.uploader__icon {
  font-size: 42px;
  color: #a5b4fc;
}

.uploader__text {
  margin-top: 8px;
  font-size: 13.5px;
  color: #64748b;
}

.uploader__text em {
  color: #6366f1;
  font-style: normal;
}

.uploader__tip {
  margin-top: 8px;
  font-size: 12px;
  color: #a0aec0;
}

.form-hint {
  display: block;
  font-size: 12px;
  line-height: 1.5;
  color: #a0aec0;
}

.param-row {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
}

.param-slider {
  flex: 1;
}

.param-value {
  width: 52px;
  font-size: 13px;
  font-weight: 600;
  color: #6366f1;
}
</style>
