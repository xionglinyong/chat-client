import { VuexModule, Module, Mutation } from 'vuex-module-decorators'
import { Record, Users } from '@/types/chart'
import store from '@/store/index'

@Module({
  dynamic: true,
  name: 'Chart',
  namespaced: true,
  store,
  stateFactory: true
})
export default class Chat extends VuexModule {
  onlineUsers: Users = {}
  record: Array<Record> = []
  sdps: { [id: string]: RTCSessionDescription } = {}

  @Mutation
  // 服务端消息名为Users，socket是socket提交荷载的前缀，data为服务端发送的数据
  socketUsers (data: Users) {
    this.onlineUsers = data
  }

  @Mutation
  // 服务端消息名为Record，socket是socket提交荷载的前缀，data为服务端发送的数据
  socketRecord (data: Array<Record>) {
    this.record = data
  }

  @Mutation
  socketRoom (data: { [id: string]: RTCSessionDescription }) {
    this.sdps = data
  }
}
