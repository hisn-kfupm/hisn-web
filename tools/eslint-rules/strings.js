'use strict'

/**
 * The strings an expression can evaluate to, as far as the source shows:
 * `'a'`, `` `a ${x}` ``, `c ? 'a' : 'b'`, `x || 'a'`, `'a' as const`.
 * A template literal yields its fixed parts joined by spaces.
 *
 * @param {any} node
 * @returns {{ node: any, text: string }[]}
 */
function renderedStrings(node) {
  if (!node) return []
  switch (node.type) {
    case 'Literal':
      return typeof node.value === 'string' ? [{ node, text: node.value }] : []
    case 'TemplateLiteral':
      return [{ node, text: node.quasis.map((q) => q.value.cooked ?? q.value.raw).join(' ') }]
    case 'ConditionalExpression':
      return [...renderedStrings(node.consequent), ...renderedStrings(node.alternate)]
    case 'LogicalExpression':
      return [...renderedStrings(node.left), ...renderedStrings(node.right)]
    case 'TSAsExpression':
    case 'TSSatisfiesExpression':
    case 'TSNonNullExpression':
      return renderedStrings(node.expression)
    default:
      return []
  }
}

module.exports = { renderedStrings }
