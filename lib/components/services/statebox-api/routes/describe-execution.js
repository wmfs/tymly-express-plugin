const debug = require('debug')('tymlyExpressPlugin')
const respond = require('../../../../util/respond')

module.exports = function describeExecution (req, res) {
  const services = req.app.get('services')
  const jwtAuthService = services.jwtAuth
  const statebox = services.statebox

  const options = {
    executionName: req.params.executionName,
    action: 'describeExecution'
  }

  const userId = jwtAuthService.extractUserIdFromRequest(req)
  if (userId) {
    options.userId = userId
  }

  debug(`Request to '${options.action}' by user '${options.userId}' (executionName='${options.executionName}')`)

  statebox.describeExecution(
    options.executionName,
    {}
  )
    .then(executionDescription => respond.ok(res, 200, executionDescription))
    .catch(err => respond.error(res, err, 'Statebox returned an error while attempting to describe execution'))
}
