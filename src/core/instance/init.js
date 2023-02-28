/* @flow */

import config from '../config'
import { initProxy } from './proxy'
import { initState } from './state'
import { initRender } from './render'
import { initEvents } from './events'
import { mark, measure } from '../util/perf'
import { initLifecycle, callHook } from './lifecycle'
import { initProvide, initInjections } from './inject'
import { extend, mergeOptions, formatComponentName } from '../util/index'

let uid = 0

export function initMixin (Vue: Class<Component>) {
  // 负责Vue 的初始化过程
  Vue.prototype._init = function (options?: Object) {
    // Vue 实例
    const vm: Component = this
    // a uid
    // 每个 Vue 实例都_uid,并且依次递增
    vm._uid = uid++

    let startTag, endTag
    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      startTag = `vue-perf-start:${vm._uid}`
      endTag = `vue-perf-end:${vm._uid}`
      mark(startTag)
    }

    vm._isVue = true
    // 处理组件配置项
    if (options && options._isComponent) {
      //每个子组件初始化走这里，只做了一些性能优化
      // 将组件配置对象上的一些深层次属性放到vm.$options选项中，以提高代码的执行效率
      initInternalComponent(vm, options)
    } else {
      // 初始化根组件时走这里
      // 合并vue的全局配置到根组件的局部配置
      // 每个子组件的选项合并则发生在两个地方：
      // 1、Vue.components方法注册的全局组件在注册时做了选项合并
      // 2、{components:{xx}}方式注册的局部组件在执行编译器生成的render函数时 做了选项合并，包括根组件的components配置
      vm.$options = mergeOptions(
        resolveConstructorOptions(vm.constructor),
        options || {},
        vm
      )
    }
    /* istanbul ignore else */
    if (process.env.NODE_ENV !== 'production') {
      // 设置代理，将vm的属性代理到_renderProxy上
      initProxy(vm)
    } else {
      vm._renderProxy = vm
    }
    // expose real self
    vm._self = vm
    // 初始化组件实例关系属性，比如：$parent、$children、$root、$refs等
    initLifecycle(vm)
    // 初始化自定义事件，这里也需要注意一点，
    // 我们在<comp @click='handleClick' />上注册的事件，监听者不是父组件，而是子组件本身。
    //也就是说事件的派发者和监听者都是子组件本身，和父组件无关
    initEvents(vm)
    // 解析组件的插槽信息，得到vm.$slot,处理渲染函数，得到vm.$createElement方法，即h函数
    initRender(vm)
    // 调用beforeCreate钩子函数
    callHook(vm, 'beforeCreate')
    // 初始化inject配置项，得到result[key]=val形式的配置对象，然后对数据进行响应式处理，并代理每个key到vm上
    initInjections(vm) 
    // 数据响应式重点，初始化props/data/methods/watch/computed
    initState(vm)
    // 判断是否有provide,provide是函数还是非函数,函数则调用并改变this指向,最终将provide数据存储到_provided
    initProvide(vm) 
    // 调用created钩子函数
    callHook(vm, 'created')

    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      vm._name = formatComponentName(vm, false)
      mark(endTag)
      measure(`vue ${vm._name} init`, startTag, endTag)
    }
    //如果发现配置项上有 el 选项，则自动调用 $mount 方法，也就是说有了 el 选项，就不需要再手动调用 $mount，反之，没有 el 则必须手动调用 $mount
    if (vm.$options.el) {
      // 调用 $mount 方法，进入挂载阶段
      vm.$mount(vm.$options.el)
    }
  }
}

export function initInternalComponent (vm: Component, options: InternalComponentOptions) {
  const opts = vm.$options = Object.create(vm.constructor.options)
  // doing this because it's faster than dynamic enumeration.
  const parentVnode = options._parentVnode
  opts.parent = options.parent
  opts._parentVnode = parentVnode

  const vnodeComponentOptions = parentVnode.componentOptions
  opts.propsData = vnodeComponentOptions.propsData
  opts._parentListeners = vnodeComponentOptions.listeners
  opts._renderChildren = vnodeComponentOptions.children
  opts._componentTag = vnodeComponentOptions.tag

  if (options.render) {
    opts.render = options.render
    opts.staticRenderFns = options.staticRenderFns
  }
}

// 从构造函数中解析配置对象的options，并合并基类选项
export function resolveConstructorOptions (Ctor: Class<Component>) {
  // 配置项目
  let options = Ctor.options
  if (Ctor.super) {
    // 存在基类，递归解析基类构造函数的选项
    const superOptions = resolveConstructorOptions(Ctor.super)
    const cachedSuperOptions = Ctor.superOptions
    if (superOptions !== cachedSuperOptions) {
      // 说明基类的构造函数选项已经发生改变，需要重新设置
      Ctor.superOptions = superOptions
      // 检查 ctor.options上是否有任何后期修改/附加的选项
      const modifiedOptions = resolveModifiedOptions(Ctor)
      // 如果存在修改/增加的选项，则合并两个选项
      if (modifiedOptions) {
        extend(Ctor.extendOptions, modifiedOptions)
      }
      // 选项合并，将合并结果赋值给ctor.options
      options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions)
      if (options.name) {
        options.components[options.name] = Ctor
      }
    }
  }
  return options
}
/**
 * 构造函数选项中后续修改或者增加的选项
 * @param {*} Ctor 
 * @returns 
 */
function resolveModifiedOptions (Ctor: Class<Component>): ?Object {
  let modified
  // 构造函数选项
  const latest = Ctor.options
  // 密封的构造函数选项，备份
  const sealed = Ctor.sealedOptions
  // 对比两个选项，记录不一致的选项
  for (const key in latest) {
    if (latest[key] !== sealed[key]) {
      if (!modified) modified = {}
      modified[key] = latest[key]
    }
  }
  return modified
}
