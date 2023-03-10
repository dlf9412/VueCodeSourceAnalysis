/* @flow */

import config from '../config'
import Watcher from '../observer/watcher'
import Dep, { pushTarget, popTarget } from '../observer/dep'
import { isUpdatingChildComponent } from './lifecycle'

import {
  set,
  del,
  observe,
  defineReactive,
  toggleObserving
} from '../observer/index'

import {
  warn,
  bind,
  noop,
  hasOwn,
  hyphenate,
  isReserved,
  handleError,
  nativeWatch,
  validateProp,
  isPlainObject,
  isServerRendering,
  isReservedAttribute,
  invokeWithErrorHandling
} from '../util/index'

const sharedPropertyDefinition = {
  enumerable: true,
  configurable: true,
  get: noop,
  set: noop
}

// 设置代理，将key 代理到target上
export function proxy (target: Object, sourceKey: string, key: string) {
  sharedPropertyDefinition.get = function proxyGetter () {
    return this[sourceKey][key]
  }
  sharedPropertyDefinition.set = function proxySetter (val) {
    this[sourceKey][key] = val
  }
  Object.defineProperty(target, key, sharedPropertyDefinition)
}

export function initState (vm: Component) {
  vm._watchers = []
  const opts = vm.$options
  // 处理props对象，为props对象的每个属性设置响应式，并将其代理到vm实例上
  if (opts.props) initProps(vm, opts.props)
  // 
  /**
   * 处理methods对象，校验每个属性的值是否为函数，和props是否重名
   */
  if (opts.methods) initMethods(vm, opts.methods)
  /**
   * 做了三件事
   * 1、判重，data对象上的属性不能和 props、methods 对象上的属性相同
   * 2、代理 data 对象上的属性到 vm 实例 => this[dataKey]的方式获取
   * 3、为data 对象上的数据设置响应式
   */
  if (opts.data) {
    initData(vm)
  } else {
    observe(vm._data = {}, true /* asRootData */)
  }
  /**
   * 1、遍历computed，为当前computed创建watcher，默认懒执行。lazy=true
   * 2、代理computed[key] 到vm实例
   * 3、判重，不能和data,props中的属性重复
   * */ 
  if (opts.computed) initComputed(vm, opts.computed)
  /**
   * 1、处理watch对象
   * 2、为每个 watch.key 创建watcher实例，key 和 watcher 实例可能是 一对多的关系
   * 3、如果设置了immediate，则立即执行回调函数
   */
  if (opts.watch && opts.watch !== nativeWatch) {
    initWatch(vm, opts.watch)
  }
}

// 处理props对象，为props对象的每个属性设置响应式，并将其代理到vm实例上
function initProps (vm: Component, propsOptions: Object) {
  const propsData = vm.$options.propsData || {}
  const props = vm._props = {}
  // 缓存props的每个key，性能优化
  const keys = vm.$options._propKeys = []
  const isRoot = !vm.$parent
  // root instance props should be converted
  if (!isRoot) {
    toggleObserving(false)
  }
  // 遍历props对象
  for (const key in propsOptions) {
    // 缓存key
    keys.push(key)
    // 获取props[key]的默认值
    const value = validateProp(key, propsOptions, propsData, vm)
    /* istanbul ignore else */
    if (process.env.NODE_ENV !== 'production') {
      const hyphenatedKey = hyphenate(key)
      if (isReservedAttribute(hyphenatedKey) ||
          config.isReservedAttr(hyphenatedKey)) {
        warn(
          `"${hyphenatedKey}" is a reserved attribute and cannot be used as component prop.`,
          vm
        )
      }
      // 为props的每个key设置数据响应式响应式
      defineReactive(props, key, value, () => {
        if (!isRoot && !isUpdatingChildComponent) {
          warn(
            `Avoid mutating a prop directly since the value will be ` +
            `overwritten whenever the parent component re-renders. ` +
            `Instead, use a data or computed property based on the prop's ` +
            `value. Prop being mutated: "${key}"`,
            vm
          )
        }
      })
    } else {
      // 为props的每个key设置数据响应式响应式
      defineReactive(props, key, value)
    }
    // 代理props,使得可以通过this[key]的方式直接访问props的数据
    if (!(key in vm)) {
      // 代理 key 到 vm 对象上
      proxy(vm, `_props`, key)
    }
  }
  // shouldObserve = true
  toggleObserving(true)
}


