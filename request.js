const request = require('request')


async function exec (data) {
  return new Promise((resolve, reject) => {
    request(data, (error, response, body) => {
      if (error) return reject(error)
      return resolve({ body, response })
    })
  })
}

module.exports = {
  exec
}