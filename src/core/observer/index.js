/* @flow */

import Dep from './dep'
import VNode from '../vdom/vnode'
import { arrayMethods } from './array'
import {
  def,
  warn,
  hasOwn,
  hasProto,
  isObject,
  isPlainObject,
  isPrimitive,
  isUndef,
  isValidArrayIndex,
  isServerRendering
} from '../util/index'

const arrayKeys = Object.getOwnPropertyNames(arrayMethods)

/**
 * In some cases we may want to disable observation inside a component's
 * update computation.
 */
export let shouldObserve: boolean = true

export function toggleObserving (value: boolean) {
  shouldObserve = value
}

/**
 * 观察者类，会被附加到每个被观察的对象上，value._ob_=this
 * 而对象的各个属性则会被转换成getter/setter，并收集依赖和通知更新
 */
export class Observer {
  value: any;
  dep: Dep;
  vmCount: number; // number of vms that have this object as root $data

  constructor (value: any) {
    this.value = value
    // 实例化一个dep 
    this.dep = new Dep()
    this.vmCount = 0
    // 在value对象上设置_ob_属性
    def(value, '__ob__', this)
    // 判断value是否为数组, 数组和对象采用不同的处理方式
    if (Array.isArray(value)) {
      // hasProto = '__proto__' in {}
      // 这个判断的作用是是为了兼容低级浏览器，如果低级浏览器 没有 _proto_(如ie6-10) 则采用第二种方式
      if (hasProto) {
        // value._proto_= arrayMethods,将value的原型指向 Array.prototype
        protoAugment(value, arrayMethods)
      } else {
        // 在目标对象上定义指定属性,为目标 设置指定属性(数组的七个方法) 
        copyAugment(value, arrayMethods, arrayKeys)
      }
      // 遍历数组,为数组的每一项设置观察
      this.observeArray(value)
    } else {
      // value为对象，为对象中的每个值设置 拦截
      this.walk(value)
    }
  }

  /**
   * 遍历对象上的每个 key，为每个key 设置响应式
   * 仅当值为对象时才会走这里
   */
  walk (obj: Object) {
    const keys = Object.keys(obj)
    for (let i = 0; i < keys.length; i++) {
      defineReactive(obj, keys[i])
    }
  }

  /**
   * 遍历数组，为数组的每一项设置观察，处理数组元素为对象的情况
   */
  observeArray (items: Array<any>) {
    for (let i = 0, l = items.length; i < l; i++) {
      observe(items[i])
    }
  }
}

// helpers

/**
 * 设置target._proto_ 的原型对象为src
 * 比如数组对象，arr._proto_=arrayMethods
 */
function protoAugment (target, src: Object) {
  /* eslint-disable no-proto */
  target.__proto__ = src
  /* eslint-enable no-proto */
}

/**
 * 在目标对象上定义指定属性
 * 比如数组：为数组对象定义那7个方法
 */
/* istanbul ignore next */
function copyAugment (target: Object, src: Object, keys: Array<string>) {
  for (let i = 0, l = keys.length; i < l; i++) {
    const key = keys[i]
    def(target, key, src[key])
  }
}

/**
 * data响应式处理的入口
 * 为对象创建观察者实例，如果对象已经被观察过，则返回已有的观察者实例，否则创建新的观察者实例
 *  
 */ 
export function observe (value: any, asRootData: ?boolean): Observer | void {
  // 非对象和Vnode实例不做响应式处理
  if (!isObject(value) || value instanceof VNode) {
    return
  }
  let ob: Observer | void
  // 如果该数据已经是代理过的数据，则直接返回_ob_属性
  if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {

    ob = value.__ob__

  } else if (shouldObserve &&!isServerRendering() &&(Array.isArray(value) || isPlainObject(value)) && Object.isExtensibl(value) &&!value._isVue) {
    //为当前 vm 的data 创建观察者实例
    ob = new Observer(value)
  }
  if (asRootData && ob) {
    ob.vmCount++
  }
  return ob
}

/**
 * 拦截 obj[key]的读取和设置操作--依赖收集,依赖更新
 * 1、在第一次读取时收集依赖，比如computed使用了data的数据,会有读取操作
 * 2、在更新时设置新值并通知依赖更新
 */
