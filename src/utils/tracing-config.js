// 追踪系统配置
export const tracingConfig = {
  // 是否启用追踪
  enabled: process.env.VUE_APP_TRACE_ENABLED === 'true' || process.env.NODE_ENV === 'development',
  
  // 采样率 (0.0 - 1.0)
  sampleRate: parseFloat(process.env.VUE_APP_TRACE_SAMPLE_RATE) || 1.0,
  
  // OTLP 端点
  otlpEndpoint: process.env.VUE_APP_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
  
  // 服务信息
  service: {
    name: process.env.VUE_APP_SERVICE_NAME || 'vue-admin-frontend',
    version: process.env.VUE_APP_SERVICE_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  },
  
  // 性能配置
  performance: {
    // 批量处理配置
    batchSize: 2048,
    batchDelay: 5000, // 5秒
    exportTimeout: 30000, // 30秒
    
    // 慢请求阈值 (毫秒)
    slowRequestThreshold: 1000,
    
    // 最大追踪记录数
    maxTraces: 1000
  },
  
  // 追踪头配置
  headers: {
    traceId: 'X-Trace-Id',
    spanId: 'X-Span-Id',
    parentSpanId: 'X-Parent-Span-Id'
  },
  
  // 忽略的请求
  ignoredUrls: [
    '/health',
    '/ping',
    '/favicon.ico',
    /\.(css|js|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/
  ],
  
  // 敏感信息过滤
  sensitiveHeaders: [
    'authorization',
    'cookie',
    'x-token',
    'x-api-key'
  ],
  
  // 自定义属性
  attributes: {
    // 用户信息
    user: {
      id: () => localStorage.getItem('userId') || 'anonymous',
      agent: () => navigator.userAgent,
      language: () => navigator.language,
      timezone: () => Intl.DateTimeFormat().resolvedOptions().timeZone
    },
    
    // 页面信息
    page: {
      url: () => window.location.href,
      title: () => document.title,
      referrer: () => document.referrer
    },
    
    // 性能信息
    performance: {
      loadTime: () => performance.timing.loadEventEnd - performance.timing.navigationStart,
      domReady: () => performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart
    }
  }
}

// 检查是否应该追踪某个请求
export const shouldTrace = (url, method) => {
  if (!tracingConfig.enabled) return false
  
  // 检查采样率
  if (Math.random() > tracingConfig.sampleRate) return false
  
  // 检查忽略的 URL
  for (const pattern of tracingConfig.ignoredUrls) {
    if (typeof pattern === 'string' && url.includes(pattern)) {
      return false
    }
    if (pattern instanceof RegExp && pattern.test(url)) {
      return false
    }
  }
  
  return true
}

// 过滤敏感信息
export const filterSensitiveData = (headers) => {
  const filtered = { ...headers }
  
  tracingConfig.sensitiveHeaders.forEach(header => {
    if (filtered[header]) {
      filtered[header] = '[REDACTED]'
    }
  })
  
  return filtered
}

// 获取自定义属性
export const getCustomAttributes = () => {
  const attributes = {}
  
  Object.entries(tracingConfig.attributes).forEach(([category, props]) => {
    Object.entries(props).forEach(([key, getter]) => {
      try {
        attributes[`${category}.${key}`] = getter()
      } catch (error) {
        console.warn(`Failed to get attribute ${category}.${key}:`, error)
      }
    })
  })
  
  return attributes
}

// 性能监控配置
export const performanceConfig = {
  // 性能指标阈值
  thresholds: {
    slowRequest: 1000, // 1秒
    verySlowRequest: 3000, // 3秒
    memoryWarning: 50 * 1024 * 1024, // 50MB
    cpuWarning: 80 // 80%
  },
  
  // 监控间隔 (毫秒)
  monitorInterval: 5000,
  
  // 是否启用性能监控
  enabled: process.env.VUE_APP_PERFORMANCE_MONITORING === 'true'
}

// 错误追踪配置
export const errorConfig = {
  // 是否启用错误追踪
  enabled: process.env.VUE_APP_ERROR_TRACKING === 'true' || process.env.NODE_ENV === 'development',
  
  // 忽略的错误类型
  ignoredErrors: [
    'Script error.',
    'ResizeObserver loop limit exceeded',
    'Network Error',
    'timeout of 5000ms exceeded'
  ],
  
  // 错误采样率
  sampleRate: 1.0,
  
  // 最大错误记录数
  maxErrors: 100
}

// 用户行为追踪配置
export const userBehaviorConfig = {
  // 是否启用用户行为追踪
  enabled: process.env.VUE_APP_USER_BEHAVIOR_TRACKING === 'true',
  
  // 追踪的事件类型
  events: {
    click: true,
    scroll: false,
    input: false,
    navigation: true,
    form: true
  },
  
  // 忽略的元素
  ignoredSelectors: [
    '.no-track',
    '[data-no-track]',
    'button[type="submit"]'
  ]
}

export default tracingConfig
