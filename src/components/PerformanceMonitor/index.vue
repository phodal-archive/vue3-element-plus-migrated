<template>
  <div class="performance-monitor">
    <el-card class="monitor-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span>📊 性能监控</span>
          <el-switch
            v-model="isEnabled"
            active-text="启用监控"
            inactive-text="禁用监控"
            @change="toggleMonitoring"
          />
        </div>
      </template>

      <div class="monitor-content">
        <!-- 性能指标 -->
        <div class="metrics-grid">
          <div class="metric-item">
            <div class="metric-value" :class="getMemoryClass()">
              {{ formatMemory(memoryUsage) }}
            </div>
            <div class="metric-label">内存使用</div>
          </div>
          
          <div class="metric-item">
            <div class="metric-value" :class="getCpuClass()">
              {{ cpuUsage.toFixed(1) }}%
            </div>
            <div class="metric-label">CPU 使用率</div>
          </div>
          
          <div class="metric-item">
            <div class="metric-value">
              {{ fps }} FPS
            </div>
            <div class="metric-label">帧率</div>
          </div>
          
          <div class="metric-item">
            <div class="metric-value">
              {{ activeConnections }}
            </div>
            <div class="metric-label">活跃连接</div>
          </div>
        </div>

        <!-- 性能图表 -->
        <div class="charts-section">
          <div class="chart-container">
            <h4>内存使用趋势</h4>
            <div ref="memoryChart" class="chart"></div>
          </div>
          
          <div class="chart-container">
            <h4>CPU 使用趋势</h4>
            <div ref="cpuChart" class="chart"></div>
          </div>
        </div>

        <!-- 性能警告 -->
        <div v-if="warnings.length > 0" class="warnings-section">
          <h4>⚠️ 性能警告</h4>
          <el-alert
            v-for="(warning, index) in warnings"
            :key="index"
            :title="warning.message"
            :type="warning.type"
            :closable="false"
            show-icon
            class="warning-item"
          />
        </div>

        <!-- 性能建议 -->
        <div class="recommendations-section">
          <h4>💡 性能建议</h4>
          <div v-if="recommendations.length === 0" class="no-recommendations">
            当前性能表现良好，暂无优化建议
          </div>
          <el-alert
            v-for="(rec, index) in recommendations"
            :key="index"
            :title="rec.title"
            :description="rec.description"
            :type="rec.type"
            :closable="false"
            show-icon
            class="recommendation-item"
          />
        </div>
      </div>
    </el-card>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'

