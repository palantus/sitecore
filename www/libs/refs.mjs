export function refToPath(ref){
  switch(ref.type){
    case "action":
      return `/action/${ref.id}`
    case "forumthread":
      return `/forum/thread/${ref.id}`
    case "changeset":
      return `/changeset/${ref.id}`
    case "support":
      return `/support/activesupport`
    case "runbookexec":
      return `/actions?filter=exec:${ref.id}`
    case "instance":
      return `/instance/${ref.id}`
    case "processes":
      return `/process`
  }
  return "";
}