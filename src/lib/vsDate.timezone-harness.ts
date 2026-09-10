// Not a test itself — run in a child process (see vsDate.test.ts) under
// different TZ env values so we can prove getWeekDates()/getActiveVsDateStr()
// are unaffected by the host's local timezone. Prints JSON to stdout.
import { getActiveVsDateStr, getWeekDates } from './vsDate'

process.stdout.write(
  JSON.stringify({
    today: getActiveVsDateStr(),
    weekDates: getWeekDates(),
  })
)
