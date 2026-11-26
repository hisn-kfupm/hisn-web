import { useEffect } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Locale } from '@/lib/i18n/locale'

const actions = vi.hoisted(() => ({ saveProfile: vi.fn() }))
vi.mock('@/app/account/actions', () => actions)
const auth = vi.hoisted(() => ({ getSession: vi.fn() }))
vi.mock('@/lib/auth/session', () => auth)
/** the page the overlay is on; a test changes it to navigate */
const nav = vi.hoisted(() => ({ pathname: '/ar/events/9001' }))
vi.mock('next/navigation', () => ({ usePathname: () => nav.pathname }))

import { label } from '@/lib/data/labels'
import ar from '@/lib/i18n/ar.json'
import en from '@/lib/i18n/en.json'
import { ProfileGateProvider, useProfileGate } from '@/lib/profile/gate'

const strings = { ar, en } as Record<Locale, Record<string, string>>

/** the founder's text, verbatim (spec §7.2) */
const FOUNDER = 'لقاءات مع قادة القطاع، وورش تقرّبك من دورك فيه، تصلك أولًا بأول على بريدك.'

type Gate = (action: () => Promise<void>) => void

/** hands the hook's gate function to the test */
function Capture({ onGate }: { onGate: (gate: Gate) => void }) {
  const gate = useProfileGate()
  useEffect(() => onGate(gate), [gate, onGate])
  return null
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => (resolve = done))
  return { promise, resolve }
}

const flush = () => act(async () => {})

type Values = { name?: string; major?: string; other?: string; level?: string; gender?: 'male' | 'female' }

/** the provider as the layout renders it, around a component that uses the gate */
function show(locale: Locale = 'ar') {
  let gate!: Gate
  const tree = () => (
    <ProfileGateProvider locale={locale}>
      <Capture onGate={(handed) => (gate = handed)} />
    </ProfileGateProvider>
  )
  const { rerender } = render(tree())
  const s = strings[locale]
  const button = (name: string) => screen.getByRole('button', { name })
  return {
    s,
    /** gate(action): the overlay opens */
    open: async (action: () => Promise<void> = vi.fn(async () => {})) => {
      await act(async () => gate(action))
      screen.getByRole('dialog')
      return action
    },
    /** client-side navigation to another page (Back, a link, a redirect after signing in or out) */
    navigate: (pathname: string) => {
      nav.pathname = pathname
      act(() => rerender(tree()))
    },
    field: (key: string) => screen.getByLabelText(s[key]),
    other: () => document.querySelector<HTMLInputElement>('[name="major_other"]'),
    fill(values: Values = {}) {
      const v = { name: 'سارة أحمد', major: 'SWE', level: 'BACHELOR', gender: 'female', ...values }
      fireEvent.change(screen.getByLabelText(s['profile.name']), { target: { value: v.name } })
      fireEvent.change(screen.getByLabelText(s['profile.major']), { target: { value: v.major } })
      if (v.other !== undefined) fireEvent.change(screen.getByLabelText(s['profile.majorOther']), { target: { value: v.other } })
      fireEvent.change(screen.getByLabelText(s['profile.level']), { target: { value: v.level } })
      fireEvent.click(screen.getByRole('radio', { name: s[`profile.gender.${v.gender}`] }))
    },
    save: () => act(async () => void fireEvent.click(button(s['profile.save']))),
    close: () => act(async () => void fireEvent.click(button(s['profile.close']))),
    dialog: () => screen.queryByRole('dialog'),
  }
}

beforeEach(() => {
  nav.pathname = '/ar/events/9001'
  actions.saveProfile.mockResolvedValue({ ok: true })
  auth.getSession.mockResolvedValue({ userId: 'u1', email: 'a@x.com' })
})

afterEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

