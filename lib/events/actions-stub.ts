'use server'
import type { RegisterResult, JoinWaitlistResult, CancelResult } from './types'
export async function registerAction(_eventId: number): Promise<RegisterResult> { return 'registered' }
export async function joinWaitlistAction(_eventId: number): Promise<JoinWaitlistResult> { return { result: 'waitlisted', position: 1 } }
export async function cancelAction(_eventId: number): Promise<CancelResult> { return 'cancelled' }
