const boomUp = require('./boom-up')

function respondOk (res, code, result) {
  res.status(code).send(!noContent(code) ? result : undefined)
}

function respondError(res, err, msg) {
  const boomErr = boomUp(err, msg)
  res.status(boomErr.output.statusCode).send(boomErr.output.payload)
}

function noContent (code) {
  return code === 204
} // noResponse

module.exports = {
  ok: respondOk,
  error: respondError
}
