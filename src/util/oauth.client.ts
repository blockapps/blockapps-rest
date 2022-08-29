import * as commander from "commander";
import * as fs from "fs";
import fsUtil from "./fsUtil";
import oauthUtil from "./oauth.util";
import * as tcpPortUsed from "tcp-port-used";
import * as http from "http";
import * as https from "https";
import * as qs from "query-string";
import * as url from "url";
const { stringify } = require("flatted/cjs");
const envPath = ".env";
const envfile = require("envfile");
let envConfig = {};

const DUMMY_SSL_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDBVqh671M27QJW
ekIc/QkKnF9I3rM7/XXyvFlYAAscRRNs9TpxTGW8n/KnBMeKFdPwj19YLMk43tf4
vhMBfCWQP2dXa7TwhXYClmpKXAllWDdyKAfVmH3ccErDAyab/ZDdyhleR65eLqbB
vc5Gf/bIksS7YtV4dmP1wd0SOrmoKFS+t4gcR6+NVWsHaeqx3avS7VJedgNPVKjb
97sbHA/PTzTEOgZlHEtIIz+e1ESCPNMdr2DN04KC+3ivx24kk4IsXJHD+8m7IImx
T4q+mf9j6EZtbj9CA2BaSHLx+h8EOq4I2RIMSDYjU8R7Xk1QrVdkpS0t9TxPjWRy
iuu9LF9tAgMBAAECggEAWliFeJUXnMYaXpDZDjTMIdI60JGIzhK+KEUNtwqmJnq8
/iCGQ+WAcSmJObUJDaTvmi1VT532FgZEhC9GMF50KzkFsJtbPT4QjFr/pmnl1h7o
IgdEyfJtdjJfLUvuodxW8t17B0yV1dsU/9oTZ2xqxQWYuzwPJzCju3bxOJCKq2ID
71Xl32yQALwsCNyb74RvMSJgk28PGqjU+zhQp7Nw2xoy/Oz+i9nZkH1YPZipkX1S
0jtj2z5XVsW+MFgPnMuy8Ut3Rn/zAWSi/PpSh1e4qPLMlmc7a7OFpbEpCmceAlnj
zmqo+U5Ns9MF5gWdspKC9qD8ZqKES2jWCPCrrjXBHQKBgQD7AVj55xVej0mI2FOw
xehBwSd56Xm0potvsdHNe1Nb6DPU9OoriA/6Gp0sA+EA/8AKo+41uHEW7BZXtHGN
ZCphn4V8CqhMNtoACWdrfSwocJmoxzQt2/PDlyPSUTozxPnzwmOXP9bCatcUiNYq
lyb4EH9dNXsPDK02xPz+Ooj/AwKBgQDFL4yBEqT3pZz3qrBN7rsWHQckPAu9/2Vk
f4sImV8nsIvL0VoKdB7N3E6BycVWRDZhJKGYTKDvCWG5CNvIuFuwEawsIpuxVRlr
hjVQno5/u8PMecydQbleJE/Ud4VXuojw+aR4xIILgXGygUKywHpdNnCI7dhV0hNm
WMLlDUNkzwKBgG4mcT15w07z4nlDNbblor74XLKLWvWEALzLdB6QeExk4hoaQIlJ
9Hj1JPQj36HomgYRWoAIqNg+Uq+6Z/p8cnzU3GdK5gBMMe7CMbhh/fbhMw12Hdfi
Jl82/GlXbAs77dSjAcFmKoC3EhvY0ONv4ZIK61mkFpTMI1ddqwiF94ixAoGAflK8
33+TQbfOfHfUJMkY/8yu4464Mwsn6J8w8dxXsnSOyo8e8O19QoKtpMYfbumaMNen
0orc2uYWvdSoAMniq0RXGZs+RPfwpgq/oxtAzSH8CMXKyL/vQhlfLw021oIA8ufr
bxbs/PP7Y9EdaqiWe5rBs2c0HZ7MoNeiW90IXM8CgYEA5ZEjdlwDsDANNb4MocbI
pOkAY1bR1oTsNnEC3nNX+rMKOWT2NLBNSS1kS+6M68Ctky1XFOqgtRZZCG8PY7ou
gB1T/TRMjqnNJWOvycD4uIUwIdp0NmGboRqdGphbJinMmXfg8PcC/QM2fncG8SCK
iHm1aYKK8r/QobR/qJsWtuI=
-----END PRIVATE KEY-----`;

const DUMMY_SSL_CERT = `-----BEGIN CERTIFICATE-----
MIIDojCCAooCCQDFBdwwu1NhADANBgkqhkiG9w0BAQsFADCBkjELMAkGA1UEBhMC
VVMxETAPBgNVBAgMCE5ldyBZb3JrMREwDwYDVQQHDAhCcm9va2x5bjEXMBUGA1UE
CgwOQmxvY2tBcHBzIEluYy4xHjAcBgNVBAMMFXRlc3RuZXQuYmxvY2thcHBzLm5l
dDEkMCIGCSqGSIb3DQEJARYVc3VwcG9ydEBibG9ja2FwcHMubmV0MB4XDTE4MDIx
MzIwNTQxNVoXDTIxMDIxMjIwNTQxNVowgZIxCzAJBgNVBAYTAlVTMREwDwYDVQQI
DAhOZXcgWW9yazERMA8GA1UEBwwIQnJvb2tseW4xFzAVBgNVBAoMDkJsb2NrQXBw
cyBJbmMuMR4wHAYDVQQDDBV0ZXN0bmV0LmJsb2NrYXBwcy5uZXQxJDAiBgkqhkiG
9w0BCQEWFXN1cHBvcnRAYmxvY2thcHBzLm5ldDCCASIwDQYJKoZIhvcNAQEBBQAD
ggEPADCCAQoCggEBAMFWqHrvUzbtAlZ6Qhz9CQqcX0jeszv9dfK8WVgACxxFE2z1
OnFMZbyf8qcEx4oV0/CPX1gsyTje1/i+EwF8JZA/Z1drtPCFdgKWakpcCWVYN3Io
B9WYfdxwSsMDJpv9kN3KGV5Hrl4upsG9zkZ/9siSxLti1Xh2Y/XB3RI6uagoVL63
iBxHr41Vawdp6rHdq9LtUl52A09UqNv3uxscD89PNMQ6BmUcS0gjP57URII80x2v
YM3TgoL7eK/HbiSTgixckcP7ybsgibFPir6Z/2PoRm1uP0IDYFpIcvH6HwQ6rgjZ
EgxINiNTxHteTVCtV2SlLS31PE+NZHKK670sX20CAwEAATANBgkqhkiG9w0BAQsF
AAOCAQEATafWoYdQmUxiIsXitgHMV51f15KOWS6vsa+XfKPLFRFIbw8bYl/PdbJp
XoxywIf9rz7/+Hme6JXhIIao26ahXWG34J06CJ3kvnQcFzrUJ4AZLZrs3E0yzsNK
4zgdiPRK3TVCwzqnA6OkajLPuhisheAtoB2T5pR+SeC064cB3lhSgnFS31ePGmgv
b4qiXqr2JW4Db8yW0eKYrfwhf9WoElVlgO1ogqZS+ygeKYFfoNhQ5wQ+c43jDK5G
EDxFZuwghztIpmp2ItFOIxpsiZnEVlHNsq4H6YcZg4XENKhb9/lgIFiYADDbAEcq
pBMYLinJZN+jM/Xddr18fL0obdkk5Q==
-----END CERTIFICATE-----`;

if (!fs.existsSync(envPath)) {
  fs.appendFileSync(envPath, "");
}

envConfig = envfile.parseFileSync(envPath);

const flows = {
  authorizationCode: "authorization-code",
  clientCredential: "client-credential",
  resourceOwnerPasswordCredential: "resource-owner-password-credential"
};

commander
  .option("-c, --config [path]", "Config file", "config.yaml")
  .option(
    "-f, --flow [oauth-flow]",
    `The oauth flow to user. Valid options are "${flows.clientCredential}" (default) or "${flows.authorizationCode}" or "${flows.resourceOwnerPasswordCredential}"`,
    "client-credential"
  )
  .option(
    "-e, --env [tokenName]",
    "Create a .env file to include the specified token",
    null
  )
  .option(
    "-u, --username [username]",
    `Username or client-id depending on the flow (optional)`,
    null
  )
  .option(
    "-p, --password [password]",
    `Password or client-secret depending on the flow (optional)`,
    null
  )
  .parse(process.argv);

if (!fs.existsSync(commander.config)) {
  console.error(
    `Could not open config file at location "${commander.config}". You may need to specify --config option`
  );
  process.exit(1);
}

const config = fsUtil.getYaml(commander.config);

let redirectUriParsed;
try {
  redirectUriParsed = url.parse(config.nodes[0].oauth.redirectUri)
} catch(err) {
  console.error('Unable to parse redirectUri as the url', err);
  process.exit(10);
}

let portNumber;
if (redirectUriParsed.port) {
  portNumber = parseInt(redirectUriParsed.port)
} else {
  portNumber = (redirectUriParsed.protocol === 'https:') ? 443 : 80
}

if (
  !config ||
  !Array.isArray(config.nodes) ||
  config.nodes.length === 0 ||
  config.nodes[0].oauth === undefined
) {
  console.error("Invalid config");
  process.exit(3);
}

const run = async function() {
  const portInUse = await tcpPortUsed.check(portNumber);
  if (portInUse) {
    console.error(`Port ${portNumber} is in use.`);
    process.exit(4);
  }

  const oauth = await oauthUtil.init(config.nodes[0].oauth);

  const signinUri = oauth.getSigninURL();
  async function requestListener(req, res) {
    // TODO: better route matching
    
    if (req.url === '/') {
      res.writeHead(302, {
        'Location': signinUri
      });
      res.end();
      return
    }

    const callbackPath = redirectUriParsed.pathname;
    
    if (req.url.indexOf(callbackPath) !== 0 ) {
      if (req.url !== '/favicon.ico') {
        console.log('Unknown URI was called: ' + req.url);
      }
      res.writeHead(404);
      res.end();
      return
    }
    
    const urlParts = req.url.split("?");
    if (urlParts.length < 2) {
      console.error("Missing query string in redirectUri callback url.");
      return
    }
    const query = qs.parse(urlParts[1]);
    if (query.code === undefined) {
      console.error('Missing required query parameter "code" in redirectUri callback');
      return
    }
    const acToken = await oauth.getAccessTokenByAuthCode(query.code);

    if (commander.env) {
      envConfig[commander.env] = acToken.token.access_token;
      const envContent = envfile.stringifySync(envConfig);
      fs.writeFileSync(envPath, envContent);
      console.log(".env file was saved!");
    }
    console.log("Token obtained by authorization code flow is:");
    console.log(stringify(acToken, null, 2));
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.write(`
      <html>
        <head>
          <title>
            BlockApps Token Exchange Utility
          </title>
          <meta name="google" content="notranslate">
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
            .padButton {
              padding-bottom: 12px;
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
            function logout(){
              window.location='${oauth.logOutUrl}?redirect_uri=${config.nodes[0].oauth.logoutRedirectUri}/'
            }
          </script>
        </head>
        <body>
          <div class="container">
            <div class="row">
              <div class="offset-sm-10 col-sm-1 text-right padButton">
                  <button onclick="logout()" class="btn btn-outline-dark btn-sm"> Logout </button>
              </div>
            </div>
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
    `);
    res.end();
  }
  switch (commander.flow) {
    case flows.clientCredential:
      if (
        config.nodes[0].oauth.clientId === undefined ||
        config.nodes[0].oauth.clientSecret === undefined
      ) {
        console.error(
          `Client id and client secret must be defined in config to use ${flows.clientCredential} flow`
        );
        process.exit(5);
      }

      try {
        let ccToken;
        if (commander.username && commander.password) {
          ccToken = await oauth.getAccessTokenByClientSecret(
            commander.username,
            commander.password
          );
        } else {
          ccToken = await oauth.getAccessTokenByClientSecret();
        }
        if (commander.env) {
          envConfig[commander.env] = ccToken.token.access_token;
          const envContent = envfile.stringifySync(envConfig);
          fs.writeFileSync(envPath, envContent);
          console.log(".env file was saved!");
        }
        console.log(`Token obtained by ${commander.flow} flow is:`);
        console.log(stringify(ccToken, null, 2));
      } catch (err) {
        console.log(err);
        process.exit(8);
      }
      break;
    case flows.resourceOwnerPasswordCredential:
      if (
        config.nodes[0].oauth.clientId === undefined ||
        config.nodes[0].oauth.clientSecret === undefined
      ) {
        console.error(
          `Client id and client secret must be defined in config to use ${flows.resourceOwnerPasswordCredential} flow`
        );
        process.exit(6);
      }

      if (
        !(config.nodes[0].oauth.serviceUsername || commander.username) ||
        !(config.nodes[0].oauth.servicePassword || commander.password)
      ) {
        console.error(
          `Username and password must be defined in config or provided as an argument to use ${flows.resourceOwnerPasswordCredential} flow`
        );
        process.exit(7);
      }

      try {
        const ropcToken = await oauth.getAccessTokenByResourceOwnerCredential(
          commander.username,
          commander.password
        );
        if (commander.env) {
          envConfig[commander.env] = ropcToken.token;
          const envContent = envfile.stringifySync(envConfig);
          fs.writeFileSync(envPath, envContent);
          console.log(".env file was saved!");
        }
        console.log(`Token obtained by ${commander.flow} flow is:`);
        console.log(stringify(ropcToken, null, 2));
      } catch (err) {
        console.log(err);
        process.exit(9);
      }
      break;
    case flows.authorizationCode:
      // start server
      if (portNumber == 443) {
        const options = {
          key: DUMMY_SSL_KEY,
          cert: DUMMY_SSL_CERT
        };
        const server = https
          .createServer(options, requestListener)
          .listen(portNumber);
      } else {
        const server = http.createServer(requestListener).listen(portNumber);
      }
      const tokenGetterUrl = `${redirectUriParsed.protocol}//${redirectUriParsed.host}`
      console.log(
        `Open sign-in URL in your browser to sign-in with OAuth and fetch token: ${tokenGetterUrl}`
      );

      break;
  }
};

try {
  run();
} catch (ex) {
  console.error(ex.message);
  process.exit(99);
}
