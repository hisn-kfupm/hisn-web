'use strict'

const NAME = 'supabase'

/**
 * No binding named exactly `supabase`: name the client after what it is (`db`, `supabaseProd`, …),
 * so it is always clear which project and which permissions a call runs with.
 * Covers variables, destructuring, parameters, functions, classes and import specifiers.
 *
 * @type {import('eslint').Rule.RuleModule}
 */
module.exports = {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow bindings named exactly `supabase`' },
    schema: [],
    messages: {
      name: 'Do not name a binding `supabase`. Use a name that says which client it is, e.g. `db` or `supabaseProd`.',
    },
  },
  create(context) {
    return {
      Program(node) {
        for (const scope of context.sourceCode.scopeManager.scopes) {
          for (const variable of scope.variables) {
            if (variable.name !== NAME) continue
            for (const def of variable.defs) context.report({ node: def.name ?? node, messageId: 'name' })
          }
        }
      },
    }
  },
}
