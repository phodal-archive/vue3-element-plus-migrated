import { generateTraceId, generateSpanId } from './tracing'

class TraceManager {
  constructor() {
    this.traces = []
    this.maxTraces = 1000
    this.isEnabled = true
    this.listeners = []
  }

  // 添加追踪记录
  addTrace(traceData) {
    if (!this.isEnabled) return

    const trace = {
      id: generateTraceId(),
      ...traceData,
      timestamp: Date.now(),
      createdAt: new Date().toISOString()
    }

    this.traces.unshift(trace)

    // 限制记录数量
    if (this.traces.length > this.maxTraces) {
      this.traces = this.traces.slice(0, this.maxTraces)
    }

    // 通知监听器
    this.notifyListeners(trace)

    return trace
  }

  // 获取所有追踪记录
  getTraces() {
    return this.traces
  }

  // 根据条件查询追踪记录
  queryTraces(filters = {}) {
    let filteredTraces = [...this.traces]

    if (filters.method) {
      filteredTraces = filteredTraces.filter(trace => 
        trace.method === filters.method
      )
    }

    if (filters.status) {
      filteredTraces = filteredTraces.filter(trace => 
        trace.status === filters.status
      )
    }

    if (filters.url) {
      filteredTraces = filteredTraces.filter(trace => 
        trace.url.includes(filters.url)
      )
    }

    if (filters.traceId) {
      filteredTraces = filteredTraces.filter(trace => 
        trace.traceId === filters.traceId
      )
    }

    if (filters.minDuration) {
      filteredTraces = filteredTraces.filter(trace => 
        trace.duration >= filters.minDuration
      )
    }

    if (filters.maxDuration) {
      filteredTraces = filteredTraces.filter(trace => 
        trace.duration <= filters.maxDuration
      )
    }

    if (filters.startTime) {
      filteredTraces = filteredTraces.filter(trace => 
        trace.timestamp >= filters.startTime
      )
    }

    if (filters.endTime) {
      filteredTraces = filteredTraces.filter(trace => 
        trace.timestamp <= filters.endTime
      )
    }

    return filteredTraces
  }

  // 获取追踪统计信息
  getStats() {
    const total = this.traces.length
    const success = this.traces.filter(trace => trace.status >= 200 && trace.status < 300).length
    const error = this.traces.filter(trace => trace.status >= 400).length
    const pending = this.traces.filter(trace => trace.status === 'pending').length

    const durations = this.traces
      .filter(trace => trace.duration > 0)
      .map(trace => trace.duration)

    const avgDuration = durations.length > 0 
      ? Math.round(durations.reduce((sum, duration) => sum + duration, 0) / durations.length)
      : 0

    const minDuration = durations.length > 0 ? Math.min(...durations) : 0
    const maxDuration = durations.length > 0 ? Math.max(...durations) : 0

    return {
      total,
      success,
      error,
      pending,
      avgDuration,
      minDuration,
      maxDuration
    }
  }

  // 获取错误追踪记录
  getErrorTraces() {
    return this.traces.filter(trace => trace.status >= 400)
  }

  // 获取慢请求追踪记录（超过指定阈值的请求）
  getSlowTraces(threshold = 1000) {
    return this.traces.filter(trace => trace.duration > threshold)
  }

  // 根据 Trace ID 查找追踪记录
  findByTraceId(traceId) {
    return this.traces.find(trace => trace.traceId === traceId)
  }

  // 根据 URL 查找追踪记录
  findByUrl(url) {
    return this.traces.filter(trace => trace.url.includes(url))
  }

  // 清空追踪记录
  clearTraces() {
    this.traces = []
    this.notifyListeners(null, 'clear')
  }

  // 启用/禁用追踪
  setEnabled(enabled) {
    this.isEnabled = enabled
  }

  // 设置最大追踪记录数
  setMaxTraces(max) {
    this.maxTraces = max
    if (this.traces.length > max) {
      this.traces = this.traces.slice(0, max)
    }
  }

  // 导出追踪数据
  exportTraces(format = 'json') {
    if (format === 'json') {
      return JSON.stringify(this.traces, null, 2)
    } else if (format === 'csv') {
      return this.toCSV()
    }
    return null
  }

