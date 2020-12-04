<template lang="pug">
  div(:class="$style.inner")
    RealVolume(:volume="volume")
    div {{recordingTime/10}}s
    v-btn(@click="audioData.length===0?record():stopRecord()") {{audioData.length===0?'录制':'停止录制'}}
    v-btn(@click="playAudio") 播放录音
    v-btn(@click="downloadToLocal") 保存为本地音乐文件
</template>

<script lang="ts">
/**
 * WebAudio+WebRTC音频录制，对音频进行了压缩
 * https://www.cnblogs.com/blqw/p/3782420.html
 */
import { Component, Vue } from 'vue-property-decorator'
import RealVolume from '@/components/real-volume.vue'
import { downloadToLocal, playAudio } from '@/utils/record'

let timer = 0
// 压缩后的采样率
let compressionSamplingRate = 22050
const sampleRate = 44100

@Component({
  components: { RealVolume }
})
export default class SoundRecord2 extends Vue {
  audioData: Array<Float32Array> = []// 音频数据
  mediaStream!: MediaStream// 媒体流
  currentFile: File | null = null// 当前录制音频文件流
  jsNode!: ScriptProcessorNode
  mediaNode!: MediaStreamAudioSourceNode
  recordingTime = 0
  volume = 0

  /**
   * 录制
   * @returns {Promise<void>}
   */
  async record (): Promise<void> {
    try {
      // 获取麦克风媒体流
      const stream = this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate,
          channelCount: 2
        },
        video: false
      })

      // 通过WebAudio保存录音
      const ac = new AudioContext()
      // 通过媒体流创建一个audioNode
      const mediaNode = this.mediaNode = ac.createMediaStreamSource(stream)
      // 创建ScriptProcessorNode操作用以处理音频
      const creator = ac.createScriptProcessor.bind(ac)
      const jsNode = this.jsNode = creator(16384, 1, 1)// 设置录制单声道，能有效减少录音文件的大小
      this.recordingTime = 0
      // 连接到AudioContext
      jsNode.connect(ac.destination)
      // 添加音频流入事件
      jsNode.onaudioprocess = (e: AudioProcessingEvent) => {
        const audioBuffer = e.inputBuffer
        const leftData = audioBuffer.getChannelData(0)
        this.volume = leftData[leftData.length - 1] + 1
        // 这里有个坑，如果不进行深拷贝的话，录制出来的音频会有问题
        this.audioData.push(leftData.slice(0))
      }
      // audioNode连接到jsNode
      mediaNode.connect(jsNode)
      timer = setInterval(() => {
        this.recordingTime++
      }, 100)
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

  stopRecord (): void {
    const { mediaStream } = this
    // 获取所有的媒体通道并停止他们
    const tracks = mediaStream.getTracks()
    clearInterval(timer)

    tracks.forEach(track => {
      track.stop()
    })
    // 停止录音
    this.jsNode.disconnect()
    this.mediaNode.disconnect()

    // 合并数据
    const audioData = mergeArray(this.audioData)
    this.currentFile = createAudioFile(compressedData(audioData, 11025))
    this.audioData = []
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
}

/**
 * 根据合成的录音数据创建文件
 * @param {Float32Array} audioData 合成的数据
 * @returns {File} 创建的文件
 */
function createAudioFile (audioData: Float32Array) {
  const channelCount = 1// 通道数，减小通道数可以压缩文件
  const sampleBits = 8// 采样位数，减小可以压缩文件，8/16
  const samplingRate = compressionSamplingRate
  const bufferLength = audioData.length * (sampleBits / 8) + 44
  const buffer = new ArrayBuffer(bufferLength)
  const view = new DataView(buffer)
  let index = 44
  // 下面的操作是创建文件头
  writeUTFBytes(view, 0, 'RIFF')
  // RIFF块长度
  view.setUint32(4, 44 + audioData.length * 2, true)
  // RIFF类型
  writeUTFBytes(view, 8, 'WAVE')
  // 格式块标识符
  // FMT子块
  writeUTFBytes(view, 12, 'fmt ')
  // 格式块长度
  view.setUint32(16, 16, true)
  // 样本格式（原始）
  view.setUint16(20, 1, true)
  // 单声道（原来是双声道）
  view.setUint16(22, channelCount, true)
  // 采样率
  view.setUint32(24, samplingRate, true)
  // 字节率（采样率*块对齐）
  view.setUint32(28, samplingRate * 2 * channelCount * (sampleBits / 8), true)
  // 块对齐（通道数*每个样本字节）
  view.setUint16(32, (sampleBits / 8) * channelCount, true)
  // 每个样本位数
  view.setUint16(34, sampleBits, true)
  // 数据子块
  // 数据块标识符
  writeUTFBytes(view, 36, 'data')
  // 数据块长度
  view.setUint32(40, audioData.length * 2, true)

  // 下面的操作是填入数据
  for (const data of audioData) {
    const s = Math.max(-1, Math.min(1, data))
    let val = s < 0 ? s * 0x8000 : s * 0x7FFF
    val = parseInt(String(255 / (65535 / (val + 32768))))
    view.setInt8(index++, val)
  }
  return new File([buffer], (new Date()).toISOString().replace('T', ' '), {
    type: 'audio/mpeg'
  })
}

/**
 * 写入字节
 * @param {DataView} view
 * @param {number} offset
 * @param {string} string
 */
function writeUTFBytes (view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i))
  }
}

/**
 * 合并单声道数据片段。因为Float32Array长度不能够动态调节，所以需要根据最终数据合成一个整体的Float32Array
 * @param {Array<Float32Array>} arr 数据片段数组
 * @returns {Float32Array} 返回一个包含所有片段的数组
 */
function mergeArray (arr: Array<Float32Array>): Float32Array {
  const length = arr.length * arr[0].length
  const floatArray = new Float32Array(length)
  let offset = 0
  for (const item of arr) {
    floatArray.set(item, offset)
    offset += item.length
  }
  return floatArray
}

/**
 * 压缩数据，更改数据的采样率：
 *  - 现有的采样率除以压缩后的为压缩比例
 *  - 生成数据时，每一个压缩比例为一个数据间隔取数据
 *
 * @param {T} data 原始的数据
 * @param {22050 | 11025} sampling 压缩后的采样率
 * @returns {T} 返回压缩后的数据
 */
function compressedData<T extends Float32Array> (data: T, sampling:22050|11025): T {
  const compression = sampleRate / sampling
  const dataLength = data.length / compression
  const arr = new Float32Array(dataLength)
  let index = 0

  compressionSamplingRate = sampling

  for (let i = 0; i < dataLength; i++, index += compression) {
    arr[i] = data[index]
  }

  return arr as T
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
