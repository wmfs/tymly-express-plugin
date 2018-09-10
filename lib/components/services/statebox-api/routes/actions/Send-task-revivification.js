'use strict'

module.exports = function sendTaskRevivification (statebox, req, res, env) {
  const options = {}
  if (env.userId) options.userId = env.userId

  statebox.sendTaskRevivification(
    req.params.executionName,
    options
  )
    .then(() => res.status(200).send())
    .catch(err => {
      console.error(err)
      res.status(500).send()
    })
}
