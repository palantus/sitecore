import { query } from "entitystorage"
import LogEntry from "../models/logentry.mjs"

export function startCleanupService(){
  return setInterval(runJob, 3_600_000) // Run every hour
}

function runJob(){
  console.time("Core cleanup completed")
  let today = new Date()
  today.setDate(today.getDate()-15)
  let todayStrISO = today.toISOString()

  query.type(LogEntry).tag("logentry").all
                      .filter(a => a.timestamp < todayStrISO)
                      .forEach(a => a.delete());

  console.timeEnd("Core cleanup completed")
}