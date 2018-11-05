# OAuth Access token getter tool

## Description
This tool is for admins who deploy the dapp with oauth user management enabled.
To run deploy script (to prepopulate the blockchain with data required to run application) we need to provide the OAuth access_token, 
issued by OAuth provider for the real URL with https.
The deploy script will upload all data on behalf of the authenticated admin user.

## Getting the access token
### Pre-conditions:
- Future production app can only run on https (Azure's restriction)
- Running on the same host machine where my future production app will be hosted
- Application's (backend app) modules are installed (`npm install`)
- blockapps-rest `config.yaml` is in the app's root dir (along with package.json) and has `oauth` section configured.

From the directory with config.yaml:
```
node node_modules/blockapps-rest/oauth-token-getter/index.js
```

1. Open your browser and navigate to your production server URL (e.g. https://example.com)
2. This tool uses dummy SSL cert so you'll get the Security warning - ignore it (by clicking Advanced -> Proceed to...)
3. Sign in on Azure server
4. You'll be redirected to the app page with access_token provided. Copy the token and use it as described in your application docs.
