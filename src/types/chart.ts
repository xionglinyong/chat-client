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
  disconnect
}
