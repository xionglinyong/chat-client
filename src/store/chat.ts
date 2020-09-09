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

  @Mutation
  socketUsers (data: Users) {
    this.onlineUsers = data
  }

  @Mutation
  socketRecord (data: Array<Record>) {
    this.record = data
  }
}
