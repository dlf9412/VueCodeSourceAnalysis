/* @flow */

import config from 'core/config'
import { warn, cached } from 'core/util/index'
import { mark, measure } from 'core/util/perf'

import Vue from './runtime/index'
import { query } from './util/index'
import { compileToFunctions } from './compiler/index'
import { shouldDecodeNewlines, shouldDecodeNewlinesForHref } from './util/compat'

const idToTemplate = cached(id => {
  const el = query(id)
  return el && el.innerHTML
})
//编译器的入口
//存储原本的$mount方法
//运行时的Vue.js 包就没有这部分的代码，通过 打包器 结合 vue-loader+vue-compiler-utils 进行编译，将模板编译成render函数
//就做了一件事，得到组件的渲染函数，将其设置到this.$options上
const mount = Vue.prototype.$mount
Vue.prototype.$mount = function (
  el?: string | Element,
  hydrating?: boolean
): Component {
  // 获取挂载的dom
  el = el && query(el)

  // 挂载点不能是body 或者 html
  if (el === document.body || el === document.documentElement) {
    process.env.NODE_ENV !== 'production' && warn(
      `Do not mount Vue to <html> or <body> - mount to normal elements instead.`
    )
    return this
  }

  // 配置项
  const options = this.$options
  /**
   * 如果用户提供了 render配置项，则直接跳过编译阶段，否则进入编译阶段
   * 解析template 和 el ,并转换为render 函数
   * 优先级：render>template>el
   */

  if (!options.render) {
    let template = options.template
    if (template) {
      // 处理template选项
      if (typeof template === 'string') {
        if (template.charAt(0) === '#') {
          // {template:'#app'},template 是一个 id选择器， 则获取该元素的innerHtml作为模板
          template = idToTemplate(template)
          /* istanbul ignore if */
          if (process.env.NODE_ENV !== 'production' && !template) {
            warn(
              `Template element not found or is empty: ${options.template}`,
              this
            )
          }
        }
      } else if (template.nodeType) {
        // template 是一个正常的元素，获取其 innerHTML 作为模板
        template = template.innerHTML
      } else {
        if (process.env.NODE_ENV !== 'production') {
          warn('invalid template option:' + template, this)
        }
        return this
      }
    } else if (el) {
      // 设置了el 选项，获取 el 选择器的outerHTML 作为模板
      template = getOuterHTML(el)
    }
    if (template) {
      // 模板就绪，进入编译阶段
      /* istanbul ignore if */
      if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
        mark('compile')
      }

      // 编译模板，得到动态渲染函数和静态渲染函数
      const { render, staticRenderFns } = compileToFunctions(template, {
        // 非生产环境下，编译时记录标签属性在模板字符串中开始和结束的位置索引
        outputSourceRange: process.env.NODE_ENV !== 'production',
        shouldDecodeNewlines,
        shouldDecodeNewlinesForHref,
        // 界定符：默认{{}}
        delimiters: options.delimiters,
        // 是否保留注释
        comments: options.comments
      }, this)
      // 将两个函数放到this.$options上
      options.render = render
      options.staticRenderFns = staticRenderFns

      /* istanbul ignore if */
      if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
        mark('compile end')
        measure(`vue ${this._name} compile`, 'compile', 'compile end')
      }
    }
  }
  // 执行挂载
  return mount.call(this, el, hydrating)
}

/**
 * Get outerHTML of elements, taking care
 * of SVG elements in IE as well.
 */
function getOuterHTML (el: Element): string {
  if (el.outerHTML) {
    return el.outerHTML
  } else {
    const container = document.createElement('div')
    container.appendChild(el.cloneNode(true))
    return container.innerHTML
  }
}

Vue.compile = compileToFunctions

export default Vue
