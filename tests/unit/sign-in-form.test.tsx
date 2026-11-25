import { Component, type ReactNode } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Locale } from '@/lib/i18n/locale'

const actions = vi.hoisted(() => ({ sendCode: vi.fn(), verifyCode: vi.fn() }))
vi.mock('@/app/sign-in/actions', () => actions)

import { SignInForm } from '@/app/[locale]/sign-in/SignInForm'
import { signInLabels } from '@/lib/auth/sign-in-labels'
import ar from '@/lib/i18n/ar.json'
import en from '@/lib/i18n/en.json'

const strings = { ar, en } as Record<Locale, Record<string, string>>

beforeEach(() => {
  vi.useFakeTimers()
  actions.sendCode.mockResolvedValue({ ok: true })
  actions.verifyCode.mockResolvedValue({ ok: false, reason: 'wrong' })
})

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

/** stands in for Next's error and redirect boundaries */
class Boundary extends Component<{ onError: (error: unknown) => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: unknown) {
    this.props.onError(error)
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

/** renders the form as the page does, with the strings resolved on the server */
function show(locale: Locale = 'ar', returnTo = `/${locale}/events/3`, onError?: (error: unknown) => void) {
  const form = <SignInForm locale={locale} returnTo={returnTo} labels={signInLabels(locale)} />
  render(onError ? <Boundary onError={onError}>{form}</Boundary> : form)
  const s = strings[locale]
  const click = (name: string) => act(async () => void fireEvent.click(screen.getByRole('button', { name })))
  return {
    s,
    typeEmail: (value: string) => fireEvent.change(screen.getByLabelText(s['signin.email']), { target: { value } }),
    typeCode: (value: string) => fireEvent.change(screen.getByLabelText(s['signin.code']), { target: { value } }),
    send: () => click(s['signin.send']),
    verify: () => click(s['signin.verify']),
    click,
  }
}

const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms))

