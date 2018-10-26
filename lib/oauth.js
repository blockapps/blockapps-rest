const jwt = require('jwt-simple');
const ax = require('./axios-wrapper');
const simpleOauth = require('simple-oauth2');
const unixTime = require('unix-time');


module.exports = class OAuthInstance {
	constructor(oauthConfig) {
		this.appTokenCookieName = oauthConfig.appTokenCookieName;
		this.appTokenExpirationCookieName = oauthConfig.appTokenCookieName + '_expiry';
		this.refreshTokenCookieName = oauthConfig.appTokenCookieName + '_refresh';
		this.stratoUrl = oauthConfig.stratoUrl;
		this.clientId = oauthConfig.clientId;
		this.clientSecret = oauthConfig.clientSecret;
		this.redirectUri = oauthConfig.redirectUri;
		this.openIdDiscoveryUrl = oauthConfig.openIdDiscoveryUrl;
		this.logoutRedirectUri = oauthConfig.logoutRedirectUri;
		this.openIdConfig;
		this.jwtAlgorithm;
		this.issuer;
		this.logOutUrl;
	}

	/**
	 * This function calls openIdConfigUrl to get openIdConfig
	 * @returns {()}
	 */
	async getOpenIdConfig() {
		try {
			this.openIdConfig = await ax.get(this.openIdDiscoveryUrl, '');
			this.jwtAlgorithm = this.openIdConfig.id_token_signing_alg_values_supported;
			this.issuer = this.openIdConfig.issuer;
			this.logOutUrl = this.openIdConfig.end_session_endpoint;
		}
		catch(error) {
			console.warn("Error with getting openIdConfig", error.message);
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

			// get tokenHost
			const url_split = o.openIdDiscoveryUrl.split('/');
			const tokenHost = url_split[0] + '//' + url_split[2];

			const credentials = {
			  client: {
			    id: o.clientId,
			    secret: o.clientSecret
			  },
			  auth: {
			    tokenHost: tokenHost,
			    tokenPath: o.openIdConfig.token_endpoint,
			    authorizePath: o.openIdConfig.authorization_endpoint
			  }
			};

			o.oauth2 = simpleOauth.create(credentials);

			return o;
		}
		catch(error) {
			console.warn("Error with init", error.message);
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
		&& (token.iss === this.issuer)
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

	async validateAndGetNewToken(req, res, next) {
		const accessToken = req['cookies'][this.appTokenCookieName];
		const accessTokenExpiry = req['cookies'][this.appTokenExpirationCookieName];
      	const refreshToken = req['cookies'][this.refreshTokenCookieName];

      	// If access token is about to expire in 300 seconds, we get new access token
      	const nearExpiration = (accessTokenExpiry - unixTime(new Date())) <= 300;

      	if (nearExpiration) {
          const tokenObject = {
            'access_token': accessToken,
            'refresh_token': refreshToken
          };

          let tokens = this.oauth2.accessToken.create(tokenObject);

          try {
            const tokensResponse = await tokens.refresh();
            const decoded = jwt.decode(tokensResponse.token['access_token'], this.clientSecret, true, this.jwtAlgorithm);

            req['cookies'][this.appTokenCookieName] = tokensResponse.token['access_token'];
            req['cookies'][this.appTokenExpirationCookieName] = decoded['exp'];
            req['cookies'][this.refreshTokenCookieName] = tokensResponse.token['refresh_token'];

            res.cookie(this.appTokenCookieName, tokensResponse.token['access_token'], {maxAge: 90*24*60*60*1000, httpOnly: true});
            res.cookie(this.appTokenExpirationCookieName, decoded['exp'], {maxAge: 90*24*60*60*1000, httpOnly: true});
            res.cookie(this.refreshTokenCookieName, tokensResponse.token['refresh_token'], {maxAge: 90*24*60*60*1000, httpOnly: true});

		  } catch (error) {
            console.warn('error getting new token', error.message);
            let err = new Error('unauthorized');
            err.status = 401;
            return next(err);
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

	/**
	 * This function constructs a logout url for oauth
	 * @method{getLogOutUrl}
	 * @returns(String) logout url
	 */
	getLogOutUrl() {
		const _logOutUrl = this.logOutUrl;
		const _clientId = this.clientId;
		const _logoutRedirectUri = this.logoutRedirectUri;
		const uri = _logOutUrl + '?client_id=' + _clientId + '&post_logout_redirect_uri=' + _logoutRedirectUri;
		return uri;
	}

  	getCookieNameAccessToken() {
		return this.appTokenCookieName;
	}

  	getCookieNameAccessTokenExpiry() {
      return this.appTokenExpirationCookieName;
	}

  	getCookieNameRefreshToken() {
      return this.refreshTokenCookieName;
	}
};

