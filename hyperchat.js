const hypercore = require('hypercore')
const hyperdiscovery = require('hyperdiscovery')
const Listener = require('./listener')

class Hyperchat {
  constructor (name) {
    this.name = name
    this.feed = hypercore(`./${name}`, { valueEncoding: 'json' })
    this.listeningTo = []
    this.ready = false
    this.feed.on('ready', () => this.connect())
    this.feed.on('error', e => console.error('feed error:', e))
    this.swarm = undefined
  }

  get key () {
    return this.feed.key.toString('hex')
  }

  connect () {
    // what if not new?
    this.feed.append({ time: Date.now(), name: this.name, status: 'START' }, (err) => {
      if (err) throw err
      this.ready = true
      console.log(this.name, 'now available on public key:', this.key)
      this.swarm = hyperdiscovery(this.feed)
      this.swarm.once('connection', function () {
        console.log('I connected to someone!')
      })
    })
  }

  disconnect (cb) {
    this.listeningTo.forEach((remote) => {
      remote.disconnect()
    })
    if (this.swarm) {
      this.feed.append({ time: Date.now(), name: this.name, status: 'END' }, () => this._destroy(cb))
    }
  }

  chat (msg) {
    if (this.ready) {
      this.feed.append({ time: Date.now(), msg })
    } else {
      console.warn('Feed is not ready yet')
    }
  }

  add (key) {
    const remote = new Listener(key)
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
  }

  _broadcastStream () {
    const stream = this.feed.replicate({
      upload: true,
      download: false,
      live: true
    })
    // stream.on('close', function () {
    //   console.log('Stream close')
    // })
    // stream.on('error', function (err) {
    //   console.log('Replication error:', err.message)
    // })
    // stream.on('end', function () {
    //   console.log('Replication stream ended')
    // })
    return stream
  }
}

module.exports = Hyperchat
