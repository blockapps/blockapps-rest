const bacommon = require('../lib/common');
const express = require('express');
const https = require('https');
const tcpPortUsed = require('tcp-port-used');
const url = require('url');

const app = express();
const OAuth = bacommon.oauth;
const oauthConfig = bacommon.config.oauth;
const port = process.env.PORT || '443';


// TODO: Make the way to set real ssl cert/key (read from directory provided in env var)
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

if (!oauthConfig) {
  console.error(`ERROR: Could not load oauth configuration section from ${process.cwd()}/config.yaml. Please check your configuration.`);
  process.exit(1)
}

let oauth = null;
(async() => {
  oauth = await OAuth.init(oauthConfig);
  if (!oauth) {
    console.error(`ERROR: Could not initialize the OAuth. Please check if the 'openIdDiscoveryUrl' is valid in ${process.cwd()}/config.yaml 'oauth' section`);
    process.exit(2)
  }
  if (await tcpPortUsed.check(+port)) {
    console.error(`ERROR: Port ${port} is in use.`);
    process.exit(3)
  }
  if (port+'' === '443') {
    https.createServer({
      key: DUMMY_SSL_KEY,
      cert: DUMMY_SSL_CERT
    }, app)
        .listen(port, function () {
          console.log(`App listening on port ${port}.`)
        });
  } else {
    app.listen(port, function () {
      console.log(`App listening on port ${port}.`)
    });
  }

})();

app.get('/', function (req, res) {
  res.redirect(oauth.oauthGetSigninURL())
});

const callbackPath = url.parse(oauthConfig.redirectUri).path;
app.get(callbackPath, async function (req, res) {
  const accessTokenResponse = await oauth.oauthGetAccessTokenByAuthCode(req.query['code']);
  res.send(`Copy your ACCESS_CODE: <br/><br/>${accessTokenResponse.token['access_token']}<br/><br/>\Code expires in: ~${Math.floor(accessTokenResponse.token['expires_in']/60)} min`)
});

