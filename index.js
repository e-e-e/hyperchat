const inquirer = require('inquirer')
const Hyperchat = require('./hyperchat')

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
    }
  } else {
    // append chat
    chat.chat(input)
  }
  chatLoop()
}
