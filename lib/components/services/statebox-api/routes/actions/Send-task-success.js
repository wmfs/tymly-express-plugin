'use strict'

module.exports = function sendTaskSuccess (statebox, req, res, env) {
  const options = {}
  if (env.userId) options.userId = env.userId

  statebox.sendTaskSuccess(
    req.params.executionName,
    env.body.output || {},
    options
  )
    .then(() => res.status(200).send())
    .catch(err => {
      console.error(err)
      res.status(500).send()
    })
}