export default {
  name: 'PerformanceMonitor',
  setup() {
    const isEnabled = ref(true)
    const memoryUsage = ref(0)
    const cpuUsage = ref(0)
    const fps = ref(60)
    const activeConnections = ref(0)
    const warnings = ref([])
    const recommendations = ref([])
    
    // 图表引用
    const memoryChart = ref(null)
    const cpuChart = ref(null)
    
    // 监控数据
    const memoryHistory = ref([])
    const cpuHistory = ref([])
    const timeHistory = ref([])
    
    // 监控间隔
    let monitorInterval = null
    let fpsInterval = null
    let lastFrameTime = performance.now()
    let frameCount = 0
    
    // 计算属性
    const getMemoryClass = () => {
      if (memoryUsage.value > 100 * 1024 * 1024) return 'critical'
      if (memoryUsage.value > 50 * 1024 * 1024) return 'warning'
      return 'normal'
    }
    
    const getCpuClass = () => {
      if (cpuUsage.value > 80) return 'critical'
      if (cpuUsage.value > 50) return 'warning'
      return 'normal'
    }
    
    // 格式化内存使用量
    const formatMemory = (bytes) => {
      if (bytes === 0) return '0 B'
      const k = 1024
      const sizes = ['B', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }
    
    // 获取内存使用情况
    const getMemoryUsage = () => {
      if (performance.memory) {
        return performance.memory.usedJSHeapSize
      }
      return 0
    }
    
    // 获取 CPU 使用率（模拟）
    const getCpuUsage = () => {
      // 这里使用一个简化的 CPU 使用率计算
      // 在实际应用中，可能需要使用 Web Workers 或其他方法
      const load = Math.random() * 100
      return Math.min(load, 100)
    }
    
    // 计算 FPS
    const calculateFPS = () => {
      const now = performance.now()
      frameCount++
      
      if (now - lastFrameTime >= 1000) {
        fps.value = Math.round((frameCount * 1000) / (now - lastFrameTime))
        frameCount = 0
        lastFrameTime = now
      }
      
      requestAnimationFrame(calculateFPS)
    }
    
    // 更新监控数据
    const updateMetrics = () => {
      if (!isEnabled.value) return
      
      const now = Date.now()
      
      // 更新指标
      memoryUsage.value = getMemoryUsage()
      cpuUsage.value = getCpuUsage()
      
      // 添加到历史记录
      memoryHistory.value.push(memoryUsage.value)
      cpuHistory.value.push(cpuUsage.value)
      timeHistory.value.push(now)
      
      // 保持最近 60 个数据点
      if (memoryHistory.value.length > 60) {
        memoryHistory.value.shift()
        cpuHistory.value.shift()
        timeHistory.value.shift()
      }
      
      // 检查性能警告
      checkPerformanceWarnings()
      
      // 生成性能建议
      generateRecommendations()
      
      // 更新图表
      updateCharts()
    }
    
    // 检查性能警告
    const checkPerformanceWarnings = () => {
      warnings.value = []
      
      if (memoryUsage.value > 100 * 1024 * 1024) {
        warnings.value.push({
          type: 'error',
          message: `内存使用过高: ${formatMemory(memoryUsage.value)}`
        })
      } else if (memoryUsage.value > 50 * 1024 * 1024) {
        warnings.value.push({
          type: 'warning',
          message: `内存使用较高: ${formatMemory(memoryUsage.value)}`
        })
      }
      
      if (cpuUsage.value > 80) {
        warnings.value.push({
          type: 'error',
          message: `CPU 使用率过高: ${cpuUsage.value.toFixed(1)}%`
        })
      } else if (cpuUsage.value > 50) {
        warnings.value.push({
          type: 'warning',
          message: `CPU 使用率较高: ${cpuUsage.value.toFixed(1)}%`
        })
      }
      
      if (fps.value < 30) {
        warnings.value.push({
          type: 'error',
          message: `帧率过低: ${fps.value} FPS`
        })
      } else if (fps.value < 50) {
        warnings.value.push({
          type: 'warning',
          message: `帧率较低: ${fps.value} FPS`
        })
      }
    }
    
    // 生成性能建议
    const generateRecommendations = () => {
      recommendations.value = []
      
      if (memoryUsage.value > 50 * 1024 * 1024) {
        recommendations.value.push({
          type: 'warning',
          title: '内存优化建议',
          description: '考虑清理不必要的对象引用，避免内存泄漏'
        })
      }
      
      if (cpuUsage.value > 50) {
        recommendations.value.push({
          type: 'warning',
          title: 'CPU 优化建议',
          description: '检查是否有耗时的计算任务，考虑使用 Web Workers'
        })
      }
      
      if (fps.value < 50) {
        recommendations.value.push({
          type: 'warning',
          title: '渲染优化建议',
          description: '优化 DOM 操作，减少重排重绘，使用 CSS 动画'
        })
      }
    }
    
    // 初始化图表
    const initCharts = () => {
      if (!memoryChart.value || !cpuChart.value) return
      
      // 内存使用图表
      const memoryChartInstance = echarts.init(memoryChart.value)
      memoryChartInstance.setOption({
        title: { text: '内存使用趋势', textStyle: { fontSize: 12 } },
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'time', axisLabel: { formatter: '{HH}:{mm}:{ss}' } },
        yAxis: { type: 'value', name: '内存 (MB)' },
        series: [{
          name: '内存使用',
          type: 'line',
          data: [],
          smooth: true,
          areaStyle: { opacity: 0.3 }
        }]
      })
      
      // CPU 使用图表
      const cpuChartInstance = echarts.init(cpuChart.value)
      cpuChartInstance.setOption({
        title: { text: 'CPU 使用趋势', textStyle: { fontSize: 12 } },
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'time', axisLabel: { formatter: '{HH}:{mm}:{ss}' } },
        yAxis: { type: 'value', name: 'CPU (%)', max: 100 },
        series: [{
          name: 'CPU 使用率',
          type: 'line',
          data: [],
          smooth: true,
          areaStyle: { opacity: 0.3 }
        }]
      })
      
      // 保存图表实例
      window.memoryChart = memoryChartInstance
      window.cpuChart = cpuChartInstance
    }
    
    // 更新图表
    const updateCharts = () => {
      if (!window.memoryChart || !window.cpuChart) return
      
      // 更新内存图表
      const memoryData = timeHistory.value.map((time, index) => [
        time,
        memoryHistory.value[index] / (1024 * 1024) // 转换为 MB
      ])
      window.memoryChart.setOption({
        series: [{ data: memoryData }]
      })
      
      // 更新 CPU 图表
      const cpuData = timeHistory.value.map((time, index) => [
        time,
        cpuHistory.value[index]
      ])
      window.cpuChart.setOption({
        series: [{ data: cpuData }]
      })
    }
    
    // 切换监控状态
    const toggleMonitoring = (enabled) => {
      isEnabled.value = enabled
      if (enabled) {
        startMonitoring()
        ElMessage.success('性能监控已启用')
      } else {
        stopMonitoring()
        ElMessage.info('性能监控已禁用')
      }
    }
    
    // 开始监控
    const startMonitoring = () => {
      if (monitorInterval) return
      
      monitorInterval = setInterval(updateMetrics, 1000)
      calculateFPS()
    }
    
    // 停止监控
    const stopMonitoring = () => {
      if (monitorInterval) {
        clearInterval(monitorInterval)
        monitorInterval = null
      }
    }
    
    onMounted(() => {
      initCharts()
      if (isEnabled.value) {
        startMonitoring()
      }
    })
    
    onUnmounted(() => {
      stopMonitoring()
      if (window.memoryChart) {
        window.memoryChart.dispose()
      }
      if (window.cpuChart) {
        window.cpuChart.dispose()
      }
    })
    
    return {
      isEnabled,
      memoryUsage,
      cpuUsage,
      fps,
      activeConnections,
      warnings,
      recommendations,
      memoryChart,
      cpuChart,
      getMemoryClass,
      getCpuClass,
      formatMemory,
      toggleMonitoring
    }
  }
}
</script>

