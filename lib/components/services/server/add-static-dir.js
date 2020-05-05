'use strict'

const cpr = require('cpr')
const path = require('path')

const staticComponents = ['images']

async function addStaticDir (app, express, blueprintComponents, config, messages, tempDir) {
  const baseDir = rootDir(config, tempDir)
  messages.subHeading('Static root ' + JSON.stringify(baseDir))

  for (const staticComponent of staticComponents) {
    messages.info('Applying ' + staticComponent)

    if (Object.prototype.hasOwnProperty.call(blueprintComponents, staticComponent)) {
      const components = blueprintComponents[staticComponent]

      for (const component of Object.values(components)) {
        // From: component.filePath
        const toPath = path.join(baseDir, staticComponent, component.namespace, component.filename)
        messages.detail(component.namespace + '\\' + component.filename)
        await cprp(component.filePath, toPath)
      }
    }
  }

  app.use(express.static(baseDir))
} // addStaticDir

function cprp (from, to) {
  return new Promise((resolve, reject) => {
    const callback = err => {
      if (err) {
        return reject(err)
      }
      resolve()
    }

    cpr(from, to, { overwrite: true }, callback)
  })
} // cprp

function rootDir (config, tempDir) {
  if (Object.prototype.hasOwnProperty.call(config, 'staticRootDir')) {
    return config.staticRootDir
  }

  return path.join(tempDir, 'tymly', 'static')
} // rootDir

module.exports = addStaticDir
