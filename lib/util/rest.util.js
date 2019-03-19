
class RestError extends Error {
  constructor(status, statusText, data) {
    super(`${status} ${statusText}: ${JSON.stringify(data)}`)
    this.name = 'RestError'
    this.response = { status, statusText, data }
  }
}

export {
  RestError,
}