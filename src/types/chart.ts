export interface Users {
  [id: string]: string
}

export interface Record {
  username: string;
  message: string;
}

export interface News {
  type: string|number;
  data: any;
}

/**
 * Invite：发送会话邀请
 */
export enum NewType {
  invite,
  Answer,
  disconnect,
  message
}

type MimeType='video/webm'|'audio/webm'|'video/webm\\;codecs=vp8'
  |'video/webm\\;codecs=daala'| 'video/webm\\;codecs=h264'
  |'audio/webm\\;codecs=opus'|'video/mpeg'

export interface MediaRecorder {
  mimeType:string;
  // eslint-disable-next-line @typescript-eslint/no-misused-new
  new(stream:MediaStream, options:{
    mimeType:MimeType;
    audioBitsPerSecond:number;
    videoBitsPerSecond:number;
    bitsPerSecond:number;
  }):MediaRecorder;

}
