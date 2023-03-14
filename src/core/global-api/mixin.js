/* @flow */

import { mergeOptions } from '../util/index'
/**
 * 定义Vue.mixin,负责全局混入选项，影响之后所有创建的Vue实例，这些实例会合并全局混入的选项
 */
export function initMixin (Vue: GlobalAPI) {
  // 在Vue 的默认配置项上合并mixin对象
  Vue.mixin = function (mixin: Object) {
    this.options = mergeOptions(this.options, mixin)
    return this
  }
}