/* dev-2 D2-7, spec §7.2: the profile step */
describe('profile overlay', () => {
  it("shows the founder's announcements text verbatim", async () => {
    const view = show()
    await view.open()
    expect(ar['profile.announcements']).toBe(FOUNDER)
    expect(screen.getByText(FOUNDER)).toBeInTheDocument()
  })

  it('leaves the announcements box unticked', async () => {
    const view = show()
    await view.open()
    expect(screen.getByRole('checkbox', { name: FOUNDER })).not.toBeChecked()
  })

  it('has neither gender chosen', async () => {
    const view = show()
    await view.open()
    const radios = screen.getAllByRole('radio')
    expect(radios.map((radio) => (radio as HTMLInputElement).value)).toStrictEqual(['male', 'female'])
    for (const radio of radios) expect(radio).not.toBeChecked()
    expect(screen.getByRole('radio', { name: 'ذكر' })).toHaveAttribute('value', 'male')
    expect(screen.getByRole('radio', { name: 'أنثى' })).toHaveAttribute('value', 'female')
  })

  it('shows a required major_other field for OTHER, and hides it for SWE', async () => {
    const view = show()
    await view.open()
    expect(view.other()).toBeNull()
    fireEvent.change(view.field('profile.major'), { target: { value: 'OTHER' } })
    expect(view.other()).toBeInTheDocument()
    expect(view.other()).toBeRequired()
    fireEvent.change(view.field('profile.major'), { target: { value: 'SWE' } })
    expect(view.other()).toBeNull()
  })

  it('saved: closes and calls the action exactly once', async () => {
    const view = show()
    const action = await view.open()
    expect(view.dialog()).toBeInTheDocument()
    view.fill()
    await view.save()
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1))
    expect(view.dialog()).toBeNull()
    await flush()
    expect(action).toHaveBeenCalledTimes(1)
  })

  it('a field error: the action is not called and the message shows', async () => {
    actions.saveProfile.mockResolvedValue({ ok: false, errors: { full_name_ar: 'profile.error.name' } })
    const view = show()
    const action = await view.open()
    view.fill()
    await view.save()
    await flush()
    expect(action).not.toHaveBeenCalled()
    expect(screen.getByText(ar['profile.error.name'])).toBeInTheDocument()
    expect(view.dialog()).toBeInTheDocument()
  })

  it('has no language field', async () => {
    const view = show()
    await view.open()
    expect(document.querySelector('[name="locale"]')).toBeNull()
    expect(screen.getAllByRole('combobox')).toHaveLength(2)
  })

  it('renders nothing until the gate is used', async () => {
    show()
    expect(document.querySelector('dialog')).toBeNull()
  })
})

describe('profile overlay, page language', () => {
  it('in English: English copy and labels, and the save carries locale en', async () => {
    const view = show('en')
    await view.open()
    expect(screen.getByText(en['profile.announcements'])).toBeInTheDocument()
    expect(screen.getByRole('option', { name: label('majors', 'SWE', 'en') })).toHaveAttribute('value', 'SWE')
    expect(screen.getByRole('option', { name: label('levels', 'BACHELOR', 'en') })).toHaveAttribute('value', 'BACHELOR')
    expect(screen.getByRole('radio', { name: en['profile.gender.male'] })).toBeInTheDocument()
    view.fill()
    await view.save()
    expect(actions.saveProfile).toHaveBeenCalledWith(expect.objectContaining({ locale: 'en' }))
  })

  it('in Arabic: the save carries locale ar', async () => {
    const view = show('ar')
    await view.open()
    expect(screen.getByRole('option', { name: label('majors', 'SWE', 'ar') })).toHaveAttribute('value', 'SWE')
    view.fill()
    await view.save()
    expect(actions.saveProfile).toHaveBeenCalledWith(expect.objectContaining({ locale: 'ar' }))
  })

  it('in English the name is still the Arabic name, written right to left', async () => {
    const view = show('en')
    await view.open()
    const name = view.field('profile.name')
    expect(name).toHaveAttribute('name', 'full_name_ar')
    expect(name).toHaveAttribute('lang', 'ar')
    expect(name).toHaveAttribute('dir', 'rtl')
  })
})

