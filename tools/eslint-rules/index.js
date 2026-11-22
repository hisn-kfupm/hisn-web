'use strict'

/**
 * ESLint plugin `hisn`: the team conventions from dev-1 D1-3, as build failures.
 * Wired up in eslint.config.mjs. Tests: tests/unit/lint-rules.test.ts.
 */
module.exports = {
  meta: { name: 'eslint-plugin-hisn', version: '1.0.0' },
  rules: {
    'no-literal-text': require('./no-literal-text'),
    'no-supabase-name': require('./no-supabase-name'),
    'talent-import': require('./talent-import'),
    'no-physical-classes': require('./no-physical-classes'),
  },
}
