import api from "./api.mjs"
import {wsURL} from "./core.mjs"
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

class MessageServer{
  constructor(){
    this.user = {};
    this.loginPromise = new Promise((resolve) => this.loginPromiseResolve = resolve);
    this.ready = new Promise(resolve => this.readyPromiseResolve = resolve);
    this.userDefined = new Promise(resolve => this.userDefinedPromiseResolve = resolve);
    this.socket = null;
  }

  async addEventListener(type, listener){
    this.listeners[type] ??= []
    this.listeners[type].push(listener)
  }

  async connect(){
    if(this.socket) return;
    this.socket = new WebSocket(wsURL());
    
    this.socket.addEventListener('open', (event) => {
      this.login()
      this.readyPromiseResolve(this)
    });

    // Listen for messages
    this.socket.addEventListener('message', (event) => {
      let msg = JSON.parse(event.data)
      switch(msg.type){
        case "status":
          this.statusReceived(msg.content)
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
      console.log(event)
      this.ready = new Promise(resolve => this.readyPromiseResolve = resolve);
      this.loginPromise = new Promise((resolve) => this.loginPromiseResolve = resolve);
      console.log("Connection closed. Attempting reconnect...")
      delete this.socket;
      await this.connect()
    })
    
    this.socket.addEventListener('error', (...error) => {
      console.log.apply(null, error)
    })

    return this.ready
  }

  async login(){
    await this.ready;
    this.userDefinedPromiseResolve(this)
    this.socket.send(JSON.stringify({type: "login", content: {token: api.token}}))
    console.log("Trying to log in to websocket server")
    return await this.loginPromise
  }

  async statusReceived({status, user}){
    switch(status){
      case "loggedin":
        this.loginPromiseResolve();
        console.log("Connected and logged in to websocket server")
        break;
    }
  }

  async send(message){
    await this.loginPromise
    this.socket.send(JSON.stringify({type: "message", content: message}))
    console.log("message sent")
  }
}

export default new MessageServer();