/**
 * 做了三件事
 * 1、判重处理，data 对象上的属性 不能和props、methods 对象上的属性相同
 * 2、代理data 对象上的属性到 vm实例
 * 3、为data 对象上的数据设置响应式
 */
function initData (vm: Component) {
  let data = vm.$options.data
  /**
   * 获取data对象数据
   * 1、判断是否为函数，
   *      函数：调用该函数，获取data对象，并且调用pushTarget 方法 将Dep.target = target
   *      非函数：赋值，或者给默认对象
   */
  data = vm._data = typeof data === 'function'
    ? getData(data, vm)
    : data || {}
    // 数据不符合规则
  if (!isPlainObject(data)) {
    data = {}
    process.env.NODE_ENV !== 'production' && warn(
      'data functions should return an object:\n' +
      'https://vuejs.org/v2/guide/components.html#data-Must-Be-a-Function',
      vm
    )
  }
  // 获取所有的data 的keys 
  const keys = Object.keys(data)
  const props = vm.$options.props
  const methods = vm.$options.methods
  let i = keys.length
  while (i--) {
    const key = keys[i]
    // 去重,判断data中的key没有跟methods的重复
    if (process.env.NODE_ENV !== 'production') {
      if (methods && hasOwn(methods, key)) {
        warn(
          `Method "${key}" has already been defined as a data property.`,
          vm
        )
      }
    }
    // 去重,判断data中的key没有跟props的重复
    if (props && hasOwn(props, key)) {
      process.env.NODE_ENV !== 'production' && warn(
        `The data property "${key}" is already declared as a prop. ` +
        `Use prop default value instead.`,
        vm
      )
    } else if (!isReserved(key)) {
      // 将数据代理到vm实例上,使得可以通过this[dataKey]的方式访问和修改
      proxy(vm, `_data`, key)
    }
  }
  // 响应式处理
  observe(data, true /* asRootData */)
}

export function getData (data: Function, vm: Component): any {
  // 将 Dep.target = target
  pushTarget()
  // 先执行try，调用方法，并返回结果(data对象)
  // try 执行成功，内部直接return ，不再继续往下走
  // try 执行成功，内部如果没有return， 则继续走finally
  try {
    return data.call(vm, vm)
  } catch (e) {
    // try执行失败，return
    handleError(e, vm, `data()`)
    return {}
  } finally {
    // 上面都执行失败
    popTarget()
  }
}

const computedWatcherOptions = { lazy: true }

function initComputed (vm: Component, computed: Object) {
  // $flow-disable-line
  const watchers = vm._computedWatchers = Object.create(null)
  // computed properties are just getters during SSR
  const isSSR = isServerRendering()

  for (const key in computed) {
    const userDef = computed[key]
    const getter = typeof userDef === 'function' ? userDef : userDef.get
    if (process.env.NODE_ENV !== 'production' && getter == null) {
      warn(
        `Getter is missing for computed property "${key}".`,
        vm
      )
    }

    if (!isSSR) {
      // create internal watcher for the computed property.
      watchers[key] = new Watcher(
        vm,
        getter || noop,
        noop,
        computedWatcherOptions
      )
    }

    // component-defined computed properties are already defined on the
    // component prototype. We only need to define computed properties defined
    // at instantiation here.
    if (!(key in vm)) {
      defineComputed(vm, key, userDef)
    } else if (process.env.NODE_ENV !== 'production') {
      if (key in vm.$data) {
        warn(`The computed property "${key}" is already defined in data.`, vm)
      } else if (vm.$options.props && key in vm.$options.props) {
        warn(`The computed property "${key}" is already defined as a prop.`, vm)
      } else if (vm.$options.methods && key in vm.$options.methods) {
        warn(`The computed property "${key}" is already defined as a method.`, vm)
      }
    }
  }
}

export function defineComputed (
  target: any,
  key: string,
  userDef: Object | Function
) {
  const shouldCache = !isServerRendering()
  if (typeof userDef === 'function') {
    sharedPropertyDefinition.get = shouldCache
      ? createComputedGetter(key)
      : createGetterInvoker(userDef)
    sharedPropertyDefinition.set = noop
  } else {
    sharedPropertyDefinition.get = userDef.get
      ? shouldCache && userDef.cache !== false
        ? createComputedGetter(key)
        : createGetterInvoker(userDef.get)
      : noop
    sharedPropertyDefinition.set = userDef.set || noop
  }
  if (process.env.NODE_ENV !== 'production' &&
      sharedPropertyDefinition.set === noop) {
    sharedPropertyDefinition.set = function () {
      warn(
        `Computed property "${key}" was assigned to but it has no setter.`,
        this
      )
    }
  }
  Object.defineProperty(target, key, sharedPropertyDefinition)
}

