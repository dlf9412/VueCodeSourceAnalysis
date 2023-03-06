/**
 * 定义 arrayMethods 对象，用于增强Array.prototype
 * 当访问 arrayMethods 对象上的 七个方法的时候 就会被拦截，以实现数组响应式
 *  
 * */ 

import { def } from '../util/index'

// 备份 数组 原型对象
const arrayProto = Array.prototype
// 通过继承的 方式创建新的arrayMethods
export const arrayMethods = Object.create(arrayProto)

// 操作数组的七个方法，这七个方法可以改变数组自生
const methodsToPatch = [
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse'
]

/**
 * 拦截变异方法并触发事件
 */
methodsToPatch.forEach(function (method) {
  // 缓存原生方法，比如push
  const original = arrayProto[method]
  // def 就是 Object.defineProperty,拦截 arrayMethods.method 的访问
  def(arrayMethods, method, function mutator (...args) {
    // 先执行原生方法， 比如 push.apply(this,args)
    const result = original.apply(this, args)
    const ob = this.__ob__
    // 如果method 是以下三个之一， 说明是新插入了元素
    let inserted
    switch (method) {
      case 'push':
      case 'unshift':
        inserted = args
        break
      case 'splice':
        inserted = args.slice(2)
        break
    }
    // 对新插入的元素做响应式处理
    if (inserted) ob.observeArray(inserted)
    // 通知更新
    ob.dep.notify()
    return result
  })
})
