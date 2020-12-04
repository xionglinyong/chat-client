/**
 *下载文件到本地
 * @param {File} file 需要下载的文件
 * @param {string} errMsg 错误提示信息
 * @returns {Promise<void>} 如果文件不存在，则返回拒绝的期约，否则返回解决的期约
 */
export function downloadToLocal (file: File, errMsg: string): Promise<void> {
  if (!file) {
    return Promise.reject(Error(errMsg))
  }
  const time = (new Date()).toISOString().replace('T', ' ')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(file)
  a.setAttribute('download', `${time}.mp3`)
  a.click()
  return Promise.resolve()
}

/**
 * 播放当前录制的音频
 */
export function playAudio (file: File, errMsg: string): Promise<void> {
  if (!file) {
    return Promise.reject(errMsg)
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
  fileReader.readAsArrayBuffer(file)
  return Promise.resolve()
}
