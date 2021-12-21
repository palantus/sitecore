export function paginate (res, {first, last, start, end, after, before}, idField = "_id") {
    if(first != null && !isNaN(first))
        res = res.slice(0, first)
    if(last != null && !isNaN(last))
        res = res.slice(Math.max(res.length - last, 0))
    
    if((start != null && !isNaN(start)) || (end != null && !isNaN(end))){
        let starIdx = start||0
        let endIdx = end != null ? end : res.length
        res = res.slice(starIdx, endIdx+1)
    }
    
    if(after != null && !isNaN(after))
        res = res.filter((r) => r[idField] > after)
    if(before != null && !isNaN(before))
        res = res.filter((r) => r[idField] < before)

    return res;
}