<template>
  <div class="trace-debugger">
    <el-card class="trace-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span>🔍 请求追踪调试器</span>
          <div class="header-actions">
            <el-button 
              size="small" 
              type="primary" 
              @click="clearTraces"
              :disabled="traces.length === 0"
            >
              清空记录
            </el-button>
            <el-switch
              v-model="isEnabled"
              active-text="启用追踪"
              inactive-text="禁用追踪"
              @change="toggleTracing"
            />
          </div>
        </div>
      </template>

      <div class="trace-content">
        <!-- 统计信息 -->
        <div class="trace-stats">
          <el-row :gutter="20">
            <el-col :span="6">
              <div class="stat-item">
                <div class="stat-number">{{ traces.length }}</div>
                <div class="stat-label">总请求数</div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="stat-item">
                <div class="stat-number success">{{ successCount }}</div>
                <div class="stat-label">成功请求</div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="stat-item">
                <div class="stat-number error">{{ errorCount }}</div>
                <div class="stat-label">失败请求</div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="stat-item">
                <div class="stat-number">{{ avgDuration }}ms</div>
                <div class="stat-label">平均耗时</div>
              </div>
            </el-col>
          </el-row>
        </div>

        <!-- 追踪列表 -->
        <div class="trace-list">
          <el-table 
            :data="traces" 
            style="width: 100%"
            max-height="400"
            @row-click="showTraceDetail"
          >
            <el-table-column prop="method" label="方法" width="80">
              <template #default="{ row }">
                <el-tag 
                  :type="getMethodType(row.method)" 
                  size="small"
                >
                  {{ row.method }}
                </el-tag>
              </template>
            </el-table-column>
            
            <el-table-column prop="url" label="URL" min-width="200">
              <template #default="{ row }">
                <div class="url-cell">
                  <span class="url-text">{{ row.url }}</span>
                  <el-tag 
                    v-if="row.traceId" 
                    size="small" 
                    type="info"
                    class="trace-id"
                  >
                    {{ row.traceId.substring(0, 8) }}...
                  </el-tag>
                </div>
              </template>
            </el-table-column>
            
            <el-table-column prop="status" label="状态" width="80">
              <template #default="{ row }">
                <el-tag 
                  :type="getStatusType(row.status)" 
                  size="small"
                >
                  {{ row.status }}
                </el-tag>
              </template>
            </el-table-column>
            
            <el-table-column prop="duration" label="耗时" width="100">
              <template #default="{ row }">
                <span :class="getDurationClass(row.duration)">
                  {{ row.duration }}ms
                </span>
              </template>
            </el-table-column>
            
            <el-table-column prop="timestamp" label="时间" width="150">
              <template #default="{ row }">
                {{ formatTime(row.timestamp) }}
              </template>
            </el-table-column>
            
            <el-table-column label="操作" width="120">
              <template #default="{ row }">
                <el-button 
                  size="small" 
                  type="primary" 
                  @click.stop="showTraceDetail(row)"
                >
                  详情
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </el-card>

    <!-- 追踪详情对话框 -->
    <el-dialog
      v-model="detailVisible"
      title="追踪详情"
      width="80%"
      :before-close="closeDetail"
    >
      <div v-if="selectedTrace" class="trace-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="请求方法">
            <el-tag :type="getMethodType(selectedTrace.method)">
              {{ selectedTrace.method }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="请求URL">
            {{ selectedTrace.url }}
          </el-descriptions-item>
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
          <el-descriptions-item label="Span ID">
            {{ selectedTrace.spanId }}
          </el-descriptions-item>
          <el-descriptions-item label="响应状态">
            <el-tag :type="getStatusType(selectedTrace.status)">
              {{ selectedTrace.status }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="请求耗时">
            <span :class="getDurationClass(selectedTrace.duration)">
              {{ selectedTrace.duration }}ms
            </span>
          </el-descriptions-item>
          <el-descriptions-item label="请求时间">
            {{ formatTime(selectedTrace.timestamp) }}
          </el-descriptions-item>
          <el-descriptions-item label="响应大小">
            {{ selectedTrace.responseSize }} bytes
          </el-descriptions-item>
        </el-descriptions>

        <!-- 请求头信息 -->
        <div class="detail-section">
          <h4>请求头</h4>
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'

export default {
  name: 'TraceDebugger',
  setup() {
    const traces = ref([])
    const isEnabled = ref(true)
    const detailVisible = ref(false)
    const selectedTrace = ref(null)

    // 计算属性
    const successCount = computed(() => {
      return traces.value.filter(trace => trace.status >= 200 && trace.status < 300).length
    })

    const errorCount = computed(() => {
      return traces.value.filter(trace => trace.status >= 400).length
    })

    const avgDuration = computed(() => {
      if (traces.value.length === 0) return 0
      const total = traces.value.reduce((sum, trace) => sum + trace.duration, 0)
      return Math.round(total / traces.value.length)
    })

    // 方法
    const addTrace = (traceData) => {
      if (!isEnabled.value) return
      
      traces.value.unshift({
        ...traceData,
        timestamp: Date.now()
      })

      // 限制记录数量
      if (traces.value.length > 100) {
        traces.value = traces.value.slice(0, 100)
      }
    }

    const clearTraces = () => {
      traces.value = []
      ElMessage.success('追踪记录已清空')
    }

    const toggleTracing = (value) => {
      isEnabled.value = value
      ElMessage.success(value ? '追踪已启用' : '追踪已禁用')
    }

    const showTraceDetail = (trace) => {
      selectedTrace.value = trace
      detailVisible.value = true
    }

    const closeDetail = () => {
      detailVisible.value = false
      selectedTrace.value = null
    }

    const copyToClipboard = async (text) => {
      try {
        await navigator.clipboard.writeText(text)
        ElMessage.success('已复制到剪贴板')
      } catch (err) {
        ElMessage.error('复制失败')
      }
    }

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
      return new Date(timestamp).toLocaleTimeString()
    }

    // 监听全局追踪事件
    const handleTraceEvent = (event) => {
      if (event.detail && event.detail.type === 'trace') {
        addTrace(event.detail.data)
      }
    }

    onMounted(() => {
      window.addEventListener('trace-event', handleTraceEvent)
    })

    onUnmounted(() => {
      window.removeEventListener('trace-event', handleTraceEvent)
    })

    return {
      traces,
      isEnabled,
      detailVisible,
      selectedTrace,
      successCount,
      errorCount,
      avgDuration,
      addTrace,
      clearTraces,
      toggleTracing,
      showTraceDetail,
      closeDetail,
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
.trace-debugger {
  margin: 20px;
}

.trace-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.trace-content {
  padding: 10px 0;
}

.trace-stats {
  margin-bottom: 20px;
}

.stat-item {
  text-align: center;
  padding: 15px;
  background: #f5f7fa;
  border-radius: 8px;
}

.stat-number {
  font-size: 24px;
  font-weight: bold;
  color: #409eff;
}

.stat-number.success {
  color: #67c23a;
}

.stat-number.error {
  color: #f56c6c;
}

.stat-label {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
}

.trace-list {
  margin-top: 20px;
}

.url-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.url-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.trace-id {
  flex-shrink: 0;
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

.trace-detail {
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
</style>
