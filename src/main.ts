import Vue from 'vue'
import './plugins/axios'
import App from './App.vue'
import vuetify from './plugins/vuetify'
import store from './store'
import VueSocketIO from 'vue-socket.io'
import router from './router'

Vue.config.productionTip = false

// 全局使用socket
Vue.use(new VueSocketIO({
  debug: false, // 开启socket控制台输出
  connection: 'https://39.105.103.136:9521/', // 链接地址
  // 配置vuex
  vuex: {
    store,
    actionPrefix: 'socket', // socket触发action的前缀
    mutationPrefix: 'socket' // socket触发mutation的前缀
  }
}))

new Vue({
  vuetify,
  store,
  router,
  render: h => h(App)
}).$mount('#app')
