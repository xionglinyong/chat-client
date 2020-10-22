<template lang="pug">
  div(:class="$style.inner")
    div(:class="$style.recordInner" ref="record")
      div(:class="$style.onlineNum")
        span(:class="$style.num") {{onlineNum}}
        | 人在线
      div(
        :class="[$style.record,{[$style.self]:username===re.username}]"
        v-for="(re,index) of record"
        :key="index")
        div {{re.username}}
        div(:class="$style.message") {{re.message}}
    v-textarea(
      v-model="message"
      append-icon="mdi-send"
      @click:append="sendMessage"
      :class="$style.textarea"
      @keyup.enter.native="sendMessage"
      solo)
</template>

<script lang="ts">
import { Component, Prop, Ref, Vue, Watch } from 'vue-property-decorator'
import { Record, Users } from '@/types/chart'
import Chat from '@/store/chat'
import { getModule } from 'vuex-module-decorators'

const ice = {
  iceServers: [
    { url: 'stun:stun.xten.com:3478' }, // 无需密码的
    { url: 'stun:stun.voipbuster.com:3478' } // 无需密码的
  ]
}

const chat: Chat = getModule(Chat)
// https://segmentfault.com/a/1190000020780854
// https://juejin.im/post/6870299373708771336
// https://github.com/wangsrGit119/suc-love-chat/blob/master/src/components/ManyToManyVideoFrame.vue
// https://juejin.im/post/6844903828744044551#heading-3
@Component
export default class ChatPage extends Vue {
  message = ''
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  peer: RTCPeerConnection = new RTCPeerConnection(ice)
  peerMap:Map<string, RTCPeerConnection>=new Map()
  localStream:MediaStream|null=null

  get onLineUses (): Users {
    return chat.onlineUsers
  }

  get onlineNum (): number {
    return Object.keys(this.onLineUses).length
  }

  get record (): Array<Record> {
    return chat.record
  }

  get sdps (): { [id: string]: RTCSessionDescription } {
    return chat.sdps
  }

  @Ref('selfVideo') selfVideo!:HTMLVideoElement
  @Ref('videoInner') videoInner!:HTMLElement

  @Watch('record', { deep: true })
  onRecordChange (): void {
    this.recordEle.scrollTop = this.recordEle.scrollHeight + 200
  }

  @Prop({
    type: String,
    required: true
  }) username!: string

  @Ref('record') recordEle!: HTMLElement

  sendMessage (): void {
    this.$socket.emit('Chat', this.message)
    this.message = ''
  }

  async join ():Promise<void> {
    try {
      const { peer } = this
      const ms = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      this.selfVideo.srcObject = ms
      await this.selfVideo.play()
      // ms.getTracks().forEach((track:MediaStreamTrack) => {
      //   peer.addTrack(track, ms)
      // })
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      peer.addStream(ms)
      const offer = await peer.createOffer()
      await peer.setLocalDescription(offer)

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      peer.onaddstream = (e:any) => {
        console.log(e)
      }

      peer.onicecandidate = (e:RTCPeerConnectionIceEvent) => {
        const candidate = e.candidate as RTCIceCandidate
        if (candidate) {
          this.handleConnection(candidate)
        }
      }

      this.$socket.emit('Join', offer)
      this.$socket.emit('OfferICE', offer)
      this.localStream = ms
    } catch (e) {
      if (e.name === 'TypeError') {
        alert('当前环境不支持视频通话')
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

  leave ():void{
    this.localStream?.getTracks().forEach((trak:MediaStreamTrack) => {
      trak.stop()
    })
    this.$socket.emit('leave')
  }

  handleConnection (candidate:RTCIceCandidate):void {
    const newCandidate = new RTCIceCandidate(candidate)
    this.peerMap.forEach((peer:RTCPeerConnection, key:string) => {
      if (key !== this.$socket.id) {
        peer.addIceCandidate(newCandidate)
      }
    })
  }

  mounted (): void {
    // 进入页面发送登录消息给服务端
    this.$socket.emit('Login', {
      username: this.username
    })
    this.sockets.subscribe('OfferICE', async (data:{offer:RTCSessionDescription, clientId:string}) => {
      if (data.clientId !== this.$socket.id) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const peer = new RTCPeerConnection(ice)
        this.peerMap.set(data.clientId, peer)
        await peer.setRemoteDescription(data.offer)

        peer.onicecandidate = (event:RTCPeerConnectionIceEvent) => {
          if (event.candidate) {
            this.$socket.emit('Candidate', event.candidate)
            this.handleConnection(event.candidate)
          }
        }

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        peer.onaddstream = (event:any) => {
          console.log(event)
          const { videoInner } = this
          const video = document.createElement('video')
          video.controls = false
          video.autoplay = true
          video.id = data.clientId
          video.srcObject = event.stream
          videoInner.append(video)
        }
        const answer = await peer.createAnswer()
        await peer.setLocalDescription(answer)
        this.$socket.emit('Answer', answer)
      }
    })

    this.sockets.subscribe('Candidate', async (data:{id:string, candidate:RTCIceCandidate}) => {
      const peer = this.peerMap.get(data.id) as RTCPeerConnection
      if (peer) {
        const newIceCanidate = new RTCIceCandidate(data.candidate)
        await peer.addIceCandidate(newIceCanidate)
      }
    })

    this.sockets.subscribe('Answer', async (data:{id:string, answer:RTCSessionDescription}) => {
      this.peerMap.forEach(async (peer, key):Promise<void> => {
        if (key !== data.id) {
          const { videoInner } = this

          await peer.setRemoteDescription(data.answer)
          const video = document.createElement('video')
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          console.log(peer.getRemoteStreams()[0])
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          video.srcObject = peer.getRemoteStreams()[0]
          video.controls = false
          video.autoplay = true
          video.width = 200
          video.height = 121
          video.id = data.id
          videoInner.append(video)
        }
      })
      await this.peer.setRemoteDescription(data.answer)
    })

    this.sockets.subscribe('Leave', (id:string) => {
      this.peerMap.delete(id)
    })
  }

  destroyed ():void {
    this.sockets.unsubscribe('OfferICE')
    this.sockets.unsubscribe('Leave')
  }
}
</script>

<style lang="stylus" rel="stylesheet/stylus" module>
.inner
  position relative
  background #fff
  display grid
  grid-template-rows auto 200px
  grid-template-columns auto
  width 80vw
  height 80vh
  border-radius 10px
  box-shadow 0 0 15px 0 #d4d4d4
  transition all .4s
  padding 20px

  &:hover
    box-shadow 0 0 30px 0 #d4d4d4

  & > .recordInner
    overflow hidden auto
    padding 10px 10px 150px 0
    grid-column 1/3

    & > .onlineNum
      position absolute
      z-index 999
      top 10px
      left 50%
      width 100%
      background #fff
      text-align center
      transform translateX(-50%)

      & > .num
        color #169a16

    & > .record
      margin 10px 0
      text-align left

      & > .message
        padding 10px
        display inline-block
        max-width 100%
        background #E0EDFF
        border-radius 5px

      &.self
        text-align right

        & > .message
          text-align left
& > .textarea
  grid-column 1 / 3
</style>
