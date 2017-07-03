#!/usr/bin/env node
const inquirer = require('inquirer')
const Hyperchat = require('../hyperchat')

const setupQuestions = [{
  type: 'input',
  name: 'name',
  message: 'What is your name?'
}]

const openInput = {
  type: 'input',
  name: 'input',
  message: '>>>'
}

let chat

inquirer.prompt(setupQuestions)
  .then((answers) => {
    // start chatclient
    if (answers.name) {
      chat = new Hyperchat(answers.name)
      chat.on('ready', () => console.log(chat.name, 'now available on public key:', chat.key))
      chat.on('connection', () => console.log('i am connected to someone'))
      chat.on('listening', data => console.log('i am listening to', data.key))
      chat.on('disconnecting', key => console.log('disconnecting from', key))
      chat.on('disconnected', key => console.log('disconnected from', key))
      chat.on('destroyed', () => console.log('Hyperchat is destroyed'))
      chat.on('started', data => console.log(data.name, 'joined conversation'))
      chat.on('ended', data => console.log(data.name, 'exited conversation'))
      chat.on('heard', data => console.log(data.name, 'heard', data.who, '-', data.index))
      chat.on('message', data => console.log(`${data.name}:`, data.message))
      return chatLoop()
    }
  })

function chatLoop () {
  return inquirer.prompt([openInput])
    .then(actOnInput)
}

function actOnInput (answer) {
  const { input } = answer
  const command = input.match(/:(\w+)(?:\s(.+))?/)
  if (command) {
    switch (command[1]) {
      case 'q':
      case 'quit':
        chat.disconnect(() => console.log('DESTROYED'))
        console.log('QUIT')
        return
      case 'c':
      case 'connect':
        if (command[2]) {
          const key = command[2].trim()
          console.log('attempt to connect to', key)
          chat.add(key)
        }
        break
      case 'w':
      case 'whoami':
        console.log('your public key is:', chat.key)
        break
      case 'd':
      case 'disconnect':
        const key = command[2].trim()
        console.log('attempt to disconnect from', key)
        chat.remove(key)
        break
      case 'h':
      case 'help':
        console.log(':h or :help - prints out the commants the chat cli accepts')
        console.log(':w or :whoami - logs out your address')
        console.log(':c [key] or :connect [key] - listens to conversation at key')
        console.log(':d [key] or :disconnect [key] - stops listnening to conversation at key')
        console.log(':q or :quit [key] - stops sharing and kills all connections')
        break
    }
  } else {
    // append chat
    chat.chat(input)
  }
  chatLoop()
}