describe('profile overlay, what is sent', () => {
  it("sends exactly the form's values", async () => {
    const view = show()
    await view.open()
    view.fill({ name: '  سارة أحمد ', major: 'SWE', level: 'MASTER', gender: 'female' })
    fireEvent.click(screen.getByRole('checkbox', { name: FOUNDER }))
    await view.save()
    expect(actions.saveProfile).toHaveBeenCalledTimes(1)
    expect(actions.saveProfile).toHaveBeenCalledWith({
      full_name_ar: '  سارة أحمد ',
      major_code: 'SWE',
      major_other: null,
      academic_level_code: 'MASTER',
      gender: 'female',
      announcements_opt_in: true,
      locale: 'ar',
    })
  })

  it('with OTHER, sends the major that was typed', async () => {
    const view = show()
    await view.open()
    view.fill({ major: 'OTHER', other: 'هندسة الأنظمة', gender: 'male' })
    await view.save()
    expect(actions.saveProfile).toHaveBeenCalledWith(expect.objectContaining({ major_code: 'OTHER', major_other: 'هندسة الأنظمة', gender: 'male', announcements_opt_in: false }))
  })

  it('a major typed for OTHER is not sent once another major is chosen', async () => {
    const view = show()
    await view.open()
    view.fill({ major: 'OTHER', other: 'هندسة الأنظمة' })
    fireEvent.change(view.field('profile.major'), { target: { value: 'CS' } })
    await view.save()
    expect(actions.saveProfile).toHaveBeenCalledWith(expect.objectContaining({ major_code: 'CS', major_other: null }))
  })

  it('an empty form is still sent, so the server names every missing field', async () => {
    actions.saveProfile.mockResolvedValue({
      ok: false,
      errors: { full_name_ar: 'profile.error.name', major_code: 'profile.error.major', academic_level_code: 'profile.error.level', gender: 'profile.error.gender' },
    })
    const view = show()
    const action = await view.open()
    await view.save()
    expect(actions.saveProfile).toHaveBeenCalledWith(expect.objectContaining({ full_name_ar: '', major_code: '', academic_level_code: '', announcements_opt_in: false, locale: 'ar' }))
    for (const key of ['profile.error.name', 'profile.error.major', 'profile.error.level', 'profile.error.gender'] as const) {
      expect(screen.getByText(ar[key])).toBeInTheDocument()
    }
    expect(action).not.toHaveBeenCalled()
  })
})

