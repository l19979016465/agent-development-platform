<template>
  <el-dialog
    v-model="visible"
    :title="isEdit ? '编辑智能体' : '新建智能体'"
    width="620px"
    top="7vh"
    :close-on-click-modal="false"
    @closed="handleClosed"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="98px">
      <el-form-item label="智能体名称" prop="name">
        <el-input v-model.trim="form.name" placeholder="如：电商客服助手" maxlength="30" show-word-limit />
      </el-form-item>

      <el-form-item label="图标" prop="avatar">
        <div class="avatar-picker">
          <span
            v-for="emoji in AVATARS"
            :key="emoji"
            class="avatar-picker__item"
            :class="{ 'is-active': form.avatar === emoji }"
            @click="form.avatar = emoji"
          >
            {{ emoji }}
          </span>
        </div>
      </el-form-item>

      <el-form-item label="分类" prop="category">
        <el-select v-model="form.category" placeholder="请选择分类" class="full-width">
          <el-option v-for="c in CATEGORY_OPTIONS" :key="c" :label="c" :value="c" />
        </el-select>
      </el-form-item>

      <el-form-item label="简介" prop="description">
        <el-input
          v-model.trim="form.description"
          type="textarea"
          :rows="2"
          maxlength="100"
          show-word-limit
          placeholder="一句话说明该智能体的用途"
        />
      </el-form-item>

      <el-form-item label="基座模型" prop="model">
        <el-select v-model="form.model" placeholder="请选择模型" class="full-width">
          <el-option v-for="m in MODEL_OPTIONS" :key="m.value" :label="m.label" :value="m.value" />
        </el-select>
      </el-form-item>

      <el-form-item label="创造性" prop="temperature">
        <div class="temp-row">
          <el-slider v-model="form.temperature" :min="0" :max="1" :step="0.1" class="temp-slider" />
          <span class="temp-value">{{ form.temperature.toFixed(1) }}</span>
        </div>
        <span class="form-hint">数值越低回答越稳定严谨，越高越有创造性</span>
      </el-form-item>

      <el-form-item label="提示词" prop="systemPrompt">
        <el-input
          v-model.trim="form.systemPrompt"
          type="textarea"
          :rows="4"
          maxlength="500"
          show-word-limit
          placeholder="设定智能体的角色、能力边界与回答风格"
        />
      </el-form-item>

      <el-form-item label="状态" prop="status">
        <el-radio-group v-model="form.status">
          <el-radio value="draft">保存为草稿</el-radio>
          <el-radio value="published">立即发布</el-radio>
        </el-radio-group>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="handleSubmit">
        {{ isEdit ? '保存修改' : '确认创建' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { MODEL_OPTIONS, CATEGORY_OPTIONS } from '../../../api/agent'
import { useAgentStore } from '../../../stores/agent'

const AVATARS = ['🤖', '🎧', '📚', '💻', '📊', '📝', '🧭', '🔍', '💡', '🎨']

const agentStore = useAgentStore()

const visible = ref(false)
const saving = ref(false)
const formRef = ref(null)
const editingId = ref(null)

const isEdit = computed(() => editingId.value !== null)

const emptyForm = () => ({
  name: '',
  avatar: '🤖',
  description: '',
  category: '客服问答',
  model: 'qwen-max',
  temperature: 0.5,
  systemPrompt: '',
  status: 'draft',
})

const form = reactive(emptyForm())

const rules = {
  name: [{ required: true, message: '请输入智能体名称', trigger: 'blur' }],
  category: [{ required: true, message: '请选择分类', trigger: 'change' }],
  model: [{ required: true, message: '请选择基座模型', trigger: 'change' }],
  description: [{ required: true, message: '请输入简介', trigger: 'blur' }],
  systemPrompt: [{ required: true, message: '请输入提示词', trigger: 'blur' }],
}

/** 打开弹窗：传入 agent 为编辑，不传为新建 */
function open(agent = null) {
  editingId.value = agent ? agent.id : null
  Object.assign(form, agent ? { ...emptyForm(), ...agent } : emptyForm())
  visible.value = true
}

async function handleSubmit() {
  try {
    await formRef.value.validate()
  } catch {
    return // 校验未通过
  }

  saving.value = true
  try {
    const payload = { ...form }
    if (isEdit.value) {
      await agentStore.update(editingId.value, payload)
      ElMessage.success('智能体已更新')
    } else {
      await agentStore.create(payload)
      ElMessage.success('智能体创建成功')
    }
    visible.value = false
  } catch (err) {
    ElMessage.error(err.message || '保存失败，请重试')
  } finally {
    saving.value = false
  }
}

/** 弹窗关闭后清理校验状态，避免残留红框 */
function handleClosed() {
  formRef.value?.resetFields()
  editingId.value = null
}

defineExpose({ open })
</script>

<style scoped>
.full-width {
  width: 100%;
}

.avatar-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.avatar-picker__item {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  font-size: 19px;
  border-radius: 10px;
  cursor: pointer;
  background: #f5f7fb;
  border: 1px solid transparent;
  transition: all 0.2s;
}

.avatar-picker__item:hover {
  background: #eef2ff;
}

.avatar-picker__item.is-active {
  border-color: #6366f1;
  background: #eef2ff;
}

.temp-row {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
}

.temp-slider {
  flex: 1;
}

.temp-value {
  width: 30px;
  font-size: 13px;
  font-weight: 600;
  color: #6366f1;
}

.form-hint {
  display: block;
  font-size: 12px;
  line-height: 1.5;
  color: #a0aec0;
}
</style>
