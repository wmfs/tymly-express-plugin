module.exports = function waitUntilStoppedRunning (statebox, req, res, env) {
  const options = {}
  if (env.userId) options.userId = env.userId

  statebox.waitUntilStoppedRunning(
    req.params.executionName,
    function (err, executionDescription) {
      if (err) {
        console.error(err)
        res.status(500).send()
      } else {
        res.status(200).send(executionDescription)
      }
    }
  )
}
