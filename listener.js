const hypercore = require('hypercore')
const hyperdiscovery = require('hyperdiscovery')

class Listener {
  constructor (key) {
    this.swarm = undefined
    this.feed = hypercore(`./remote${key}`, key, { valueEncoding: 'json', sparse: true, live: true })
    this.feed.on('ready', () => this.connect())
    this.feed.on('error', e => console.error('feed error:', e))
    this.lastVersion = undefined
    // start listening to append messages
    this.feed.on('append', () => {
      console.log('appended', this.feed.length)
      // this._newData()
    })
  }

  get key () {
    return this.feed.key.toString('hex')
  }

  connect () {
    console.log('Listening to:', this.key)
    this.swarm = hyperdiscovery(this.feed)
    this.swarm.once('connection', () => {
      console.log('version was', this.feed.length)
      console.log('I am listening to someone!')
      this._update()
    })
    // this.feed.on('download', (i, data) => {
    //   console.log('data', i, data.toString())
    // })
  }

  _update () {
    this.feed.update(() => {
      this.lastVersion = this.feed.length
      console.log('last version was', this.lastVersion)
      this._update()
    })
  }

  _newData () {
    const last = this.lastVersion || 0
    const newest = this.feed.length
    if (newest > last) {
      console.log('recived from', this.lastVersion, newest)
      this.lastVersion = newest
      this.feed.download({start: last, end: newest}, () => {
        for (var i = last; i < newest; i++) {
          this.feed.get(i, {wait: false, valueEncoding: 'json'}, this._gotMessage.bind(this))
        }
      })
    }
  }

  _gotMessage (err, data) {
    if (err) throw err
    console.log('new message', data)
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

  _listenStream () {
    const stream = this.feed.replicate({
      upload: true,
      download: true,
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

module.exports = Listener
