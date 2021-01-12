<template lang="pug">
  v-app(:class="$style.inner")
    video#remote(ref="remoteVideo" @contextmenu.prevent="")
    video#local(:class="$style.local" ref="localVideo" @contextmenu.prevent="")
    div(:class="$style.status") {{connectionStatus}}
    div(:class="$style.myId" v-if="myId && !visible") 我的ID：{{myId}}
    div(:class="$style.messageInner")
      div(:class="$style.messages")
        div(v-for="message of messages") {{message.sender}}:{{message.message}}
      v-textarea(
        v-model="message"
        append-icon="mdi-send"
        height="50px"
        @click:append="sendMsg"
        :class="$style.textarea"
        @keyup.enter.native="sendMsg"
        solo)
    v-btn(
      :class="$style.callBtn"
      @click="connectionStatus==='通话中'?handleDisconnect():handleCall()"
      :disabled="canUse") {{connectionStatus==='通话中'?'挂断':'呼叫'}}
    v-dialog(persistent v-model="visible" data-app max-width="100%" width="300px" )
      v-card
        v-card-title 输入你的ID及对方ID
        v-card-text
          v-form(ref="form" lazy-validation)
            v-text-field(
              label="你的ID"
              v-model="myId"
              :counter="10"
              :rules="myIdRules")
            v-text-field(
              label="对方ID"
              v-model="inverseId"
              :counter="10"
              :rules="inverseIdRules")
            v-btn(
              width="100%"
              color="primary"
              :disabled="connecting"
              :loading="connecting"
              @click="initConversation") 连接
              template(#loader)
                span 连接中...
</template>

<script lang="ts">
// 下一步
//  ？发送聊天信息

import { Component, Ref, Vue } from 'vue-property-decorator'
import Peer, { DataConnection, MediaConnection, PeerJSOption } from 'peerjs'
import { News, NewType } from '@/types/chart'

enum ConnectionStatus {
  'calling' = '呼叫中',
  'connecting' = '通话中',
  'activeDisconnect' = '主动断开',
  'passiveDisconnect' = '断开',
  'notConnected' = '未呼叫',
  'error' = '发生错误'
}

// 本地代理配置
const peerOption: PeerJSOption = {
  host: '39.105.103.136', // 中转服务地址
  secure: true, // 使用https
  port: 9522, // 端口
  debug: 3, // 0:输出日志，1:输出错误，2:输出错误和日志，3：输出所有
  path: 'peer',
  config: {
    iceServers: [
      { urls: 'turn:39.105.103.136:3475', credential: '123456', username: 'test' }
    ]
  }
}

const errMap: { [id: string]: string } = {
  'browser-incompatible': '浏览器不支持某些或者所有WebRTC，请使用新版谷歌浏览器',
  'unavailable-id': 'ID不可用，因为该ID已存在',
  'invalid-id': '非法ID，请输入合法ID',
  'invalid-key': '非法ID，请输入合法ID',
  network: '无法连接到信令服务器',
  'server-error': '无法访问服务器',
  'ssl-unavailable': 'SSL证书不可用',
  'peer-unavailable': '对方不在线'
}

@Component
export default class Peer121 extends Vue {
  myId = ''
  inverseId = ''
  connecting = false
  canUse = false
  connectionStatus: ConnectionStatus = ConnectionStatus.notConnected// 连接状态
  mediaStream!: MediaStream// 媒体流
  mediaConnection: MediaConnection | null = null// 媒体连接
  peer!: Peer
  dataConnection!: DataConnection
  visible = true
  message=''
  myIdRules = [
    (v: string) => !!v || '请输入ID',
    (v: string) => v.length <= 10 || 'ID在十位数之内'
  ]

  messages:Array<{sender:string, message:string}>=[]

  inverseIdRules = [
    (v: string) => {
      if (v) {
        return v.length <= 10 || 'ID在十位数之内'
      }
      return true
    }
  ]

  @Ref('localVideo') localVideo!: HTMLVideoElement
  @Ref('remoteVideo') remoteVideo!: HTMLVideoElement
  @Ref('form') form!: HTMLFormElement

  /**
   * 开始呼叫
   * @returns {Promise<void>}
   */
  async handleCall (): Promise<void> {
    const { localVideo } = this
    const mediaStream = this.mediaStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    })
    this.connectionStatus = ConnectionStatus.calling
    localVideo.srcObject = mediaStream
    localVideo.onloadedmetadata = async () => {
      localVideo.muted = true
      await localVideo.play()
    }
    await localVideo.play()
    this?.dataConnection?.send({
      type: NewType.invite
    })
  }

  async handleDisconnect (): Promise<void> {
    await this.onDisconnect()
    this?.dataConnection?.send({
      type: NewType.disconnect
    })
  }

  async onDisconnect (): Promise<void> {
    const { remoteVideo, localVideo } = this
    this.connectionStatus = ConnectionStatus.passiveDisconnect
    await remoteVideo.pause()
    await localVideo.pause()
    this.stopTrack()
    this?.mediaConnection?.close()
  }

  handleAnswer (data: string): void {
    const { remoteVideo, peer, mediaStream, inverseId } = this
    if (data === 'receive') {
      const mc = this.mediaConnection = peer.call(inverseId, mediaStream)
      mc.on('stream', (remoteStream: MediaStream) => {
        this.connectionStatus = ConnectionStatus.connecting
        remoteVideo.srcObject = remoteStream
        remoteVideo.onloadedmetadata = async () => {
          await remoteVideo.play()
        }
      })
      mc.on('close', () => {
        console.log('远端视频流关闭')
      })
      mc.on('error', (err) => {
        console.log(err)
      })
    } else if (data === 'reject') {
      alert('对方已拒绝')
      this.stopTrack()
    }
  }

  sendMsg ():void {
    const { message, dataConnection } = this
    dataConnection.send({
      type: NewType.message,
      data: message
    })
    this.messages.push({
      sender: '我',
      message
    })
    this.message = ''
  }

  stopTrack (): void {
    const tracks = this.mediaStream?.getTracks() ?? []
    for (const track of tracks) {
      track.stop()
    }
  }

  initReceive (): void {
    const { peer } = this
    const { localVideo, remoteVideo } = this
    const res = confirm('接收到视频邀请，是否接受？')
    if (res) {
      peer.on('call', async (p: MediaConnection) => {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        })
        localVideo.srcObject = this.mediaStream
        localVideo.onloadedmetadata = async () => {
          await localVideo.play()
        }
        p.answer(this.mediaStream)
        p.on('stream', async (stream: MediaStream) => {
          remoteVideo.srcObject = stream
          remoteVideo.onloadedmetadata = async () => {
            this.connectionStatus = ConnectionStatus.connecting
            await remoteVideo.play()
          }
        })
        p.on('close', () => {
          this.connectionStatus = ConnectionStatus.notConnected
          this.onDisconnect()
        })
        p.on('error', () => {
          this.connectionStatus = ConnectionStatus.error
        })
        peer.on('disconnected', async () => {
          console.log('disconnected')
        })
        peer.on('close', () => {
          console.log('close')
        })
      })
    }
    this?.dataConnection?.send({
      type: NewType.Answer,
      data: res ? 'receive' : 'reject'
    })
  }

  initConversation (): void {
    if (!this.form.validate()) return
    this.connecting = true
    const { myId, inverseId } = this
    let { peer } = this
    if (!peer) peer = this.peer = new Peer(myId, peerOption)
    // 创建实例成功
    peer.on('open', async () => {
      const onData = (data: News) => {
        if (data.type === NewType.Answer) {
          this.handleAnswer(data.data)
        } else if (data.type === NewType.invite) {
          this.initReceive()
        } else if (data.type === NewType.disconnect) {
          this.onDisconnect()
        } else if (data.type === NewType.message) {
          this.messages.push({
            message: data.data,
            sender: this.inverseId
          })
        }
      }
      // 当数据通道被连接时
      peer.on('connection', (conn: DataConnection) => {
        this.dataConnection = conn
        this.inverseId = conn.peer
        conn.on('data', onData)
      })
      if (inverseId) {
        const conn = this.dataConnection = peer.connect(inverseId)
        conn.on('open', () => {
          this.connecting = false
          this.visible = false
          conn.on('data', onData)
        })
      } else {
        this.connecting = false
        this.visible = false
      }
    })
    peer.on('error', (err) => {
      const { type } = err
      if (type === 'disconnected') {
        peer.reconnect()
      } else {
        alert(errMap[type])
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        this.peer = null
      }
      this.connecting = false
    })
  }
}

</script>

<style lang="stylus" rel="stylesheet/stylus" module>
.inner
  position relative
  width 100%
  height 100%

  .status
    position absolute
    top 10px
    left 50%
    transform translateX(-50%)
    width 100px
    height 50px
    line-height 50px
    background rgba(120, 213, 120, .9)
    text-align center
    border-radius 5px
    user-select none

  .myId
    position absolute
    top 10px
    left 10px
    background #fff
    padding 10px

  .messageInner
    position absolute
    display grid
    grid-template-rows auto 50px
    width 200px
    height 300px
    bottom 200px
    background rgba(184,184,184,.8)
    right 50px
    .messages
      overflow hidden auto

  video
    width 100%
    height 100%

    &.local
      position absolute
      width 200px
      height 121px
      bottom 50px
      right 50px
      border 1px solid red

  .callBtn
    position absolute
    width 100px
    left 50%
    transform translateX(-50%)
    bottom 50px
</style>
