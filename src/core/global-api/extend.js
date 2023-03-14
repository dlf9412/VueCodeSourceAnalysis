/* @flow */

import { ASSET_TYPES } from 'shared/constants'
import { defineComputed, proxy } from '../instance/state'
import { extend, mergeOptions, validateComponentName } from '../util/index'

export function initExtend (Vue: GlobalAPI) {
  /**
   * Each instance constructor, including Vue, has a unique
   * cid. This enables us to create wrapped "child
   * constructors" for prototypal inheritance and cache them.
   */
  Vue.cid = 0
  let cid = 1

  /**
   *Vue.extend 方法入口
   */
  Vue.extend = function (extendOptions: Object): Function {
    // 配置项
    extendOptions = extendOptions || {}
    // 
    const Super = this
    const SuperId = Super.cid
    // 创建缓存，如果有，就用参数中的带的，如果没有则创建一个
    const cachedCtors = extendOptions._Ctor || (extendOptions._Ctor = {})
    // 如果已经缓存，则直接放回缓存的实例
    if (cachedCtors[SuperId]) {
      return cachedCtors[SuperId]
    }

    // 
    const name = extendOptions.name || Super.options.name
    // 校验组件的name是否符合规范
    if (process.env.NODE_ENV !== 'production' && name) {
      validateComponentName(name)
    }

    // 创建sub 子级实例
    const Sub = function VueComponent (options) {
      this._init(options)
    }  
    // 将sub的 原型指向Super
    Sub.prototype = Object.create(Super.prototype)
    // sub的构造函数指回自己
    Sub.prototype.constructor = Sub
    Sub.cid = cid++
    // 合并 传入的配置项和 Super 的配置项
    Sub.options = mergeOptions(
      Super.options,
      extendOptions
    )
    // 将Super存到 sub['super']上
    Sub['super'] = Super

    // For props and computed properties, we define the proxy getters on
    // the Vue instances at extension time, on the extended prototype. This
    // avoids Object.defineProperty calls for each instance created.
    // 初始化props
    if (Sub.options.props) {
      initProps(Sub)
    }
    // 初始化computed
    if (Sub.options.computed) {
      initComputed(Sub)
    }

    // allow further extension/mixin/plugin usage
    // 为Sub设置原型方法
    Sub.extend = Super.extend
    Sub.mixin = Super.mixin
    Sub.use = Super.use

    // create asset registers, so extended classes
    // can have their private assets too.
    ASSET_TYPES.forEach(function (type) {
      Sub[type] = Super[type]
    })
    // enable recursive self-lookup
    if (name) {
      Sub.options.components[name] = Sub
    }

    // keep a reference to the super options at extension time.
    // later at instantiation we can check if Super's options have
    // been updated.
    Sub.superOptions = Super.options
    Sub.extendOptions = extendOptions
    Sub.sealedOptions = extend({}, Sub.options)

    // cache constructor
    // 存储当前的创建的Sub实例
    cachedCtors[SuperId] = Sub
    return Sub
  }
}

function initProps (Comp) {
  const props = Comp.options.props
  for (const key in props) {
    proxy(Comp.prototype, `_props`, key)
  }
}

function initComputed (Comp) {
  const computed = Comp.options.computed
  for (const key in computed) {
    defineComputed(Comp.prototype, key, computed[key])
  }
}
