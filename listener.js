const hypercore = require('hypercore')
const hyperdiscovery = require('hyperdiscovery')
const fs = require('fs')
const path = require('path')
const homedir = require('os').homedir()

const remoteChatDirectory = path.resolve(homedir, './hyperchats/remote')

class Listener {
  constructor (key, receiver) {
    this.swarm = undefined
    this.name = undefined
    try {
      fs.statSync(remoteChatDirectory)
    } catch (e) {
      fs.mkdirSync(remoteChatDirectory)
    }
    this.receiver = receiver
    this.feed = hypercore(path.join(remoteChatDirectory, key), key, { valueEncoding: 'json', sparse: true, live: true })
    this.feed.on('ready', () => this.connect())
    this.feed.on('error', e => console.error('feed error:', e))
    this.lastVersion = undefined
    // start listening to append messages
    this.feed.on('append', this._newData.bind(this))
  }

  get key () {
    return this.feed.key.toString('hex')
  }

  connect () {
    console.log('Listening to:', this.key)
    const archive = this.feed
    const receiver = this.receiver.feed
    this.swarm = hyperdiscovery(this.feed, {
      stream: function (peer) {
        const stream = archive.replicate({
          live: true,
          upload: true,
          download: true,
          userData: receiver.key
        })
        stream.on('handshake', () => {
          console.log('HANDSHAKE LISTENER', stream.remoteUserData.toString('hex'))
        })
        return stream
      }
    })
    this.swarm.once('connection', () => {
      this.lastVersion = this.feed.length
      this.receiver.emit('listening', { key: this.key })
      this.feed.get(0, this._setName.bind(this))
      this._update()
    })
  }

  _setName (err, data) {
    if (err) throw err
    this.name = data.name || this.key
  }

  _update () {
    this.feed.update(() => {
      this.lastVersion = this.feed.length
      this._update()
    })
  }

  _newData () {
    const last = this.lastVersion || 0
    const newest = this.feed.length
    if (newest > last) {
      this.lastVersion = newest
      this.feed.download({start: last, end: newest}, () => {
        for (var i = last; i < newest; i++) {
          const index = i
          this.feed.get(
            index,
            {wait: false, valueEncoding: 'json'},
            (err, data) => this._gotMessage(err, data, index)
          )
        }
      })
    }
  }

  _gotMessage (err, data, index) {
    if (err) throw err
    if (data.msg) {
      this.receiver.emit('message', {
        name: this.name,
        message: data.msg,
        time: data.time,
        index
      })
      this.receiver.heard(this.discoveryKey, index)
    }
    switch (data.status) {
      case 'START':
        this.receiver.emit('started', { name: this.name })
        break
      case 'END':
        this.receiver.emit('ended', { name: this.name })
        break
      case 'HEARD':
        const who = data.heard === this.discoveryKey ? 'you' : data.heard
        this.receiver.emit('heard', {name: this.name, who, index: data.index})

        break
    }
  }

  disconnect (cb) {
    if (this.swarm) {
      this._destroy(cb)
    }
  }

  _destroy (cb) {
    this.swarm.leave(this.feed.discoveryKey)
    this.swarm.destroy(cb)
    this.swarm = undefined
  }
}

module.exports = Listener
