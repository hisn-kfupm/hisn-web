/** An event as the public pages see it. Times are ISO strings in UTC; show them with formatRiyadh(). */
export type PublicEvent = {
  id: number
  title: string
  description: string
  // optional English text (events.title_en / description_en); null shows the Arabic on /en (D1-8)
  titleEn: string | null
  descriptionEn: string | null
  departmentCode: string | null
  startsAt: string
  endsAt: string
  format: 'in_person' | 'online'
  location: string | null
  presenter: string | null
  capacity: number | null
  registrationClosesAt: string
  status: 'published' | 'cancelled'
  imageUrl: string | null
  recordingUrl: string | null
  // No meeting URL field, ever: the link goes only to registered people, by email.
}

export type RegisterResult =
  | 'registered'
  | 'already_registered'
  | 'already_waitlisted'
  | 'full'
  | 'closed'
  | 'cancelled'
  | 'not_found'
  | 'profile_required'
  | { needsProfile: true }

export type JoinWaitlistResult =
  | {
      result:
        | 'waitlisted'
        | 'already_waitlisted'
        | 'already_registered'
        | 'not_full'
        | 'no_capacity'
        | 'closed'
        | 'cancelled'
        | 'not_found'
        | 'profile_required'
      position?: number
    }
  | { needsProfile: true }

export type CancelResult = 'cancelled' | 'not_found' | 'started'

/** what the register button shows; see eventButtonState() */
export type ButtonState =
  | 'open'
  | 'open_almost_full'
  | 'registered'
  | 'full'
  | 'waitlisted'
  | 'closed'
  | 'cancelled'
  | 'ended'
