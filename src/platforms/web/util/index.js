/* @flow */

import { warn } from 'core/util/index'

export * from './attrs'
export * from './class'
export * from './element'

/**
 * Query an element selector if it's not an element already.
 */
export function query (el: string | Element): Element {
  // 如果el是个string，代表传进来的时候class或者id
  // 否则是个dom元素
  if (typeof el === 'string') {
    const selected = document.querySelector(el)
    // 如果没有这个元素，直接创建一个div标签
    if (!selected) {
      process.env.NODE_ENV !== 'production' && warn(
        'Cannot find element: ' + el
      )
      return document.createElement('div')
    }
    // 如果有，返回这个元素
    return selected
  } else {
    return el
  }
}
