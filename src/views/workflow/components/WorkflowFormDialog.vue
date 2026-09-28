<template>
  <el-dialog
    v-model="visible"
    :title="isEdit ? '编辑工作流' : '新建工作流'"
    width="520px"
    :close-on-click-modal="false"
    @closed="handleClosed"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="86px">
      <el-form-item label="名称" prop="name">
        <el-input v-model.trim="form.name" placeholder="如：差旅报销助手" maxlength="30" show-word-limit />
      </el-form-item>

      <el-form-item label="图标">
        <div class="covers">
          <span
            v-for="c in COVERS"
            :key="c"
            class="cover"
            :class="{ 'is-active': form.cover === c }"
            @click="form.cover = c"
          >
            {{ c }}
          </span>
        </div>
      </el-form-item>

      <el-form-item label="说明" prop="description">
        <el-input
          v-model.trim="form.description"
          type="textarea"
          :rows="3"
          maxlength="120"
          show-word-limit
          placeholder="说明该工作流解决的业务场景与执行流程"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="handleSubmit">
        {{ isEdit ? '保存' : '创建并编排' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useWorkflowStore } from '../../../stores/workflow'

const emit = defineEmits(['created'])

const store = useWorkflowStore()

const COVERS = ['🧩', '📚', '🧾', '📝', '🤖', '🔍', '📊', '💡']

const visible = ref(false)
const saving = ref(false)
const formRef = ref(null)
const editingId = ref(null)

const isEdit = computed(() => editingId.value !== null)

const emptyForm = () => ({ name: '', description: '', cover: '🧩' })
const form = reactive(emptyForm())

const rules = {
  name: [{ required: true, message: '请输入工作流名称', trigger: 'blur' }],
  description: [{ required: true, message: '请输入说明', trigger: 'blur' }],
}

/** 传 workflow 为编辑，不传为新建 */
function open(workflow = null) {
  editingId.value = workflow ? workflow.id : null
  Object.assign(form, workflow ? { name: workflow.name, description: workflow.description, cover: workflow.cover } : emptyForm())
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
    if (isEdit.value) {
      await store.update(editingId.value, { ...form })
      ElMessage.success('工作流已更新')
      visible.value = false
    } else {
      const flow = await store.create({ ...form })
      ElMessage.success('工作流创建成功')
      visible.value = false
      emit('created', flow) // 创建后直接进入编排页
    }
  } catch (err) {
    ElMessage.error(err.message || '操作失败，请重试')
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
.covers {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.cover {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 9px;
  font-size: 18px;
  cursor: pointer;
  border: 1.5px solid #eef0f4;
  transition: border-color 0.15s, background 0.15s;
}

.cover:hover {
  background: #f6f8fc;
}

.cover.is-active {
  border-color: #6366f1;
  background: #eef2ff;
}
</style>
