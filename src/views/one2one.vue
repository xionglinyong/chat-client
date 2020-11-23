<template lang="pug">
  div(:class="$style.rtcInner")
    div
      video(ref="outVideo")
    div
      video(ref="outReceive")
    div
      video(ref="inVideo")
    v-btn(@click="sendCall") 呼叫
    v-btn(@click="disconnect") 断开
</template>

<script lang="ts">
// https://juejin.im/post/6866252061336567822#heading-1
import { Component, Ref, Vue } from 'vue-property-decorator'

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
@Component
export default class WebRTC extends Vue {
  // 本地视频流
  mediaStream: MediaStream | null = null
  // 呼叫端代理
  peerOut: RTCPeerConnection = new RTCPeerConnection()
  // 对等端代理
  peerIn: RTCPeerConnection = new RTCPeerConnection()

  // 呼叫端视频
  @Ref('outReceive') outReceive!: HTMLVideoElement
  // 呼叫端拿到的对等端视频
  @Ref('outVideo') outVideo!: HTMLVideoElement
  // 对等端拿到的呼叫端的视频
  @Ref('inVideo') inVideo!: HTMLVideoElement

  async sendOffer ():Promise<void> {
    const { peerOut, peerIn } = this
    // 创建邀请，真实情况下需通过信令服务器发送给对等端
    const offer = await peerOut.createOffer()
    // 呼叫端设置本地描述
    await peerOut.setLocalDescription(offer)
    // 呼叫端设置远端描述，真实情况下应该是由信令服务器发送而来
    await peerIn.setRemoteDescription(offer)
    // 对等端添加视频流，这样才能够被呼叫端拿到
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    peerIn.addStream(this.mediaStream)
    // 对等端创建应答
    const answer = await peerIn.createAnswer()
    // 对等端设置本地描述为应答
    await peerIn.setLocalDescription(answer)
    // 呼叫端设置应答，真实情况应该由信令服务器发送而来
    await peerOut.setRemoteDescription(answer)
  }

  /**
   * 发送呼叫
   */
  async sendCall ():Promise<void> {
    try {
      const { outVideo, peerOut, peerIn } = this
      const { mediaDevices } = navigator
      // 如果不支持音视频输入则弹框警告
      const devices:Array<MediaDeviceInfo> = await mediaDevices.enumerateDevices()
      if (!devices.find((item:MediaDeviceInfo) => item.kind === 'audioinput')) {
        alert('设备不支持音频')
      }
      if (!devices.find((item:MediaDeviceInfo) => item.kind === 'videoinput')) {
        alert('设备不支持视频')
      }
      // 获取媒体流，并播放到Video
      this.mediaStream = await mediaDevices.getUserMedia({
        video: true,
        audio: true
      })
      outVideo.srcObject = this.mediaStream
      // 呼叫端添加视频流
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      peerOut.addStream(this.mediaStream)
      peerOut.onicecandidate = (e:RTCPeerConnectionIceEvent) => {
        // 本地代理通过信令服务器传递信息给其他对等端是触发，用于将ICE候选信息发送给对等端
        if (e.candidate) {
          peerIn.addIceCandidate(e.candidate)
        }
      }
      await outVideo.play()
      await this.sendOffer()
    } catch (e) {
      if (e.name === 'TypeError') {
        alert('当前环境不支持视频通话')
      } else if (e.name === 'NotAllowedError') {
        alert('请允许使用摄像头')
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

  /**
   *关闭本地和远程连接，关闭本地媒体轨道
   */
  disconnect ():void {
    const tracks = this.mediaStream?.getTracks() ?? []
    this.peerOut.close()
    this.peerIn.close()
    for (const track of tracks) {
      track.stop()
    }
  }

  mounted ():void {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    this.peerIn.onaddstream = (e) => {
      // 对等端接收呼叫端的视频流，此事件只有在呼叫端和对等端建立连接之后才会触发
      this.inVideo.srcObject = e.stream
      this.inVideo.play()
    }
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    this.peerOut.onaddstream = (e) => {
      // 呼叫端接收对等端的视频流，此事件只有在呼叫端和对等端建立连接之后才会触发
      this.outReceive.srcObject = e.stream
      this.outReceive.play()
    }
  }
}
</script>

<style lang="stylus" rel="stylesheet/stylus" module>
.rtcInner
  videoWidth=400px
  videoHeight=350px
  position relative
  display grid
  grid-template-columns repeat(auto-fill, videoWidth)
  grid-template-rows repeat(auto-fill,videoHeight)
  video
    position relative
    width videoWidth
    border 1px solid red
  names='本地视频' '远端视频' '远端本地视频'
  for name,index in names
    &>div:nth-child({index+1})
      position relative
      &::after
        position absolute
        content name
        left 50%
        transform translateX(-50%)
        bottom 10px
        color red
</style>
