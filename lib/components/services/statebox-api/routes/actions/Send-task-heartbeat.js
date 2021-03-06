'use strict'

module.exports = function sendTaskHeartbeat (statebox, req, res, env) {
  const options = {}
  if (env.userId) options.userId = env.userId

  statebox.sendTaskHeartbeat(
    req.params.executionName,
    env.body.output || {},
    options
  )
    .then(executionDescription => res.status(200).send(executionDescription))
    .catch(err => {
      console.error(err)
      res.status(500).send()
    })
}

// statebox.updateTymly(
//       req.params.tymlyId,
//       options,
//       function (err, tymly) {
//         if (err) {
//           let boomErr
//           if (err.isBoom) {
//             boomErr = err
//           } else {
//             boomErr = boom.internal('Tymly returned an error while attempting to update', err)
//           }
//           res.status(boomErr.output.statusCode).send(boomErr.output.payload)
//         } else {
//           res.status(200).send(
//             {
//               tymly: tymly
//             }
//               )
//         }
//       }
//   )
