import { notFound } from 'next/navigation'

/*
  Any address under /ar or /en that no page matches, such as /en/nope or /ar/events/1/extra
  (dev-1 D1-5). notFound() shows app/[locale]/not-found.tsx inside this language's header and
  footer, with a 404 status. Under Cache Components Next sends that 404 page as an empty shell and
  renders it in the browser (a page's notFound() can't be server-rendered into the prerendered
  HTML); only app/global-not-found.tsx is complete HTML, and it can't follow the language.
*/
export default function UnknownPage(): never {
  notFound()
}
