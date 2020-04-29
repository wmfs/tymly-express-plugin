'use strict'

const _ = require('lodash')
const respond = require('../../../../util/respond')
const debug = require('debug')('statebox')

module.exports = function startExecution (req, res) {
  const services = req.app.get('services')
  const jwtAuthService = services.jwtAuth
  const statebox = services.statebox
  const stateMachineName = req.body.stateMachineName

  const input = cloneOrDefault(req.body.input)
  const options = cloneOrDefault(req.body.options)
  options.action = 'startExecution'
  options.stateMachineName = stateMachineName

  const userId = jwtAuthService.extractUserIdFromRequest(req)
  if (userId) {
    options.userId = userId
  }

  statebox.startExecution(
    input,
    stateMachineName,
    options
  )
    .then(executionDescription => {
      debug('executionDescription:', executionDescription)
      respond.ok(res, 201, executionDescription)
    })
    .catch(err => respond.error(res, err, 'Statebox returned an error while attempting to start'))
}

function cloneOrDefault (obj) {
  return obj ? _.cloneDeep(obj) : {}
}
