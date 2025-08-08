# 前端请求追踪系统

基于 Axios 和 OpenTelemetry 的前端请求追踪系统，用于监控和分析 HTTP 请求，支持与后端 trace id 关联。

## 功能特性

### 🔍 请求追踪
- 自动为每个 HTTP 请求生成唯一的 trace id 和 span id
- 在请求头中携带追踪信息，便于与后端关联
- 记录请求的详细信息：方法、URL、状态码、耗时等

### 📊 可视化调试
- 实时显示请求追踪信息
- 统计请求成功率和平均响应时间
- 识别慢请求和错误请求
- 支持查看请求详情和响应数据

### 🔧 性能分析
- 自动分析性能瓶颈
- 生成优化建议
- 支持数据导出（JSON/CSV 格式）

### 🎯 与后端集成
- 通过请求头传递 trace id 和 span id
- 支持与 Jaeger、Zipkin 等后端追踪系统集成
- 便于前后端联合调试

## 快速开始

### 1. 安装依赖

```bash
npm install @opentelemetry/api @opentelemetry/core @opentelemetry/context-zone @opentelemetry/sdk-trace-web @opentelemetry/sdk-trace-base @opentelemetry/instrumentation-document-load @opentelemetry/instrumentation-user-interaction @opentelemetry/instrumentation-fetch @opentelemetry/exporter-trace-otlp-http @opentelemetry/resources @opentelemetry/semantic-conventions
```

### 2. 配置环境变量

在项目根目录创建 `.env.development` 文件：

```env
# 开发环境配置
NODE_ENV = development

# API 基础路径
VUE_APP_BASE_API = '/dev-api'

# OpenTelemetry 配置
VUE_APP_OTLP_ENDPOINT = 'http://localhost:4318/v1/traces'

# 追踪配置
VUE_APP_TRACE_ENABLED = true
VUE_APP_TRACE_SAMPLE_RATE = 1.0
```

### 3. 访问追踪调试器

启动开发服务器后，访问 `/trace-debugger` 页面查看追踪调试器。

## 核心组件

### 1. 追踪配置 (`src/utils/tracing.js`)

OpenTelemetry 的核心配置，包括：
- Web Tracer Provider 设置
- OTLP 导出器配置
- 自动 instrumentations 注册
- 追踪工具函数

### 2. 请求拦截器 (`src/utils/request.js`)

增强的 Axios 拦截器，提供：
- 自动生成 trace id 和 span id
- 在请求头中添加追踪信息
- 记录请求开始和结束时间
- 发送追踪事件到调试面板

### 3. 追踪管理器 (`src/utils/traceManager.js`)

追踪数据的管理工具，提供：
- 追踪记录的存储和查询
- 性能分析和统计
- 数据导出功能
- 事件监听机制

### 4. 调试面板组件 (`src/components/TraceDebugger/index.vue`)

可视化的追踪调试界面，包括：
- 实时请求列表
- 统计信息展示
- 详情查看功能
- 控制面板

## 使用方法

### 基本使用

系统会自动追踪所有通过 Axios 发送的请求，无需额外配置。

### 查看追踪信息

1. 访问 `/trace-debugger` 页面
2. 在左侧面板查看实时请求列表
3. 点击请求查看详细信息
4. 使用右侧控制面板进行配置

### 与后端关联

前端会在每个请求的头部添加以下信息：

```
X-Trace-Id: <生成的 trace id>
X-Span-Id: <生成的 span id>
X-Parent-Span-Id: <父 span id>
```

后端可以读取这些头部信息来关联追踪：

```javascript
// 后端示例（Node.js）
app.use((req, res, next) => {
  const traceId = req.headers['x-trace-id']
  const spanId = req.headers['x-span-id']
  const parentSpanId = req.headers['x-parent-span-id']
  
  // 使用这些 ID 创建后端 span
  const span = tracer.startSpan('http-request', {
    attributes: {
      'http.method': req.method,
      'http.url': req.url,
      'trace.id': traceId,
      'span.id': spanId,
      'parent.span.id': parentSpanId
    }
  })
  
  // 处理请求...
  
  span.end()
  next()
})
```

### 配置 OpenTelemetry 后端

#### 使用 Jaeger

1. 启动 Jaeger：

```bash
docker run -d --name jaeger \
  -e COLLECTOR_OTLP_ENABLED=true \
  -p 16686:16686 \
  -p 4318:4318 \
  jaegertracing/all-in-one:latest
```

2. 配置前端导出器：