export function defineReactive (
  obj: Object,
  key: string,
  val: any,
  customSetter?: ?Function,
  shallow?: boolean
) {
  // 实例化dep,一个key 一个dep
  const dep = new Dep()

  // 获取obj[key]的属性描述符，发现它是不可配置对象的话直接return
  const property = Object.getOwnPropertyDescriptor(obj, key)
  if (property && property.configurable === false) {
    return
  }

  // 记录getter和setter，获取val值
  const getter = property && property.get
  const setter = property && property.set
  if ((!getter || setter) && arguments.length === 2) {
    val = obj[key]
  }

  // 递归调用，处理val 即 obj[key] 的值为对象的情况，保证对象中的所有key 都被观察
  // 对 obj[key] 的值为对象的数据，递归 响应式处理该值
  let childOb = !shallow && observe(val)
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    // get 拦截对 obj[key] 的读取操作---依赖收集
    get: function reactiveGetter () {
      const value = getter ? getter.call(obj) : val
      // Dep.target为 Dep 类的一个静态属性，值为watcher,在实例化 Watcher 时会被设置
      // 实例化Watcher 时会执行 new Watcher 时传递的回调函数(computed 除外，因为它懒执行)
      // 而回调函数中如果有 vm.key 的读取行为，则会触发这里的 读取 拦截，进行依赖收集
      // 回调函数执行完以后又会将 Dep.target设置为null，避免这里重复收集依赖
      if (Dep.target) {
        // 依赖收集，在 dep 中添加 watcher，也在 watcher 中添加 dep
        dep.depend()
        // childobj 表示对象中嵌套 对象的观察者对象，如果存在也对其进行依赖收集
        if (childOb) {
          // 更新 childKey 被更新时能触发响应式的原因
          childOb.dep.depend()
          // 如果obj[key] 是数组，则触发数组响应式
          if (Array.isArray(value)) {
            // 为数组项为对象的项添加依赖
            dependArray(value)
          }
        }
      }
      return value
    },
    // set 拦截 对 obj[key] 的设置操作
    // 对已经收集的依赖的watcher进行通知
    set: function reactiveSetter (newVal) {
      // 旧的 obj[key]
      const value = getter ? getter.call(obj) : val
      /* eslint-disable no-self-compare */
      // 如果新老数据一样，则直接return，不更新，也不触发响应式更新过程
      if (newVal === value || (newVal !== newVal && value !== value)) {
        return
      }
      
      /* eslint-enable no-self-compare */
      if (process.env.NODE_ENV !== 'production' && customSetter) {
        customSetter()
      }
      // setter如果不存在，说明该属性是一个只读属性，直接return
      if (getter && !setter) return
      // 设置新值
      if (setter) {
        setter.call(obj, newVal)
      } else {
        val = newVal
      }
      // 对新值 进行观察，让新值也是响应式的
      childOb = !shallow && observe(newVal)
      // 依赖通知更新
      dep.notify()
    }
  })
}

/**
 * Set a property on an object. Adds the new property and
 * triggers change notification if the property doesn't
 * already exist.
 */
export function set (target: Array<any> | Object, key: any, val: any): any {
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(`Cannot set reactive property on undefined, null, or primitive value: ${(target: any)}`)
  }
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.length = Math.max(target.length, key)
    target.splice(key, 1, val)
    return val
  }
  if (key in target && !(key in Object.prototype)) {
    target[key] = val
    return val
  }
  const ob = (target: any).__ob__
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid adding reactive properties to a Vue instance or its root $data ' +
      'at runtime - declare it upfront in the data option.'
    )
    return val
  }
  if (!ob) {
    target[key] = val
    return val
  }
  defineReactive(ob.value, key, val)
  ob.dep.notify()
  return val
}

/**
 * Delete a property and trigger change if necessary.
 */
export function del (target: Array<any> | Object, key: any) {
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(`Cannot delete reactive property on undefined, null, or primitive value: ${(target: any)}`)
  }
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.splice(key, 1)
    return
  }
  const ob = (target: any).__ob__
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid deleting properties on a Vue instance or its root $data ' +
      '- just set it to null.'
    )
    return
  }
  if (!hasOwn(target, key)) {
    return
  }
  delete target[key]
  if (!ob) {
    return
  }
  ob.dep.notify()
}

/**
 * 遍历每个数组元素，递归处理数组项为对象的情况，为其添加依赖
 * 因为前面的递归阶段无法为数组中的对象元素添加依赖
 */
function dependArray (value: Array<any>) {
  for (let e, i = 0, l = value.length; i < l; i++) {
    e = value[i]
    e && e.__ob__ && e.__ob__.dep.depend()
    if (Array.isArray(e)) {
      dependArray(e)
    }
  }
}
