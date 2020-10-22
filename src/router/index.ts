import Vue from 'vue'
import VueRouter, { RouteConfig } from 'vue-router'

Vue.use(VueRouter)

const routes: Array<RouteConfig> = [
  {
    path: '/',
    name: 'Home',
    component: () => import(/* webpackChunkName: "home" */ '../views/home.vue')
  },
  {
    path: '/one2one',
    name: 'One2One',
    component: () => import(/* webpackChunkName: "one2one" */ '../views/one2one.vue')
  },
  {
    path: '/online121',
    name: 'Online121',
    component: () => import(/* webpackChunkName: "online121" */ '../views/online-1to1.vue')
  },
  {
    path: '/peer121',
    name: 'Peer121',
    component: () => import(/* webpackChunkName: "peer121" */ '../views/peer121.vue')
  }
]

const router = new VueRouter({
  routes,
  mode: 'history'
})

export default router
