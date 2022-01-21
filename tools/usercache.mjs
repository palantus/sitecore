let userPermissionCache = {}
let userRoleCache = {}

export function clearUserRoleAndPermissionCache(){
  userRoleCache = {}
  userPermissionCache = {}
}

export function lookupUserRoles(user){
  return userRoleCache[user._id] || (userRoleCache[user._id] = user.roles)
}

export function lookupUserPermissions(user){
  return userPermissionCache[user._id] || (userPermissionCache[user._id] = user.permissions)
}

let jwtToUserCache = {}
let jwtCacheTime = null;

export function lookupUserFromJWT(token){
  let hit = jwtToUserCache[token]
  if(hit && hit.ts > new Date().getTime() - 5000){
    return hit.user
  }
  return null;
}

export function cacheJWT(token, user){
  jwtToUserCache[token] = {ts: new Date().getTime(), user}
  return user;
}