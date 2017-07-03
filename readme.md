# Hyperchat

An experiment with using hypercore to share and record chat histories.

## install

There are two options.

1. install globally to use from the command line as a chat client:
  ```bash
  npm install -g @e-e-e/hyperchat
  hyperchat
  # you will be promped to add a username
  ? What is your name? ...
  # this will create a hypercore file in your home directory for this name
  # from the chat interface you can enter any of the following commands
  ? >>>
  # :h or :help - prints out the commants the chat cli accepts
  # :w or :whoami - logs out your address
  # :c [key] or :connect [key] - listens to conversation at key
  # :d [key] or :disconnect [key] - stops listnening to conversation at key
  # :q or :quit [key] - stops sharing and kills all connections
  ```

2. install and build your own chat app on top of hyperchat
  ```bash
  npm install @e-e-e/hyperchat --save
  ```
  and import in your project;
  ```js
  var hyperchat = require('@e-e-e/hyperchat')
  var chat = new Hyperchat('username')

  // you can listen to chat events
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

  // connect to multiple other clients
  chat.add('some-public-key')
  chat.add('some-other-public-key')

  // disconnect from other clients
  chat.remove('some-public-key')

  // and chat to any client who is also connected to you
  chat.chat('hello world')
  ```

## config

At the moment there are no config options exposed.
Chats are by default stored at the users home: `~/hyperchats`
