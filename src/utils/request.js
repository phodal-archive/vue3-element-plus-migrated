import axios from 'axios'
import { ElMessageBox as MessageBox, ElMessage as Message } from 'element-plus'
import store from '@/store'
import { getToken } from '@/utils/auth'
import { 
  createHttpSpan, 
  endSpan, 
  generateTraceId, 
  generateSpanId,
  getCurrentTraceContext 
} from '@/utils/tracing'
import { tracingConfig, shouldTrace, filterSensitiveData } from '@/utils/tracing-config'

// create an axios instance
const service = axios.create({
  baseURL: process.env.VUE_APP_BASE_API, // url = base url + request url
  // withCredentials: true, // send cookies when cross-domain requests
  timeout: 5000, // request timeout
})

// 存储活跃的 span
const activeSpans = new Map()

// request interceptor
service.interceptors.request.use(
  (config) => {
    // do something before request is sent

    if (store.getters.token) {
      // let each request carry token
      // ['X-Token'] is a custom headers key
      // please modify it according to the actual situation
      config.headers['X-Token'] = getToken()
    }

    // 检查是否应该追踪此请求
    if (!shouldTrace(config.url, config.method)) {
      return config
    }

    // 创建追踪 span
    const span = createHttpSpan(config)
    const traceId = generateTraceId()
    const spanId = generateSpanId()
    
    // 在请求头中添加追踪信息
    config.headers[tracingConfig.headers.traceId] = traceId
    config.headers[tracingConfig.headers.spanId] = spanId
    config.headers[tracingConfig.headers.parentSpanId] = getCurrentTraceContext()?.spanId || ''
    
    // 存储 span 用于后续处理
    activeSpans.set(config.url + config.method, span)
    
    // 添加请求开始时间
    config.metadata = {
      startTime: Date.now(),
      traceId,
      spanId
    }

    console.log(`🚀 [TRACE] Request started: ${config.method} ${config.url}`, {
      traceId,
      spanId,
      headers: filterSensitiveData(config.headers)
    })

    // 发送追踪事件到调试面板
    window.dispatchEvent(new CustomEvent('trace-event', {
      detail: {
        type: 'trace',
        data: {
          method: config.method,
          url: config.url,
          traceId,
          spanId,
          headers: filterSensitiveData(config.headers),
          status: 'pending',
          duration: 0,
          timestamp: Date.now()
        }
      }
    }))

    return config
  },
  (error) => {
    // do something with request error
    console.log(error) // for debug
    return Promise.reject(error)
  }
)

// response interceptor
service.interceptors.response.use(
  /**
   * If you want to get http information such as headers or status
   * Please return  response => response
   */

  /**
   * Determine the request status by custom code
   * Here is just an example
   * You can also judge the status by HTTP Status Code
   */
  (response) => {
    const res = response.data
    const config = response.config
    const span = activeSpans.get(config.url + config.method)
    
    // 计算请求耗时
    const duration = Date.now() - config.metadata.startTime
    
    // 记录响应信息
    console.log(`✅ [TRACE] Request completed: ${config.method} ${config.url}`, {
      traceId: config.metadata.traceId,
      spanId: config.metadata.spanId,
      duration: `${duration}ms`,
      status: response.status,
      responseSize: JSON.stringify(res).length
    })

    // 发送完成事件到调试面板
    window.dispatchEvent(new CustomEvent('trace-event', {
      detail: {
        type: 'trace',
        data: {
          method: config.method,
          url: config.url,
          traceId: config.metadata.traceId,
          spanId: config.metadata.spanId,
          status: response.status,
          duration,
          responseSize: JSON.stringify(res).length,
          response: res,
          headers: config.headers,
          timestamp: Date.now()
        }
      }
    }))

    // 结束 span
    if (span) {
      endSpan(span, response)
      activeSpans.delete(config.url + config.method)
    }

    // if the custom code is not 20000, it is judged as an error.
    if (res.code !== 20000) {
      Message({
        message: res.message || 'Error',
        type: 'error',
        duration: 5 * 1000,
      })

      // 50008: Illegal token; 50012: Other clients logged in; 50014: Token expired;
      if (res.code === 50008 || res.code === 50012 || res.code === 50014) {
        // to re-login
        MessageBox.confirm(
          'You have been logged out, you can cancel to stay on this page, or log in again',
          'Confirm logout',
          {
            confirmButtonText: 'Re-Login',
            cancelButtonText: 'Cancel',
            type: 'warning',
          }
        ).then(() => {
          store.dispatch('user/resetToken').then(() => {
            location.reload()
          })
        })
      }
      return Promise.reject(new Error(res.message || 'Error'))
    } else {
      return res
    }
  },
  (error) => {
    const config = error.config
    const span = config ? activeSpans.get(config.url + config.method) : null
    
    // 记录错误信息
    if (config) {
      const duration = Date.now() - config.metadata.startTime
      console.log(`❌ [TRACE] Request failed: ${config.method} ${config.url}`, {
        traceId: config.metadata.traceId,
        spanId: config.metadata.spanId,
        duration: `${duration}ms`,
        error: error.message,
        status: error.response?.status
      })

      // 发送错误事件到调试面板
      window.dispatchEvent(new CustomEvent('trace-event', {
        detail: {
          type: 'trace',
          data: {
            method: config.method,
            url: config.url,
            traceId: config.metadata.traceId,
            spanId: config.metadata.spanId,
            status: error.response?.status || 0,
            duration,
            error: error.message,
            headers: config.headers,
            timestamp: Date.now()
          }
        }
      }))

      // 结束 span 并记录错误
      if (span) {
        endSpan(span, null, error)
        activeSpans.delete(config.url + config.method)
      }
    }

    console.log('err' + error) // for debug
    Message({
      message: error.message,
      type: 'error',
      duration: 5 * 1000,
    })
    return Promise.reject(error)
  }
)

export default service
