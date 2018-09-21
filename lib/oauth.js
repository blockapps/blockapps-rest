module.exports = function(config) {

	const STRATO_URL = config['STRATO_URL'];
	const CLIENT_ID = config['CLIENT_ID'];
	const CLIENT_SECRET = config['CLIENT_SECRET'];
	const OAUTH_PATHS = config['OAUTH_PATHS'];
	const OAUTH_REDIRECT_URI = config['OAUTH_REDIRECT_URI'];

	const credentials = {
	  client: {
	    id: CLIENT_ID,
	    secret: CLIENT_SECRET
	  },
	  auth: {
	    // TODO: call /v2.0/.well-known/openid-configuration discovery endpoint to get all oauth paths automatically to fill this object;
	    tokenHost: OAUTH_PATHS['TOKEN_HOST'],
	    tokenPath: OAUTH_PATHS['TOKEN_PATH'],
	    authorizePath: OAUTH_PATHS['AUTHORIZE_PATH']
	  }
	};

	const oauth2 = require('simple-oauth2').create(credentials);

	return {

		oauthGetSigninURL: async function() {
			const authorizationUri = oauth2.authorizationCode.authorizeURL({
		      redirect_uri: OAUTH_REDIRECT_URI,
		      scope: 'email openid',
		      state: '',
		      resource: STRATO_URL,
		    });

		    return authorizationUri;
		},

		oauthGetAccessTokenByAuthCode: async function(authCode) {
			const tokenConfig = {
			    code: authCode,
			    redirect_uri: OAUTH_REDIRECT_URI,
			    scope: 'email openid',
			    resource: STRATO_URL
			};

			const result = await oauth2.authorizationCode.getToken(tokenConfig);
    		const accessTokenResponse = oauth2.accessToken.create(result);

			return accessTokenResponse;
		}

	};
};

