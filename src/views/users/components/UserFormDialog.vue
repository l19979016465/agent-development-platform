<template>
  <el-dialog
    v-model="visible"
    :title="isEdit ? '编辑用户' : '新建用户'"
    width="560px"
    :close-on-click-modal="false"
    @closed="handleClosed"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
      <el-form-item label="账号" prop="username">
        <el-input
          v-model.trim="form.username"
          placeholder="4-20 位字母、数字或下划线"
          :disabled="isEdit"
          maxlength="20"
        />
      </el-form-item>

      <el-form-item label="昵称" prop="nickname">
        <el-input v-model.trim="form.nickname" placeholder="选填，默认与账号相同" maxlength="20" />
      </el-form-item>

      <el-form-item v-if="!isEdit" label="初始密码" prop="password">
        <el-input
          v-model="form.password"
          type="password"
          placeholder="6-20 位"
          show-password
          autocomplete="new-password"
        />
      </el-form-item>

      <el-form-item label="角色" prop="role">
        <el-radio-group v-model="form.role" :disabled="isSelf">
          <el-radio v-for="r in ROLE_OPTIONS" :key="r" :value="r">{{ r }}</el-radio>
        </el-radio-group>
        <div v-if="isSelf" class="form-hint">不能修改自己的角色与模块权限</div>
      </el-form-item>

      <el-form-item label="所属组织" prop="org">
        <el-select v-model="form.org" placeholder="请选择所属组织" style="width: 100%">
          <el-option v-for="o in ORG_FORM_OPTIONS" :key="o" :label="o" :value="o" />
        </el-select>
      </el-form-item>

      <el-form-item label="模块权限">
        <div v-if="form.role === ROLE_ADMIN" class="form-hint form-hint--block">
          管理员默认拥有全部模块权限，且可进入用户管理
        </div>
        <el-checkbox-group v-else v-model="form.permissions" :disabled="isSelf">
          <el-checkbox v-for="p in PERMISSION_KEYS" :key="p" :value="p">
            {{ PERMISSION_MAP[p].label }}
          </el-checkbox>
        </el-checkbox-group>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="handleSubmit">
        {{ isEdit ? '保存' : '创建' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'

import { useUsersStore } from '../../../stores/users'
import { useAuthStore } from '../../../stores/auth'
import {
  ROLE_OPTIONS,
  ROLE_ADMIN,
  ORG_OPTIONS,
  DEFAULT_ORG,
  PERMISSION_KEYS,
  PERMISSION_MAP,
} from '../../../api/users'

const userStore = useUsersStore()
const auth = useAuthStore()

const visible = ref(false)
const saving = ref(false)
const formRef = ref(null)
/** 正在编辑的账号；为 null 表示新建 */
const editingUsername = ref(null)

const ORG_FORM_OPTIONS = [DEFAULT_ORG, ...ORG_OPTIONS]

const isEdit = computed(() => editingUsername.value !== null)
const isSelf = computed(() => isEdit.value && editingUsername.value === auth.user?.username)

function emptyForm() {
  return {
    username: '',
    nickname: '',
    password: '',
    role: ROLE_OPTIONS[1],
    org: DEFAULT_ORG,
    permissions: [...PERMISSION_KEYS],
  }
}

const form = reactive(emptyForm())

const rules = {
  username: [
    { required: true, message: '请输入账号', trigger: 'blur' },
    {
      pattern: /^[a-zA-Z0-9_]{4,20}$/,
      message: '账号需为 4-20 位字母、数字或下划线',
      trigger: 'blur',
    },
  ],
  nickname: [{ max: 20, message: '昵称最多 20 个字符', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入初始密码', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度为 6-20 位', trigger: 'blur' },
  ],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }],
  org: [{ required: true, message: '请选择所属组织', trigger: 'change' }],
}

// 切到管理员时补全权限，保证切回普通用户时仍处于全选状态
watch(
  () => form.role,
  (role) => {
    if (role === ROLE_ADMIN) form.permissions = [...PERMISSION_KEYS]
  }
)

/** 打开弹窗：传入用户为编辑，不传为新建 */
function open(user = null) {
  editingUsername.value = user ? user.username : null
  Object.assign(form, emptyForm())
  if (user) {
    Object.assign(form, {
      username: user.username,
      nickname: user.nickname,
      role: user.role,
      org: user.org || DEFAULT_ORG,
      permissions: [...(user.permissions || PERMISSION_KEYS)],
    })
  }
  visible.value = true
}

function handleClosed() {
  formRef.value?.resetFields()
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
      await userStore.update(editingUsername.value, {
        nickname: form.nickname,
        role: form.role,
        org: form.org,
        permissions: [...form.permissions],
      })
      // 改的是自己的资料时，同步一下顶栏的昵称与组织
      if (isSelf.value) auth.refresh()
      ElMessage.success('用户已更新')
    } else {
      await userStore.create({
        username: form.username,
        password: form.password,
        nickname: form.nickname,
        role: form.role,
        org: form.org,
        permissions: [...form.permissions],
      })
      ElMessage.success('用户创建成功')
    }
    visible.value = false
  } catch (err) {
    ElMessage.error(err.message || '保存失败，请重试')
  } finally {
    saving.value = false
  }
}

defineExpose({ open })
</script>

<style scoped>
.form-hint {
  margin-left: 12px;
  font-size: 12.5px;
  color: #94a3b8;
}

.form-hint--block {
  margin-left: 0;
  line-height: 1.6;
}
</style>
