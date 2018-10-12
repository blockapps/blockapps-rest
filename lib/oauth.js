const jwt = require('jwt-simple');
const ax = require('./axios-wrapper');

module.exports = class OAuthInstance {
	constructor(oauthConfig) {
		this.appTokenCookieName = oauthConfig.appTokenCookieName;
		this.stratoUrl = oauthConfig.stratoUrl;
		this.clientId = oauthConfig.clientId;
		this.clientSecret = oauthConfig.clientSecret;
		this.tokenHost = oauthConfig.tokenHost;
		this.redirectUri = oauthConfig.redirectUri;
		this.tid = oauthConfig.tid;
		this.openIdDiscoveryUrl = oauthConfig.openIdDiscoveryUrl;
		this.openIdConfig;
		this.jwtAlgorithm;
	}

	/**
	 * This function calls openIdConfigUrl to get openIdConfig
	 * @returns {()}
	 */
	async getOpenIdConfig() {
		try {
			this.openIdConfig = await ax.get(this.openIdDiscoveryUrl, '');
			this.jwtAlgorithm = this.openIdConfig.id_token_signing_alg_values_supported;
		}
		catch(error) {
			console.warn("something went wrong with getting openIdConfig", error.message);
		}
	}

	/**
	 * This function creates a new instance of OAuthInstance and populates the relevant fields
	 * @param oauthConfig 
	 * @returns o an instance of the OAuthInstance
	 */	
	static async init(oauthConfig) {
		try {
			const o = new OAuthInstance(oauthConfig);
			await o.getOpenIdConfig();

			const credentials = {
			  client: {
			    id: o.clientId,
			    secret: o.clientSecret
			  },
			  auth: {
			    tokenHost: o.tokenHost,
			    tokenPath: o.openIdConfig.token_endpoint,
			    authorizePath: o.openIdConfig.authorization_endpoint
			  }
			};
			
			o.oauth2 = require('simple-oauth2').create(credentials);

			return o;
		}
		catch(error) {
			console.warn("something went wrong with init", error.message);
		}
	}

	/**
	 * Check if token is valid and not expired
	 * @param token
	 * @returns {boolean}
	 */
	isTokenValid(token) {
		return (token)
		// validate audience claim
		&& (token.aud === this.stratoUrl)
		// validate issuer claim
		&& (token.iss === 'https://sts.windows.net/' + this.tid + '/')
	}

	/**
	 * This function gets the sign in url for oauth
	 * @method{oauthGetSigninURL}
	 * @returns AuthorizationUri
	 */
	oauthGetSigninURL() {
		const authorizationUri = this.oauth2.authorizationCode.authorizeURL({
	      redirect_uri: this.redirectUri,
	      scope: 'email openid',
	      state: '',
	      resource: this.stratoUrl,
	    });

	    return authorizationUri;
	}

	/**
	 * This function gets the access token from the authorization code
	 * @method{oauthGetAccessTokenByAuthCode}
	 * @param {String} authCode
	 * @returns AccessTokenResponse
	 */
	async oauthGetAccessTokenByAuthCode(authCode) {
		const tokenConfig = {
		    code: authCode,
		    redirect_uri: this.redirectUri,
		    scope: 'email openid',
		    resource: this.stratoUrl
		};

		const result = await this.oauth2.authorizationCode.getToken(tokenConfig);
		const accessTokenResponse = this.oauth2.accessToken.create(result);

		return accessTokenResponse;
	}

	/**
	 * This function refreshes an access token if it has expired
	 * @method{oauthRefreshToken}
	 * @param {String} token
	 * @param {String} refreshToken
	 * @param {String} expiresIn
	 * @returns({})
	 */
	async oauthRefreshToken(token, refreshToken, expiresIn) {
		const tokenObject = {
		  'access_token': token,
		  'refresh_token': refreshToken,
		  'expires_in': expiresIn
		};

		let accessToken = this.oauth2.accessToken.create(tokenObject);

		if (accessToken.expired()) {
		  try {
		    accessToken = await accessToken.refresh();
		  } catch (error) {
		    console.log('Error refreshing access token: ', error.message);
		  }
		}
	}

	/**
	 * Request guard controller, validate if JWT is valid
	 * @param req
	 * @param res
	 * @param next
	 * @returns next()
	 */
	validateRequest(req, res, next) {
		const token = req['cookies'][this.appTokenCookieName];

		if (!token) {
			return unauthorized();
		}

		let decodedToken;
		try {
			decodedToken = jwt.decode(token, this.clientSecret, true, this.jwtAlgorithm);
		}
		catch(err) {
			console.warn('error with decoding token', error.message);
			return unauthorized();
		}

		if (!this.isTokenValid(decodedToken)) {
			unauthorized();
		}

		req.access_token = req.cookies[this.appTokenCookieName];

		return next();

		function unauthorized() {
			let err = new Error('unauthorized');
			err.status = 401;
			return next(err);
		}
	}
};

