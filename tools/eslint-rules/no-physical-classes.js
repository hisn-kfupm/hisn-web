'use strict'

/**
 * dev-1 D1-3's pattern, also matched after a variant (`lg:pl-6`, `rtl:ml-2`) or a leading `!`.
 * `-?` catches negative margins; `(-|\s|$|\/)` keeps `place-*`, `prose` and `border-line` legal
 * and still ends a gradient with an interpolation modifier (`bg-linear-to-r/oklch`).
 * Besides margins, padding, insets, borders, floats and text alignment it covers transform origins
 * (`origin-right`), gradient directions (`bg-linear-to-r`), single corners (`rounded-tl-*`) and
 * scroll offsets (`scroll-ml-*`), which flip just as badly when the page turns English.
 */
const PHYSICAL =
  /(^|[\s:!])-?(m[lr]|p[lr]|left|right|rounded-[lr]|rounded-(tl|tr|bl|br)|border-[lr]|float-(left|right)|text-(left|right)|origin-((top|bottom)-)?(left|right)|bg-(linear|gradient)-to-(l|r|tl|tr|bl|br)|scroll-[mp][lr])(-|\s|$|\/)/

/** helpers whose string arguments are class lists */
const CLASS_HELPERS = new Set(['cn', 'clsx', 'cx', 'twMerge', 'cva', 'tv'])
const isClassName = (name) => typeof name === 'string' && (name === 'className' || name.endsWith('ClassName'))
const COMPARISON = new Set(['==', '===', '!=', '!=='])
/** keys never worth walking into: type annotations and the back-link to the parent */
const SKIP_KEYS = new Set(['parent', 'typeAnnotation', 'typeArguments', 'typeParameters', 'returnType'])

/** the whole class token around the match, e.g. `lg:pl-6` */
function offendingClass(text, match) {
  const at = match.index + match[1].length
  let start = at
  while (start > 0 && !/\s/.test(text[start - 1])) start--
  const end = text.slice(at).search(/\s|$/)
  return text.slice(start, at + end)
}

/**
 * No physical (left/right) Tailwind classes; use the logical ones: ms-/me-, ps-/pe-, start-/end-,
 * text-start/text-end, rounded-s/e (corners rounded-ss/se/es/ee), border-s/e, scroll-ms/me, and
 * origin-(--start) for a transform origin on the inline-start edge. A gradient that runs along the
 * line goes in CSS with `linear-gradient(var(--to-end), …)` (app/globals.css).
 * Checks every string inside a `className` (or `*ClassName`) prop or property, and inside calls
 * to cn(), clsx() and similar helpers anywhere.
 *
 * @type {import('eslint').Rule.RuleModule}
 */
module.exports = {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow physical left/right Tailwind classes; use logical ones' },
    schema: [],
    messages: {
      physical:
        '`{{cls}}` is a left/right class. Use the logical one (ms-/me-, ps-/pe-, start-/end-, text-start/end, rounded-s/e or rounded-ss/se/es/ee, border-s/e, scroll-ms/me, origin-(--start)); put a sideways gradient in CSS with var(--to-end).',
    },
  },
  create(context) {
    const keys = context.sourceCode.visitorKeys
    const checked = new WeakSet()

    const checkText = (node, text) => {
      const match = PHYSICAL.exec(text)
      if (match) context.report({ node, messageId: 'physical', data: { cls: offendingClass(text, match) } })
    }

    /** walk an expression and check every string literal in it */
    const walk = (node) => {
      if (!node || typeof node.type !== 'string' || checked.has(node)) return
      checked.add(node)
      if (node.type === 'Literal') {
        if (typeof node.value === 'string') checkText(node, node.value)
        return
      }
      if (node.type === 'TemplateLiteral') {
        checkText(node, node.quasis.map((q) => q.value.cooked ?? q.value.raw).join(' '))
        node.expressions.forEach(walk)
        return
      }
      // `side === 'left' && …` compares a value; it is not a class
      if (node.type === 'BinaryExpression' && COMPARISON.has(node.operator)) return
      if (node.type === 'MemberExpression' && node.computed) return walk(node.object)
      for (const key of keys[node.type] ?? []) {
        if (SKIP_KEYS.has(key)) continue
        const child = node[key]
        if (Array.isArray(child)) child.forEach(walk)
        else walk(child)
      }
    }

    const keyName = (key) => (key.type === 'Identifier' ? key.name : key.type === 'Literal' ? key.value : undefined)

    return {
      JSXAttribute(node) {
        if (node.name.type === 'JSXIdentifier' && isClassName(node.name.name)) walk(node.value)
      },
      Property(node) {
        if (!node.computed && isClassName(keyName(node.key))) walk(node.value)
      },
      CallExpression(node) {
        if (node.callee.type === 'Identifier' && CLASS_HELPERS.has(node.callee.name)) node.arguments.forEach(walk)
      },
    }
  },
}
