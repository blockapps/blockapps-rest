const jwt = require('jwt-simple');
const moment = require('moment');

module.exports = function(oauthConfig) {

	if (oauthConfig === undefined) {
		return {};
	}

	const appTokenCookieName = oauthConfig.appTokenCookieName;
	const stratoUrl = oauthConfig.stratoUrl;
	const clientId = oauthConfig.clientId;
	const clientSecret = oauthConfig.clientSecret;
	const paths = oauthConfig.paths;
	const redirectUri = oauthConfig.redirectUri;
	const jwtAlgorithm = oauthConfig.jwtAlgorithm;

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

	/**
	 * Check if token is valid and not expired
	 * @param token
	 * @returns {boolean}
	 */
	function isTokenValid(token) {
		return (token)
		// validate audience claim
		&& (token.aud == stratoUrl)
		// validate issuer claim
		&& (token.iss == 'https://sts.windows.net/' + token.tid + '/')
	}

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
		},

		/**
		 * Request guard controller, validate if JWT is valid
		 * @param req
		 * @param res
		 * @param next
		 * @returns next()
		 */
		validateRequest: function(req, res, next) {
			const token = req['cookies'][appTokenCookieName];

			if (!token) {
				return unauthorized();
			}

			let decodedToken;
			try {
				decodedToken = jwt.decode(token, clientSecret, true, jwtAlgorithm);
			}
			catch(err) {
				console.warn('error with decoding token', error.message);
				return unauthorized();
			}

			if (!isTokenValid(decodedToken)) {
				unauthorized();
			}

			req.access_token = req.cookies[appTokenCookieName];

			return next();

			function unauthorized() {
				let err = new Error('unauthorized');
				err.status = 401;
				return next(err);
			}
		}
	};
};

