<template lang="pug">
  v-app
    v-main(:class="$style.inner")
      transition(name="fade" mode="out-in")
        chat(v-if="username" :username="username")
        v-row(:class="$style.form" v-else)
          v-col(cols="12" sm="12" md="12")
            v-text-field(
              label="Solo"
              type="text"
              v-model="userStr"
              filled
              append-icon="mdi-send"
              placeholder="输入用户名加入匿名聊天系统"
              @click:append="joinChat"
              @keyup.enter.native="joinChat"
              solo)
</template>

<script lang="ts">
import Vue from 'vue'
import { Component } from 'vue-property-decorator'
import Chat from '@/components/chat.vue'
@Component({
  components: { Chat }
})
export default class Home extends Vue {
  username=''
  userStr=''
  joinChat (e: KeyboardEvent) {
    this.username = this.userStr
  }
}
</script>
<style lang="stylus" module>
.inner
  display grid !important
  justify-content center
  align-items center
  width 100%
  height 100%
  transform-style preserve-3d
  perspective 300px
.form
  width 500px
</style>
<style lang="stylus">
.fade-enter-active
  animation fadeEnter .5s
.fade-leave-active
  animation fadeLeave .5s
@keyframes fadeLeave
  from
    transform translate3d(0,0,0)
    opacity 1
  to
    transform translate3d(0,0,200px)
    opacity 0
@keyframes fadeEnter
  from
    transform translate3d(0,0,-200px)
    opacity 0
  to
    transform translate3d(0,0,0x)
    opacity 1
</style>
<style lang="stylus">

//全局设置滚动条
::-webkit-scrollbar
  width 5px
  background rgba(0,0,0,0)
  border-radius 15px
::-webkit-scrollbar-button
  display none
::-webkit-scrollbar-thumb
  width 5px
  background primaryColor
  &:horizontal
    height 5px !important
  background #2196F3
  border-radius 5px
</style>
