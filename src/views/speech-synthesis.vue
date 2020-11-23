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
  text=''
  // eslint-disable-next-line no-undef
  languages:Array<string>=Array.from(languageMap.keys())

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

  speakVoice ():void {
    const { synthesizer, language, text } = this
    synthesizer.lang = languageMap.get(language) as string
    synthesizer.text = text
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(synthesizer)
  }

  mounted () {
    const { recognizer } = this

    // eslint-disable-next-line no-undef
    recognizer.onresult = (e:SpeechRecognitionEvent) => {
      this.recogniseText = e.results[0][0].transcript
      this.stopRecognise()
    }
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
    .recogniseText
      text-align center
</style>
