/* @flow */
/* globals MutationObserver */

import { noop } from 'shared/util'
import { handleError } from './error'
import { isIE, isIOS, isNative } from './env'

export let isUsingMicroTask = false

const callbacks = []
let pending = false

// 刷新callbacks 数组
function flushCallbacks () {
  pending = false
  // 存储callbacks
  const copies = callbacks.slice(0)
  // 清空callbacks
  callbacks.length = 0
  // 遍历copies ,执行flushSchedulerQueue方法
  for (let i = 0; i < copies.length; i++) {
    copies[i]()
  }
}


let timerFunc


// 异步调用，首先先判断是否可以使用promise，然后是
// 使用第一种微任务 promise
if (typeof Promise !== 'undefined' && isNative(Promise)) {
  const p = Promise.resolve()
  timerFunc = () => {
    p.then(flushCallbacks)

    if (isIOS) setTimeout(noop)
  }
  // 使用微任务队列
  isUsingMicroTask = true
} else if (!isIE && typeof MutationObserver !== 'undefined' && (
  isNative(MutationObserver) ||

  MutationObserver.toString() === '[object MutationObserverConstructor]'
)) {
// 第二种微任务 MutationObserver
  let counter = 1
  const observer = new MutationObserver(flushCallbacks)
  const textNode = document.createTextNode(String(counter))
  observer.observe(textNode, {
    characterData: true
  })
  timerFunc = () => {
    counter = (counter + 1) % 2
    textNode.data = String(counter)
  }
  isUsingMicroTask = true
} else if (typeof setImmediate !== 'undefined' && isNative(setImmediate)) {
// 使用宏任务-setImmediate
  timerFunc = () => {
    setImmediate(flushCallbacks)
  }
} else {
  // 使用宏任务-setImmediate
  timerFunc = () => {
    setTimeout(flushCallbacks, 0)
  }
}

export function nextTick (cb?: Function, ctx?: Object) {
  // 用callbacks数据存储经过包装的 cb 函数，也就是执行watcher 的函数
  let _resolve
  callbacks.push(() => {
    // 错误捕获，防止外部使用nextick 的时候 的错误
    if (cb) {
      try {
        cb.call(ctx)
      } catch (e) {
        handleError(e, ctx, 'nextTick')
      }
    } else if (_resolve) {
      _resolve(ctx)
    }
  })
  // 执行callbacks 数组,pending保证执行是有序的
  if (!pending) {
    pending = true
    timerFunc()
  }
  // $flow-disable-line
  if (!cb && typeof Promise !== 'undefined') {
    return new Promise(resolve => {
      _resolve = resolve
    })
  }
}
