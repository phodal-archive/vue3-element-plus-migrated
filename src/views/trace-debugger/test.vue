<template>
  <div class="trace-test-page">
    <div class="page-header">
      <h1>🧪 追踪系统测试</h1>
      <p>测试各种类型的请求和追踪功能</p>
    </div>

    <el-row :gutter="20">
      <!-- 基本请求测试 -->
      <el-col :span="12">
        <el-card class="test-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span>📡 基本请求测试</span>
            </div>
          </template>

          <div class="test-content">
            <el-button 
              type="primary" 
              @click="testGetRequest"
              :loading="loading.get"
            >
              测试 GET 请求
            </el-button>
            
            <el-button 
              type="success" 
              @click="testPostRequest"
              :loading="loading.post"
            >
              测试 POST 请求
            </el-button>
            
            <el-button 
              type="warning" 
              @click="testPutRequest"
              :loading="loading.put"
            >
              测试 PUT 请求
            </el-button>
            
            <el-button 
              type="danger" 
              @click="testDeleteRequest"
              :loading="loading.delete"
            >
              测试 DELETE 请求
            </el-button>
          </div>
        </el-card>
      </el-col>

      <!-- 错误测试 -->
      <el-col :span="12">
        <el-card class="test-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span>❌ 错误测试</span>
            </div>
          </template>

          <div class="test-content">
            <el-button 
              type="danger" 
              @click="testNetworkError"
              :loading="loading.networkError"
            >
              网络错误
            </el-button>
            
            <el-button 
              type="danger" 
              @click="testTimeoutError"
              :loading="loading.timeoutError"
            >
              超时错误
            </el-button>
            
            <el-button 
              type="danger" 
              @click="testServerError"
              :loading="loading.serverError"
            >
              服务器错误
            </el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20">
      <!-- 批量请求测试 -->
      <el-col :span="12">
        <el-card class="test-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span>🔄 批量请求测试</span>
            </div>
          </template>

          <div class="test-content">
            <el-input-number
              v-model="batchSize"
              :min="1"
              :max="20"
              label="请求数量"
            />
            
            <el-button 
              type="primary" 
              @click="testBatchRequests"
              :loading="loading.batch"
            >
              发送批量请求
            </el-button>
            
            <el-button 
              type="warning" 
              @click="testConcurrentRequests"
              :loading="loading.concurrent"
            >
              并发请求
            </el-button>
          </div>
        </el-card>
      </el-col>

      <!-- 自定义追踪测试 -->
      <el-col :span="12">
        <el-card class="test-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span>🎯 自定义追踪测试</span>
            </div>
          </template>

          <div class="test-content">
            <el-button 
              type="primary" 
              @click="testCustomSpan"
              :loading="loading.customSpan"
            >
              自定义 Span
            </el-button>
            
            <el-button 
              type="success" 
              @click="testUserInteraction"
              :loading="loading.userInteraction"
            >
              用户交互追踪
            </el-button>
            
            <el-button 
              type="warning" 
              @click="testPerformanceMonitoring"
              :loading="loading.performance"
            >
              性能监控测试
            </el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 测试结果 -->
    <el-card class="results-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span>📊 测试结果</span>
          <el-button size="small" @click="clearResults">清空结果</el-button>
        </div>
      </template>

      <div class="results-content">
        <el-table :data="testResults" style="width: 100%">
          <el-table-column prop="timestamp" label="时间" width="180">
            <template #default="{ row }">
              {{ formatTime(row.timestamp) }}
            </template>
          </el-table-column>
          
          <el-table-column prop="test" label="测试类型" width="150" />
          
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="row.status === 'success' ? 'success' : 'danger'">
                {{ row.status }}
              </el-tag>
            </template>
          </el-table-column>
          
          <el-table-column prop="duration" label="耗时" width="100">
            <template #default="{ row }">
              {{ row.duration }}ms
            </template>
          </el-table-column>
          
          <el-table-column prop="message" label="消息" />
          
          <el-table-column prop="traceId" label="Trace ID" width="120">
            <template #default="{ row }">
              <el-button 
                v-if="row.traceId" 
                size="small" 
                @click="copyToClipboard(row.traceId)"
              >
                复制
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-card>
  </div>
</template>

<script>
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'
import { createCustomSpan, runInSpan } from '@/utils/tracing'

