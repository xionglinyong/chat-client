<template lang="pug">
  div(:class="$style.soundContainer" ref="soundContainer")
    div(:class="$style.sound" v-for="(volume,index) of historyVolume" :key="index")
      div(:class="$style.soundBar" :style="`height:${historyVolume[index]}px;`")
</template>

<script lang="ts">
import { Component, Prop, Ref, Vue, Watch } from 'vue-property-decorator'

const arrayLength = 200

@Component
export default class RealVolume extends Vue {
  historyVolume:Array<number>=new Array(arrayLength)
  height=50

  @Prop({
    type: Number,
    default: 0,
    required: true
  }) volume!:number

  @Watch('volume')
  onVolumeChange (volume:number):void {
    this.setVal(volume)
  }

  setVal:(val:number)=>void=(() => {
    let index = 0
    return (val:number) => {
      this.$set(this.historyVolume, index, val / 2 * this.height)
      // this.historyVolume[index] = val / 2 * this.height
      index === arrayLength - 1 ? index = 0 : index++
    }
  })()
}
</script>

<style lang="stylus" rel="stylesheet/stylus" module>
.soundContainer
  width=1px
  height=50px
  height height
  display grid
  grid-template-columns repeat(200,width)
  grid-template-rows repeat(1,height)
  .sound
    position relative
    height 100%
    background #a8a4a4
    .soundBar
      position absolute
      bottom 0
      left 0
      width 100%
      height 0
      background #b85e5e
      transition 0.05s
</style>