```javascript
// src/utils/tracing.js
const otlpExporter = new OTLPTraceExporter({
  url: 'http://localhost:4318/v1/traces'
})
```

#### 使用 Zipkin

1. 启动 Zipkin：

```bash
docker run -d --name zipkin \
  -p 9411:9411 \
  openzipkin/zipkin:latest
```

2. 配置前端导出器：

```javascript
// 需要安装 @opentelemetry/exporter-zipkin
import { ZipkinExporter } from '@opentelemetry/exporter-zipkin'

const zipkinExporter = new ZipkinExporter({
  url: 'http://localhost:9411/api/v2/spans'
})
```

## API 参考

### TraceManager

```javascript
import traceManager from '@/utils/traceManager'

// 添加追踪记录
traceManager.addTrace(traceData)

// 查询追踪记录
const traces = traceManager.queryTraces({
  method: 'GET',
  status: 200,
  minDuration: 100
})

// 获取统计信息
const stats = traceManager.getStats()

// 分析性能
const analysis = traceManager.analyzePerformance()

// 导出数据
const jsonData = traceManager.exportTraces('json')
const csvData = traceManager.exportTraces('csv')
```

### 追踪工具函数

```javascript
import { 
  generateTraceId, 
  generateSpanId, 
  createHttpSpan, 
  endSpan,
  getCurrentTraceContext 
} from '@/utils/tracing'

// 生成 trace id
const traceId = generateTraceId()

// 生成 span id
const spanId = generateSpanId()

// 创建 HTTP span
const span = createHttpSpan(config)

// 结束 span
endSpan(span, response, error)

// 获取当前 trace context
const context = getCurrentTraceContext()
```

## 性能优化

### 1. 采样率控制

在生产环境中，可以通过调整采样率来减少性能影响：

```javascript
// src/utils/tracing.js
const provider = new WebTracerProvider({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'vue-admin-frontend',
    [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV
  }),
  sampler: new TraceIdRatioBasedSampler(0.1) // 10% 采样率
})
```

### 2. 批量处理

使用 BatchSpanProcessor 来批量发送追踪数据：

```javascript
provider.addSpanProcessor(new BatchSpanProcessor(otlpExporter, {
  maxQueueSize: 2048,
  scheduledDelayMillis: 5000,
  exportTimeoutMillis: 30000
}))
```

### 3. 条件追踪

只在开发环境或特定条件下启用追踪：

```javascript
if (process.env.NODE_ENV === 'development' || process.env.VUE_APP_TRACE_ENABLED === 'true') {
  // 初始化追踪
}
```

## 故障排除

### 1. 追踪数据未显示

- 检查 OpenTelemetry 后端是否正常运行
- 确认 OTLP 端点配置正确
- 查看浏览器控制台是否有错误信息

### 2. 请求头未包含追踪信息

- 确认 Axios 拦截器正确配置
- 检查请求是否通过配置的 Axios 实例发送

### 3. 性能影响

- 调整采样率减少追踪数据量
- 使用批量处理器减少网络请求
- 在生产环境中考虑禁用某些 instrumentations

## 扩展功能

### 1. 自定义追踪

```javascript
import { createCustomSpan, runInSpan } from '@/utils/tracing'

// 创建自定义 span
const span = createCustomSpan('custom-operation', {
  'custom.attribute': 'value'
})

// 在 span 中执行函数
await runInSpan(span, async () => {
  // 执行异步操作
  const result = await someAsyncOperation()
  return result
})
```

### 2. 用户行为追踪

```javascript
// 追踪用户点击事件
document.addEventListener('click', (event) => {
  const span = createCustomSpan('user-click', {
    'user.action': 'click',
    'element.tag': event.target.tagName,
    'element.class': event.target.className
  })
  
  // 处理点击事件...
  
  span.end()
})
```

### 3. 错误追踪

```javascript
// 全局错误处理
window.addEventListener('error', (event) => {
  const span = createCustomSpan('javascript-error', {
    'error.message': event.message,
    'error.filename': event.filename,
    'error.lineno': event.lineno
  })
  
  span.recordException(event.error)
  span.end()
})
```

## 最佳实践

1. **合理使用采样率**：在生产环境中使用较低的采样率
2. **避免过度追踪**：只追踪重要的业务操作
3. **保护敏感信息**：不要在追踪数据中包含敏感信息
4. **监控性能影响**：定期检查追踪系统对应用性能的影响
5. **数据清理**：定期清理过期的追踪数据

## 许可证

MIT License
