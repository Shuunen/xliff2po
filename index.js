#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const parser = require('xml-mapping')
const pkg = require('./package.json')

const encoding = 'utf8'
const inputFile = process.argv.slice(2)[0]
const createJson = false
const replaces = {
  // '\\w': 'test',
  // '\n<x id="LINE_BREAK" ctype="lb"\/>': '<br>',
  '!!!': '!!'
}

// simple custom log
const log = (...stuff) => console.log(pkg.name, stuff.join(''))

// read a file from disk
const read = filepath => new Promise((resolve, reject) => {
  log('reading   : ', filepath)
  fs.readFile(filepath, encoding, (err, content) => {
    if (err) reject(err)
    else resolve(content)
  })
})

// write file to disk
const write = (filepath, content) => new Promise((resolve, reject) => {
  log('writing   : ', filepath)
  fs.writeFile(filepath, content, encoding, (err) => {
    if (err) reject(err)
    else resolve('success')
  })
})

// fill a string template with data inside object
const fill = (template, data) => {
  let content = template
  // log('using data :', JSON.stringify(data, null, 4))
  Object.keys(data).forEach(key => {
    content = content.replace(key, data[key])
  })
  return content
}

// read text node properly
const readTextNode = (input) => {
  let str = (input.join ? input.join('<br>') : input) + '' // if there is multiple translation lines, we get an array
  // log('reading text node : ' + str)
  Object.keys(replaces).forEach(key => {
    str = str.replace(new RegExp(key, 'gi'), replaces[key])
  })
  return str
}

// return a promise rejection
const error = (str) => new Promise.reject(str)

// convert .xlf file to .po file
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
        if (!translations.length) {
          return error('no translations found in xlf')
        }
        translations.forEach(translation => {
          content += '#: ' + translation['context-group'].context[0].$t + '\n'
          content += 'msgid "' + translation.id + '"\n'
          content += 'msgstr "' + readTextNode(translation.source.$t) + '"\n\n'
        })
        log('processed : ' + translations.length + ' translations')
        return write(name + '.' + lang + '.po', content)
      })
    })
    .then(status => {
      log('finnished')
      log('status : ', status)
    })
}

// init
if (!inputFile) {
  log('miss argument, please specify xlf translation input file like :\nxliff2po path/to/my/translation-file.xlf')
} else {
  convert(inputFile)
}
