/*
  STAND-IN DATA — delete this file once A-2 (supabaseProdServer) and A-3/A-6 (events table and seed)
  are on main, and switch lib/events/queries.ts to the real queries written in its comments.

  Rows look like what the events table returns (snake_case, UTC ISO times). Dates are relative to
  "now" so the homepage always has upcoming events and recordings while the stand-in is in use.
  Every title carries «مؤقت». A meeting_url column is included on purpose: the real table has one,
  and toPublicEvent must drop it.
*/

export type EventRow = {
  id: number
  title: string
  description: string
  department_code: string | null
  starts_at: string
  ends_at: string
  format: 'in_person' | 'online'
  location: string | null
  presenter: string | null
  capacity: number | null
  registration_closes_at: string
  status: 'draft' | 'published' | 'cancelled'
  image_url: string | null
  recording_url: string | null
  meeting_url: string | null
}

/** same names as SEED.events.* in tests/fixtures/seed.ts (A-6) */
export const STAND_IN_IDS = { draft: 9007, cancelled: 9008, pastWithRecording: 9101, pastNoRecording: 9105 } as const

const DAY = 86_400_000
const pad = (n: number) => String(n).padStart(2, '0')

/** UTC ISO for a Riyadh wall-clock time (UTC+3, no DST) `days` days from now */
function riyadhAt(now: number, days: number, hour: number, minute = 0): string {
  const day = new Date(now + 3 * 3_600_000 + days * DAY).toISOString().slice(0, 10)
  return new Date(`${day}T${pad(hour)}:${pad(minute)}:00+03:00`).toISOString()
}

type Sample = Omit<EventRow, 'starts_at' | 'ends_at' | 'registration_closes_at'> & {
  day: number
  from: [number, number]
  to: [number, number]
  /** registration closes early: [day, hour, minute] in Riyadh time (default: when the event starts) */
  closes?: [number, number, number]
}

const base = { description: 'وصف تجريبي للفعالية. «مؤقت»', presenter: null, image_url: null, meeting_url: null }

/* longer descriptions for the event page (D1-11): paragraphs are separated by a blank line */
const LONG = {
  systems: 'لقاء تمهيدي لمن يسمع عن «هندسة الأنظمة» ولا يعرف أين تبدأ وأين تنتهي. نمرّ على دورة حياة نظام دفاعي من المتطلبات إلى التشغيل، ونرى أين يقف المهندس الكهربائي والميكانيكي ومهندس البرمجيات ومختص الجودة في هذه الدورة. «مؤقت»\n\nلا يحتاج اللقاء خلفية سابقة. نخصص نصف الوقت للأسئلة، فاحضر ومعك سؤال عن تخصصك. «مؤقت»',
  wide: 'لقاء مفتوح عن سعة القطاع: الصناعات العسكرية جزء من الصناعات الدفاعية لا كلها. نعرض خريطة الجهات والأدوار، ونتحدث عن مسارات الطلاب من الهندسة والعلوم والإدارة والتصميم. «مؤقت»\n\nيناسب اللقاء طلاب السنوات الأولى ومن لم يحدد مساره بعد. «مؤقت»',
  internships: 'كيف تبحث عن تدريب صيفي في شركات القطاع، ومتى تبدأ التقديم، وماذا تكتب في طلبك. نشارك تجارب طلاب تدربوا في الأعوام الماضية. «مؤقت»\n\nالمقاعد محدودة لأن اللقاء يدار في مجموعات صغيرة. «مؤقت»',
  visit: 'زيارة ميدانية إلى خط إنتاج، يتطلب الدخول إليها تسجيل الأسماء مسبقًا لدى الجهة المضيفة، لذلك أُغلق التسجيل قبل الموعد بأيام. «مؤقت»\n\nيلتقي المسجلون عند مبنى ٥٨ قبل الموعد بنصف ساعة. «مؤقت»',
  reading: 'كيف تقرأ وصفًا وظيفيًا في القطاع الدفاعي وتعرف ما المطلوب فعلًا وما يمكن تعلّمه أثناء العمل. «مؤقت»\n\nالتسجيل متاح في المكتبة لمن فاته اللقاء. «مؤقت»',
}

