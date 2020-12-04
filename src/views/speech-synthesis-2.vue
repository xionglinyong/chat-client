<template lang="pug">
  div(:class="$style.wrapper")
    v-card(:class="$style.recogniseWrapper")
      v-card-title 语音合成
      v-card-subtitle
        v-radio-group(v-model="voice")
          v-radio(v-for="v of voices" :key="v" :label="v" :value="v")
      v-card-subtitle
        v-text-field(label="输入需要合成的内容" v-model="text")
      v-card-text
        v-btn(@click="speakVoice") 合成并播放
        v-btn(@click="downloadToLocal") 下载

</template>

<script lang="ts">
import { Component, Vue, Watch } from 'vue-property-decorator'
import axios from 'axios'

const voiceMap = new Map([
  ['小云（标准女声）', 'Xiaoyun'],
  ['小刚（标准男声）', 'Xiaogang'],
  ['姗姗（粤语女声）', 'Shanshan'],
  ['小玥（四川话女声）', 'Xiaoyue'],
  ['小玥（四川话女声）', 'Xiaoyue']
])

@Component
export default class SpeechSynthesis extends Vue {
  voice = '小云（标准女声）'
  text = ''
  voices: Array<string> = Array.from(voiceMap.keys())
  currentFile: File | null=null

  @Watch('text')
  onTextChange () {
    this.currentFile = null
  }

  @Watch('voice')
  onVoiceChange () {
    this.currentFile = null
  }

  async speakVoice (): Promise<void> {
    const text = this.text.trim()
    const voice = voiceMap.get(this.voice)
    if (!text) {
      alert('请输入合成文本')
      return
    } else if (!this.currentFile || !(this.currentFile instanceof File)) {
      const token = 'fa9d040c5d8244508bc2e7dae3734eef'
      const key = 'RBfcR7nPwq4RHhYw'
      const encodeText = encodeURIComponent(text)
      const url = `/api/tts?appkey=${key}&token=${token}&text=${encodeText}&format=mp3&sample_rate=16000&voice=${voice}`
      // const url = 'http://192.168.1.118:8086/api/v1/VoiceCompound'
      const res = await axios.get(url, {
        responseType: 'arraybuffer'
      })
      const { data } = res
      this.currentFile = new File([data], 'play.mp3', {
        type: 'mpeg'
      })
    }
    this.playAudio()
  }

  /**
   * 播放当前录制的音频
   */
  playAudio (): void {
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
      audioNode.buffer = await audioContext.decodeAudioData(fileReader.result as ArrayBuffer)
      audioNode.connect(audioContext.destination)
      audioNode.start(0)
    }
    // 读取选中的文件
    fileReader.readAsArrayBuffer(currentFile)
  }

  /**
   * 下载至本地
   */
  downloadToLocal (): void {
    const { currentFile } = this
    if (!currentFile) {
      alert('请先输入文本然后合成语音，再下载！')
      return
    }
    const time = (new Date()).toISOString().replace('T', ' ')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(currentFile)
    a.setAttribute('download', `${time}.mp3`)
    a.click()
  }
}
</script>

<style lang="stylus" rel="stylesheet/stylus" module>
.wrapper
  width 100%
  height 100%
  display grid
  place-content center
  grid-gap 20px

  .recogniseWrapper
    text-align center
</style>
