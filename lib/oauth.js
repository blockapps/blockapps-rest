module.exports = function(oauthConfig) {

	if (oauthConfig === undefined) {
		return {};
	}

	const stratoUrl = oauthConfig.stratoUrl;
	const clientId = oauthConfig.clientId;
	const clientSecret = oauthConfig.clientSecret;
	const paths = oauthConfig.paths;
	const redirectUri = oauthConfig.redirectUri;

	const credentials = {
	  client: {
	    id: clientId,
	    secret: clientSecret
	  },
	  auth: {
	    // TODO: call /v2.0/.well-known/openid-configuration discovery endpoint to get all oauth paths automatically to fill this object;
	    tokenHost: paths.tokenHost,
	    tokenPath: paths.tokenPath,
	    authorizePath: paths.authorizePath
	  }
	};

	const oauth2 = require('simple-oauth2').create(credentials);

	return {

		oauthGetSigninURL: function() {
			const authorizationUri = oauth2.authorizationCode.authorizeURL({
		      redirect_uri: redirectUri,
		      scope: 'email openid',
		      state: '',
		      resource: stratoUrl,
		    });

		    return authorizationUri;
		},

		oauthGetAccessTokenByAuthCode: async function(authCode) {
			const tokenConfig = {
			    code: authCode,
			    redirect_uri: redirectUri,
			    scope: 'email openid',
			    resource: stratoUrl
			};

			const result = await oauth2.authorizationCode.getToken(tokenConfig);
			const accessTokenResponse = oauth2.accessToken.create(result);

			return accessTokenResponse;
		},

		oauthRefreshToken: async function(token) {
			let accessToken = oauth2.accessToken.create(tokenObject);

			if (accessToken.expired()) {
			  try {
			    accessToken = await accessToken.refresh();
			  } catch (error) {
			    console.log('Error refreshing access token: ', error.message);
			  }
			}
		}

	};
};

