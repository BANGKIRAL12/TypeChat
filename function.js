// const chalk = require('chalk')


const time = new Date()
const stringDate = time.toLocaleDateString() + ' ' + time.toLocaleTimeString()

const error = (message) => {
  const chalk = import('chalk');
  const code = `[${stringDate}][CAHYA] [ERROR] typechat - ${message}`

  return code
}
const info = (message) => {
  const chalk = import('chalk');
  const code = `[${stringDate}][CAHYA] [INFO] typechat - ${message}`

  return code
}
const warning = (message) => {
  const chalk = import('chalk');
  const code = `[${stringDate}][CAHYA] [WARNING] typechat - ${message}`

  return code
}

error('hy')

module.exports = {
  error,
  info,
  warning
}
