'use strict'

const path = require('node:path')

const TALENT = 'lib/db/talent'
const ALLOWED_FILE = 'app/talent/actions.ts'
const EXTENSION = /\.(?:[cm]?[jt]sx?)$/

const posix = (p) => p.split(path.sep).join('/')

/**
 * Only `app/talent/actions.ts` may import the talent client (`@/lib/db/talent`): the talent
 * database is separate and its data is sensitive. Catches `@/` and relative paths, sub-paths,
 * type-only imports, re-exports, `import()` and `require()`.
 *
 * @type {import('eslint').Rule.RuleModule}
 */
module.exports = {
  meta: {
    type: 'problem',
    docs: { description: `Only ${ALLOWED_FILE} may import @/${TALENT}` },
    schema: [],
    messages: {
      import: `Only ${ALLOWED_FILE} may import @/${TALENT}. Call the talent server actions instead.`,
    },
  },
  create(context) {
    const root = context.cwd
    const file = path.resolve(root, context.filename)
    if (posix(path.relative(root, file)) === ALLOWED_FILE) return {}

    /** the module a specifier points at, relative to the project root, or null for packages */
    const target = (specifier) => {
      let resolved
      if (specifier.startsWith('@/')) resolved = specifier.slice(2)
      else if (specifier.startsWith('.')) resolved = posix(path.relative(root, path.resolve(path.dirname(file), specifier)))
      else return null
      return resolved.replace(EXTENSION, '').replace(/\/index$/, '')
    }

    const check = (source) => {
      if (source?.type !== 'Literal' || typeof source.value !== 'string') return
      const imported = target(source.value)
      if (imported === TALENT || imported?.startsWith(`${TALENT}/`)) context.report({ node: source, messageId: 'import' })
    }

    return {
      ImportDeclaration: (node) => check(node.source),
      ExportNamedDeclaration: (node) => check(node.source),
      ExportAllDeclaration: (node) => check(node.source),
      ImportExpression: (node) => check(node.source),
      CallExpression(node) {
        if (node.callee.type === 'Identifier' && node.callee.name === 'require') check(node.arguments[0])
      },
    }
  },
}
