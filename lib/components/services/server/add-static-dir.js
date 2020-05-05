'use strict'

const cpr = require('cpr')

const staticComponents = ['images']

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
}

async function addStaticDir (app, express, blueprintComponents, config, messages, tempDir, callback) {
  const path = require('path')
  let baseDir

  if (Object.prototype.hasOwnProperty.call(config, 'staticRootDir')) {
    baseDir = config.staticRootDir
  } else {
    baseDir = path.join(tempDir, 'tymly', 'static')
  }

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
  callback(null)
}

module.exports = addStaticDir
