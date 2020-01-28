/* eslint-env mocha */

'use strict'

const PORT = 3003
const jwt = require('jsonwebtoken')
const request = require('request')
const expect = require('chai').expect
const tymly = require('@wmfs/tymly')
const path = require('path')
const Buffer = require('safe-buffer').Buffer

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason)
  // application specific logging, throwing an error, or other logic here
})

function sendToken (adminToken) {
  const options = {
    Accept: '*/*'
  }
  if (adminToken) {
    options.authorization = 'Bearer ' + adminToken
  }
  return options
}

describe('Simple Express tests', function () {
  this.timeout(process.env.TIMEOUT || 5000)

  let tymlyService, server, adminToken, rupert, alan, statebox, authService
  const secret = 'Shhh!'
  const audience = 'IAmTheAudience!'
  const executionsUrl = `http://localhost:${PORT}/executions/`
  const testEndpointUrl = `http://localhost:${PORT}/test-endpoint/`
  const GET_FROM_API_STATE_MACHINE = 'tymlyTest_getFromApi_1_0'

  describe('start up', () => {
    it('create a usable admin token for Dave', () => {
      adminToken = jwt.sign(
        {},
        Buffer.from(secret, 'base64'),
        {
          subject: 'Dave',
          audience: audience
        }
      )
    })

    it('create some basic tymly services to run a simple cat blueprint', (done) => {
      process.env.TEST_API_URL = testEndpointUrl
      process.env.TEST_TOKEN = 'Bearer ' + adminToken

      tymly.boot(
        {
          pluginPaths: [
            path.resolve(__dirname, './../lib'),
            path.resolve(__dirname, './fixtures/plugins/cats-plugin'),
            path.resolve(__dirname, './fixtures/plugins/it-lives-plugin'),
            path.resolve(__dirname, './fixtures/plugins/endpoint-plugin'),
            require.resolve('@wmfs/tymly-rbac-plugin'),
            require.resolve('@wmfs/tymly-solr-plugin'),
            require.resolve('@wmfs/tymly-cardscript-plugin'),
            require.resolve('@wmfs/tymly-rest-client-plugin')
          ],

          blueprintPaths: [
            path.resolve(__dirname, './fixtures/blueprints/cats-blueprint'),
            path.resolve(__dirname, './fixtures/blueprints/it-lives-blueprint'),
            path.resolve(__dirname, './fixtures/blueprints/website-blueprint')
          ],

          config: {

            staticRootDir: path.resolve(__dirname, './output'),

            auth: {
              secret: secret,
              audience: audience
            },

            defaultUsers: {
              Dave: ['tymlyTest_tymlyTestAdmin'],
              Steve: ['spaceCadet']
            }

          }

        },
        (err, tymlyServices) => {
          expect(err).to.eql(null)
          tymlyService = tymlyServices.tymly
          authService = tymlyServices.jwtAuth
          server = tymlyServices.server
          statebox = tymlyServices.statebox
          tymlyServices.rbac.debug()
          done()
        }
      )
    })

    it('start Express app', (done) => {
      server.listen(
        PORT,
        () => {
          console.log('\n')
          console.log(`Example app listening on port ${PORT}!\n`)
          done()
        }
      )
    })

    it('should get cert from auth0 domain', async () => {
      process.env.AUTH0_DOMAIN = 'wmfs'
      const cert = await authService.findCertificate()
      expect(cert)
      expect(cert.includes('BEGIN CERTIFICATE'))
      expect(cert.includes('END CERTIFICATE'))
    })
  })

  // CHECK THAT A VALID JWT REQUIRED TO USE /TYMLY'S API
  // ---------------------------------------------------
  describe('don\'t do anything without a JWT', () => {
    it('fail to create a new Tymly without a JWT', (done) => {
      request(
        {
          url: executionsUrl,
          method: 'POST',
          json: {
            stateMachineName: 'tymlyTest_cat_1_0',
            data: { petName: 'Rupert' }
          }
        },
        (err, res, body) => {
          expect(res.statusCode).to.equal(401)
          done(err)
        })
    })

    it('fail updating a Tymly without a JWT', (done) => {
      request(
        {
          url: executionsUrl + alan,
          method: 'PUT',
          json: {
            action: 'SendTaskHeartbeat',
            output: {
              sound: 'Car engine'
            }
          }
        },
        (err, res, body) => {
          expect(res.statusCode).to.equal(401)
          done(err)
        })
    })

    it('fail getting a Tymly without a JWT', (done) => {
      request(
        {
          url: executionsUrl + rupert,
          method: 'GET'
        },
        (err, res, body) => {
          expect(res.statusCode).to.equal(401)
          done(err)
        }
      )
    })
  })

  describe('run cat execution', () => {
    // VALID JWTs WORK
    // ----------------------
    it('create a new Rupert execution', (done) => {
      request(
        {
          url: executionsUrl,
          method: 'POST',
          json: {
            stateMachineName: 'tymlyTest_cat_1_0',
            input: {
              petName: 'Rupert',
              gender: 'male',
              hoursSinceLastMotion: 11,
              hoursSinceLastMeal: 5,
              petDiary: []
            },
            options: {
              instigatingClient: {
                appName: 'tymly-express-plugin',
                domain: 'express-spec.js'
              }
            }
          },
          headers: sendToken(adminToken)
        },
        (err, res, body) => {
          expect(res.statusCode).to.equal(201)
          expect(body.status).to.eql('RUNNING')
          expect(body.currentStateName).to.eql('WakingUp')
          expect(body.ctx.petName).to.eql('Rupert')
          expect(body.executionOptions).to.eql(
            {
              action: 'startExecution',
              instigatingClient: {
                appName: 'tymly-express-plugin',
                domain: 'express-spec.js'
              },
              stateMachineName: 'tymlyTest_cat_1_0',
              userId: 'Dave'
            }
          )
          rupert = body.executionName
          done(err)
        }
      )
    })

    it('get Rupert execution description', (done) => {
      request(
        {
          url: executionsUrl + rupert,
          method: 'GET',
          headers: sendToken(adminToken),
          json: true
        },
        (err, res, body) => {
          expect(res.statusCode).to.equal(200)
          expect(body.ctx.petName).to.equal('Rupert')
          done(err)
        }
      )
    })

    it('successfully complete Rupert\'s day', (done) => {
      statebox.waitUntilStoppedRunning(
        rupert,
        (err, executionDescription) => {
          try {
            expect(err).to.eql(null)
            expect(executionDescription.status).to.eql('SUCCEEDED')
            expect(executionDescription.stateMachineName).to.eql('tymlyTest_cat_1_0')
            expect(executionDescription.currentStateName).to.eql('Sleeping')
            expect(executionDescription.ctx.hoursSinceLastMeal).to.eql(0)
            expect(executionDescription.ctx.hoursSinceLastMotion).to.eql(0)
            expect(executionDescription.ctx.gender).to.eql('male')
            expect(executionDescription.ctx.petDiary).to.be.an('array')
            expect(executionDescription.ctx.petDiary[0]).to.equal('Look out, Rupert is waking up!')
            expect(executionDescription.ctx.petDiary[2]).to.equal('Rupert is walking... where\'s he off to?')
            expect(executionDescription.ctx.petDiary[6]).to.equal('Shh, Rupert is eating...')
            done()
          } catch (e) {
            done(e)
          }
        }
      )
    })
  })

  describe('run another cat execution', () => {
    it('create a new Alan execution', (done) => {
      request(
        {
          url: executionsUrl,
          method: 'POST',
          json: {
            stateMachineName: 'tymlyTest_listeningCat_1_0',
            input: {
              petName: 'Alan',
              gender: 'male',
              petDiary: []
            }
          },
          headers: sendToken(adminToken)
        },
        (err, res, body) => {
          expect(res.statusCode).to.equal(201)
          expect(body.status).to.eql('RUNNING')
          expect(body.currentStateName).to.eql('WakingUp')
          expect(body.ctx.petName).to.eql('Alan')
          alan = body.executionName
          done(err)
        }
      )
    })

    it('wait a while', (done) => {
      setTimeout(done, 250)
    })

    it('update Alan execution with a heartbeat', (done) => {
      request(
        {
          url: executionsUrl + alan,
          method: 'PUT',
          json: {
            action: 'SendTaskHeartbeat',
            output: {
              sound: 'Car engine'
            }
          },
          headers: sendToken(adminToken)
        },
        (err, res, body) => {
          expect(res.statusCode).to.equal(200)
          expect(body.status).to.equal('RUNNING')
          expect(body.currentStateName).to.equal('Listening')
          expect(body.ctx.sound).to.equal('Car engine')
          done(err)
        }
      )
    })

    it('wait a while longer', (done) => {
      setTimeout(done, 250)
    })

    it('sendTaskSuccess() to the Alan execution', (done) => {
      request(
        {
          url: executionsUrl + alan,
          method: 'PUT',
          json: {
            action: 'SendTaskSuccess',
            output: {
              order: [
                {
                  product: 'Fresh Tuna',
                  quantity: 25
                }
              ]
            }
          },
          headers: sendToken(adminToken)
        },
        (err, res, body) => {
          expect(res.statusCode).to.equal(200)
          done(err)
        }
      )
    })

    it('successfully complete Alans\'s awakening', (done) => {
      statebox.waitUntilStoppedRunning(
        alan,
        (err, executionDescription) => {
          try {
            expect(err).to.eql(null)
            expect(executionDescription.status).to.eql('SUCCEEDED')
            expect(executionDescription.stateMachineName).to.eql('tymlyTest_listeningCat_1_0')
            expect(executionDescription.currentStateName).to.eql('Sleeping')
            expect(executionDescription.ctx.gender).to.eql('male')
            expect(executionDescription.ctx.petDiary).to.be.an('array')
            expect(executionDescription.ctx.petDiary[0]).to.equal('Look out, Alan is waking up!')
            expect(executionDescription.ctx.petDiary[1]).to.equal('Alan is listening for something... what will he hear?')
            expect(executionDescription.ctx.petDiary[2]).to.equal('Sweet dreams Alan! x')
            expect(executionDescription.ctx.order[0]).to.eql(
              {
                product: 'Fresh Tuna',
                quantity: 25
              }
            )
            done()
          } catch (err) {
            done(err)
          }
        }
      )
    })

    it('create another new Alan execution', (done) => {
      request(
        {
          url: executionsUrl,
          method: 'POST',
          json: {
            stateMachineName: 'tymlyTest_listeningCat_1_0',
            input: {
              petName: 'Alan',
              gender: 'male',
              petDiary: []
            }
          },
          headers: sendToken(adminToken)
        },
        (err, res, body) => {
          expect(res.statusCode).to.equal(201)
          expect(body.status).to.eql('RUNNING')
          expect(body.currentStateName).to.eql('WakingUp')
          expect(body.ctx.petName).to.eql('Alan')
          alan = body.executionName
          done(err)
        }
      )
    })

    it('cancel a new Alan tymly', (done) => {
      request(
        {
          url: executionsUrl + alan,
          method: 'DELETE',
          headers: sendToken(adminToken)
        },
        (err, res, body) => {
          expect(res.statusCode).to.equal(204)
          done(err)
        }
      )
    })

    it('get stopped Alan execution-description', (done) => {
      request(
        {
          url: executionsUrl + alan,
          method: 'GET',
          headers: sendToken(adminToken),
          json: true
        },
        (err, res, body) => {
          expect(res.statusCode).to.equal(200)
          expect(body.ctx.petName).to.equal('Alan')
          expect(body.status).to.equal('STOPPED')
          expect(body.errorCode).to.equal('STOPPED')
          expect(body.errorMessage).to.equal('Execution stopped externally')
          done(err)
        }
      )
    })

    it('start state machine to claim from an API (our localhost booted address [remit]) and expect the header to be taken through, and sensible data to be returned', (done) => {
      statebox.startExecution(
        {},
        GET_FROM_API_STATE_MACHINE,
        {
          sendResponse: 'COMPLETE',
          userId: 'Dave'
        },
        (err, executionDescription) => {
          expect(err).to.eql(null)
          expect(executionDescription.currentStateName).to.eql('GetDataFromRestApi')
          expect(executionDescription.stateMachineName).to.eql('tymlyTest_getFromApi_1_0')
          expect(executionDescription.ctx.stateMachinesUserCanStart)
          expect(executionDescription.ctx.forms)
          expect(executionDescription.status).to.eql('SUCCEEDED')
          done(err)
        }
      )
    })
  })

  describe('restart a failed execution', () => {
    let frankenstein
    it('start', (done) => {
      request(
        {
          url: executionsUrl,
          method: 'POST',
          json: {
            stateMachineName: 'tymlyTest_helloFailButLiveAgain',
            input: { },
            options: {
              instigatingClient: {
                appName: 'tymly-express-plugin',
                domain: 'express-spec.js'
              }
            }
          },
          headers: sendToken(adminToken)
        },
        (err, res, body) => {
          expect(res.statusCode).to.equal(201)
          expect(body.status).to.eql('RUNNING')
          expect(body.currentStateName).to.eql('Hello')
          expect(body.executionOptions).to.eql(
            {
              action: 'startExecution',
              instigatingClient: {
                appName: 'tymly-express-plugin',
                domain: 'express-spec.js'
              },
              stateMachineName: 'tymlyTest_helloFailButLiveAgain',
              userId: 'Dave'
            }
          )
          frankenstein = body.executionName
          done(err)
        }
      )
    })

    it('wait a while', (done) => {
      setTimeout(done, 250)
    })

    it('oh dear, it has failed', (done) => {
      request(
        {
          url: executionsUrl + frankenstein,
          method: 'GET',
          headers: sendToken(adminToken),
          json: true
        },
        (err, res, body) => {
          expect(res.statusCode).to.equal(200)
          expect(body.status).to.eql('FAILED')
          expect(body.stateMachineName).to.eql('tymlyTest_helloFailButLiveAgain')
          expect(body.currentStateName).to.eql('Stuttery')
          done(err)
        }
      )
    })

    it('bring back to life', (done) => {
      request(
        {
          url: executionsUrl + frankenstein,
          method: 'PUT',
          json: {
            action: 'SendTaskRevivification'
          },
          headers: sendToken(adminToken)
        },
        (err, res) => {
          expect(res.statusCode).to.equal(200)
          done(err)
        }
      )
    })

    it('wait a while', (done) => {
      setTimeout(done, 250)
    })

    it('yes, the machine has restarted', (done) => {
      request(
        {
          url: executionsUrl + frankenstein,
          method: 'GET',
          headers: sendToken(adminToken),
          json: true
        },
        (err, res, body) => {
          expect(res.statusCode).to.equal(200)
          expect(body.status).to.eql('SUCCEEDED')
          expect(body.stateMachineName).to.eql('tymlyTest_helloFailButLiveAgain')
          expect(body.currentStateName).to.eql('IT-LIVES')
          done(err)
        }
      )
    })
  })

  describe('clean up', () => {
    it('shutdown Tymly', async () => {
      await tymlyService.shutdown()
    })
  })
})
