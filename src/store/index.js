import { createApp } from 'vue'
import { createStore } from 'vuex'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import getters from './getters'

// 使用 require.context 的方式保持不变，但是需要注意在 Vue 3 中不再需要 Vuex
const modulesFiles = require.context('./modules', true, /\.js$/)

const modules = modulesFiles.keys().reduce((modules, modulePath) => {
  const moduleName = modulePath.replace(/^\.\/(.*)\.\w+$/, '$1')
  const value = modulesFiles(modulePath)
  modules[moduleName] = value.default
  return modules
}, {})

const store = createStore({
  modules,
  getters,
})

const app = createApp(App)

app.use(store)
app.use(ElementPlus)

app.mount('#app')

export default store
