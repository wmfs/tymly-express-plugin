const debug = require('debug')('statebox')
const respond = require('../../../../util/respond')

module.exports = function cancelTymlyRoute (req, res) {
  const services = req.app.get('services')
  const jwtAuthService = services.jwtAuth
  const statebox = services.statebox

  const options = {
    userId: jwtAuthService.extractUserIdFromRequest(req),
    action: 'stopExecution',
    stateMachineName: req.params.executionName
  }

  debug(`Request to '${options.action}' on '${options.stateMachineName}' (by user '${options.userId}')`)

  statebox.stopExecution(
    'Execution stopped externally',
    'STOPPED',
    req.params.executionName,
    options
  )
    .then(executionDescription => respond.ok(res, 204, executionDescription))
    .catch(err => respond.error(res, err, `Execution returned an error while attempting to stop (executionName='${req.params.executionName})'`))
}
