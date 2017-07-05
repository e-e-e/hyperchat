const hypercore = require('hypercore')
const hyperdiscovery = require('hyperdiscovery')
const Listener = require('./listener')
const fs = require('fs')
const path = require('path')
const events = require('events')
const homedir = require('os').homedir()

const chatsDirectory = path.resolve(homedir, './hyperchats')

class Hyperchat extends events.EventEmitter {
  constructor (name) {
    super()
    this.name = name
    try {
      fs.statSync(chatsDirectory)
    } catch (e) {
      fs.mkdirSync(chatsDirectory)
    }
    this.feed = hypercore(path.join(chatsDirectory, name), { valueEncoding: 'json' })
    this.listeningTo = []
    this.ready = false
    this.feed.on('ready', () => this.connect())
    this.feed.on('error', e => console.error('feed error:', e))
    this.swarm = undefined
  }

  get key () {
    return this.feed.key.toString('hex')
  }

  get discoveryKey () {
    return this.feed.discoveryKey.toString('hex')
  }

  connect () {
    this.feed.append({ time: Date.now(), name: this.name, status: 'START' }, (err) => {
      if (err) throw err
      this.emit('ready')
      this.ready = true
      const archive = this.feed
      this.swarm = hyperdiscovery(this.feed, {
        stream: function (peer) {
          const stream = archive.replicate({
            live: true,
            upload: true,
            download: true,
            userData: archive.key
          })
          stream.on('handshake', () => {
            console.log('HANDSHAKE RECIEVER', stream.remoteUserData.toString('hex'))
          })
          return stream
        }
      })
      this.swarm.once('connection', () => { this.emit('connection') })
    })
  }

  disconnect (cb) {
    const kill = () => {
      if (count === 0 && this.swarm) {
        this.feed.append({ time: Date.now(), name: this.name, status: 'END' }, () => {
          setTimeout(() => this._destroy(cb), 40)
        })
      };
    }
    var count = this.listeningTo.length
    if (count) {
      this.listeningTo.forEach((remote) => {
        this.emit('disconnecting', remote.key)
        remote.disconnect(() => {
          this.emit('disconnected', remote.key)
          count--
          kill()
        })
      })
    } else {
      kill()
    }
  }

  chat (msg) {
    if (this.ready) {
      this.feed.append({ time: Date.now(), msg })
    } else {
      console.warn('Feed is not ready yet')
    }
  }

  heard (discoveryKey, index) {
    this.feed.append({ time: Date.now(), heard: discoveryKey, index, status: 'HEARD' })
  }

  add (key) {
    const remote = new Listener(key, this)
    // attach listener events
    this.listeningTo.push(remote)
  }

  remove (key) {
    const id = this.listeningTo.findIndex(e => e.key === key)
    if (id >= 0) {
      this.listeningTo[id].disconnect()
      this.listeningTo.splice(id, 1)
    } else {
      console.warn('You dont seem to be connected to:', key)
    }
  }

  _destroy (cb) {
    this.swarm.leave(this.feed.discoveryKey)
    this.swarm.destroy(cb)
    this.swarm = undefined
    this.emit('destroyed')
  }
}

module.exports = Hyperchat