describe('profile overlay, closing and repeating', () => {
  it('closing without saving discards the action', async () => {
    const view = show()
    const first = await view.open()
    await view.close()
    expect(view.dialog()).toBeNull()
    const second = await view.open()
    view.fill()
    await view.save()
    await waitFor(() => expect(second).toHaveBeenCalledTimes(1))
    expect(first).not.toHaveBeenCalled()
  })

  it('Escape closes it and discards the action', async () => {
    const view = show()
    const first = await view.open()
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    await flush()
    expect(view.dialog()).toBeNull()
    const second = await view.open()
    view.fill()
    await view.save()
    await waitFor(() => expect(second).toHaveBeenCalledTimes(1))
    expect(first).not.toHaveBeenCalled()
  })

  it('starts blank after a close: the next person on the tab never sees what was typed (P-1)', async () => {
    const view = show()
    await view.open()
    view.fill({ major: 'OTHER', other: 'هندسة الأنظمة', gender: 'male' })
    fireEvent.click(screen.getByRole('checkbox', { name: FOUNDER }))
    await view.close()
    await view.open()
    expect(view.field('profile.name')).toHaveValue('')
    expect(view.field('profile.major')).toHaveValue('')
    expect(view.other()).toBeNull()
    expect(view.field('profile.level')).toHaveValue('')
    for (const radio of screen.getAllByRole('radio')) expect(radio).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: FOUNDER })).not.toBeChecked()
  })

  it('starts blank after a save', async () => {
    const view = show()
    await view.open()
    view.fill()
    await view.save()
    await flush()
    expect(view.dialog()).toBeNull()
    await view.open()
    expect(view.field('profile.name')).toHaveValue('')
    for (const radio of screen.getAllByRole('radio')) expect(radio).not.toBeChecked()
  })

  it('another page (Back, a link, signing in or out): closes it and discards the action', async () => {
    const view = show()
    const first = await view.open()
    view.fill()
    view.navigate('/ar/events')
    expect(view.dialog()).toBeNull()
    const second = await view.open()
    expect(view.field('profile.name')).toHaveValue('')
    view.fill()
    await view.save()
    await waitFor(() => expect(second).toHaveBeenCalledTimes(1))
    expect(first).not.toHaveBeenCalled()
  })

  it('a save that finishes after the page changed runs neither action, and leaves a newer overlay open', async () => {
    const pending = deferred<{ ok: true }>()
    actions.saveProfile.mockReturnValueOnce(pending.promise)
    const view = show()
    const first = await view.open()
    view.fill()
    act(() => void fireEvent.click(screen.getByRole('button', { name: ar['profile.save'] })))
    view.navigate('/ar/events')
    const second = await view.open()
    await act(async () => pending.resolve({ ok: true }))
    await flush()
    expect(first).not.toHaveBeenCalled()
    expect(second).not.toHaveBeenCalled()
    expect(view.dialog()).toBeInTheDocument()
  })

  it('the same page again (a search change is not a new page): stays open', async () => {
    const view = show()
    await view.open()
    view.navigate('/ar/events/9001')
    expect(view.dialog()).toBeInTheDocument()
  })

  it('a second gate() before saving: only the latest action runs, once', async () => {
    const view = show()
    const first = await view.open()
    const second = await view.open()
    view.fill()
    await view.save()
    await waitFor(() => expect(second).toHaveBeenCalledTimes(1))
    await flush()
    expect(first).not.toHaveBeenCalled()
  })

  it('a double tap on save: one save, one action', async () => {
    const pending = deferred<{ ok: true }>()
    actions.saveProfile.mockReturnValue(pending.promise)
    const view = show()
    const action = await view.open()
    view.fill()
    const save = screen.getByRole('button', { name: ar['profile.save'] })
    act(() => {
      fireEvent.click(save)
      fireEvent.click(save)
    })
    expect(save).toBeDisabled()
    await act(async () => pending.resolve({ ok: true }))
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1))
    await flush()
    expect(actions.saveProfile).toHaveBeenCalledTimes(1)
    expect(action).toHaveBeenCalledTimes(1)
  })

  it('while saving it cannot be closed, and the action still runs once saved', async () => {
    const pending = deferred<{ ok: true }>()
    actions.saveProfile.mockReturnValue(pending.promise)
    const view = show()
    const action = await view.open()
    view.fill()
    act(() => void fireEvent.click(screen.getByRole('button', { name: ar['profile.save'] })))
    expect(screen.getByRole('button', { name: ar['profile.close'] })).toBeDisabled()
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(view.dialog()).toBeInTheDocument()
    await act(async () => pending.resolve({ ok: true }))
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1))
  })

  it('closed by the browser itself (a back gesture): it can be opened again', async () => {
    const view = show()
    await view.open()
    const box = screen.getByRole('dialog')
    act(() => {
      box.removeAttribute('open')
      fireEvent(box, new Event('close'))
    })
    const second = await view.open()
    view.fill()
    await view.save()
    await waitFor(() => expect(second).toHaveBeenCalledTimes(1))
  })

  it('closed by the browser in the middle of a save: the action is discarded', async () => {
    const pending = deferred<{ ok: true }>()
    actions.saveProfile.mockReturnValue(pending.promise)
    const view = show()
    const action = await view.open()
    view.fill()
    act(() => void fireEvent.click(screen.getByRole('button', { name: ar['profile.save'] })))
    const box = screen.getByRole('dialog')
    act(() => {
      box.removeAttribute('open')
      fireEvent(box, new Event('close'))
    })
    await act(async () => pending.resolve({ ok: true }))
    await flush()
    expect(action).not.toHaveBeenCalled()
  })

  it('a save that fails on the way: a notice, the overlay stays, and a retry runs the action once', async () => {
    actions.saveProfile.mockRejectedValueOnce(new Error('offline'))
    const view = show()
    const action = await view.open()
    view.fill()
    await view.save()
    await flush()
    expect(screen.getByRole('alert')).toHaveTextContent(ar['profile.error.failed'])
    expect(view.dialog()).toBeInTheDocument()
    expect(action).not.toHaveBeenCalled()
    await view.save()
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1))
    expect(actions.saveProfile).toHaveBeenCalledTimes(2)
  })
})

