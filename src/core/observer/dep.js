/* @flow */

import type Watcher from './watcher'
import { remove } from '../util/index'
import config from '../config'

let uid = 0

/**
 * 一个dep 对应一个obj.key
 * 在读取响应式数据时，负责收集依赖，每个dep （或者说 obj.key）依赖的watcher 有哪些
 * 在响应式数据更新时，负责通知dep 中 那些watcher去执行 update 方法
 */
export default class Dep {
  static target: ?Watcher;
  id: number;
  subs: Array<Watcher>;

  constructor () {
    this.id = uid++
    this.subs = []
  }

  // 在dep 中添加watcher
  addSub (sub: Watcher) {
    this.subs.push(sub)
  }

  removeSub (sub: Watcher) {
    remove(this.subs, sub)
  }

  // 向watcher中添加Dep
  depend () {
    if (Dep.target) {
      Dep.target.addDep(this)
    }
  }

  // 通知 dep 中的所有watcher，执行watcher.update()方法
  notify () {
    // stabilize the subscriber list first
    const subs = this.subs.slice()
    if (process.env.NODE_ENV !== 'production' && !config.async) {
      // 排序
      subs.sort((a, b) => a.id - b.id)
    }
    // 遍历dep 中存储的 watcher，执行 watcher.update()
    for (let i = 0, l = subs.length; i < l; i++) {
      subs[i].update()
    }
  }
}

/**
 * 当前正在执行的 watcher,同一时间只会有一个watcher 在执行
 * Dep.target = 当前正在执行的watcher
 * 通过调用 pushTarget 方法完成赋值，调用popTarget 方法完成重置(null)
 */
Dep.target = null
const targetStack = []


// 在需要进行依赖收集的时候调用，设置Dep.target = watcher
export function pushTarget (target: ?Watcher) {
  targetStack.push(target)
  Dep.target = target
}

// 依赖收集结束调用，设置Dep.target=null
export function popTarget () {
  targetStack.pop()
  Dep.target = targetStack[targetStack.length - 1]
}
