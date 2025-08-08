const express = require('express')
const cors = require('cors')
const { trace, context, SpanStatusCode } = require('@opentelemetry/api')

const app = express()
const PORT = 3001

// 中间件配置
app.use(cors())
app.use(express.json())

// 追踪中间件 - 处理前端传递的追踪信息
app.use((req, res, next) => {
  // 从请求头中获取追踪信息
  const traceId = req.headers['x-trace-id']
  const spanId = req.headers['x-span-id']
  const parentSpanId = req.headers['x-parent-span-id']
  
  console.log('🔍 收到前端追踪信息:', {
    traceId,
    spanId,
    parentSpanId,
    method: req.method,
    url: req.url,
    userAgent: req.headers['user-agent']
  })

  // 创建后端 span
  const tracer = trace.getTracer('backend-service')
  const span = tracer.startSpan('http-request', {
    attributes: {
      'http.method': req.method,
      'http.url': req.url,
      'http.request_id': traceId,
      'http.span_id': spanId,
      'http.parent_span_id': parentSpanId || '',
      'user.agent': req.headers['user-agent'],
      'request.timestamp': new Date().toISOString()
    }
  })

  // 将 span 添加到响应头中，便于前端接收
  res.setHeader('X-Backend-Trace-Id', traceId)
  res.setHeader('X-Backend-Span-Id', spanId)
  res.setHeader('X-Backend-Response-Time', Date.now())

  // 模拟处理时间
  const processingTime = Math.random() * 1000 + 100
  setTimeout(() => {
    // 记录处理结果
    span.setStatus({
      code: SpanStatusCode.OK
    })
    span.setAttribute('http.response.status_code', 200)
    span.setAttribute('http.response.size', JSON.stringify({ success: true }).length)
    span.setAttribute('processing.time_ms', processingTime)
    
    span.end()
  }, processingTime)

  next()
})

// 测试接口
app.get('/api/test', (req, res) => {
  console.log('✅ 处理测试请求')
  res.json({
    success: true,
    message: '测试请求成功',
    timestamp: new Date().toISOString(),
    traceInfo: {
      traceId: req.headers['x-trace-id'],
      spanId: req.headers['x-span-id'],
      parentSpanId: req.headers['x-parent-span-id']
    }
  })
})

// 成功接口
app.post('/api/success', (req, res) => {
  console.log('✅ 处理成功请求', req.body)
  res.json({
    success: true,
    message: '请求处理成功',
    data: req.body,
    timestamp: new Date().toISOString()
  })
})

// 错误接口
app.get('/api/error', (req, res) => {
  console.log('❌ 模拟错误请求')
  res.status(500).json({
    success: false,
    message: '模拟服务器错误',
    error: 'Internal Server Error',
    timestamp: new Date().toISOString()
  })
})

// 用户信息接口
app.get('/api/user/:id', (req, res) => {
  const userId = req.params.id
  console.log(`👤 获取用户信息: ${userId}`)
  
  // 模拟数据库查询
  setTimeout(() => {
    res.json({
      success: true,
      user: {
        id: userId,
        name: `用户${userId}`,
        email: `user${userId}@example.com`,
        createdAt: new Date().toISOString()
      }
    })
  }, Math.random() * 500 + 100)
})

// 数据列表接口
app.get('/api/data', (req, res) => {
  const page = parseInt(req.query.page) || 1
  const limit = parseInt(req.query.limit) || 10
  
  console.log(`📊 获取数据列表: 第${page}页，每页${limit}条`)
  
  // 模拟数据查询
  const data = Array.from({ length: limit }, (_, i) => ({
    id: (page - 1) * limit + i + 1,
    title: `数据项 ${(page - 1) * limit + i + 1}`,
    description: `这是第${page}页的第${i + 1}条数据`,
    createdAt: new Date().toISOString()
  }))
  
  setTimeout(() => {
    res.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total: 100,
        totalPages: Math.ceil(100 / limit)
      }
    })
  }, Math.random() * 300 + 50)
})

// 文件上传接口
app.post('/api/upload', (req, res) => {
  console.log('📁 处理文件上传请求')
  
  // 模拟文件上传处理
  setTimeout(() => {
    res.json({
      success: true,
      message: '文件上传成功',
      fileInfo: {
        filename: 'example.jpg',
        size: 1024 * 1024,
        type: 'image/jpeg',
        url: 'https://example.com/uploads/example.jpg'
      }
    })
  }, Math.random() * 1000 + 200)
})

// 健康检查接口
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
})

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('❌ 服务器错误:', err)
  
  const span = trace.getActiveSpan()
  if (span) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: err.message
    })
    span.recordException(err)
    span.end()
  }
  
  res.status(500).json({
    success: false,
    message: '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
  })
})

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 后端服务器启动成功`)
  console.log(`📍 服务地址: http://localhost:${PORT}`)
  console.log(`🔍 追踪调试: http://localhost:${PORT}/health`)
  console.log(`📝 支持的前端追踪头:`)
  console.log(`   - X-Trace-Id: 追踪ID`)
  console.log(`   - X-Span-Id: Span ID`)
  console.log(`   - X-Parent-Span-Id: 父Span ID`)
})

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('🛑 收到 SIGTERM 信号，正在关闭服务器...')
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('🛑 收到 SIGINT 信号，正在关闭服务器...')
  process.exit(0)
})

module.exports = app
