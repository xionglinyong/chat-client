<template lang="pug">
  div(:class="$style.inner")
    v-file-input(@change="onChange")
    v-btn(@click="audioData.length===0?record():stopRecord()") {{audioData.length===0?'录制':'停止录制'}}
    v-btn(@click="playAudio") 播放录音
    v-btn(@click="downToLocal") 保存为本地音乐文件
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'

@Component
export default class SoundRecord extends Vue {
  audioData:Array<File>=[]// 音频数据
  mediaStream!:MediaStream// 媒体流
  recorder!:any// 录制器
  currentFile:File|null=null// 当前录制音频文件流

  /**
   * 录制
   * @returns {Promise<void>}
   */
  async record ():Promise<void> {
    try {
      // 获取麦克风媒体流
      const stream = this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 48000,
          channelCount: 2
        },
        video: false
      })

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      // 创建录制器
      const recorder = this.recorder = new MediaRecorder(stream, {
        audioBitsPerSecond: 256000,
        mimeType: 'audio/webm'
      })

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      // 当得到数据时的处理回调
      recorder.ondataavailable = async (e:BlobEvent) => {
        console.log(e.data)
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        this.audioData.push(e.data)
      }
      // 当录制停止时
      recorder.onstop = () => {
        const time = (new Date()).toISOString().replace('T', ' ')
        const recorderFile = new Blob(this.audioData, { type: this.recorder.mimeType })
        this.audioData = []
        this.currentFile = new File([recorderFile], `${time}.mp3`, { type: 'audio/mp3' })
        console.log('stop')
      }
      // 每隔10毫秒惊喜一次录制数据切割
      recorder.start(10)
    } catch (e) {
      console.log(e)
      if (e.name === 'TypeError') {
        alert('当前环境不支持视频通话')
      } else if (e.name === 'NotAllowedError') {
        alert('请允许使用麦克风')
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

  stopRecord ():void {
    const { mediaStream } = this
    // 获取所有的媒体通道并停止他们
    const tracks = mediaStream.getTracks()
    tracks.forEach(track => {
      track.stop()
    })
    // 停止录音
    this.recorder.stop()
  }

  /**
   * 下载至本地
   */
  downToLocal ():void {
    const { currentFile } = this
    if (!currentFile) {
      alert('请先录制完成，再来播放')
      return
    }
    const time = (new Date()).toISOString().replace('T', ' ')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(currentFile)
    a.setAttribute('download', `${time}.mp3`)
    a.click()
  }

  /**
   * 播放当前录制的音频
   */
  playAudio ():void {
    const { currentFile } = this
    if (!currentFile) {
      alert('请先录制完成，再来播放')
      return
    }
    // 创建一个文件读取器
    const fileReader = new FileReader()

    // 通过AudioContext播放音频
    fileReader.onload = async () => {
      // 创建一个AudioContext
      const audioContext = new AudioContext()
      // 创建一个AudioNode通过AudioContext
      const audioNode = audioContext.createBufferSource()
      // AudioContext对二进制文件进行解码
      audioNode.buffer = await audioContext.decodeAudioData(fileReader.result as ArrayBuffer)
      audioNode.connect(audioContext.destination)
      audioNode.start(0)
    }
    // 读取选中的文件
    fileReader.readAsArrayBuffer(this.currentFile as File)
  }

  onChange (e:InputEvent):void {
    console.log(e)
    // 创建一个文件读取器
    const fileReader = new FileReader()

    // 第一种播放音频的方法：通过audio元素
    // fileReader.onload = () => {
    //   // 利用读取结果创建8位无符号整型数组，再利用这个数组创建二进制流文件
    //   const blob = new Blob([new Int8Array(fileReader.result)], {
    //     type: 'audio/mp3'
    //   })
    //   // 利用二进制流文件生成一个URL
    //   const url = URL.createObjectURL(blob)
    //   console.log(url)
    //   // 播放
    //   this.audio.src = url
    //   this.audio.play()
    // }

    // 第二种播放音频的方法，通过AudioContext
    fileReader.onload = async () => {
      // 创建一个AudioContext
      const audioContext = new AudioContext()
      // 创建一个AudioNode通过AudioContext
      const audioNode = audioContext.createBufferSource()
      // AudioContext对二进制文件进行解码
      audioNode.buffer = await audioContext.decodeAudioData(fileReader.result as ArrayBuffer)
      audioNode.connect(audioContext.destination)
      audioNode.start(0)
    }
    // 读取选中的文件
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    fileReader.readAsArrayBuffer(e)
  }

  mounted ():void {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    if (!MediaRecorder) {
      alert('请使用最新版本的火狐、谷歌、Edge浏览器')
    }
  }
}
</script>

<style lang="stylus" rel="stylesheet/stylus" module>
.inner
  display grid
  place-content center
  width 100%
  height 100%
  grid-gap 20px
</style>
