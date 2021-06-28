const {stringify} = require('flatted/cjs');

class RestError extends Error {
  response : any;
  
  constructor(status, statusText, data) {
    super(`${status} ${statusText}: ${stringify(data)}`)
    this.name = 'RestError'
    this.response = { status, statusText, data }
  }
}

// TODO: remove application level wrappers
const response = {
  status(code, res, payload) {
    if (code < 300) {
      res.status(code).json({
        success: true,
        data: payload || {},
      });
    } else {
      res.status(code).json({
        success: false,
        //        error: JSON.stringify(payload),
        error: payload,
      });
    }
  },

  status200: function (res, data) {
    res.status(200).json({
      success: true,
      data: data || {},
    });
  },

  status201: function (res, data) {
    res.status(201).json({
      success: true,
      data: data || {},
    });
  },

  status400: function (res, error) {
    res.status(400).json({
      success: false,
      error: stringify(error),
    });
  },

  status500: function (res, error) {
    res.status(500).json({
      success: false,
      error: stringify(error),
    });
  },
}


export {
  RestError,
  response
}
