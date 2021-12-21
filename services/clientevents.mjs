import WebSocket from 'ws'
import jwt from 'jsonwebtoken'
import service from "./auth.mjs"
let activeConnections = []

export function sendEvent(userId, eventName, data){
  activeConnections.forEach(c => {
    if(c.userId != userId && userId) return;
    c.send(JSON.stringify({type: "event", content: {name: eventName, data}}))
  })
}

async function handleClientRequest(messageText, ws){
  let msg = JSON.parse(messageText)

  switch(msg.type){
    case "login":
      let token = msg.content?.token;

      if(!token){
        ws.send(JSON.stringify({type: "error", content: "No token provided"}))
        return;
      }

      let userInfo;
      if(token == process.env.AXMAN_API_KEY){
        userInfo = service.getAxManUser();
      } else {
        userInfo = await new Promise(resolve => jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
          if (err || !user?.id) return resolve({error: "Session expired"})
          resolve(user)
        }))
      }

      if(userInfo?.id){
        ws.userId = userInfo.id
        ws.send(JSON.stringify({type: "status", content: {status: "loggedin"}}))
      } else {
        ws.send(JSON.stringify({type: "error", content: userInfo?.error || "Could not log you in"}))
        return;
      }
      break;

    case "logout":
      delete ws.userId;
      ws.send(JSON.stringify({type: "status", content: {status: "loggedout"}}))
      break;
                
    case "message":
      if(!ws.userId){
        ws.send(JSON.stringify({type: "error", content: "You are not logged in"}))
        break;
      }
      handleMessage(msg.content, ws, ws.userId)
      break;
  }
}

export function createServer(){
  const wss = new WebSocket.Server({ noServer: true, clientTracking: true});
    
  wss.on('connection', (ws) => {
      ws.on('message', (message) => {handleClientRequest(message, ws); return false;})
      ws.on('close', () => {activeConnections.splice(activeConnections.indexOf(ws), 1); /*console.log("Connection closed")*/})
      ws.on('error', (err) => {console.log(err)})
      activeConnections.push(ws)
      /*console.log("new connection")*/
  });

  return wss;
}