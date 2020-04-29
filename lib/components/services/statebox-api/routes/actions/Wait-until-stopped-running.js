module.exports = function waitUntilStoppedRunning (statebox, req, res, env) {
  const options = {}
  if (env.userId) options.userId = env.userId

  statebox.waitUntilStoppedRunning(
    req.params.executionName
  )
    .then(executionDescription => res.status(200).send(executionDescription))
    .catch(err => {
      console.error(err)
      res.status(500).send()
    })
}
