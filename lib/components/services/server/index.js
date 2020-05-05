'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const addStaticDir = require('./add-static-dir')
const schema = require('./schema.json')
const debug = require('debug')('tymly-express-plugin')
const process = require('process')
const helmet = require('helmet')

class ExpressServerService {
  /**
   * Boot function to expose Server service class
   * @param {object} options
   * @param {function} callback Callback function for when boot is complete
   */
  async boot (options) {
    const jsonLimit = process.env.TYMLY_REQUEST_SIZE_LIMIT || '10mb'

    // Create a new Express app
    const app = express()
    app.use(helmet())
    app.use(bodyParser.urlencoded({ extended: false, limit: jsonLimit }))
    app.use(bodyParser.json({ limit: jsonLimit }))

    options.messages.info('Created Express.js app')
    options.messages.detail(`JSON Request Size - ${jsonLimit}`)

    // Make Tymly Control available to routes
    app.set('services', options.bootedServices)

    // Allow CORS
    app.use(
      function (req, res, next) {
        res.header('Access-Control-Allow-Origin', '*')
        res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,OPTIONS')
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With, Custom-Header')
        next()
      }
    )

    options.messages.info('Configured CORS')

    await addStaticDir(
      app,
      express,
      options.blueprintComponents,
      options.config,
      options.messages,
      options.bootedServices.temp.tempDir
    )

    this.express = express

    /**
     * @property {Object} app A ready-to-go Express app
     * @example
     * var port = 3000
     * server.app.listen(port, function () {
     *   console.log('')
     *   console.log('Tymly server is available http://localhost:' + port)
     * })
     */
    this.app = app
  }

  /**
   * Sets up a listener on a local Express app object
   * @param {String} port The port to listen on
   * @param {Function} callback
   * @example
   * server.listen(
      PORT,
      () => {
         console.log('\n')
         console.log(`Example app listening on port ${PORT}!\n`)
         done()
       }
   )
   */
  listen (port, callback) {
    this.server = this.app.listen(port, callback)
  }

  /**
   * Invokes shutdown function on this.server
   * @example
   * server.shutdown()
   */
  shutdown () {
    if (this.server) {
      debug('Shutting down...')
      this.server.close()
    } else {
      debug('Unable to shutdown... server not started?')
    }
  }
}

module.exports = {
  serviceClass: ExpressServerService,
  bootAfter: ['temp'],
  schema: schema
}
