import { WebSocketServer } from "ws"
import service from "./auth.mjs"
import User from "../models/user.mjs"
import APIKey from "../models/apikey.mjs"
let activeConnections = []

export function getActiveUsers(){
  return [...new Set(activeConnections.map(c => c.userId))].map(userId => User.lookup(userId)).filter(u => !!u)
}

export function sendEvent(userId, eventName, data, remoteId = null){
  activeConnections.forEach(c => {
    if(c.federation && userId.endsWith(`@${c.federationIdentifier}`)){
      c.send(JSON.stringify({
        type: "forward",
        recipient: userId.split("@")[0], 
        content:{
          type: "event", 
          content: {name: eventName, data}
        }
      }))
    } else {
      if(userId && c.userId != userId) return;
      c.send(JSON.stringify({type: "event", remoteId, content: {name: eventName, data}}))
    }
  })
}

export function sendMessage(userId, message, args, remoteId = null){
  activeConnections.forEach(c => {
    if(c.federation && userId.endsWith(`@${c.federationIdentifier}`)){
      c.send(JSON.stringify({
        type: "forward",
        recipient: userId.split("@")[0], 
        content:{
          type: "message", 
          content: {message, args}
        }
      }))
    } else {
      if(userId && c.userId) return;
      c.send(JSON.stringify({type: "message", remoteId, content: {message, args}}))
    }
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

        let key = APIKey.lookupKey(token)
        if(key && key.federation){
          ws.federation = true;
          ws.federationIdentifier = key.identifier;
        }

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
      handleMessage(msg.content, ws, ws.userId)
      //console.log(`Message from ${ws.userId}: ${JSON.stringify(msg.content)}`)
      break;
  }
}

function handleMessage(message, ws, userId){
  switch(message.type){
    case "selfsync":
      activeConnections.forEach(c => {
        if(c.userId != userId || c == ws) return;
        c.send(JSON.stringify({type: "event", content: message.event}))
      })
      break;
  }
}

export function createServer(){
  const wss = new WebSocketServer({ noServer: true, clientTracking: true});
    
  wss.on('connection', (ws) => {
      ws.on('message', (message) => {handleClientRequest(message, ws); return false;})
      ws.on('close', () => {activeConnections.splice(activeConnections.indexOf(ws), 1); /*console.log("Connection closed")*/})
      ws.on('error', (err) => {console.log(err)})
      ws.on('pong', () => ws.isAlive = true)
      activeConnections.push(ws)
      /*console.log("new connection")*/
  });

  setInterval(function ping() {
    wss.clients.forEach(function each(ws) {
      if (ws.isAlive === false) {
        console.log("Connection didn't respond to ping. Terminating.")
        return ws.terminate();
      }  
      ws.isAlive = false;
      ws.ping(() => null);
    });
  }, 3000);

  return wss;
}