export function getTimestamp(offsetMS) {
  let tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
  return (new Date(Date.now() - tzoffset + (offsetMS||0))).toISOString().slice(0, -1);
}

export function getTime(offsetMS) {
  let tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
  return (new Date(Date.now() - tzoffset + (offsetMS||0))).toISOString().slice(0, -1).substring(11);
}