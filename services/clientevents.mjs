import WebSocket from 'ws'
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

      let userInfo = await service.tokenToUser(token);

      if(userInfo?.user?.id){
        ws.userId = userInfo.user.id
        ws.send(JSON.stringify({type: "status", content: {status: "loggedin"}}))
      } else {
        ws.send(JSON.stringify({type: "error", content: userInfo?.reponse || "Could not log you in"}))
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
      //handleMessage(msg.content, ws, ws.userId)
      console.log(`Message from ${ws.userId}: ${JSON.stringify(msg.content)}`)
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