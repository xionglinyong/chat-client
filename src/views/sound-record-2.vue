<template lang="pug">
  div(:class="$style.inner")
    RealVolume(:volume="volume")
    v-btn(@click="leftAudioData.length===0?record():stopRecord()") {{leftAudioData.length===0?'录制':'停止录制'}}
    v-btn(@click="playAudio") 播放录音
    v-btn(@click="downToLocal") 保存为本地音乐文件
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import RealVolume from '@/components/real-volume.vue'

@Component({
  components: { RealVolume }
})
export default class SoundRecord2 extends Vue {
  leftAudioData:Array<Float32Array>=[]// 左声道音频数据
  rightAudioData:Array<Float32Array>=[]// 右声道音频数据
  mediaStream!:MediaStream// 媒体流
  currentFile:File|null=null// 当前录制音频文件流
  jsNode!:ScriptProcessorNode
  mediaNode!:MediaStreamAudioSourceNode
  volume=0

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

      // 通过WebAudio保存录音
      const ac = new AudioContext()
      // 通过媒体流创建一个audioNode
      const mediaNode = this.mediaNode = ac.createMediaStreamSource(stream)
      // 创建Node操作用以处理音频
      const creator = ac.createScriptProcessor.bind(ac)
      const jsNode = this.jsNode = creator(4096, 2, 2)// 设置的更小的话会造成有杂音
      // 连接到AudioContext
      jsNode.connect(ac.destination)
      // 添加音频流入事件
      jsNode.onaudioprocess = (e:AudioProcessingEvent) => {
        const audioBuffer = e.inputBuffer
        const leftData = audioBuffer.getChannelData(0)
        const rightData = audioBuffer.getChannelData(1)
        this.volume = rightData[rightData.length - 1] + 1
        // 这里有个坑，如果不进行深拷贝的话，录制出来的音频会有问题
        this.leftAudioData.push(leftData.slice(0))
        this.rightAudioData.push(rightData.slice(0))
      }
      // audioNode连接到jsNode
      mediaNode.connect(jsNode)
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
    this.jsNode.disconnect()
    this.mediaNode.disconnect()

    // 合并数据
    const left = mergeArray(this.leftAudioData)
    const right = mergeArray(this.rightAudioData)
    const audioData = mergedProvincialHighway(left, right)
    this.currentFile = createAudioFile(audioData)
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

  mounted ():void {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    if (!MediaRecorder) {
      alert('请使用最新版本的火狐、谷歌、Edge浏览器')
    }
  }
}

/**
 *合并两个声道
 * @param {Float32Array} left 左声道
 * @param {Float32Array} right 右声道
 */
function mergedProvincialHighway (left:Float32Array, right:Float32Array):Float32Array {
  const length = left.length + right.length
  const data = new Float32Array(length)
  for (let i = 0; i < left.length; i++) {
    const j = i * 2
    data[j] = left[i]
    data[j + 1] = right[i]
  }
  return data
}

/**
 * 根据合成的录音数据创建文件
 * @param {Float32Array} audioData 合成的数据
 * @returns {File} 创建的文件
 */
function createAudioFile (audioData:Float32Array) {
  const bufferLength = audioData.length * 2 + 44
  const buffer = new ArrayBuffer(bufferLength)
  const view = new DataView(buffer)
  let index = 44
  // 下面的操作是创建文件头
  writeUTFBytes(view, 0, 'RIFF')
  // RIFF chunk length
  view.setUint32(4, 44 + audioData.length * 2, true)
  // RIFF type
  writeUTFBytes(view, 8, 'WAVE')
  // format chunk identifier
  // FMT sub-chunk
  writeUTFBytes(view, 12, 'fmt ')
  // format chunk length
  view.setUint32(16, 16, true)
  // sample format (raw)
  view.setUint16(20, 1, true)
  // stereo (2 channels)
  view.setUint16(22, 2, true)
  // sample rate
  view.setUint32(24, 44100, true)
  // byte rate (sample rate * block align)
  view.setUint32(28, 44100 * 2, true)
  // block align (channel count * bytes per sample)
  view.setUint16(32, 2 * 2, true)
  // bits per sample
  view.setUint16(34, 16, true)
  // data sub-chunk
  // data chunk identifier
  writeUTFBytes(view, 36, 'data')
  // data chunk length
  view.setUint32(40, audioData.length * 2, true)

  // 下面的操作是填入数据
  for (const data of audioData) {
    view.setInt16(index, data * (0x7FFF * 1), true)
    index += 2
  }
  return new File([buffer], (new Date()).toISOString().replace('T', ' '), {
    type: 'audio/wave'
  })
}

/**
 * 写入字节
 * @param {DataView} view
 * @param {number} offset
 * @param {string} string
 */
function writeUTFBytes (view:DataView, offset:number, string:string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i))
  }
}

/**
 * 合并单声道数据片段。因为Float32Array长度不能够动态调节，所以需要根据最终数据合成一个整体的Float32Array
 * @param {Array<Float32Array>} arr 数据片段数组
 * @returns {Float32Array} 返回一个包含所有片段的数组
 */
function mergeArray (arr:Array<Float32Array>):Float32Array {
  const length = arr.length * arr[0].length
  const floatArray = new Float32Array(length)
  let offset = 0
  for (const item of arr) {
    floatArray.set(item, offset)
    offset += item.length
  }
  return floatArray
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
