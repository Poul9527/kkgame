<template>
  <Modal 
    v-model="authStore.isAuthModalOpen" 
    :title="authStore.authModalTab === 'login' ? '玩家登录' : '新特工注册 (送 1000 启动金)'"
    width="420px"
  >
    <div class="auth-box">
      <!-- 选项卡切换 -->
      <div class="auth-tabs">
        <button 
          class="tab-btn" 
          :class="{ active: authStore.authModalTab === 'login' }"
          @click="switchTab('login')"
        >
          密码登录
        </button>
        <button 
          class="tab-btn" 
          :class="{ active: authStore.authModalTab === 'register' }"
          @click="switchTab('register')"
        >
          快速注册
        </button>
      </div>

      <!-- 表单区域 -->
      <form class="auth-form" @submit.prevent="handleSubmit">
        <div class="form-group">
          <label>账号 / 用户名</label>
          <input 
            v-model="form.username" 
            type="text" 
            placeholder="请输入 3 位以上账号"
            required
            autocomplete="username"
          />
        </div>

        <div class="form-group">
          <label>密码</label>
          <input 
            v-model="form.password" 
            type="password" 
            placeholder="请输入 6 位以上密码"
            required
            autocomplete="current-password"
          />
        </div>

        <!-- 注册专有字段 -->
        <template v-if="authStore.authModalTab === 'register'">
          <div class="form-group">
            <label>玩家昵称 (选填)</label>
            <input 
              v-model="form.nickname" 
              type="text" 
              placeholder="游戏内显示名称" 
            />
          </div>

          <div class="form-group">
            <label>挑选专属头像</label>
            <div class="avatar-picker">
              <span 
                v-for="av in avatarPresets" 
                :key="av"
                class="av-item"
                :class="{ selected: form.avatar === av }"
                @click="form.avatar = av"
              >
                {{ av }}
              </span>
            </div>
          </div>
        </template>

        <!-- 错误与提示 -->
        <div v-if="errorMessage" class="error-alert">
          {{ errorMessage }}
        </div>

        <button 
          type="submit" 
          class="btn-arcade btn-primary submit-btn"
          :disabled="loading"
        >
          <span v-if="loading">正在处理中...</span>
          <span v-else>{{ authStore.authModalTab === 'login' ? '立即登录' : '立即注册并领取 1000 🪙' }}</span>
        </button>
      </form>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { sound } from '@/utils/soundEngine'
import Modal from '@/components/common/Modal.vue'

const authStore = useAuthStore()

const avatarPresets = ['🎮', '🤠', '🤖', '👾', '🦊', '🎩', '⚡', '🧙‍♂️']

const form = reactive({
  username: '',
  password: '',
  nickname: '',
  avatar: '🎮'
})

const loading = ref(false)
const errorMessage = ref('')

const switchTab = (tab: 'login' | 'register') => {
  sound.click()
  authStore.authModalTab = tab
  errorMessage.value = ''
}

const handleSubmit = async () => {
  sound.click()
  loading.value = true
  errorMessage.value = ''

  try {
    if (authStore.authModalTab === 'login') {
      const res = await authStore.login({
        username: form.username,
        password: form.password
      })
      if (!res.ok) {
        errorMessage.value = res.error || '登录失败，请检查账号密码'
      }
    } else {
      const res = await authStore.register({
        username: form.username,
        password: form.password,
        nickname: form.nickname,
        avatar: form.avatar
      })
      if (!res.ok) {
        errorMessage.value = res.error || '注册失败'
      }
    }
  } catch (err: any) {
    errorMessage.value = err.message || '网络连接超时'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-box {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 4px 0;
}

.auth-tabs {
  display: flex;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 4px;
  gap: 4px;
}

.tab-btn {
  flex: 1;
  padding: 8px 12px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn.active {
  background: rgba(6, 182, 212, 0.2);
  color: var(--accent-cyan);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 0.8rem;
  color: var(--text-dim);
  font-weight: 600;
}

.form-group input {
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid var(--border-color);
  color: #fff;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 0.92rem;
  outline: none;
  transition: border-color 0.2s;
}

.form-group input:focus {
  border-color: var(--accent-cyan);
  box-shadow: 0 0 10px rgba(6, 182, 212, 0.25);
}

.avatar-picker {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.av-item {
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.3rem;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--border-color);
  cursor: pointer;
  transition: all 0.15s;
}

.av-item:hover {
  transform: scale(1.1);
  border-color: var(--accent-cyan);
}

.av-item.selected {
  background: rgba(6, 182, 212, 0.25);
  border-color: var(--accent-cyan);
  box-shadow: 0 0 10px rgba(6, 182, 212, 0.4);
}

.error-alert {
  padding: 8px 12px;
  background: rgba(244, 63, 94, 0.15);
  border: 1px solid #f43f5e;
  color: #fb7185;
  font-size: 0.82rem;
  border-radius: 8px;
  text-align: center;
}

.submit-btn {
  width: 100%;
  padding: 12px;
  margin-top: 6px;
  font-size: 0.95rem;
}
</style>
