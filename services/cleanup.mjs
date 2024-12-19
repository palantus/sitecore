import { query } from "entitystorage"
import LogEntry from "../models/logentry.mjs"

export function startCleanupService(){
  return setInterval(runJob, 3_600_000) // Run every hour
}

function runJob(){
  // console.time("Core cleanup completed")
  let todayMinus15 = new Date()
  todayMinus15.setDate(todayMinus15.getDate()-15)
  let todayMinus15Str = todayMinus15.toISOString()

  query.type(LogEntry).tag("logentry").all
                      .filter(a => a.timestamp < todayMinus15Str)
                      .forEach(a => a.delete());

  let todayMinus30 = new Date()
  todayMinus30.setDate(todayMinus30.getDate()-30)
  let todayMinus30Str = todayMinus30.toISOString()

  query.tag("notification").all.filter(n => n.timestamp < todayMinus30Str)
                               .forEach(n => n.delete())

  // console.timeEnd("Core cleanup completed")
}
