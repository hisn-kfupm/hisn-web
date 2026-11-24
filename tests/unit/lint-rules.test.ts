// @vitest-environment node
import { ESLint, RuleTester, type Linter, type Rule } from 'eslint'
import tsParser from '@typescript-eslint/parser'
import { describe, expect, it } from 'vitest'
import hisn from '../../tools/eslint-rules/index.js'

RuleTester.describe = describe
RuleTester.it = it
RuleTester.itOnly = it.only

const tester = new RuleTester({
  languageOptions: {
    parser: tsParser as Linter.Parser,
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
})

const rule = (name: keyof typeof hisn.rules) => hisn.rules[name] as Rule.RuleModule
/** cases default to a component file; RuleTester resolves the path from the project root */
const at = (filename: string) => (code: string) => ({ code, filename })
const page = at('app/page.tsx')
const errors = (messageId: string, count = 1) => Array.from({ length: count }, () => ({ messageId }))

describe('hisn/no-literal-text', () => {
  tester.run('no-literal-text', rule('no-literal-text'), {
    valid: [
      page(`<p>{t(locale, 'home.title')}</p>`),
      page(`<p> </p>`),
      // decorative images keep an empty alt
      page(`<img alt="" src="/x.png" />`),
      // numbers and punctuation are not letters
      page(`<p>٤٠٤</p>`),
      page(`<span>·</span>`),
      page(`<p>{t(locale, 'a')}{' '}{t(locale, 'b')}</p>`),
      page(`<Bdi lang="en">{CONTACT_EMAIL}</Bdi>`),
      // Latin identifiers in ordinary props are fine
      page(`<Button variant="primary" data-testid="auth-entry" className="ms-4" />`),
    ],
    invalid: [
      { ...page(`<p>مرحبا</p>`), errors: errors('text') },
      { ...page(`<img alt="شعار" />`), errors: errors('attribute') },
      { ...page(`<input placeholder="name@example.com" />`), errors: errors('attribute') },
      { ...page(`<button aria-label="Close" />`), errors: errors('attribute') },
      { ...page(`<abbr title={'جامعة'} />`), errors: errors('attribute') },
      // a string in braces is still literal text
      { ...page(`<p>{'مرحبا'}</p>`), errors: errors('text') },
      { ...page(`<p>{open ? 'افتح' : 'أغلق'}</p>`), errors: errors('text', 2) },
      { ...page('<p>{`تبقّى ${n}`}</p>'), errors: errors('text') },
      // Arabic in any prop is UI text, whatever the prop is called
      { ...page(`<Card label="الأقسام" />`), errors: errors('attribute') },
    ],
  })
})

describe('hisn/no-supabase-name', () => {
  tester.run('no-supabase-name', rule('no-supabase-name'), {
    valid: [
      page(`const supabaseProd = createClient()`),
      page(`const db = { supabase: 1 }; db.supabase`),
      page(`import { supabase as db } from 'x'`),
    ],
    invalid: [
      { ...page(`const supabase = createClient()`), errors: errors('name') },
      { ...page(`function load(supabase: Client) {}`), errors: errors('name') },
      { ...page(`import supabase from 'x'`), errors: errors('name') },
      { ...page(`import { createClient as supabase } from 'x'`), errors: errors('name') },
      { ...page(`const { supabase } = deps`), errors: errors('name') },
    ],
  })
})

describe('hisn/talent-import', () => {
  const source = `import { insertTalentEntry } from '@/lib/db/talent'`
  tester.run('talent-import', rule('talent-import'), {
    valid: [
      at('app/talent/actions.ts')(source),
      at('app/talent/actions.ts')(`import { insertTalentEntry } from '../../lib/db/talent'`),
      // the field definitions live elsewhere and anyone may use them
      page(`import { talentFields } from '@/lib/talent/fields'`),
      page(`import { x } from '@/lib/db/talentHelpers'`),
    ],
    invalid: [
      { ...page(source), errors: errors('import') },
      { ...at('app/talent/page.tsx')(source), errors: errors('import') },
      { ...page(`import { x } from '../lib/db/talent'`), errors: errors('import') },
      { ...at('lib/db/events.ts')(`import type { Entry } from './talent'`), errors: errors('import') },
      { ...page(`import { x } from '@/lib/db/talent.ts'`), errors: errors('import') },
      { ...page(`export { insertTalentEntry } from '@/lib/db/talent'`), errors: errors('import') },
      { ...page(`const m = await import('@/lib/db/talent')`), errors: errors('import') },
    ],
  })
})

describe('hisn/no-physical-classes', () => {
  tester.run('no-physical-classes', rule('no-physical-classes'), {
    valid: [
      page(`<div className="ms-4" />`),
      page(`<div className="ps-4 pe-2 me-1 start-0 end-0 inset-x-0 text-start rounded-full border-s-2 border-line" />`),
      page(`<div className="place-items-center prose rtl:-scale-x-100 max-[359px]:sr-only" />`),
      page(`<div className={cn('flex', side === 'left' && 'ms-2')} />`),
      page(`const edge = 'left'`),
      // logical forms of the utilities below: the inline-start variable, symmetric directions, logical corners
      page(`<div className="before:origin-(--start) origin-center origin-top origin-bottom" />`),
      page(`<div className="bg-linear-to-t bg-linear-to-b bg-linear-120 rounded-t-lg rounded-ss-lg rounded-ee scroll-ms-4 scroll-pe-2 scroll-mt-4" />`),
    ],
    invalid: [
      { ...page(`<div className="ml-4 p-2" />`), errors: errors('physical') },
      { ...page(`<div className="text-right" />`), errors: errors('physical') },
      { ...page(`<div className="lg:pl-6" />`), errors: errors('physical') },
      { ...page(`<div className="-mr-2" />`), errors: errors('physical') },
      { ...page(`<div className="ml-auto!" />`), errors: errors('physical') },
      { ...page(`<div className="absolute left-0" />`), errors: errors('physical') },
      { ...page(`<div className="rounded-r-full border-l-2" />`), errors: errors('physical') },
      { ...page(`<div className="float-left" />`), errors: errors('physical') },
      { ...page('<div className={`flex ${gap} pr-2`} />'), errors: errors('physical') },
      { ...page(`<div className={cn('flex', open && 'right-0')} />`), errors: errors('physical') },
      { ...page(`<Icon iconClassName="mr-1" />`), errors: errors('physical') },
      // class strings built outside JSX
      { ...page(`const c = cn('flex', 'pl-2')`), errors: errors('physical') },
      { ...page(`const props = { className: 'mr-2' }`), errors: errors('physical') },
      // transform origins, gradient directions, corners and scroll offsets that point left or right
      { ...page(`<div className="before:origin-right before:scale-x-0" />`), errors: errors('physical') },
      { ...page(`<div className="ltr:before:origin-left" />`), errors: errors('physical') },
      { ...page(`<div className="origin-top-left" />`), errors: errors('physical') },
      { ...page(`<div className="bg-linear-to-r from-mint to-teal" />`), errors: errors('physical') },
      { ...page(`<div className="bg-gradient-to-l" />`), errors: errors('physical') },
      { ...page(`<div className="bg-linear-to-tr/oklch" />`), errors: errors('physical') },
      { ...page(`<div className="rounded-tl-lg" />`), errors: errors('physical') },
      { ...page(`<div className="scroll-ml-4" />`), errors: errors('physical') },
    ],
  })
})

describe('eslint.config.mjs', () => {
  const eslint = new ESLint({ cwd: process.cwd() })
  const hisnErrors = async (code: string, filePath: string) => {
    const [result] = await eslint.lintText(code, { filePath })
    return result.messages.filter((m) => m.ruleId?.startsWith('hisn/') && m.severity === 2).map((m) => m.ruleId)
  }
  const code = [
    `import { insertTalentEntry } from '@/lib/db/talent'`,
    `const supabase = insertTalentEntry`,
    `export default function Probe() { return <p className="ml-4">مرحبا {String(supabase)}</p> }`,
  ].join('\n')

  it('turns all four rules on as errors in app code', async () => {
    expect((await hisnErrors(code, 'app/lint-probe.tsx')).sort()).toEqual([
      'hisn/no-literal-text',
      'hisn/no-physical-classes',
      'hisn/no-supabase-name',
      'hisn/talent-import',
    ])
  }, 30_000)

  it.each(['tests/lint-probe.tsx', 'scripts/lint-probe.tsx', 'supabase/lint-probe.tsx'])(
    'leaves %s alone',
    async (filePath) => {
      expect(await hisnErrors(code, filePath)).toEqual([])
    },
    30_000,
  )
})
