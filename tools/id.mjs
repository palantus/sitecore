export let createId = id => id.replace(/^\s+|\s+$/g, '') // trim
                        .toLowerCase()
                        .replace(/\//g, '-') //Replace / with -
                        .replace(/[^a-z0-9 -]/g, '') // remove invalid chars
                        .replace(/\s+/g, '-') // collapse whitespace and replace by -
                        .replace(/-+/g, '-'); // collapse dashes