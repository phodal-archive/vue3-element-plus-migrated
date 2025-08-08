import { createApp } from 'vue'
import Cookies from 'js-cookie'
import 'normalize.css/normalize.css' // a modern alternative to CSS resets
import ElementPlus from 'element-plus'
import './styles/element-variables.scss'
import '@/styles/index.scss' // global css
import App from './App'
import store from './store' // Assuming Vuex 4.x store
import router from './router'
import './icons' // icon
import './permission' // permission control
import './utils/error-log' // error log
import * as filters from './filters' // global filters

// 初始化 OpenTelemetry 追踪
import './utils/tracing'

// If you don't want to use mock-server
// you want to use MockJs for mock api
// you can execute: mockXHR()
if (process.env.NODE_ENV === 'production') {
  const { mockXHR } = require('../mock')
  mockXHR()
}

const app = createApp(App)

app.use(ElementPlus, {
  size: Cookies.get('size') || 'medium', // set element-plus default size
})

// register global utility filters
app.config.globalProperties.$filters = filters

app.config.globalProperties.routerAppend = (path, pathToAppend) => {
  return path + (path.endsWith('/') ? '' : '/') + pathToAppend
}

app.use(store)
app.use(router)
app.mount('#app')