<style scoped>
.performance-monitor {
  margin: 20px;
}

.monitor-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.monitor-content {
  padding: 10px 0;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
}

.metric-item {
  text-align: center;
  padding: 15px;
  background: #f5f7fa;
  border-radius: 8px;
  border: 2px solid transparent;
}

.metric-value {
  font-size: 24px;
  font-weight: bold;
  color: #409eff;
  margin-bottom: 5px;
}

.metric-value.normal {
  color: #67c23a;
}

.metric-value.warning {
  color: #e6a23c;
}

.metric-value.critical {
  color: #f56c6c;
}

.metric-label {
  font-size: 12px;
  color: #909399;
}

.charts-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.chart-container {
  background: #f5f7fa;
  border-radius: 8px;
  padding: 15px;
}

.chart-container h4 {
  margin: 0 0 10px 0;
  color: #303133;
  font-size: 14px;
}

.chart {
  height: 200px;
  width: 100%;
}

.warnings-section,
.recommendations-section {
  margin-bottom: 20px;
}

.warnings-section h4,
.recommendations-section h4 {
  margin-bottom: 10px;
  color: #303133;
  font-size: 14px;
}

.warning-item,
.recommendation-item {
  margin-bottom: 10px;
}

.no-recommendations {
  text-align: center;
  color: #909399;
  padding: 20px;
  background: #f5f7fa;
  border-radius: 8px;
}

@media (max-width: 768px) {
  .charts-section {
    grid-template-columns: 1fr;
  }
  
  .metrics-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
