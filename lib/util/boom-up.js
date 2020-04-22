const boom = require('@hapi/boom')

function boomUp (err, msg) {
  if (boom.isBoom(err)) {
    return err
  }

  return boom.badImplementation(msg, err)
} // boomUp

module.exports = boomUp