describe('profile overlay, errors', () => {
  it('ties each error to its field and moves focus to the first one', async () => {
    actions.saveProfile.mockResolvedValue({ ok: false, errors: { major_code: 'profile.error.major', academic_level_code: 'profile.error.level' } })
    const view = show()
    await view.open()
    await view.save()
    await flush()
    const major = view.field('profile.major')
    expect(major).toHaveAttribute('aria-invalid', 'true')
    expect(major).toHaveAccessibleDescription(ar['profile.error.major'])
    expect(view.field('profile.level')).toHaveAccessibleDescription(ar['profile.error.level'])
    expect(view.field('profile.name')).not.toHaveAttribute('aria-invalid')
    expect(major).toHaveFocus()
  })

  it('a gender error is described on the group and focus goes to the first choice', async () => {
    actions.saveProfile.mockResolvedValue({ ok: false, errors: { gender: 'profile.error.gender' } })
    const view = show()
    await view.open()
    await view.save()
    await flush()
    expect(screen.getByRole('group', { name: ar['profile.gender'] })).toHaveAccessibleDescription(ar['profile.error.gender'])
    expect(screen.getByRole('radio', { name: 'ذكر' })).toHaveFocus()
    for (const radio of screen.getAllByRole('radio')) expect(radio).toHaveAccessibleDescription(ar['profile.error.gender'])
  })

  it('a session that ended: says so, with a sign-in link back to this page', async () => {
    actions.saveProfile.mockRejectedValueOnce(new Error('unauthenticated'))
    auth.getSession.mockResolvedValue(null)
    nav.pathname = '/en/events/9001'
    const view = show('en')
    const action = await view.open()
    view.fill()
    await view.save()
    await flush()
    const notice = screen.getByRole('alert')
    expect(notice).toHaveTextContent(en['profile.error.signedOut'])
    expect(notice).not.toHaveTextContent(en['profile.error.failed'])
    expect(screen.getByRole('link', { name: en['auth.signIn'] })).toHaveAttribute('href', '/en/sign-in?returnTo=%2Fen%2Fevents%2F9001')
    expect(action).not.toHaveBeenCalled()
  })

  it('a failed save while still signed in, or with the check failing too: the connection message', async () => {
    actions.saveProfile.mockRejectedValue(new Error('offline'))
    const view = show()
    await view.open()
    view.fill()
    await view.save()
    await flush()
    expect(screen.getByRole('alert')).toHaveTextContent(ar['profile.error.failed'])
    auth.getSession.mockRejectedValue(new Error('offline'))
    await view.save()
    await flush()
    expect(screen.getByRole('alert')).toHaveTextContent(ar['profile.error.failed'])
    expect(screen.queryByRole('link', { name: ar['auth.signIn'] })).toBeNull()
  })

  it('tells a screen reader that the save is running', async () => {
    const pending = deferred<{ ok: true }>()
    actions.saveProfile.mockReturnValue(pending.promise)
    const view = show()
    await view.open()
    view.fill()
    expect(screen.getByRole('status')).toHaveTextContent('')
    act(() => void fireEvent.click(screen.getByRole('button', { name: ar['profile.save'] })))
    expect(screen.getByRole('status')).toHaveTextContent(ar['profile.saving'])
    await act(async () => pending.resolve({ ok: true }))
  })

  it('an OTHER major with nothing typed: the error sits on the typed field', async () => {
    actions.saveProfile.mockResolvedValue({ ok: false, errors: { major_other: 'profile.error.majorOther' } })
    const view = show()
    await view.open()
    view.fill({ major: 'OTHER' })
    await view.save()
    await flush()
    const other = view.field('profile.majorOther')
    expect(other).toHaveAccessibleDescription(ar['profile.error.majorOther'])
    expect(other).toHaveFocus()
  })

  it('errors with no field of their own show in the notice', async () => {
    actions.saveProfile.mockResolvedValue({ ok: false, errors: { form: 'profile.error.invalid', locale: 'profile.error.locale' } })
    const view = show('en')
    await view.open()
    view.fill()
    await view.save()
    await flush()
    const notice = screen.getByRole('alert')
    expect(notice).toHaveTextContent(en['profile.error.invalid'])
    expect(notice).toHaveTextContent(en['profile.error.locale'])
  })

  it("a field's error goes once it is changed, and the next save starts clean", async () => {
    actions.saveProfile.mockResolvedValueOnce({ ok: false, errors: { full_name_ar: 'profile.error.name' } })
    const view = show()
    const action = await view.open()
    view.fill({ name: 'س' })
    await view.save()
    await flush()
    expect(screen.getByText(ar['profile.error.name'])).toBeInTheDocument()
    fireEvent.change(view.field('profile.name'), { target: { value: 'سارة أحمد' } })
    expect(screen.queryByText(ar['profile.error.name'])).toBeNull()
    await view.save()
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1))
  })
})

describe('profile overlay, focus', () => {
  it('opening moves focus into the overlay', async () => {
    const view = show()
    await view.open()
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true)
  })

  it('is named by its title', async () => {
    const view = show('en')
    await view.open()
    expect(screen.getByRole('dialog', { name: en['profile.title'] })).toBeInTheDocument()
  })
})

describe('useProfileGate', () => {
  it('outside the provider: throws, so a missing provider is never a silent no-op', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Capture onGate={() => {}} />)).toThrow(/ProfileGateProvider/)
  })
})