function createComputedGetter (key) {
  return function computedGetter () {
    const watcher = this._computedWatchers && this._computedWatchers[key]
    if (watcher) {
      if (watcher.dirty) {
        watcher.evaluate()
      }
      if (Dep.target) {
        watcher.depend()
      }
      return watcher.value
    }
  }
}

function createGetterInvoker(fn) {
  return function computedGetter () {
    return fn.call(this, this)
  }
}

/**
 * 做了以下三件事，其实最关键的就是第三件事
 * 1、校验 methods[key]，必须是一个函数
 * 2、判重：
 *    methods 中的key 不能和props 中的key 相同
 *    methods 中的key 不能和Vue实例上已有的方法重叠，一般是一些内置方法，比如以 $和_开头的方法
 * 3、将methods[key] 放到vm 实例上，得到 vm[key] = methods[key]
 *  
 */
function initMethods (vm: Component, methods: Object) {
  // 获取props 配置项
  const props = vm.$options.props
  // 遍历methods 对象
  for (const key in methods) {
    if (process.env.NODE_ENV !== 'production') {
      if (typeof methods[key] !== 'function') {
        warn(
          `Method "${key}" has type "${typeof methods[key]}" in the component definition. ` +
          `Did you reference the function correctly?`,
          vm
        )
      }
      // 判断该名称没有在props使用过,去重
      if (props && hasOwn(props, key)) {
        warn(
          `Method "${key}" has already been defined as a prop.`,
          vm
        )
      }
      if ((key in vm) && isReserved(key)) {
        warn(
          `Method "${key}" conflicts with an existing Vue instance method. ` +
          `Avoid defining component methods that start with _ or $.`
        )
      }
    }
    // 将method的this指向,指向vm => methods[key].bind(vm)
    // 通知将 methods 挂载到当前vm下
    vm[key] = typeof methods[key] !== 'function' ? noop : bind(methods[key], vm)
  }
}
// 
function initWatch (vm: Component, watch: Object) {
  // 遍历watch
  for (const key in watch) {
    // 获取watch的方法
    const handler = watch[key]
    // 如果是数组，则遍历数组
    if (Array.isArray(handler)) {
      for (let i = 0; i < handler.length; i++) {
        createWatcher(vm, key, handler[i])
      }
    } else {
      createWatcher(vm, key, handler)
    }
  }
}

function createWatcher (
  vm: Component,
  expOrFn: string | Function,
  handler: any,
  options?: Object
) {
  if (isPlainObject(handler)) {
    options = handler
    handler = handler.handler
  }
  if (typeof handler === 'string') {
    handler = vm[handler]
  }
  return vm.$watch(expOrFn, handler, options)
}

export function stateMixin (Vue: Class<Component>) {
  // flow somehow has problems with directly declared definition object
  // when using Object.defineProperty, so we have to procedurally build up
  // the object here.
  const dataDef = {}
  dataDef.get = function () { return this._data }
  const propsDef = {}
  propsDef.get = function () { return this._props }
  if (process.env.NODE_ENV !== 'production') {
    dataDef.set = function () {
      warn(
        'Avoid replacing instance root $data. ' +
        'Use nested data properties instead.',
        this
      )
    }
    propsDef.set = function () {
      warn(`$props is readonly.`, this)
    }
  }
  Object.defineProperty(Vue.prototype, '$data', dataDef)
  Object.defineProperty(Vue.prototype, '$props', propsDef)

  Vue.prototype.$set = set
  Vue.prototype.$delete = del

  Vue.prototype.$watch = function (
    expOrFn: string | Function,
    cb: any,
    options?: Object
  ): Function {
    const vm: Component = this
    if (isPlainObject(cb)) {
      return createWatcher(vm, expOrFn, cb, options)
    }
    options = options || {}
    options.user = true
    const watcher = new Watcher(vm, expOrFn, cb, options)
    if (options.immediate) {
      const info = `callback for immediate watcher "${watcher.expression}"`
      pushTarget()
      invokeWithErrorHandling(cb, vm, [watcher.value], vm, info)
      popTarget()
    }
    return function unwatchFn () {
      watcher.teardown()
    }
  }
}
