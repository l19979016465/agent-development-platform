<template>
  <el-dialog
    v-model="visible"
    :title="`重置密码 · ${target.nickname || target.username || ''}`"
    width="460px"
    :close-on-click-modal="false"
    @closed="handleClosed"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
      <el-form-item label="新密码" prop="password">
        <el-input
          v-model="form.password"
          type="password"
          placeholder="6-20 位"
          show-password
          autocomplete="new-password"
        />
      </el-form-item>

      <el-form-item label="确认密码" prop="confirm">
        <el-input
          v-model="form.confirm"
          type="password"
          placeholder="请再次输入新密码"
          show-password
          autocomplete="new-password"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="handleSubmit">确定重置</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'

import { useUsersStore } from '../../../stores/users'

const userStore = useUsersStore()

const visible = ref(false)
const saving = ref(false)
const formRef = ref(null)
const target = reactive({ username: '', nickname: '' })

const form = reactive({ password: '', confirm: '' })

const rules = {
  password: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度为 6-20 位', trigger: 'blur' },
  ],
  confirm: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    {
      // rules 是静态对象，取不到兄弟字段的当前值，用闭包比较 form.password
      validator: (_rule, value, callback) =>
        value === form.password ? callback() : callback(new Error('两次输入的密码不一致')),
      trigger: ['blur', 'change'],
    },
  ],
}

/** 打开弹窗并指定要重置密码的账号 */
function open(user) {
  target.username = user.username
  target.nickname = user.nickname
  visible.value = true
}

function handleClosed() {
  formRef.value?.resetFields()
  form.password = ''
  form.confirm = ''
}

async function handleSubmit() {
  try {
    await formRef.value.validate()
  } catch {
    return
  }

  saving.value = true
  try {
    await userStore.resetPassword(target.username, form.password)
    ElMessage.success('密码已重置')
    visible.value = false
  } catch (err) {
    ElMessage.error(err.message || '重置失败，请重试')
  } finally {
    saving.value = false
  }
}

defineExpose({ open })
</script>