const SAMPLES: Sample[] = [
  { ...base, id: 9001, description: LONG.systems, presenter: 'مهندس أنظمة من إحدى جهات القطاع «مؤقت»', title: 'مدخل إلى هندسة الأنظمة في القطاع الدفاعي «مؤقت»', department_code: 'SYSTEMS_INTEGRATION', day: 3, from: [18, 0], to: [20, 0], format: 'in_person', location: 'مبنى 58 · قاعة 102', capacity: 30, status: 'published', recording_url: null },
  { ...base, id: 9002, title: 'الأمن السيبراني بعيون غير المبرمجين «مؤقت»', department_code: 'CYBERSECURITY', day: 7, from: [19, 0], to: [21, 0], format: 'in_person', location: 'مبنى 22 · المسرح', capacity: 40, status: 'published', recording_url: null },
  { ...base, id: 9003, title: 'البيانات والذكاء الاصطناعي في الصناعة «مؤقت»', department_code: 'DATA_ANALYSIS', day: 9, from: [21, 0], to: [22, 30], format: 'online', location: null, capacity: null, status: 'published', recording_url: null },
  { ...base, id: 9004, title: 'لقاء مفتوح: أين يعمل خريجو الإدارة في القطاع؟ «مؤقت»', department_code: 'CAREER_READINESS', day: 11, from: [18, 0], to: [19, 30], format: 'in_person', location: 'كلية الإدارة الصناعية', capacity: 25, status: 'published', recording_url: null },
  { ...base, id: 9005, description: LONG.wide, presenter: 'لجنة التوعية في حصن «مؤقت»', title: 'الصناعات الدفاعية أوسع مما تظن «مؤقت»', department_code: 'SECTOR_AWARENESS', day: 14, from: [18, 0], to: [20, 0], format: 'in_person', location: 'قاعة المحاضرات الرئيسية', capacity: 60, status: 'published', recording_url: null },
  { ...base, id: 9006, title: 'ورشة: سيرة ذاتية لقطاع تقني «مؤقت»', department_code: 'MANUFACTURING_DESIGN', day: 16, from: [18, 0], to: [20, 0], format: 'in_person', location: 'مبنى 58 · قاعة 102', capacity: 30, status: 'published', recording_url: null },
  { ...base, id: STAND_IN_IDS.draft, title: 'مسودة لم تُنشر «مؤقت»', department_code: 'SECTOR_AWARENESS', day: 2, from: [18, 0], to: [20, 0], format: 'in_person', location: 'مبنى 58', capacity: 30, status: 'draft', recording_url: null },
  { ...base, id: STAND_IN_IDS.cancelled, title: 'ورشة: التصميم الصناعي للمنتجات التقنية «مؤقت»', department_code: 'MANUFACTURING_DESIGN', day: 5, from: [18, 0], to: [20, 30], format: 'in_person', location: 'مبنى 19 · المعمل', capacity: 20, status: 'cancelled', recording_url: null },
  { ...base, id: STAND_IN_IDS.pastWithRecording, description: LONG.reading, presenter: 'فريق التأهيل المهني «مؤقت»', title: 'كيف تقرأ وصفًا وظيفيًا في القطاع الدفاعي «مؤقت»', department_code: 'SECTOR_AWARENESS', day: -6, from: [18, 0], to: [20, 0], format: 'online', location: null, capacity: null, status: 'published', recording_url: 'https://youtu.be/standin0001' },
  { ...base, id: 9102, title: 'ورشة: أساسيات سلاسل الإمداد «مؤقت»', department_code: 'MANUFACTURING_DESIGN', day: -12, from: [19, 0], to: [21, 0], format: 'in_person', location: 'مبنى 24 · قاعة 108', capacity: 30, status: 'published', recording_url: 'https://youtu.be/standin0002' },
  { ...base, id: 9103, title: 'من الفكرة إلى النموذج الأولي «مؤقت»', department_code: 'SYSTEMS_INTEGRATION', day: -19, from: [18, 0], to: [20, 0], format: 'in_person', location: 'مبنى 58 · قاعة 102', capacity: 30, status: 'published', recording_url: 'https://youtu.be/standin0003' },
  { ...base, id: 9104, title: 'أدوار غير تقنية في شركات الدفاع «مؤقت»', department_code: 'CAREER_READINESS', day: -26, from: [18, 0], to: [19, 30], format: 'online', location: null, capacity: null, status: 'published', recording_url: 'https://youtu.be/standin0004' },
  { ...base, id: 9106, title: 'هندسة المواد: من المختبر إلى خط الإنتاج «مؤقت»', department_code: 'MANUFACTURING_DESIGN', day: -33, from: [18, 0], to: [20, 0], format: 'in_person', location: 'مبنى 63 · قاعة 201', capacity: 40, status: 'published', recording_url: 'https://youtu.be/standin0006' },
  { ...base, id: 9107, title: 'تحليل البيانات لغير المتخصصين «مؤقت»', department_code: 'DATA_ANALYSIS', day: -40, from: [20, 0], to: [21, 30], format: 'online', location: null, capacity: null, status: 'published', recording_url: 'https://youtu.be/standin0007' },
  // more of the calendar's months (D1-10): full, almost full, online, a second cancellation, a
  // second event on one day, and an event that ended yesterday without a recording. All start
  // after day 11, so the homepage's four upcoming events and six recordings stay the same.
  { ...base, id: 9009, description: LONG.internships, title: 'لقاء: مسارات التدريب الصيفي في شركات القطاع «مؤقت»', department_code: 'CAREER_READINESS', day: 12, from: [18, 30], to: [20, 0], format: 'in_person', location: 'مبنى 22 · قاعة 115', capacity: 35, status: 'published', recording_url: null },
  { ...base, id: 9010, title: 'جلسة: أمن الشبكات الصناعية «مؤقت»', department_code: 'CYBERSECURITY', day: 14, from: [20, 30], to: [22, 0], format: 'online', location: null, capacity: null, status: 'published', recording_url: null },
  { ...base, id: 9011, title: 'تكامل الأنظمة: من المتطلبات إلى الاختبار «مؤقت»', department_code: 'SYSTEMS_INTEGRATION', day: 19, from: [18, 0], to: [20, 0], format: 'in_person', location: 'مبنى 58 · قاعة 102', capacity: 40, status: 'published', recording_url: null },
  { ...base, id: 9012, title: 'ورشة: الطباعة ثلاثية الأبعاد للنماذج الأولية «مؤقت»', department_code: 'MANUFACTURING_DESIGN', day: 22, from: [17, 0], to: [19, 0], format: 'in_person', location: 'مبنى 19 · المعمل', capacity: 20, status: 'cancelled', recording_url: null },
  { ...base, id: 9013, title: 'قراءة في سوق العمل الدفاعي للخريجين «مؤقت»', department_code: 'SECTOR_AWARENESS', day: 25, from: [19, 0], to: [20, 30], format: 'in_person', location: 'قاعة المحاضرات الرئيسية', capacity: 80, status: 'published', recording_url: null },
  { ...base, id: 9014, title: 'تصوير البيانات لصنّاع القرار «مؤقت»', department_code: 'DATA_ANALYSIS', day: 29, from: [20, 0], to: [21, 30], format: 'online', location: null, capacity: null, status: 'published', recording_url: null },
  { ...base, id: 9015, title: 'مقابلة تجريبية مع مختصي التوظيف «مؤقت»', department_code: 'CAREER_READINESS', day: 33, from: [18, 0], to: [20, 0], format: 'in_person', location: 'كلية الإدارة الصناعية', capacity: 16, status: 'published', recording_url: null },
  { ...base, id: 9016, title: 'جولة في مختبرات الأنظمة الذاتية «مؤقت»', department_code: 'SYSTEMS_INTEGRATION', day: 37, from: [10, 0], to: [12, 0], format: 'in_person', location: 'مبنى 63', capacity: 25, status: 'published', recording_url: null },
  // registration closed early (a site visit whose names go to the host in advance): the event
  // page's «أُغلق التسجيل» state (D1-11). Starts after day 11, like the rows above.
  { ...base, id: 9017, description: LONG.visit, title: 'زيارة ميدانية: خط إنتاج من الداخل «مؤقت»', department_code: 'SYSTEMS_INTEGRATION', day: 13, from: [9, 0], to: [12, 0], closes: [-1, 23, 59], format: 'in_person', location: 'مبنى 58 · نقطة التجمع', capacity: 20, status: 'published', recording_url: null },
  { ...base, id: 9108, title: 'حوار مفتوح: ماذا يعني العمل في الصناعات الدفاعية؟ «مؤقت»', department_code: 'SECTOR_AWARENESS', day: -1, from: [19, 0], to: [20, 30], format: 'in_person', location: 'مبنى 22 · المسرح', capacity: 60, status: 'published', recording_url: null },
  { ...base, id: STAND_IN_IDS.pastNoRecording, title: 'جلسة تعارف مع لجنة حصن «مؤقت»', department_code: 'CYBERSECURITY', day: -4, from: [18, 0], to: [19, 0], format: 'in_person', location: 'مبنى 22', capacity: 50, status: 'published', recording_url: null },
]

