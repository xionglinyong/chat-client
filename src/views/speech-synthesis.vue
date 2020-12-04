<template lang="pug">
  div(:class="$style.wrapper")
    v-card(:class="$style.recogniseWrapper")
      v-card-title 语音识别
      v-card-subtitle(:class="$style.recogniseText") {{recognizing?'识别中。。。':recogniseText}}
      v-card-text
        v-btn(@click="recognizing?stopRecognise():startRecognise()")
          |{{recognizing?'停止识别':'开始识别'}}
    v-card(:class="$style.recogniseWrapper")
      v-card-title 语音合成
      v-card-subtitle
        v-radio-group(v-model="language")
          v-radio(v-for="lan of languages" :key="lan" :label="lan" :value="lan")
      v-card-subtitle
        v-text-field(label="输入需要合成的内容" v-model="text")
      v-card-subtitle(:class="$style.recogniseText") {{recognizing?'识别中。。。':recogniseText}}
      v-card-text
        v-btn(@click="speakVoice") 合成并播放

</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import axios from 'axios'

/*
*尝试将合成的语音放到AudioContext上
* */

const languageMap = new Map([
  ['普通话（中国大陆）', 'zh-CN'],
  ['英语（美国）', 'en-US'],
  ['粤語（香港）', 'zh-HK'],
  ['普通话（中国台湾）', 'zh-TW']
])

// https://www.zhangxinxu.com/wordpress/2017/01/html5-speech-recognition-synthesis-api/
@Component
export default class SpeechSynthesis extends Vue {
  recognizing=false
  recogniseText=''
  language='普通话（中国大陆）'
  audioData:Array<Float32Array>=[]
  text=''
  // eslint-disable-next-line no-undef
  languages:Array<string>=Array.from(languageMap.keys())
  jsNode!:ScriptProcessorNode
  mediaNode!:MediaStreamAudioSourceNode
  // eslint-disable-next-line new-cap,no-undef,@typescript-eslint/ban-ts-comment
  recognizer:SpeechRecognition=new window.webkitSpeechRecognition()
  // 语音合成器
  synthesizer:SpeechSynthesisUtterance=new SpeechSynthesisUtterance()

  startRecognise ():void {
    this.recognizing = true
    this.recognizer.start()
  }

  stopRecognise ():void {
    this.recognizing = false
    this.recognizer.stop()
  }

  async speakVoice ():Promise<void> {
    const { synthesizer, language, text } = this
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    // 通过WebAudio保存录音
    const ac = new AudioContext()
    // 通过媒体流创建一个audioNode
    const mediaNode = this.mediaNode = ac.createMediaStreamSource(stream)
    // 创建ScriptProcessorNode操作用以处理音频
    const creator = ac.createScriptProcessor.bind(ac)
    const jsNode = this.jsNode = creator(4096, 2, 2)// 设置的更小的话会造成有杂音
    synthesizer.lang = languageMap.get(language) as string
    synthesizer.text = text
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(synthesizer)
    window.speechSynthesis.addEventListener('voiceschanged', (e:any) => {
      console.log(e)
    })
    // 连接到AudioContext
    jsNode.connect(ac.destination)
    // 添加音频流入事件
    jsNode.onaudioprocess = async (e:AudioProcessingEvent) => {
      const audioBuffer = e.outputBuffer
      console.log(audioBuffer.getChannelData(1))
    }
    synthesizer.onend = () => {
      stream.getTracks().forEach(track => {
        track.stop()
      })
      this.jsNode.disconnect()
      this.mediaNode.disconnect()
    }
    // audioNode连接到jsNode
    mediaNode.connect(jsNode)
  }

  mounted ():void {
    const { recognizer } = this

    // eslint-disable-next-line no-undef
    recognizer.onresult = (e:SpeechRecognitionEvent) => {
      this.recogniseText = e.results[0][0].transcript
      this.stopRecognise()
    }
  }
}

/**
 * 合并数据片段。因为Float32Array长度不能够动态调节，所以需要根据最终数据合成一个整体的Float32Array
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
.wrapper
  width 100%
  height 100%
  display grid
  place-content center
  grid-gap 20px
  .recogniseWrapper
    text-align center
    .recogniseText
      text-align center
</style>
