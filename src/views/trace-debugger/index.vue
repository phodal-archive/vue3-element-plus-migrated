<template>
  <div class="trace-debugger-page">
    <div class="page-header">
      <h1>🔍 请求追踪调试器</h1>
      <p>实时监控和分析前端 HTTP 请求，支持与后端 trace id 关联</p>
    </div>

    <el-row :gutter="20">
      <!-- 追踪调试面板 -->
      <el-col :span="16">
        <TraceDebugger />
      </el-col>
      
      <!-- 性能监控面板 -->
      <el-col :span="8">
        <PerformanceMonitor />
      </el-col>
    </el-row>

    <el-row :gutter="20">
      <!-- 控制面板 -->
      <el-col :span="24">

      <!-- 控制面板 -->
      <el-col :span="8">
        <el-card class="control-panel" shadow="hover">
          <template #header>
            <div class="card-header">
              <span>⚙️ 控制面板</span>
            </div>
          </template>

          <div class="control-content">
            <!-- 追踪设置 -->
            <div class="control-section">
              <h4>追踪设置</h4>
              <el-form label-width="100px">
                <el-form-item label="启用追踪">
                  <el-switch
                    v-model="tracingEnabled"
                    @change="toggleTracing"
                  />
                </el-form-item>
                <el-form-item label="最大记录数">
                  <el-input-number
                    v-model="maxTraces"
                    :min="100"
                    :max="10000"
                    @change="setMaxTraces"
                  />
                </el-form-item>
                <el-form-item label="慢请求阈值">
                  <el-input-number
                    v-model="slowRequestThreshold"
                    :min="100"
                    :max="10000"
                    suffix="ms"
                  />
                </el-form-item>
              </el-form>
            </div>

            <!-- 测试请求 -->
            <div class="control-section">
              <h4>测试请求</h4>
              <el-button 
                type="primary" 
                @click="testRequest"
                :loading="testLoading"
              >
                发送测试请求
              </el-button>
              <el-button 
                type="success" 
                @click="testSuccessRequest"
                :loading="testLoading"
              >
                成功请求
              </el-button>
              <el-button 
                type="danger" 
                @click="testErrorRequest"
                :loading="testLoading"
              >
                错误请求
              </el-button>
            </div>

            <!-- 数据导出 -->
            <div class="control-section">
              <h4>数据导出</h4>
              <el-button 
                type="primary" 
                @click="exportData('json')"
                size="small"
              >
                导出 JSON
              </el-button>
              <el-button 
                type="success" 
                @click="exportData('csv')"
                size="small"
              >
                导出 CSV
              </el-button>
            </div>

            <!-- 性能分析 -->
            <div class="control-section">
              <h4>性能分析</h4>
              <el-button 
                type="warning" 
                @click="analyzePerformance"
                size="small"
              >
                分析性能
              </el-button>
            </div>
          </div>
        </el-card>

        <!-- 性能分析结果 -->
        <el-card v-if="performanceAnalysis" class="analysis-panel" shadow="hover">
          <template #header>
            <div class="card-header">
              <span>📊 性能分析结果</span>
            </div>
          </template>

          <div class="analysis-content">
            <!-- 统计信息 -->
            <div class="analysis-stats">
              <el-row :gutter="10">
                <el-col :span="12">
                  <div class="stat-box">
                    <div class="stat-value">{{ performanceAnalysis.slowTraces.length }}</div>
                    <div class="stat-label">慢请求</div>
                  </div>
                </el-col>
                <el-col :span="12">
                  <div class="stat-box">
                    <div class="stat-value error">{{ performanceAnalysis.errorTraces.length }}</div>
                    <div class="stat-label">错误请求</div>
                  </div>
                </el-col>
              </el-row>
            </div>

            <!-- 优化建议 -->
            <div class="recommendations">
              <h5>优化建议</h5>
              <div v-if="performanceAnalysis.recommendations.length === 0" class="no-recommendations">
                暂无优化建议
              </div>
              <el-alert
                v-for="(rec, index) in performanceAnalysis.recommendations"
                :key="index"
                :title="rec.message"
                :type="rec.severity === 'high' ? 'error' : 'warning'"
                :closable="false"
                show-icon
                class="recommendation-item"
              />
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 追踪详情对话框 -->
    <el-dialog
      v-model="traceDetailVisible"
      title="追踪详情"
      width="90%"
      :before-close="closeTraceDetail"
    >
      <div v-if="selectedTrace" class="trace-detail-content">
        <!-- 基本信息 -->
        <el-descriptions :column="3" border>
          <el-descriptions-item label="Trace ID">
            <el-input 
              :value="selectedTrace.traceId" 
              readonly 
              size="small"
            >
              <template #append>
                <el-button @click="copyToClipboard(selectedTrace.traceId)">
                  复制
                </el-button>
              </template>
            </el-input>
          </el-descriptions-item>
          <el-descriptions-item label="请求方法">
            <el-tag :type="getMethodType(selectedTrace.method)">
              {{ selectedTrace.method }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="响应状态">
            <el-tag :type="getStatusType(selectedTrace.status)">
              {{ selectedTrace.status }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="请求URL">
            {{ selectedTrace.url }}
          </el-descriptions-item>
          <el-descriptions-item label="请求耗时">
            <span :class="getDurationClass(selectedTrace.duration)">
              {{ selectedTrace.duration }}ms
            </span>
          </el-descriptions-item>
          <el-descriptions-item label="请求时间">
            {{ formatTime(selectedTrace.timestamp) }}
          </el-descriptions-item>
        </el-descriptions>

        <!-- 请求头信息 -->
        <div class="detail-section">
          <h4>请求头信息</h4>
          <el-input
            type="textarea"
            :value="JSON.stringify(selectedTrace.headers, null, 2)"
            :rows="6"
            readonly
          />
        </div>

        <!-- 响应数据 -->
        <div class="detail-section">
          <h4>响应数据</h4>
          <el-input
            type="textarea"
            :value="JSON.stringify(selectedTrace.response, null, 2)"
            :rows="8"
            readonly
          />
        </div>

        <!-- 错误信息 -->
        <div v-if="selectedTrace.error" class="detail-section">
          <h4>错误信息</h4>
          <el-alert
            :title="selectedTrace.error"
            type="error"
            :closable="false"
            show-icon
          />
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import TraceDebugger from '@/components/TraceDebugger/index.vue'
import PerformanceMonitor from '@/components/PerformanceMonitor/index.vue'
import traceManager from '@/utils/traceManager'
import request from '@/utils/request'

export default {
  name: 'TraceDebuggerPage',
  components: {
    TraceDebugger,
    PerformanceMonitor
  },
  setup() {
    const tracingEnabled = ref(true)
    const maxTraces = ref(1000)
    const slowRequestThreshold = ref(1000)
    const testLoading = ref(false)
    const performanceAnalysis = ref(null)
    const traceDetailVisible = ref(false)
    const selectedTrace = ref(null)

    // 切换追踪状态
    const toggleTracing = (enabled) => {
      traceManager.setEnabled(enabled)
      ElMessage.success(enabled ? '追踪已启用' : '追踪已禁用')
    }

    // 设置最大追踪记录数
    const setMaxTraces = (max) => {
      traceManager.setMaxTraces(max)
      ElMessage.success(`最大追踪记录数已设置为 ${max}`)
    }

    // 测试请求
    const testRequest = async () => {
      testLoading.value = true
      try {
        await request({
          url: '/api/test',
          method: 'get'
        })
        ElMessage.success('测试请求发送成功')
      } catch (error) {
        ElMessage.error('测试请求失败')
      } finally {
        testLoading.value = false
      }
    }

    // 测试成功请求
    const testSuccessRequest = async () => {
      testLoading.value = true
      try {
        await request({
          url: '/api/success',
          method: 'post',
          data: { test: true }
        })
        ElMessage.success('成功请求测试完成')
      } catch (error) {
        ElMessage.error('成功请求测试失败')
      } finally {
        testLoading.value = false
      }
    }

    // 测试错误请求
    const testErrorRequest = async () => {
      testLoading.value = true
      try {
        await request({
          url: '/api/error',
          method: 'get'
        })
      } catch (error) {
        ElMessage.info('错误请求测试完成（这是预期的错误）')
      } finally {
        testLoading.value = false
      }
    }

    // 导出数据
    const exportData = (format) => {
      const data = traceManager.exportTraces(format)
      if (data) {
        const blob = new Blob([data], { 
          type: format === 'json' ? 'application/json' : 'text/csv' 
        })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `traces.${format}`
        a.click()
        URL.revokeObjectURL(url)
        ElMessage.success(`数据已导出为 ${format.toUpperCase()} 格式`)
      }
    }

    // 分析性能
    const analyzePerformance = () => {
      performanceAnalysis.value = traceManager.analyzePerformance()
      ElMessage.success('性能分析完成')
    }

    // 显示追踪详情
    const showTraceDetail = (trace) => {
      selectedTrace.value = trace
      traceDetailVisible.value = true
    }

    // 关闭追踪详情
    const closeTraceDetail = () => {
      traceDetailVisible.value = false
      selectedTrace.value = null
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

    // 工具方法
    const getMethodType = (method) => {
      const types = {
        GET: 'success',
        POST: 'primary',
        PUT: 'warning',
        DELETE: 'danger',
        PATCH: 'info'
      }
      return types[method] || 'info'
    }

    const getStatusType = (status) => {
      if (status >= 200 && status < 300) return 'success'
      if (status >= 400 && status < 500) return 'warning'
      if (status >= 500) return 'danger'
      return 'info'
    }

    const getDurationClass = (duration) => {
      if (duration < 100) return 'duration-fast'
      if (duration < 500) return 'duration-normal'
      return 'duration-slow'
    }

    const formatTime = (timestamp) => {
      return new Date(timestamp).toLocaleString()
    }

    onMounted(() => {
      // 初始化设置
      traceManager.setEnabled(tracingEnabled.value)
      traceManager.setMaxTraces(maxTraces.value)
    })

    return {
      tracingEnabled,
      maxTraces,
      slowRequestThreshold,
      testLoading,
      performanceAnalysis,
      traceDetailVisible,
      selectedTrace,
      toggleTracing,
      setMaxTraces,
      testRequest,
      testSuccessRequest,
      testErrorRequest,
      exportData,
      analyzePerformance,
      showTraceDetail,
      closeTraceDetail,
      copyToClipboard,
      getMethodType,
      getStatusType,
      getDurationClass,
      formatTime
    }
  }
}
</script>

<style scoped>
.trace-debugger-page {
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

.control-panel {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.control-content {
  padding: 10px 0;
}

.control-section {
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #ebeef5;
}

.control-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.control-section h4 {
  margin-bottom: 15px;
  color: #303133;
  font-size: 14px;
}

.analysis-panel {
  margin-top: 20px;
}

.analysis-content {
  padding: 10px 0;
}

.analysis-stats {
  margin-bottom: 20px;
}

.stat-box {
  text-align: center;
  padding: 15px;
  background: #f5f7fa;
  border-radius: 8px;
  margin-bottom: 10px;
}

.stat-value {
  font-size: 20px;
  font-weight: bold;
  color: #409eff;
}

.stat-value.error {
  color: #f56c6c;
}

.stat-label {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
}

.recommendations h5 {
  margin-bottom: 10px;
  color: #303133;
}

.no-recommendations {
  text-align: center;
  color: #909399;
  padding: 20px;
}

.recommendation-item {
  margin-bottom: 10px;
}

.trace-detail-content {
  max-height: 600px;
  overflow-y: auto;
}

.detail-section {
  margin-top: 20px;
}

.detail-section h4 {
  margin-bottom: 10px;
  color: #303133;
}

.duration-fast {
  color: #67c23a;
}

.duration-normal {
  color: #e6a23c;
}

.duration-slow {
  color: #f56c6c;
}
</style>
