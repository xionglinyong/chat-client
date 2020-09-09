<template lang="pug">
  div(:class="$style.inner")
    div(:class="$style.recordInner" ref="record")
      div(:class="$style.onlineNum")
        span(:class="$style.num") {{onlineNum}}
        |人在线
      div(
        :class="[$style.record,{[$style.slef]:username===re.username}]"
        v-for="(re,index) of record"
        :key="index")
        div {{re.username}}
        div(:class="$style.message") {{re.message}}
    v-textarea(
      v-model="message"
      append-icon="mdi-send"
      @click:append="sendMessage"
      @keyup.enter.native="sendMessage"
      solo)
</template>

<script lang="ts">
import { Component, Prop, Ref, Vue, Watch } from 'vue-property-decorator'
import { Record, Users } from '@/types/chart'
import Chat from '@/store/chat'
import { getModule } from 'vuex-module-decorators'

const chat:Chat = getModule(Chat)

// https://github.com/MetinSeylan/Vue-Socket.io
// https://juejin.im/post/6844903935656853512#heading-1
// demo地址：http://39.105.103.136:82/
// 1.优化客户端项目，并且上传到GitHub
// 2.简化服务端项目，并且上传到GitHub
// 3.编写教程
// 4.发布到语雀与掘金
@Component
export default class ChatPage extends Vue {
  message=''

  get onLineUses ():Users {
    return chat.onlineUsers
  }

  get onlineNum ():number {
    return Object.keys(this.onLineUses).length
  }

  get record ():Array<Record> {
    return chat.record
  }

  @Watch('record', { deep: true })
  onRecordChange ():void {
    this.recordEle.scrollTop = this.recordEle.scrollHeight + 200
  }

  @Prop({
    type: String,
    required: true
  }) username!: string

  @Ref('record') recordEle!:HTMLElement

  sendMessage ():void {
    this.$socket.emit('Chat', this.message)
    this.message = ''
  }

  mounted ():void {
    // 进入页面发送登录消息给服务端
    this.$socket.emit('Login', {
      username: this.username
    })
  }
}
</script>

<style lang="stylus" rel="stylesheet/stylus" module>
.inner
  position relative
  background #fff
  display grid
  grid-template-rows auto 200px
  width 80vw
  height 80vh
  border-radius 10px
  box-shadow 0 0 15px 0 #d4d4d4
  transition all .4s
  padding 20px
  &:hover
    box-shadow 0 0 30px 0 #d4d4d4
  .recordInner
    overflow hidden auto
    padding 10px 10px 150px 0
    &>.onlineNum
      position absolute
      z-index 999
      top 10px
      left 50%
      width 100%
      background #fff
      text-align center
      transform translateX(-50%)
      &>.num
        color #169a16
    &>.record
      margin 10px 0
      text-align left
      &>.message
        padding 10px
        display inline-block
        max-width 100%
        background #E0EDFF
        border-radius 5px
      &.slef
        text-align right
        &>.message
          text-align left
</style>
