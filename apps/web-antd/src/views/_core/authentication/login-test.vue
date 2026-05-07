<script lang="ts" setup>
import { ref } from 'vue';

import { Button, Card, Descriptions, DescriptionsItem, Divider, Form, FormItem, Input, InputPassword, message, Select, SelectOption, Spin, Tag } from 'ant-design-vue';

import { loginApi } from '#/api/core/auth';
import { requestClient } from '#/api/request';

defineOptions({ name: 'LoginTest' });

const loading = ref(false);
const loginResult = ref<any>(null);
const userInfo = ref<any>(null);
const errorMsg = ref('');
const loginTime = ref('');

const form = ref({
  tenantId: '000000',
  username: 'admin',
  password: '123456',
});

async function handleLogin() {
  loading.value = true;
  loginResult.value = null;
  userInfo.value = null;
  errorMsg.value = '';

  try {
    const res = await loginApi({
      tenantId: form.value.tenantId,
      username: form.value.username,
      password: form.value.password,
      grantType: 'password',
    });

    loginResult.value = res;
    loginTime.value = new Date().toLocaleString();
    message.success('登录成功');

    // 尝试获取用户信息
    try {
      const userRes = await requestClient.get<any>('/system/user/getInfo');
      userInfo.value = userRes;
    } catch {
      // 忽略用户信息获取失败
    }
  } catch (e: any) {
    errorMsg.value = e?.message || '登录失败';
    message.error(errorMsg.value);
  } finally {
    loading.value = false;
  }
}

function handleClear() {
  loginResult.value = null;
  userInfo.value = null;
  errorMsg.value = '';
  loginTime.value = '';
}
</script>

<template>
  <div class="login-test-page">
    <div class="login-test-container">
      <!-- 标题 -->
      <div class="page-header">
        <h2 class="page-title">登录功能测试</h2>
        <p class="page-desc">用于测试登录接口是否正常工作</p>
      </div>

      <!-- 登录表单 -->
      <Card title="登录参数" class="form-card">
        <Spin :spinning="loading">
          <Form layout="vertical">
            <FormItem label="租户ID">
              <Input v-model:value="form.tenantId" placeholder="请输入租户ID" />
            </FormItem>
            <FormItem label="用户名">
              <Input v-model:value="form.username" placeholder="请输入用户名" />
            </FormItem>
            <FormItem label="密码">
              <InputPassword v-model:value="form.password" placeholder="请输入密码" />
            </FormItem>
            <FormItem>
              <div class="btn-group">
                <Button type="primary" :loading="loading" @click="handleLogin">
                  发起登录测试
                </Button>
                <Button @click="handleClear">清除结果</Button>
              </div>
            </FormItem>
          </Form>
        </Spin>
      </Card>

      <!-- 登录结果 -->
      <template v-if="loginResult || errorMsg">
        <Divider />

        <!-- 失败提示 -->
        <Card v-if="errorMsg" title="登录结果" class="result-card result-error">
          <div class="error-block">
            <Tag color="error">失败</Tag>
            <span class="error-text">{{ errorMsg }}</span>
          </div>
        </Card>

        <!-- 成功结果 -->
        <template v-if="loginResult">
          <!-- Token信息 -->
          <Card title="Token 信息" class="result-card">
            <Descriptions :column="1" bordered size="small">
              <DescriptionsItem label="登录时间">
                <Tag color="success">成功</Tag>
                {{ loginTime }}
              </DescriptionsItem>
              <DescriptionsItem label="access_token">
                <span class="token-text">{{ loginResult.access_token }}</span>
              </DescriptionsItem>
              <DescriptionsItem label="client_id">
                {{ loginResult.client_id }}
              </DescriptionsItem>
              <DescriptionsItem label="有效期（秒）">
                {{ loginResult.expire_in }}
              </DescriptionsItem>
            </Descriptions>
          </Card>

          <!-- 用户信息 -->
          <Card v-if="userInfo" title="用户信息" class="result-card" style="margin-top: 16px">
            <Descriptions :column="2" bordered size="small">
              <DescriptionsItem label="用户名">
                {{ userInfo.user?.userName }}
              </DescriptionsItem>
              <DescriptionsItem label="昵称">
                {{ userInfo.user?.nickName }}
              </DescriptionsItem>
              <DescriptionsItem label="手机号">
                {{ userInfo.user?.phonenumber || '-' }}
              </DescriptionsItem>
              <DescriptionsItem label="邮箱">
                {{ userInfo.user?.email || '-' }}
              </DescriptionsItem>
              <DescriptionsItem label="角色" :span="2">
                <Tag
                  v-for="role in userInfo.roles"
                  :key="role"
                  color="blue"
                  style="margin: 2px"
                >
                  {{ role }}
                </Tag>
              </DescriptionsItem>
              <DescriptionsItem label="权限" :span="2">
                <Tag
                  v-for="perm in (userInfo.permissions || []).slice(0, 10)"
                  :key="perm"
                  color="green"
                  style="margin: 2px; font-size: 11px"
                >
                  {{ perm }}
                </Tag>
                <span v-if="(userInfo.permissions || []).length > 10" style="color: #999; font-size: 12px">
                  ...共 {{ userInfo.permissions?.length }} 条
                </span>
              </DescriptionsItem>
            </Descriptions>
          </Card>

          <!-- 原始响应 -->
          <Card title="原始响应数据" class="result-card" style="margin-top: 16px">
            <pre class="json-block">{{ JSON.stringify(loginResult, null, 2) }}</pre>
          </Card>
        </template>
      </template>
    </div>
  </div>
</template>

<style scoped>
.login-test-page {
  min-height: 100vh;
  padding: 32px 24px;
  background: #f5f5f5;
}

.login-test-container {
  max-width: 720px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 24px;
}

.page-title {
  margin: 0 0 4px;
  font-size: 22px;
  font-weight: 700;
  color: #1a1a1a;
}

.page-desc {
  margin: 0;
  font-size: 13px;
  color: #888;
}

.form-card {
  border-radius: 8px;
}

.btn-group {
  display: flex;
  gap: 12px;
}

.result-card {
  border-radius: 8px;
}

.result-error {
  border-color: #ff4d4f;
}

.error-block {
  display: flex;
  gap: 10px;
  align-items: center;
}

.error-text {
  color: #ff4d4f;
  font-size: 14px;
}

.token-text {
  word-break: break-all;
  font-size: 11px;
  font-family: monospace;
  color: #52c41a;
}

.json-block {
  padding: 12px;
  overflow-x: auto;
  font-size: 12px;
  line-height: 1.6;
  color: #333;
  white-space: pre-wrap;
  word-break: break-all;
  background: #f6f8fa;
  border-radius: 6px;
}
</style>