export default {
  name: 'TraceTestPage',
  setup() {
    const loading = reactive({
      get: false,
      post: false,
      put: false,
      delete: false,
      networkError: false,
      timeoutError: false,
      serverError: false,
      batch: false,
      concurrent: false,
      customSpan: false,
      userInteraction: false,
      performance: false
    })

    const batchSize = ref(5)
    const testResults = ref([])

    // 添加测试结果
    const addResult = (test, status, message, duration = 0, traceId = null) => {
      testResults.value.unshift({
        timestamp: Date.now(),
        test,
        status,
        message,
        duration,
        traceId
      })

      // 限制结果数量
      if (testResults.value.length > 100) {
        testResults.value = testResults.value.slice(0, 100)
      }
    }

    // 清空结果
    const clearResults = () => {
      testResults.value = []
      ElMessage.success('测试结果已清空')
    }

    // 复制到剪贴板
    const copyToClipboard = async (text) => {
      try {
        await navigator.clipboard.writeText(text)
        ElMessage.success('已复制到剪贴板')
      } catch (err) {
        ElMessage.error('复制失败')
      }
    }

    // 格式化时间
    const formatTime = (timestamp) => {
      return new Date(timestamp).toLocaleTimeString()
    }

    // 基本请求测试
    const testGetRequest = async () => {
      loading.get = true
      const startTime = Date.now()
      
      try {
        const response = await request({
          url: '/api/test',
          method: 'get'
        })
        
        const duration = Date.now() - startTime
        addResult('GET 请求', 'success', '请求成功', duration, response.traceInfo?.traceId)
        ElMessage.success('GET 请求测试成功')
      } catch (error) {
        const duration = Date.now() - startTime
        addResult('GET 请求', 'error', error.message, duration)
        ElMessage.error('GET 请求测试失败')
      } finally {
        loading.get = false
      }
    }

    const testPostRequest = async () => {
      loading.post = true
      const startTime = Date.now()
      
      try {
        const response = await request({
          url: '/api/success',
          method: 'post',
          data: { test: true, timestamp: Date.now() }
        })
        
        const duration = Date.now() - startTime
        addResult('POST 请求', 'success', '请求成功', duration)
        ElMessage.success('POST 请求测试成功')
      } catch (error) {
        const duration = Date.now() - startTime
        addResult('POST 请求', 'error', error.message, duration)
        ElMessage.error('POST 请求测试失败')
      } finally {
        loading.post = false
      }
    }

    const testPutRequest = async () => {
      loading.put = true
      const startTime = Date.now()
      
      try {
        const response = await request({
          url: '/api/user/1',
          method: 'put',
          data: { name: 'Test User', email: 'test@example.com' }
        })
        
        const duration = Date.now() - startTime
        addResult('PUT 请求', 'success', '请求成功', duration)
        ElMessage.success('PUT 请求测试成功')
      } catch (error) {
        const duration = Date.now() - startTime
        addResult('PUT 请求', 'error', error.message, duration)
        ElMessage.error('PUT 请求测试失败')
      } finally {
        loading.put = false
      }
    }

    const testDeleteRequest = async () => {
      loading.delete = true
      const startTime = Date.now()
      
      try {
        const response = await request({
          url: '/api/user/1',
          method: 'delete'
        })
        
        const duration = Date.now() - startTime
        addResult('DELETE 请求', 'success', '请求成功', duration)
        ElMessage.success('DELETE 请求测试成功')
      } catch (error) {
        const duration = Date.now() - startTime
        addResult('DELETE 请求', 'error', error.message, duration)
        ElMessage.error('DELETE 请求测试失败')
      } finally {
        loading.delete = false
      }
    }

    // 错误测试
    const testNetworkError = async () => {
      loading.networkError = true
      const startTime = Date.now()
      
      try {
        await request({
          url: 'http://invalid-url-that-does-not-exist.com/api/test',
          method: 'get',
          timeout: 5000
        })
      } catch (error) {
        const duration = Date.now() - startTime
        addResult('网络错误', 'error', error.message, duration)
        ElMessage.info('网络错误测试完成（这是预期的错误）')
      } finally {
        loading.networkError = false
      }
    }

    const testTimeoutError = async () => {
      loading.timeoutError = true
      const startTime = Date.now()
      
      try {
        await request({
          url: '/api/slow',
          method: 'get',
          timeout: 1000
        })
      } catch (error) {
        const duration = Date.now() - startTime
        addResult('超时错误', 'error', error.message, duration)
        ElMessage.info('超时错误测试完成（这是预期的错误）')
      } finally {
        loading.timeoutError = false
      }
    }

    const testServerError = async () => {
      loading.serverError = true
      const startTime = Date.now()
      
      try {
        await request({
          url: '/api/error',
          method: 'get'
        })
      } catch (error) {
        const duration = Date.now() - startTime
        addResult('服务器错误', 'error', error.message, duration)
        ElMessage.info('服务器错误测试完成（这是预期的错误）')
      } finally {
        loading.serverError = false
      }
    }

    // 批量请求测试
    const testBatchRequests = async () => {
      loading.batch = true
      const startTime = Date.now()
      
      try {
        const promises = Array.from({ length: batchSize.value }, (_, i) =>
          request({
            url: `/api/user/${i + 1}`,
            method: 'get'
          })
        )
        
        const results = await Promise.all(promises)
        const duration = Date.now() - startTime
        
        addResult('批量请求', 'success', `成功发送 ${batchSize.value} 个请求`, duration)
        ElMessage.success(`批量请求测试成功，共 ${batchSize.value} 个请求`)
      } catch (error) {
        const duration = Date.now() - startTime
        addResult('批量请求', 'error', error.message, duration)
        ElMessage.error('批量请求测试失败')
      } finally {
        loading.batch = false
      }
    }

    const testConcurrentRequests = async () => {
      loading.concurrent = true
      const startTime = Date.now()
      
      try {
        const promises = Array.from({ length: 10 }, (_, i) =>
          request({
            url: '/api/data',
            method: 'get',
            params: { page: i + 1, limit: 5 }
          })
        )
        
        const results = await Promise.all(promises)
        const duration = Date.now() - startTime
        
        addResult('并发请求', 'success', '成功发送 10 个并发请求', duration)
        ElMessage.success('并发请求测试成功')
      } catch (error) {
        const duration = Date.now() - startTime
        addResult('并发请求', 'error', error.message, duration)
        ElMessage.error('并发请求测试失败')
      } finally {
        loading.concurrent = false
      }
    }

    // 自定义追踪测试
    const testCustomSpan = async () => {
      loading.customSpan = true
      const startTime = Date.now()
      
      try {
        const span = createCustomSpan('custom-test-operation', {
          'test.type': 'custom-span',
          'test.timestamp': Date.now()
        })
        
        await runInSpan(span, async () => {
          // 模拟一些异步操作
          await new Promise(resolve => setTimeout(resolve, 1000))
          
          // 添加一些事件
          span.addEvent('test-event', {
            'event.data': 'test data'
          })
          
          return 'custom operation completed'
        })
        
        const duration = Date.now() - startTime
        addResult('自定义 Span', 'success', '自定义追踪测试成功', duration)
        ElMessage.success('自定义 Span 测试成功')
      } catch (error) {
        const duration = Date.now() - startTime
        addResult('自定义 Span', 'error', error.message, duration)
        ElMessage.error('自定义 Span 测试失败')
      } finally {
        loading.customSpan = false
      }
    }

    const testUserInteraction = async () => {
      loading.userInteraction = true
      const startTime = Date.now()
      
      try {
        // 模拟用户交互追踪
        const span = createCustomSpan('user-interaction-test', {
          'interaction.type': 'button-click',
          'interaction.element': 'test-button',
          'user.id': 'test-user'
        })
        
        await runInSpan(span, async () => {
          // 模拟用户操作
          await new Promise(resolve => setTimeout(resolve, 500))
          
          // 添加用户行为事件
          span.addEvent('user-action', {
            'action.type': 'click',
            'action.target': 'test-button'
          })
          
          return 'user interaction tracked'
        })
        
        const duration = Date.now() - startTime
        addResult('用户交互追踪', 'success', '用户交互追踪测试成功', duration)
        ElMessage.success('用户交互追踪测试成功')
      } catch (error) {
        const duration = Date.now() - startTime
        addResult('用户交互追踪', 'error', error.message, duration)
        ElMessage.error('用户交互追踪测试失败')
      } finally {
        loading.userInteraction = false
      }
    }

    const testPerformanceMonitoring = async () => {
      loading.performance = true
      const startTime = Date.now()
      
      try {
        // 模拟性能监控测试
        const span = createCustomSpan('performance-test', {
          'performance.test': 'memory-usage',
          'performance.timestamp': Date.now()
        })
        
        await runInSpan(span, async () => {
          // 模拟内存密集型操作
          const largeArray = new Array(1000000).fill(0).map((_, i) => i)
          
          // 添加性能指标
          span.setAttribute('performance.memory.usage', performance.memory?.usedJSHeapSize || 0)
          span.setAttribute('performance.array.size', largeArray.length)
          
          // 清理内存
          largeArray.length = 0
          
          return 'performance test completed'
        })
        
        const duration = Date.now() - startTime
        addResult('性能监控', 'success', '性能监控测试成功', duration)
        ElMessage.success('性能监控测试成功')
      } catch (error) {
        const duration = Date.now() - startTime
        addResult('性能监控', 'error', error.message, duration)
        ElMessage.error('性能监控测试失败')
      } finally {
        loading.performance = false
      }
    }

    return {
      loading,
      batchSize,
      testResults,
      clearResults,
      copyToClipboard,
      formatTime,
      testGetRequest,
      testPostRequest,
      testPutRequest,
      testDeleteRequest,
      testNetworkError,
      testTimeoutError,
      testServerError,
      testBatchRequests,
      testConcurrentRequests,
      testCustomSpan,
      testUserInteraction,
      testPerformanceMonitoring
    }
  }
}
</script>

<style scoped>
.trace-test-page {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
  text-align: center;
}

.page-header h1 {
  color: #303133;
  margin-bottom: 10px;
}

.page-header p {
  color: #909399;
  font-size: 14px;
}

.test-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.test-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.test-content .el-button {
  margin-bottom: 10px;
}

.results-card {
  margin-top: 20px;
}

.results-content {
  max-height: 400px;
  overflow-y: auto;
}
</style>
