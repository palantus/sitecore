import api from "./api.mjs"
import {getRemoteId, wsURL} from "./core.mjs"
let handlers = {}

export function onMessage(eventName, id, fn){
  handlers[eventName] ??= []
  handlers[eventName].push({fn, id})
}

export function offMessage(eventName, id){
  if(handlers[eventName] === undefined) return;
  handlers[eventName] = handlers[eventName].filter(h => h.id != id)
}

function fire(eventName, data){
  handlers[eventName]?.forEach(h => h.fn(data))
}

export function fireSelfSync(name, data){
  messageServer.send({type: "selfsync", event: {name, data}})
}

class MessageServer{
  constructor(){
    this.loginPromise = new Promise((resolve) => this.loginPromiseResolve = resolve);
    this.socket = null;
  }

  async addEventListener(type, listener){
    this.listeners[type] ??= []
    this.listeners[type].push(listener)
  }

  connect(){
    if(this.socket) return;
    this.socket = new WebSocket(wsURL());
    
    this.socket.addEventListener('open', (event) => {
      this.socket.send(JSON.stringify({type: "login", content: {token: api.token}}))
      console.log("Trying to log in to websocket server")
    });

    // Listen for messages
    this.socket.addEventListener('message', (event) => {
      let msg = JSON.parse(event.data)
      if(msg.remoteId && msg.remoteId != getRemoteId()) return; 
      switch(msg.type){
        case "status":
          if(msg.content.status == "loggedin"){
            this.loginPromiseResolve();
            console.log("Connected and logged in to websocket server")
          } else {
            console.log(`Unknown status: ${msg.content.status}`)
          }
          break;
        case "event":
          fire(msg.content.name, msg.content.data); 
          break;
        case "message":
          console.log(msg)
          break;
        case "error":
          fire("error", msg.content); 
          console.log(msg.content)
          break;
        default:
          console.log('Unknown message from server', event.data);
      }
    });
    
    this.socket.addEventListener('close', async (event) => {
      if(event.code == 1001) return;
      console.log(event)
      this.loginPromise = new Promise((resolve) => this.loginPromiseResolve = resolve);
      console.log("Connection closed. Attempting reconnect...")
      delete this.socket;
      this.connect()
    })
    
    this.socket.addEventListener('error', (...error) => {
      console.log.apply(null, error)
    })
  }

  async send(message){
    await this.loginPromise
    this.socket.send(JSON.stringify({type: "message", content: message}))
  }
}

let messageServer = new MessageServer()
export default messageServer;