/** ids of the events a visitor can open (not drafts); needs no clock, for generateStaticParams */
export function standInPageIds(): number[] {
  return SAMPLES.filter((s) => s.status !== 'draft').map((s) => s.id)
}

/** the stand-in events table at the given moment */
export function standInRows(now: number = Date.now()): EventRow[] {
  return SAMPLES.map(({ day, from, to, closes, ...row }) => {
    const startsAt = riyadhAt(now, day, ...from)
    const closesAt = closes ? riyadhAt(now, ...closes) : startsAt
    return { ...row, starts_at: startsAt, ends_at: riyadhAt(now, day, ...to), registration_closes_at: closesAt }
  })
}

/**
 * Seats already taken per event (STAND-IN). The real number is a count of registrations
 * (A-3's registrations table); it is live data, so read it only where a page can show a value that
 * is up to an hour old (the cached homepage) or render it dynamically. Events without a capacity
 * have no entry.
 */
const TAKEN: Record<number, number> = {
  9001: 24, 9002: 13, 9004: 23, 9005: 21, 9006: 9, [STAND_IN_IDS.cancelled]: 4,
  9009: 35, 9011: 36, 9012: 6, 9013: 31, 9015: 14, 9016: 3, 9017: 12, 9108: 47,
}

export function standInSeatsTaken(id: number): number | null {
  return TAKEN[id] ?? null
}
