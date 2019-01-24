'use strict'

// http://docs.aws.amazon.com/step-functions/latest/apireference/Welcome.html
const routes = require('./routes/index')

class StateboxApiService {
  /**
   * Boot function to expose StateboxApiService service class and add statebox api
   * @param {object} options
   * @param {function} callback Callback function for when boot is complete
   */
  boot (options, callback) {
    const express = options.bootedServices.server.express
    const app = options.bootedServices.server.app
    const jwtCheck = options.bootedServices.jwtAuth.jwtCheck

    addExpressApi(
      express,
      app,
      jwtCheck
    )
    callback(null)
  }
}

/**
 * Sets up an Express route for the statebox api on a supplied express object/app at '/executions'
 * @param {Object} express The express instance to work with
 * @param {Object} app The initialised express app to add the route to
 * @param {Function} jwtCheck Function to execute to confirm JWT auth
 * @example
 * addExpressApi(
    express,
    app,
    jwtCheck
    )
 */
function addExpressApi (express, app, jwtCheck) {
  // Statebox routes
  // ---------------
  const router = express.Router()
  router.post('/', jwtCheck, routes.startExecution)
  router.get('/:executionName', jwtCheck, routes.describeExecution)
  router.put('/:executionName', jwtCheck, routes.executionAction)
  router.delete('/:executionName', jwtCheck, routes.stopExecution)
  app.use('/executions', router)
}

module.exports = {
  serviceClass: StateboxApiService,
  bootAfter: ['jwtAuth', 'statebox']
}
