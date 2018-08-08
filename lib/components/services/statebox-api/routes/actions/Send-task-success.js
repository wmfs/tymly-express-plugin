'use strict'

module.exports = function sendTaskSuccess (statebox, req, res, env) {
  const options = {}
  if (env.userId) options.userId = env.userId

  statebox.sendTaskSuccess(
    req.params.executionName,
    env.body.output || {},
    options,
    function (err) {
      if (err) {
        console.error(err)
        res.status(500).send()
      } else {
        res.status(200).send()
      }
    }
  )
}
