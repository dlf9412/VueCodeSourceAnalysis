import { initMixin } from './init'
import { stateMixin } from './state'
import { renderMixin } from './render'
import { eventsMixin } from './events'
import { lifecycleMixin } from './lifecycle'
import { warn } from '../util/index'

function Vue (options) {
  if (process.env.NODE_ENV !== 'production' &&
    !(this instanceof Vue)
  ) {
    warn('Vue is a constructor and should be called with the `new` keyword')
  }
  this._init(options)
}

// _init方法,初始化data/props/methods/computed/watch/provide/inject等
initMixin(Vue)
// 将$set/$delete/$data/$props 挂载到vm实例，可以通过this.$data的方式获取到
stateMixin(Vue)
// 事件:$on,$emit,$once,$off
eventsMixin(Vue)
// 生命周期相关:$forceUpdte,$destory
lifecycleMixin(Vue)
// 渲染相关:$nexttick,_render
renderMixin(Vue)

export default Vue
