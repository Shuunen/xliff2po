console.log('starting...')

const fs = require('fs')

const parser = require('xml-mapping')

const pkg = require('./package.json')

const inputFile = process.argv.slice(2)[0]

const encoding = 'utf8'

const read = path => new Promise((resolve, reject) => {
  console.log('reading : ', path)
  fs.readFile(path, encoding, (err, content) => {
    if (err) reject(err)
    else resolve(content)
  })
})

const write = (path, content) => new Promise((resolve, reject) => {
  console.log('writing :', path)
  fs.writeFile(path, content, encoding, (err) => {
    if (err) reject(err)
    else resolve('success')
  })
})

const fill = (template, data) => {
  let content = template
  console.log('using data :', JSON.stringify(data, null, 4))
  Object.keys(data).forEach(key => {
    content = content.replace(key, data[key])
  })
  return content
}

read(inputFile)
  .then(xml => parser.load(xml))
  .then(obj => {
    const input = obj.xliff.file
    const pretty = JSON.stringify(input, null, 4)
    write('sample.json', pretty)
    return read('template.po').then(template => {
      const data = {
        PROJECT_NAME: inputFile.split('.')[0],
        GENERATOR_NAME: pkg.name,
        GENERATOR_VERSION: pkg.version,
        LANGUAGE_CODE: input['source-language']
      }
      return write('sample.fr.po', fill(template, data))
    })
  })
  .then(status => console.log('finnished with status :', status))
