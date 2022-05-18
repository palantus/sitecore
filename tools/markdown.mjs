import Showdown from "showdown"

export function md2html(text) {
  if (!text || typeof text !== "string") return ""
  let converter = new Showdown.Converter({
    tables: true,
    simplifiedAutoLink: true,
    simpleLineBreaks: true,
    requireSpaceBeforeHeadingText: true
  })
  return converter.makeHtml(text)
}