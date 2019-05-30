import commander from 'commander'
import fs from 'fs';
import fsUtil from './fsUtil'
import oauthUtil from './oauth.util'
import tcpPortUsed from 'tcp-port-used'
import http from 'http'
import open from 'open'
import qs from 'query-string'

commander
  .option(
    '-c, --config [path]', 
    'Config file', 
    'config.yaml')
  .option(
    '-p, --port [number]', 
    'Port on which to run web server for token exchange', 
    '8000')
  .option(
    '-f, --flow [oauth-flow]',
    'The oauth flow to user. Valid options are "client-credential" (default) or "authorization-code"', 
    'client-credential')
  .parse(process.argv)

if (!fs.existsSync(commander.config)) {
  console.error(`Could not open config file at location "${commander.config}". You may need to specify --config option`)
  process.exit(1)
}

const portNumber = Number.parseInt(commander.port, 10)

if (isNaN(portNumber)) {
  console.error('Could not parse port number or missing --port option')
  process.exit(2)
}

const config = fsUtil.getYaml(commander.config)

if (!config ||
  !Array.isArray(config.nodes) ||
  config.nodes.length === 0 ||
  config.nodes[0].oauth === undefined
) {
  console.error('Invalid config')
  process.exit(3)
}


const run = async function () {
  const portInUse = await tcpPortUsed.check(portNumber)
  if (portInUse) {
    console.error(`Port ${portNumber} is in use.`);
    process.exit(4)
  }

  const oauth = oauthUtil.init(config.nodes[0].oauth)

  switch(commander.flow) {
    case 'client-credential': 
      if(config.nodes[0].oauth.clientId === undefined
        || config.nodes[0].oauth.clientSecret === undefined
      ) {
        console.error('Client id and client secret must be defined in config to use client-credential flow')
        process.exit(5)
      }
      const ccToken = await oauth.getAccessTokenByClientSecret()
      console.log('Token obtained by client credential flow is:')
      console.log(JSON.stringify(ccToken,null,2))
      break;
    case 'authorization-code':
      // start server
      const server = http
        .createServer(async (req, res) => {
          if(req.url.indexOf('/callback?') !== 0) {
            res.writeHead(404, {})
            res.end()
            return
          }
          const urlParts = req.url.split('?')
          if(urlParts.length < 2) {
            console.error('Missing query string in callback url.')
            process.exit(6)
          }
          const query = qs.parse(urlParts[1])
          if(query.code === undefined) {
            console.error('Missing required query parameter "code" in callback')
            process.exit(7)
          }
          const acToken = await oauth.getAccessTokenByAuthCode(query.code);
          console.log('Token obtained by authorization code flow is:')
          console.log(JSON.stringify(acToken,null,2))
          res.writeHead(200,{ 'Content-Type': 'text/html; charset=utf-8'})
          res.write(`
            <html>
              <head>
                <title>
                  BlockApps Token Exchange Utility
                </title>
                <script src="https://code.jquery.com/jquery-3.3.1.slim.min.js" integrity="sha384-q8i/X+965DzO0rT7abK41JStQIAqVgRVzpbzo5smXKp4YfRvH+8abtTE1Pi6jizo" crossorigin="anonymous"></script>
                <script src="https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.14.7/umd/popper.min.js" integrity="sha384-UO2eT0CpHqdSJQ6hJty5KVphtPhzWj9WO1clHTMGa3JDZwrnQq4sF86dIHNDz0W1" crossorigin="anonymous"></script>
                <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/js/bootstrap.min.js" integrity="sha384-JjSmVgyd0p3pXB1rRibZUAYoIIy6OrQ6VrjIEaFf/nJGzIxFDsf4x0xIM+B07jRM" crossorigin="anonymous"></script>
                <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css" integrity="sha384-ggOyR0iXCbMQv3Xipma34MD+dH/1fQ784/j6cY/iJTQUOhcWr7x9JvoRxT2MZw1T" crossorigin="anonymous">
                <link rel="stylesheet" href="https://use.fontawesome.com/releases/v5.8.1/css/all.css" integrity="sha384-50oBUHEmvpQ+1lW4y57PTFmhCaXp0ML5d60M1M7uH2+nqUivzIebhndOJK28anvf" crossorigin="anonymous">
                <style>
                  pre {
                    white-space: pre-wrap;       /* Since CSS 2.1 */
                    white-space: -moz-pre-wrap;  /* Mozilla, since 1999 */
                    white-space: -pre-wrap;      /* Opera 4-6 */
                    white-space: -o-pre-wrap;    /* Opera 7 */
                    word-wrap: break-word;       /* Internet Explorer 5.5+ */
                    background-color: #e7e7e7;
                    padding-left: 24px;
                    padding-right: 24px;
                    border-radius: 4px;
                  }
                  body {
                    padding: 24px;
                  }
                  textarea {
                    border: none;
                    color: #fff;
                  }
                </style>
                <script>
                  function copyToClipboard(text) {
                    var textArea = document.createElement("textarea");
                    textArea.value = text;
                    document.body.appendChild(textArea);
                    textArea.focus();
                    textArea.select();
                    document.execCommand('copy')
                    document.body.removeChild(textArea);
                  }
                </script>
              </head>
              <body>
                <div class="container">
                  <div class="row">
                    <div class="offset-sm-1 col-sm-9">
                      <h4>
                        <small class="text-muted">Access Token</small>
                      </h4>
                    </div>
                    <div class="col-sm-1 text-right">
                      <button onclick="copyToClipboard('${acToken.token.access_token}');" title="Copy to clipboard" class="btn btn-outline-dark btn-sm">
                        <i class="fas fa-clipboard"></i>
                      </button>
                    </div>
                  </div>  
                  <div class="row">
                    <div class="offset-sm-1 col-sm-10">
                      <pre>
                        <code>
                          ${acToken.token.access_token}
                        </code>
                      </pre>
                    </div>
                  </div>
                  <div class="row">
                    <div class="offset-sm-1 col-sm-9">
                      <h4>
                        <small class="text-muted">ID Token</small>
                      </h4>
                    </div>
                    <div class="col-sm-1 text-right">
                      <button onclick="copyToClipboard('${acToken.token.id_token}');" title="Copy to clipboard" class="btn btn-outline-dark btn-sm">
                        <i class="fas fa-clipboard"></i>
                      </button>
                    </div>
                  </div>  
                  <div class="row">
                    <div class="offset-sm-1 col-sm-10">
                      <pre>
                        <code>
                          ${acToken.token.id_token}
                        </code>
                      </pre>
                    </div>
                  </div>
                </div>
              </body>
            </html>
          `)
          res.end()
        })
        .listen(portNumber)

      const signinUri = oauth.getSigninURL()

      console.log(`Open sign-in URL in your browser to sign-in with OAuth and fetch token: ${signinUri}`);
      
      // launch browser
      await open(signinUri)


      break;
  }
  


}

try {
  run()
} catch (ex) {
  console.error(ex.message)
  process.exit(99)
}