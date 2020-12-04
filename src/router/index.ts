import Vue from 'vue'
import VueRouter, { RouteConfig } from 'vue-router'

Vue.use(VueRouter)

const routes: Array<RouteConfig> = [
  {
    path: '/',
    name: 'Home',
    component: () => import(/* webpackChunkName: "home" */ '@/views/home.vue')
  },
  {
    path: '/one2one',
    name: 'One2One',
    component: () => import(/* webpackChunkName: "one2one" */ '@/views/one2one.vue')
  },
  {
    path: '/online121',
    name: 'Online121',
    component: () => import(/* webpackChunkName: "online121" */ '@/views/online-1to1.vue')
  },
  {
    path: '/peer121',
    name: 'Peer121',
    component: () => import(/* webpackChunkName: "peer121" */ '@/views/peer121.vue')
  },
  {
    path: '/sound-record',
    name: 'SoundRecord',
    component: () => import(/* webpackChunkName: "sound-record" */ '../views/sound-record.vue')
  },
  {
    path: '/sound-record-2',
    name: 'SoundRecord2',
    component: () => import(/* webpackChunkName: "sound-record-2" */ '@/views/sound-record-2.vue')
  },
  {
    path: '/sound-record-2-test',
    name: 'SoundRecord2Test',
    component: () => import(/* webpackChunkName: "sound-record-2-test" */ '@/views/sound-record-2-test.vue')
  },
  {
    path: '/speech-synthesis',
    name: 'SpeechSynthesis',
    component: () => import(/* webpackChunkName: "speech-synthesis" */ '@/views/speech-synthesis.vue')
  },
  {
    path: '/speech-synthesis-2',
    name: 'SpeechSynthesis2',
    component: () => import(/* webpackChunkName: "speech-synthesis" */ '@/views/speech-synthesis-2.vue')
  }
]

const router = new VueRouter({
  routes,
  mode: 'history'
})

export default router
