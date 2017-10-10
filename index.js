#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const parser = require('xml-mapping')
const pkg = require('./package.json')

const encoding = 'utf8'
const inputFile = process.argv.slice(2)[0]
const createJson = false

const log = (...stuff) => console.log(pkg.name, stuff.join(''))

const read = filepath => new Promise((resolve, reject) => {
  log('reading : ', filepath)
  fs.readFile(filepath, encoding, (err, content) => {
    if (err) reject(err)
    else resolve(content)
  })
})

const write = (filepath, content) => new Promise((resolve, reject) => {
  log('writing : ', filepath)
  fs.writeFile(filepath, content, encoding, (err) => {
    if (err) reject(err)
    else resolve('success')
  })
})

const fill = (template, data) => {
  let content = template
  // log('using data :', JSON.stringify(data, null, 4))
  Object.keys(data).forEach(key => {
    content = content.replace(key, data[key])
  })
  return content
}

const convert = (filepath) => {
  log('starting...')
  read(filepath)
    .then(xml => parser.load(xml))
    .then(obj => {
      const input = obj.xliff.file
      const pretty = JSON.stringify(input, null, 4)
      if (createJson) {
        write('sample.json', pretty)
      }
      return read(path.join(__dirname, 'template.po')).then(template => {
        const name = inputFile.split('.')[0]
        const lang = input['source-language']
        const data = {
          PROJECT_NAME: name,
          GENERATOR_NAME: pkg.name,
          GENERATOR_VERSION: pkg.version,
          LANGUAGE_CODE: lang
        }
        let content = fill(template, data)
        const translations = input.body['trans-unit']
        translations.forEach(translation => {
          content += '#: ' + translation['context-group'].context[0].$t + '\n'
          content += 'msgid "' + translation.id + '"\n'
          content += 'msgstr "' + translation.source.$t + '"\n\n'
        })
        return write(name + '.' + lang + '.po', content)
      })
    })
    .then(status => log('finnished with status :', status))
}

// Init
if (!inputFile) {
  log('miss argument, please specify xlf translation input file like :\nxliff2po path/to/my/translation-file.xlf')
} else {
  convert(inputFile)
}