  // 转换为 CSV 格式
  toCSV() {
    if (this.traces.length === 0) return ''

    const headers = ['Method', 'URL', 'Status', 'Duration', 'Trace ID', 'Timestamp', 'Error']
    const rows = this.traces.map(trace => [
      trace.method,
      trace.url,
      trace.status,
      trace.duration,
      trace.traceId,
      new Date(trace.timestamp).toISOString(),
      trace.error || ''
    ])

    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')
  }

  // 添加监听器
  addListener(callback) {
    this.listeners.push(callback)
  }

  // 移除监听器
  removeListener(callback) {
    const index = this.listeners.indexOf(callback)
    if (index > -1) {
      this.listeners.splice(index, 1)
    }
  }

  // 通知监听器
  notifyListeners(trace, action = 'add') {
    this.listeners.forEach(callback => {
      try {
        callback(trace, action)
      } catch (error) {
        console.error('Trace listener error:', error)
      }
    })
  }

  // 获取追踪链（父子关系）
  getTraceChain(traceId) {
    const trace = this.findByTraceId(traceId)
    if (!trace) return []

    const chain = [trace]
    let currentTrace = trace

    // 查找父追踪记录
    while (currentTrace.parentTraceId) {
      const parentTrace = this.findByTraceId(currentTrace.parentTraceId)
      if (parentTrace) {
        chain.unshift(parentTrace)
        currentTrace = parentTrace
      } else {
        break
      }
    }

    return chain
  }

  // 获取相关追踪记录（相同用户、相似时间等）
  getRelatedTraces(traceId) {
    const trace = this.findByTraceId(traceId)
    if (!trace) return []

    const timeWindow = 5 * 60 * 1000 // 5分钟时间窗口
    const startTime = trace.timestamp - timeWindow
    const endTime = trace.timestamp + timeWindow

    return this.traces.filter(t => 
      t.traceId !== traceId &&
      t.timestamp >= startTime &&
      t.timestamp <= endTime
    )
  }

  // 分析性能瓶颈
  analyzePerformance() {
    const slowTraces = this.getSlowTraces(500)
    const errorTraces = this.getErrorTraces()
    
    const urlStats = {}
    this.traces.forEach(trace => {
      if (!urlStats[trace.url]) {
        urlStats[trace.url] = {
          count: 0,
          totalDuration: 0,
          errors: 0,
          avgDuration: 0
        }
      }
      
      urlStats[trace.url].count++
      urlStats[trace.url].totalDuration += trace.duration || 0
      if (trace.status >= 400) {
        urlStats[trace.url].errors++
      }
    })

    // 计算平均耗时
    Object.keys(urlStats).forEach(url => {
      urlStats[url].avgDuration = Math.round(urlStats[url].totalDuration / urlStats[url].count)
    })

    return {
      slowTraces,
      errorTraces,
      urlStats,
      recommendations: this.generateRecommendations(urlStats, slowTraces, errorTraces)
    }
  }

  // 生成性能优化建议
  generateRecommendations(urlStats, slowTraces, errorTraces) {
    const recommendations = []

    // 分析慢请求
    if (slowTraces.length > 0) {
      recommendations.push({
        type: 'performance',
        severity: 'high',
        message: `发现 ${slowTraces.length} 个慢请求，建议优化相关接口性能`
      })
    }

    // 分析错误率高的接口
    Object.keys(urlStats).forEach(url => {
      const stats = urlStats[url]
      const errorRate = (stats.errors / stats.count) * 100
      if (errorRate > 10) {
        recommendations.push({
          type: 'reliability',
          severity: 'high',
          message: `接口 ${url} 错误率 ${errorRate.toFixed(1)}%，建议检查服务稳定性`
        })
      }
    })

    // 分析平均响应时间
    Object.keys(urlStats).forEach(url => {
      const stats = urlStats[url]
      if (stats.avgDuration > 1000) {
        recommendations.push({
          type: 'performance',
          severity: 'medium',
          message: `接口 ${url} 平均响应时间 ${stats.avgDuration}ms，建议优化`
        })
      }
    })

    return recommendations
  }
}

// 创建单例实例
const traceManager = new TraceManager()

export default traceManager