/* dev-2 D2-5, spec §7.1 */
describe('SignInForm', () => {
  it('keeps resend disabled for 60 seconds after sending', async () => {
    const { s, typeEmail, send } = show()
    typeEmail('a@gmail.com')
    await send()
    const resend = screen.getByRole('button', { name: s['signin.resend'] })
    expect(resend).toBeDisabled()
    expect(screen.getByText(s['signin.resendIn'].replace('{time}', '١:٠٠'))).toBeInTheDocument()

    advance(59_000)
    expect(resend).toBeDisabled()
    expect(screen.getByText(s['signin.resendIn'].replace('{time}', '٠:٠١'))).toBeInTheDocument()

    advance(1_000)
    expect(resend).toBeEnabled()
  })

  it('warns about a university address without blocking it', () => {
    const { s, typeEmail } = show()
    typeEmail('x@gmail.com')
    expect(screen.queryByText(s['signin.institutionalWarning'])).toBeNull()
    typeEmail('x@kfupm.edu.sa')
    expect(screen.getByText(s['signin.institutionalWarning'])).toBeInTheDocument()
    expect(screen.getByRole('button', { name: s['signin.send'] })).toBeEnabled()
  })

  it('works in English from /en', async () => {
    const { typeEmail, send } = show('en')
    expect(screen.getByText(en['signin.personalHint'])).toBeInTheDocument()
    typeEmail('x@kfupm.edu.sa')
    expect(screen.getByText(en['signin.institutionalWarning'])).toBeInTheDocument()
    await send()
    expect(actions.sendCode).toHaveBeenCalledWith('x@kfupm.edu.sa', 'en')
  })

  it('asks for a six-digit one-time code, says where it went and to check junk', async () => {
    const { s, typeEmail, send } = show()
    typeEmail('a@gmail.com')
    await send()
    const code = screen.getByLabelText(s['signin.code'])
    expect(code).toHaveAttribute('inputmode', 'numeric')
    expect(code).toHaveAttribute('autocomplete', 'one-time-code')
    expect(code).toHaveAttribute('maxlength', '6')
    expect(screen.getByText(s['signin.checkJunk'])).toBeInTheDocument()
    // the address sits inside Arabic text, isolated (CLAUDE.md: mixed direction)
    expect(document.querySelector('bdi')?.textContent).toBe('a@gmail.com')
  })

  it('confirms the code for that address and passes returnTo through', async () => {
    const { typeEmail, typeCode, send, verify } = show('ar', '/ar/events/3')
    typeEmail('a@gmail.com')
    await send()
    typeCode('123456')
    await verify()
    expect(actions.verifyCode).toHaveBeenCalledWith('a@gmail.com', '123456', '/ar/events/3')
  })

  it('says why sending failed, in the page language, and stays on the email step', async () => {
    actions.sendCode.mockResolvedValueOnce({ ok: false, reason: 'rate_limited' })
    const { s, typeEmail, send } = show('en')
    typeEmail('a@gmail.com')
    await send()
    expect(screen.getByRole('alert')).toHaveTextContent(s['signin.error.rate_limited'])
    expect(screen.getByLabelText(s['signin.email'])).toBeInTheDocument()
  })

  it('treats a request that never reaches the server as a failed send', async () => {
    actions.sendCode.mockRejectedValueOnce(new Error('offline'))
    const { s, typeEmail, send } = show()
    typeEmail('a@gmail.com')
    await send()
    expect(screen.getByRole('alert')).toHaveTextContent(s['signin.error.send_failed'])
  })

  it('says when the code is wrong', async () => {
    const { s, typeEmail, typeCode, send, verify } = show()
    typeEmail('a@gmail.com')
    await send()
    typeCode('000000')
    await verify()
    expect(screen.getByRole('alert')).toHaveTextContent(s['signin.error.wrong'])
  })

  // Review Focus 3: repeated taps (or Enter) on a slow connection must not send twice
  it('sends once however often the form is submitted while the request runs', async () => {
    let finish: (value: unknown) => void = () => {}
    actions.sendCode.mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)))
    const { s, typeEmail } = show()
    typeEmail('a@gmail.com')
    const button = screen.getByRole('button', { name: s['signin.send'] })
    const form = button.closest('form')!
    await act(async () => void fireEvent.submit(form))
    expect(button).toBeDisabled()
    await act(async () => void fireEvent.submit(form))
    fireEvent.click(button)
    await act(async () => finish({ ok: true }))
    expect(actions.sendCode).toHaveBeenCalledTimes(1)
  })

  it('reads a code typed on an Arabic keypad, and a pasted code with a space in it', async () => {
    const { s, typeEmail, typeCode, send, verify } = show()
    typeEmail('a@gmail.com')
    await send()
    const code = screen.getByLabelText(s['signin.code'])
    typeCode('١٢٣٤٥٦')
    expect(code).toHaveValue('123456')
    fireEvent.paste(code, { clipboardData: { getData: () => '654 321' } })
    expect(code).toHaveValue('654321')
    await verify()
    expect(actions.verifyCode).toHaveBeenCalledWith('a@gmail.com', '654321', '/ar/events/3')
  })

  it('does not check a code that is too short', async () => {
    const { s, typeEmail, typeCode, send, verify } = show()
    typeEmail('a@gmail.com')
    await send()
    typeCode('123')
    await verify()
    expect(actions.verifyCode).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(s['signin.error.wrong'])
  })

  it('says the code could not be checked when the request fails, and keeps the form', async () => {
    actions.verifyCode.mockRejectedValueOnce(new Error('offline'))
    const { s, typeEmail, typeCode, send, verify } = show('en')
    typeEmail('a@gmail.com')
    await send()
    typeCode('123456')
    await verify()
    expect(screen.getByRole('alert')).toHaveTextContent(s['signin.error.unavailable'])
    expect(screen.getByLabelText(s['signin.code'])).toHaveValue('123456')
  })

  it("lets the redirect after a right code through to Next's boundary", async () => {
    const redirect = Object.assign(new Error('NEXT_REDIRECT'), { digest: 'NEXT_REDIRECT;push;/ar/events/3;307;' })
    actions.verifyCode.mockRejectedValueOnce(redirect)
    const caught: unknown[] = []
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { s, typeEmail, typeCode, send, verify } = show('ar', '/ar/events/3', (e) => caught.push(e))
    typeEmail('a@gmail.com')
    await send()
    typeCode('123456')
    await verify()
    expect(caught).toContain(redirect)
    expect(screen.queryByText(s['signin.error.unavailable'])).toBeNull()
  })

  it('goes back to the code without sending again when the address is unchanged', async () => {
    const { s, typeEmail, send, click } = show()
    typeEmail('a@gmail.com')
    await send()
    await click(s['signin.changeEmail'])
    expect(document.activeElement).toBe(screen.getByLabelText(s['signin.email']))
    await send()
    expect(actions.sendCode).toHaveBeenCalledTimes(1)
    expect(screen.getByLabelText(s['signin.code'])).toBeInTheDocument()
  })

  it('announces a repeated error again', async () => {
    const { typeEmail, typeCode, send, verify } = show()
    typeEmail('a@gmail.com')
    await send()
    typeCode('000000')
    await verify()
    const first = screen.getByRole('alert')
    await verify()
    expect(screen.getByRole('alert')).not.toBe(first)
  })

  it('resends to the same address and starts the wait again', async () => {
    const { s, typeEmail, send, click } = show()
    typeEmail('a@gmail.com')
    await send()
    advance(60_000)
    await click(s['signin.resend'])
    expect(actions.sendCode).toHaveBeenNthCalledWith(2, 'a@gmail.com', 'ar')
    expect(screen.getByRole('button', { name: s['signin.resend'] })).toBeDisabled()
  })

  it('goes back to fix a mistyped address', async () => {
    const { s, typeEmail, send, click } = show()
    typeEmail('a@gmial.com')
    await send()
    await click(s['signin.changeEmail'])
    expect(screen.getByLabelText(s['signin.email'])).toHaveValue('a@gmial.com')
  })
})
