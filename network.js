var swarmDefaults = require('dat-swarm-defaults')
var disc = require('discovery-swarm')
var xtend = require('xtend')

function joinNetwork (archive, opts, cb) {
  var DEFAULT_PORT = 3282 // 37667
  var swarmOpts = xtend({
    hash: false,
    stream: opts.stream
  }, opts)
  var swarm = disc(swarmDefaults(swarmOpts))
  swarm.once('error', function () {
    swarm.listen(0)
  })
  swarm.listen(swarmOpts.port || DEFAULT_PORT)
  swarm.join(archive.discoveryKey, { announce: !(swarmOpts.upload === false) }, cb)
  return swarm
}

module.exports = joinNetwork
