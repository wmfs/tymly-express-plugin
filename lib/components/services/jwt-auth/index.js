'use strict'

const boom = require('boom')
const process = require('process')
const dottie = require('dottie')
const jwt = require('jsonwebtoken')
const jwtMiddleware = require('express-jwt')
const schema = require('./schema.json')
const Buffer = require('safe-buffer').Buffer
const fs = require('fs')
const axios = require('axios')

class AuthService {
  async boot (options, callback) {
    const secret = await findSecret(options)
    const audience = findAudience(options)

    if (audience && secret) {
      const expressApp = options.bootedServices.server.app
      this.jwtCheck = jwtMiddleware(
        {
          secret: secret,
          audience: audience
        }
      )
      expressApp.set('jwtCheck', this.jwtCheck)

      this.secret = secret
      this.audience = audience
      this.findCertificate = findCertificate

      options.messages.info('Added JWT Express middleware')
      callback(null)
    } else {
      console.error('Failed to set-up authentication middleware: Is $TYMLY_AUTH_SECRET/$TYMLY_AUTH_CERTIFICATE and $TYMLY_AUTH_AUDIENCE set?')
      callback(boom.internal('Failed to set-up authentication middleware: Is $TYMLY_AUTH_SECRET/$TYMLY_AUTH_CERTIFICATE and $TYMLY_AUTH_AUDIENCE set?'))
    }
  } // boot

  /**
   * Generates a JWT for use in Tymly auth stuff
   * @param {Object} subject The subject to be supplied to the JWT
   * @returns {String} The JWT produced by the jwt.sign function
   * @example
   * const jwt = generateToken(subject)
   */
  generateToken (subject) {
    return jwt.sign(
      {},
      this.secret,
      {
        subject: subject,
        audience: this.audience
      }
    )
  } // generateToken

  /**
   * Extracts a userID from an Express request object
   * @param {Object} req An Express.js request object
   * @returns {String} A userId extracted from the request (derived via the `user` property added via [express-jwt](https://www.npmjs.com/package/express-jwt) middleware)
   * @example
   * var userId = auth.extractUserIdFromRequest (req)
   * console.log(userId) // myUsername@tymlyjs.io
   */
  extractUserIdFromRequest (req) {
    let userId
    if (req.hasOwnProperty('user')) {
      userId = req.user.sub
    }
    return userId
  } // extractUserIdFromRequest
} // AuthService

/**
 * Extracts a secret from a supplied 'options' object
 * @param {Object} options Object to search for secret within
 * @returns {String} The secret extracted from the 'options' object
 * @example
 * const secret = findSecret(options)
 */
async function findSecret (options) {
  const secret = await findCertificate(options) || findAuthSecret(options)

  if (secret === undefined) {
    options.messages.error(
      {
        name: 'noSecret',
        message: 'No authentication secret was supplied via config or the $TYMLY_AUTH_SECRET environment variable'
      }
    )
  }

  return secret
} // findSecret

/**
 * Extracts a certificate from a supplied 'options' object, or failing that takes it from 'TYMLY_CERTIFICATE_PATH' environment variable
 * @param {Object} options Object to search for secret within
 * @returns {String} The certificate extracted from the 'options' object, or grabbed from the env var
 * @example
 * const cert = findCertificate(options)
 */
async function findCertificate (options) {
  const certPath = dottie.get(options, 'config.auth.certificate') || process.env.TYMLY_CERTIFICATE_PATH

  if (certPath) {
    options.messages.info(`Loading certificate from ${certPath}`)
    return fs.readFileSync(certPath)
  } else if (process.env.AUTH0_DOMAIN) {
    const pemUrl = `https://${process.env.AUTH0_DOMAIN}.eu.auth0.com/pem`

    const { data } = await axios.get(pemUrl)
    return data
  } else {
    return undefined
  }
} // findCertificate

/**
 * Extracts an authentication secret from a supplied 'options' object, or failing that takes it from 'TYMLY_AUTH_SECRET' environment variable
 * @param {Object} options Object to search for secret within
 * @returns {String} The secret extracted from the 'options' object, or grabbed from the env var
 * @example
 * const secret = findAuthSecret(options)
 */
function findAuthSecret (options) {
  const secret = dottie.get(options, 'config.auth.secret') || process.env.TYMLY_AUTH_SECRET
  if (secret) {
    options.messages.info(`Using auth secret`)
  }

  return secret ? Buffer.from(secret, 'base64') : undefined
} // findAuthSecret

/**
 * Extracts an audience from a supplied 'options' object, or failing that takes it from 'TYMLY_AUTH_AUDIENCE' environment variable
 * @param {Object} options Object to search for secret within
 * @returns {String} The certificate extracted from the 'options' object, or grabbed from the env var
 * @example
 * const audience = findAudience(options)
 */
function findAudience (options) {
  const audience = dottie.get(options, 'config.auth.audience') || process.env.TYMLY_AUTH_AUDIENCE

  if (audience === undefined) {
    options.messages.error(
      {
        name: 'noAudience',
        message: 'No authentication audience was supplied via config or the $TYMLY_AUTH_AUDIENCE environment variable'
      }
    )
  } else {
    options.messages.info(`Audience ${audience}`)
  }

  return audience
} // findAudience

module.exports = {
  serviceClass: AuthService,
  bootAfter: ['server'],
  schema: schema
}
