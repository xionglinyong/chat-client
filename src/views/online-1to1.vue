<template lang="pug">
  div(:class="$style.inner")
    video#remote(ref="remoteVideo")
    video#local(:class="$style.local" ref="localVideo")
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
    v-btn(:class="$style.callBtn" @click="handleCall") 发起
</template>

<script lang="ts">
/*
https://developer.mozilla.org/zh-CN/docs/Web/API/WebRTC_API/Signaling_and_video_calling
基本流程：
  发送端和接收端创建本地代理（RTCPeerConnection），并监听对等端媒体流
  发送端获取媒体流
  发送端代理添加视频流
  发送端监听本地候选信息，如果已经准备好了，就发送到对等端
  发送端准备发送通话邀请
  发送端穿件会话邀请
  发送端创建会话邀请信息描述
  发送端设置本地会话信息描述为会话邀请信息描述
  通过信令服务器将会话邀请信息描述发送给接收端
  接收端接收会话信息，设置为远端会话描述
  接收端创建应答会话信息描述，并设置为本地会话信息描述
  通过信令服务器将应答会话信息描述发送给发送端
  发送端设置应答会话信息为远端会话描述
  两端交换候选信息，直至有一个候选信息一致
  建立连接
  持续交换候选信息（为了选择更好的候选信息）
*/
import { Component, Ref, Vue } from 'vue-property-decorator'
@Component
export default class Online1to1 extends Vue {
  message=''
  messages:Array<{sender:string, message:string}>=[]
  // 本地代理
  peer:RTCPeerConnection=new RTCPeerConnection({
    // ice服务，用于网络穿透
    iceServers: [
      { urls: 'turn:numb.viagenie.ca', credential: '123456', username: '2690363124@qq.com' }
    ]
  })

  dataChannel!:RTCDataChannel

  candidateArr:Array<RTCIceCandidate>=[]

  mediaStream!:MediaStream

  @Ref('localVideo') localVideo!:HTMLVideoElement
  @Ref('remoteVideo') remoteVideo!:HTMLVideoElement

  /**
   *获取本地媒体流，并添加到本地代理
   * @returns {Promise<void>}
   */
  async createMediaStream ():Promise<void> {
    const { localVideo, peer } = this

    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true
    })
    localVideo.srcObject = this.mediaStream
    localVideo.onloadedmetadata = async () => {
      await localVideo.play()
    }
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    await peer.addStream(this.mediaStream)
  }

  sendMsg ():void {
    const { message } = this
    this.dataChannel.send(message)
    this.messages.push({
      sender: '我',
      message
    })
    this.message = ''
  }

  addEvent ():void {
    const { remoteVideo, peer } = this
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    peer.onaddstream = async (e:MediaStreamEvent) => {
      // 当接收到对等端视频流时
      remoteVideo.srcObject = e.stream
      remoteVideo.onloadedmetadata = async () => {
        await remoteVideo.play()
      }
    }
    peer.addEventListener('connectionstatechange', () => {
      const { connectionState } = this.peer
      const statusMap = new Map([
        ['closed', '已关闭'],
        ['connected', '连接成功'],
        ['connecting', '正在连接'],
        ['disconnected', '断开连接'],
        ['failed', '失败'],
        ['new', '新连接']
      ])
      console.log(`连接状态:${statusMap.get(connectionState)}`)
    })
  }

  async handleCall ():Promise<void> {
    try {
      const { peer } = this
      // 发送会话邀请时，创建本地数据通道
      const dc = this.dataChannel = this.peer.createDataChannel(this.$socket.id)
      console.log(dc)
      // 监听
      dc.onmessage = (e:MessageEvent) => {
        this.messages.push({
          sender: '对方',
          message: e.data
        })
      }
      dc.onerror = (e:any) => {
        console.log(e)
      }

      await this.createMediaStream()
      // 本地代理通过信令服务器发送给对等端是，将候选信息发送给对等端
      peer.onicecandidate = async (e:RTCPeerConnectionIceEvent) => {
        const { candidate } = e
        if (candidate) {
          this.$socket.emit('Candidate', candidate)
        }
      }

      // 创建会话邀请设置为本地会话描述，并发送给对等端
      const offer = await peer.createOffer()
      await peer.setLocalDescription(offer)
      this.$socket.emit('OfferICE', offer)
    } catch (e) {
      if (e.name === 'TypeError') {
        console.log('当前环境不支持视频通话')
      } else if (e.name === 'NotAllowedError') {
        console.log('用户拒绝')
      } else if (e.name === 'AbortError') {
        console.log('中止')
      } else if (e.name === 'NotFoundError') {
        console.log('找不到')
      } else if (e.name === 'OverConstrainedError') {
        console.log('设备无法满足要求')
      } else if (e.name === 'SecurityError') {
        console.log('由于安全原因，被禁止')
      }
    }
  }

  mounted ():void {
    console.log(this.$router.resolve('/news'))
    this.addEvent()
    this.peer.ondatachannel = (e:RTCDataChannelEvent) => {
      const dc = this.dataChannel = e.channel
      dc.onmessage = (e:MessageEvent) => {
        this.messages.push({
          sender: '对方',
          message: e.data
        })
      }
    }
    // 监听对等端发送的候选信息
    this.sockets.subscribe('Candidate', async (data:{id:string, candidate:RTCIceCandidate}) => {
      if (this.$socket.id !== data.id) {
        this.candidateArr.push(data.candidate)
      }
    })
    // 监听对等端的会话应答
    this.sockets.subscribe('OfferICE', async (data:{id:string, offer:any}) => {
      const { peer, candidateArr } = this
      if (this.$socket.id !== data.id) {
        await peer.setRemoteDescription(data.offer)
        await this.createMediaStream()
        // 本地代理在接收到会话邀请时添加候选信息
        candidateArr.forEach(async (candidate:RTCIceCandidate) => {
          await peer.addIceCandidate(candidate)
        })
        const answer = await peer.createAnswer()
        await peer.setLocalDescription(answer)
        // 发送应答
        this.$socket.emit('Answer', answer)
      }
    })
    // 接收对等端的会话邀请
    this.sockets.subscribe('Answer', (data:{answer:any, id:string}) => {
      if (this.$socket.id !== data.id) {
        this.peer.setRemoteDescription(data.answer)
      }
    })
  }
}
</script>

<style lang="stylus" rel="stylesheet/stylus" module>
.inner
  position relative
  width 100%
  height 100%
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
  .callBtn
    position absolute
    width 100px
    left 50%
    transform translateX(-50%)
    bottom 50px
</style>
