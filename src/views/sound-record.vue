<template lang="pug">
  div(:class="$style.inner")
    v-file-input(@change="onChange")
    v-btn(@click="audioData.length===0?record():stopRecord()") {{audioData.length===0?'录制':'停止录制'}}
    v-btn(@click="playAudio") 播放录音
    v-btn(@click="downloadToLocal") 保存为本地音乐文件
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import { downloadToLocal, playAudio } from '@/utils/record'

@Component
export default class SoundRecord extends Vue {
  audioData: Array<Blob> = []// 音频数据
  mediaStream!: MediaStream// 媒体流
  recorder!: any// 录制器
  currentFile: File | null = null// 当前录制音频文件流

  /**
   * 录制
   * @returns {Promise<void>}
   */
  async record (): Promise<void> {
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

      // 当得到数据时的处理回调
      recorder.ondataavailable = async (e: { data: Blob }) => {
        console.log(e.data)
        this.audioData.push(e.data)
      }
      // 当录制停止时
      recorder.onstop = () => {
        const time = (new Date()).toISOString().replace('T', ' ')
        // 根据二进制文件对象生成文件对象
        this.currentFile = new File(this.audioData, `${time}.mp3`, { type: 'audio/mpeg' })
        this.audioData = []
      }
      // 每隔10毫秒进行一次录制数据切割
      recorder.start(10)
    } catch (e) {
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

  stopRecord (): void {
    const { mediaStream } = this
    // 获取所有的媒体通道并停止他们
    mediaStream.getTracks().forEach(track => {
      track.stop()
    })
    // 停止录音
    this.recorder.stop()
  }

  /**
   * 下载至本地
   */
  async downloadToLocal (): Promise<void> {
    try {
      const { currentFile } = this
      await downloadToLocal(currentFile as File, '请先录制完成，再下载')
    } catch (e) {
      alert(e)
    }
  }

  /**
   * 播放当前录制的音频
   */
  async playAudio (): Promise<void> {
    try {
      const { currentFile } = this
      await playAudio(currentFile as File, '请先录制完成，再播放')
    } catch (e) {
      alert(e)
    }
  }

  onChange (e: InputEvent): void {
    console.log(e)
    // 创建一个文件读取器
    const fileReader = new FileReader()

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

  mounted (): void {
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
