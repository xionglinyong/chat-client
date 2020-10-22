<template lang="pug">
  div(:class="$style.inner")
    video#remote(ref="remoteVideo" @contextmenu.prevent="")
    video#local(:class="$style.local" ref="localVideo" @contextmenu.prevent="")
    div(:class="$style.status") {{connectionStatus}}
    v-btn(
      :class="$style.callBtn"
      @click="connectionStatus==='通话中'?handleDisconnect():handleCall()"
      :disabled="canUse") {{connectionStatus==='通话中'?'挂断':'呼叫'}}
</template>

<script lang="ts">
// 证书类型：nginx
// 安装https：https://blog.csdn.net/qq_36940740/article/details/105325395
// 安装https：https://blog.csdn.net/qq_33973359/article/details/105537568
// 开启服务命令：peerjs --port 9522 --key peerjs --path /peer --sslkey ./xliny.top.key --sslcert ./xliny.top.pem
// 访问：https://39.105.103.136:9522/peer
// stun服务：https://github.com/enobufs/stun
import { Component, Ref, Vue } from 'vue-property-decorator'
import Peer, { DataConnection, MediaConnection, PeerConnectOption, PeerJSOption } from 'peerjs'
import { News, NewType } from '@/types/chart'

enum ConnectionStatus{
  'calling'='呼叫中',
  'connecting'='通话中',
  'activeDisconnect'='主动断开',
  'passiveDisconnect'='断开',
  'notConnected'='未呼叫',
  'error'='发生错误'
}

// 本地代理配置
const peerOption:PeerJSOption = {
  host: '39.105.103.136', // 中转服务地址
  secure: true, // 使用https
  port: 9522, // 端口
  debug: 0, // 0:输出日志，1:输出错误，2:输出错误和日志，3：输出所有
  path: 'peer',
  config: {
    // iceTransportPolicy: 'relay',
    // sdpSemantics: 'unified-plan',
    iceServers: [
      { urls: 'turn:numb.viagenie.ca', credential: '123456', username: '2690363124@qq.com' }
      // { urls: 'stun:39.105.103.136:3478' },
      // { urls: 'stun:39.105.103.136:3479' }
      // {
      //   urls: 'turn:39.105.103.136:3480',
      //   credential: '12345678',
      //   username: 'admin'
      // }
    ]
  }
}

@Component
export default class Peer121 extends Vue {
  canUse=false
  connectionStatus:ConnectionStatus=ConnectionStatus.notConnected// 连接状态
  mediaStream!:MediaStream// 媒体流
  mediaConnection:MediaConnection|null=null// 媒体连接
  peer:Peer=new Peer(this.$route.query.id as string, peerOption)
  dataConnection!:DataConnection

  @Ref('localVideo') localVideo!:HTMLVideoElement
  @Ref('remoteVideo') remoteVideo!:HTMLVideoElement

  /**
   * 开始呼叫
   * @returns {Promise<void>}
   */
  async handleCall ():Promise<void> {
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

  async handleDisconnect ():Promise<void> {
    await this.onDisconnect()
    this?.dataConnection?.send({
      type: NewType.disconnect
    })
  }

  async onDisconnect ():Promise<void> {
    const { remoteVideo, localVideo } = this
    this.connectionStatus = ConnectionStatus.passiveDisconnect
    await remoteVideo.pause()
    await localVideo.pause()
    this.stopTrack()
    this?.mediaConnection?.close()
  }

  handleAnswer (data:string):void {
    const { remoteVideo, peer, mediaStream } = this
    if (data === 'receive') {
      const mc = this.mediaConnection = peer.call('ReceiveUser', mediaStream)
      mc.on('stream', (remoteStream:MediaStream) => {
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

  stopTrack ():void {
    const tracks = this.mediaStream?.getTracks() ?? []
    for (const track of tracks) {
      track.stop()
    }
  }

  initReceive ():void {
    const { peer } = this
    const { localVideo, remoteVideo } = this
    const res = confirm('接收到视频邀请，是否接受？')
    if (res) {
      peer.on('call', async (p:MediaConnection) => {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        })
        localVideo.srcObject = this.mediaStream
        localVideo.onloadedmetadata = async () => {
          await localVideo.play()
        }
        p.answer(this.mediaStream)
        p.on('stream', async (stream:MediaStream) => {
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

  mounted ():void{
    const { peer } = this
    const { id } = this.$route.query
    console.log(peer)
    peer.on('open', async () => {
      if (id === 'ReceiveUser') {
        peer.on('connection', (conn:DataConnection) => {
          this.dataConnection = conn
          conn.on('data', (data:News) => {
            if (data.type === NewType.invite) {
              this.initReceive()
            } else if (data.type === NewType.disconnect) {
              this.onDisconnect()
            }
          })
        })
      } else {
        const conn = this.dataConnection = peer.connect('ReceiveUser')
        conn.on('open', () => {
          conn.on('data', (data:News) => {
            if (data.type === NewType.Answer) {
              this.handleAnswer(data.data)
            } else if (data.type === NewType.disconnect) {
              this.onDisconnect()
            }
          })
        })
      }
    })
    peer.on('error', () => {
      peer.reconnect()
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
    background rgba(120,213,120,.9)
    text-align center
    border-radius 5px
    user-select none
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
