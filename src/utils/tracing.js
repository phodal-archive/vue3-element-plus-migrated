import { WebTracerProvider } from '@opentelemetry/sdk-trace-web'
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { Resource } from '@opentelemetry/resources'
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions'
import { registerInstrumentations } from '@opentelemetry/instrumentation'
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load'
import { UserInteractionInstrumentation } from '@opentelemetry/instrumentation-user-interaction'
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch'
import { ZoneContextManager } from '@opentelemetry/context-zone'
import { trace, context, SpanStatusCode } from '@opentelemetry/api'
import { tracingConfig, shouldTrace, filterSensitiveData, getCustomAttributes } from './tracing-config'

// 创建 Web Tracer Provider
const provider = new WebTracerProvider({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: tracingConfig.service.name,
    [SemanticResourceAttributes.SERVICE_VERSION]: tracingConfig.service.version,
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: tracingConfig.service.environment
  })
})

// 配置 OTLP 导出器（可以发送到 Jaeger、Zipkin 或其他后端）
const otlpExporter = new OTLPTraceExporter({
  url: tracingConfig.otlpEndpoint,
  headers: {}
})

// 添加 Batch Span Processor
provider.addSpanProcessor(new BatchSpanProcessor(otlpExporter, {
  maxQueueSize: tracingConfig.performance.batchSize,
  scheduledDelayMillis: tracingConfig.performance.batchDelay,
  exportTimeoutMillis: tracingConfig.performance.exportTimeout
}))

// 注册 instrumentations
if (tracingConfig.enabled) {
  registerInstrumentations({
    instrumentations: [
      new DocumentLoadInstrumentation(),
      new UserInteractionInstrumentation(),
      new FetchInstrumentation({
        // 自定义 fetch 拦截器配置
        applyCustomAttributesOnSpan: (span, request, response) => {
          // 检查是否应该追踪
          if (!shouldTrace(request.url, request.method)) {
            return
          }
          
          // 添加自定义属性
          span.setAttribute('http.request.method', request.method)
          span.setAttribute('http.request.url', request.url)
          
          // 添加过滤后的请求头
          const filteredHeaders = filterSensitiveData(request.headers)
          span.setAttribute('http.request.headers', JSON.stringify(filteredHeaders))
          
          if (response) {
            span.setAttribute('http.response.status_code', response.status)
            span.setAttribute('http.response.headers', JSON.stringify(filterSensitiveData(response.headers)))
          }
          
          // 添加自定义属性
          const customAttributes = getCustomAttributes()
          Object.entries(customAttributes).forEach(([key, value]) => {
            span.setAttribute(key, value)
          })
        }
      })
    ],
    tracerProvider: provider
  })
}

// 设置全局 context manager
if (tracingConfig.enabled) {
  provider.register({
    contextManager: new ZoneContextManager()
  })
}

// 获取 tracer
const tracer = trace.getTracer('vue-admin-frontend')

// 生成唯一的 trace id
export const generateTraceId = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

// 生成唯一的 span id
export const generateSpanId = () => {
  return Math.random().toString(36).substring(2, 15)
}

// 创建 HTTP 请求 span
export const createHttpSpan = (config) => {
  const span = tracer.startSpan(`HTTP ${config.method} ${config.url}`, {
    attributes: {
      'http.method': config.method,
      'http.url': config.url,
      'http.request_id': generateTraceId(),
      'user.id': localStorage.getItem('userId') || 'anonymous',
      'user.agent': navigator.userAgent
    }
  })

  return span
}

// 结束 span 并记录结果
export const endSpan = (span, response, error) => {
  if (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message
    })
    span.recordException(error)
  } else if (response) {
    span.setStatus({
      code: SpanStatusCode.OK
    })
    span.setAttribute('http.response.status_code', response.status)
    span.setAttribute('http.response.size', JSON.stringify(response.data).length)
  }
  
  span.end()
}

// 获取当前 trace context
export const getCurrentTraceContext = () => {
  const currentSpan = trace.getActiveSpan()
  if (currentSpan) {
    const spanContext = currentSpan.spanContext()
    return {
      traceId: spanContext.traceId,
      spanId: spanContext.spanId,
      traceFlags: spanContext.traceFlags
    }
  }
  return null
}

// 创建自定义 span
export const createCustomSpan = (name, attributes = {}) => {
  return tracer.startSpan(name, { attributes })
}

// 在 span 中执行函数
export const runInSpan = async (span, fn) => {
  return await context.with(trace.setSpan(context.active(), span), fn)
}

export { tracer, provider }
