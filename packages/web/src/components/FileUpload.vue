<script setup lang="ts">
import { ref } from 'vue'

const API_BASE = 'http://localhost:3016'

// 状态定义
const singleResult = ref<any>(null)
const singleError = ref(false)
const singleFile = ref<HTMLInputElement | null>(null)

const multipleResult = ref<any>(null)
const multipleError = ref(false)
const multipleFiles = ref<HTMLInputElement | null>(null)

const imageResult = ref<any>(null)
const imageError = ref(false)
const imageUrl = ref('')
const imageFile = ref<HTMLInputElement | null>(null)

const apiList = ref<any[]>([])
// 接口列表
const fetchAPIList = async () => {
  try {
    const res = await fetch(`${API_BASE}`)
    const data = await res.json()
    return data
  } catch (err: any) {
    return { error: err.message }
  }
}

fetchAPIList().then(data => {
  console.log('fetchAPIList', data)
  apiList.value = data.endpoints
})

const apiUploadList = ref<any[]>([])

const fetchAPIUploadList = async () => {
  try {
    const res = await fetch(`${API_BASE}/api/upload/list`)
    const data = await res.json()
    return data
  } catch (err: any) {
    return { error: err.message }
  }
}

fetchAPIUploadList().then(data => {
  console.log('fetchAPIUploadList:', data)
  apiUploadList.value = data.data
})

// 1. 单文件上传
const handleSingleUpload = async () => {
  const input = singleFile.value
  if (!input || !input.files || input.files.length === 0) return

  const formData = new FormData()
  formData.append('file', input.files[0])

  try {
    const res = await fetch(`${API_BASE}/api/upload/single`, {
      method: 'POST',
      body: formData
    })
    const data = await res.json()
    singleResult.value = data
    singleError.value = !data.success
  } catch (err: any) {
    singleResult.value = { error: err.message }
    singleError.value = true
  }
}

// 2. 多文件上传
const handleMultipleUpload = async () => {
  const input = multipleFiles.value
  if (!input || !input.files || input.files.length === 0) return

  const formData = new FormData()
  for (let i = 0; i < input.files.length; i++) {
    formData.append('files', input.files[i])
  }

  try {
    const res = await fetch(`${API_BASE}/api/upload/multiple`, {
      method: 'POST',
      body: formData
    })
    const data = await res.json()
    multipleResult.value = data
    multipleError.value = !data.success
  } catch (err: any) {
    multipleResult.value = { error: err.message }
    multipleError.value = true
  }
}

// 3. 图片上传
const handleImageUpload = async () => {
  const input = imageFile.value
  if (!input || !input.files || input.files.length === 0) return

  const formData = new FormData()
  formData.append('image', input.files[0])

  try {
    const res = await fetch(`${API_BASE}/api/upload/image`, {
      method: 'POST',
      body: formData
    })
    const data = await res.json()
    imageResult.value = data
    imageError.value = !data.success

    if (data.success && data.data && data.data.url) {
      imageUrl.value = data.data.url
    } else {
      imageUrl.value = ''
    }
  } catch (err: any) {
    imageResult.value = { error: err.message }
    imageError.value = true
    imageUrl.value = ''
  }
}
</script>

<template>
  <div class="file-upload-container">
    <div class="file-upload-api-list">
      <h2>接口列表</h2>
      <ol>
        <li v-for="api in apiList" :key="api">{{ api }}</li>
      </ol>
    </div>
    <div class="file-upload-api-upload-list">
      <h2>上传接口列表</h2>
      <ol>
        <li v-for="api in apiUploadList" :key="api">
          {{ API_BASE + api.url }}
          <img :src="API_BASE + api.url" :alt="api.name" width="60"/>
        </li>
      </ol>
    </div>
    <!-- 单文件上传 -->
    <div class="upload-section">
      <h2>1. 单文件上传</h2>
      <form @submit.prevent="handleSingleUpload">
        <div class="form-group">
          <label>选择文件：</label>
          <input type="file" ref="singleFile" name="file" required>
        </div>
        <button type="submit">上传</button>
      </form>
      <div v-if="singleResult" :class="['result', { error: singleError }]">
        <pre>{{ JSON.stringify(singleResult, null, 2) }}</pre>
      </div>
    </div>

    <!-- 多文件上传 -->
    <div class="upload-section">
      <h2>2. 多文件上传（最多5个）</h2>
      <form @submit.prevent="handleMultipleUpload">
        <div class="form-group">
          <label>选择文件：</label>
          <input type="file" ref="multipleFiles" name="files" multiple required>
        </div>
        <button type="submit">上传</button>
      </form>
      <div v-if="multipleResult" :class="['result', { error: multipleError }]">
        <pre>{{ JSON.stringify(multipleResult, null, 2) }}</pre>
      </div>
    </div>

    <!-- 图片专用上传 -->
    <div class="upload-section">
      <h2>3. 图片专用上传（仅图片，最大5MB）</h2>
      <form @submit.prevent="handleImageUpload">
        <div class="form-group">
          <label>选择图片：</label>
          <input type="file" ref="imageFile" name="image" accept="image/*" required>
        </div>
        <button type="submit">上传</button>
        <div class="preview" v-if="imageUrl">
          <img :src="imageUrl" alt="Uploaded Image">
        </div>
      </form>
      <div v-if="imageResult" :class="['result', { error: imageError }]">
        <pre>{{ JSON.stringify(imageResult, null, 2) }}</pre>
      </div>
    </div>
  </div>
</template>

<style scoped>
.file-upload-container {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  max-width: 800px;
  margin: 50px auto;
  padding: 20px;
  background: #f5f5f5;
}

.upload-section {
  background: white;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  margin-bottom: 20px;
}

h2 {
  margin-top: 0;
  color: #333;
  border-bottom: 2px solid #007bff;
  padding-bottom: 10px;
}

.form-group {
  margin-bottom: 15px;
}

label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
  color: #555;
}

input[type="file"] {
  width: 100%;
  padding: 10px;
  border: 2px dashed #ddd;
  border-radius: 4px;
  cursor: pointer;
  box-sizing: border-box;
}

button {
  background: #007bff;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  transition: background 0.3s;
}

button:hover {
  background: #0056b3;
}

.result {
  margin-top: 20px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 4px;
  border-left: 4px solid #28a745;
  display: block;
}

.result.error {
  border-left-color: #dc3545;
}

pre {
  background: #f4f4f4;
  padding: 10px;
  border-radius: 4px;
  overflow-x: auto;
  margin: 0;
}

.preview {
  margin-top: 10px;
}

.preview img {
  max-width: 200px;
  max-height: 200px;
  border-radius: 4px;
  margin: 5px;
}
</style>