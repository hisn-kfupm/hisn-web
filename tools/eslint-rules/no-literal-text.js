'use strict'

const { renderedStrings } = require('./strings')

const LETTER = /\p{L}/u
const ARABIC_LETTER = /(?=\p{L})\p{Script=Arabic}/u
/** attributes whose value is read out or shown, so any letter in them is UI text */
const TEXT_ATTRIBUTES = new Set(['alt', 'title', 'placeholder', 'aria-label'])

const attributeName = (node) =>
  node.name.type === 'JSXNamespacedName' ? `${node.name.namespace.name}:${node.name.name.name}` : node.name.name

/**
 * No literal UI text in JSX: it belongs in lib/i18n/ar.json, read with t().
 * - text between tags, or a string in braces, that contains a letter
 * - a letter in alt, title, placeholder or aria-label
 * - Arabic letters in any other attribute (e.g. a `label` prop)
 * Numbers, punctuation and whitespace are allowed; so is `alt=""` for decorative images.
 *
 * @type {import('eslint').Rule.RuleModule}
 */
module.exports = {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow literal UI text in JSX; add a key to lib/i18n/ar.json and use t()' },
    schema: [],
    messages: {
      text: 'Literal text in JSX. Add a key to lib/i18n/ar.json and render it with t().',
      attribute: 'Literal text in the "{{name}}" attribute. Add a key to lib/i18n/ar.json and pass t() instead.',
    },
  },
  create(context) {
    return {
      JSXText(node) {
        if (LETTER.test(node.value)) context.report({ node, messageId: 'text' })
      },
      JSXExpressionContainer(node) {
        if (node.parent.type === 'JSXAttribute') return
        for (const s of renderedStrings(node.expression)) {
          if (LETTER.test(s.text)) context.report({ node: s.node, messageId: 'text' })
        }
      },
      JSXAttribute(node) {
        if (!node.value) return
        const name = attributeName(node)
        const pattern = TEXT_ATTRIBUTES.has(name) ? LETTER : ARABIC_LETTER
        const candidates =
          node.value.type === 'JSXExpressionContainer'
            ? renderedStrings(node.value.expression)
            : renderedStrings(node.value)
        for (const s of candidates) {
          if (pattern.test(s.text)) context.report({ node: s.node, messageId: 'attribute', data: { name } })
        }
      },
    }
  },
}
