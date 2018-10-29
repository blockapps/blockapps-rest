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
	* Validate the express.js API request against the tokens validity, refresh access token seamlessly for user if needed
	* @param req
	* @param res
	* @returns {Promise<*>}
	*/
	async validateAndGetNewToken(req, res) {
		try {
        const accessToken = req['cookies'][this.appTokenCookieName]? req['cookies'][this.appTokenCookieName] : null;
        if (!accessToken) throw 'Access Token not found';

        const refreshToken = req['cookies'][this.refreshTokenCookieName]? req['cookies'][this.refreshTokenCookieName] : null;
        const accessTokenExpiry = req['cookies'][this.appTokenExpirationCookieName]? req['cookies'][this.appTokenExpirationCookieName] : null;

        let nearExpiration;

        if (!accessTokenExpiry) {
          const decodedToken = jwt.decode(accessToken, this.clientSecret, true, this.jwtAlgorithm);
          const expiry = decodedToken['exp'];
          nearExpiration = (expiry - unixTime(new Date())) <= 0;	// This checks if access token is completely expired
          if (nearExpiration && !refreshToken) {
            res.clearCookie(this.appTokenCookieName);
            throw 'Refresh Token not found 1';
          }
        } else {
          nearExpiration = (accessTokenExpiry - unixTime(new Date())) <= 300;	// If access token is about to expire in 300 seconds, get new access token in advance
		}

        if (nearExpiration && !refreshToken) {
          res.clearCookie(this.appTokenCookieName);
          res.clearCookie(this.appTokenExpirationCookieName);
          throw 'Refresh Token not found 2';
        } else if (nearExpiration && refreshToken) {
          const tokenObject = {
            'access_token': accessToken,
            'refresh_token': refreshToken
          };

          let tokens = this.oauth2.accessToken.create(tokenObject);
          const tokensResponse = await tokens.refresh();
          const decoded = jwt.decode(tokensResponse.token['access_token'], this.clientSecret, true, this.jwtAlgorithm);

          req['cookies'][this.appTokenCookieName] = tokensResponse.token['access_token'];
          req['cookies'][this.appTokenExpirationCookieName] = decoded['exp'];
          req['cookies'][this.refreshTokenCookieName] = tokensResponse.token['refresh_token'];
          res.cookie(this.appTokenCookieName, tokensResponse.token['access_token'], {
            maxAge: 90 * 24 * 60 * 60 * 1000,
            httpOnly: true
          });
          res.cookie(this.appTokenExpirationCookieName, decoded['exp'], {
            maxAge: 90 * 24 * 60 * 60 * 1000,
            httpOnly: true
          });
          res.cookie(this.refreshTokenCookieName, tokensResponse.token['refresh_token'], {
            maxAge: 90 * 24 * 60 * 60 * 1000,
            httpOnly: true
          });
        }

        return;

      } catch (error) {
        // FIXME: decide error model here
        throw error;
      }
	}

  /**
	 * This function constructs a logout url for oauth
	 * @method{getLogOutUrl}
	 * @returns(String) logout url
	 */
	getLogOutUrl() {
		return `${this.logOutUrl}?client_id=${this.clientId}&post_logout_redirect_uri=${this.logoutRedirectUri}`;
	}

  /**
	 * Get the name of the cookie storing access token
   * @returns(String) access token cookie name
   */
	getCookieNameAccessToken() {
		return this.appTokenCookieName;
	}

  /**
   * Get the name of the cookie storing access token expire date
   * @returns(String) access token expire date cookie name
   */
	getCookieNameAccessTokenExpiry() {
      return this.appTokenExpirationCookieName;
	}

  /**
   * Get the name of the cookie storing refresh token
   * @returns(String) refresh token cookie name
   */
	getCookieNameRefreshToken() {
      return this.refreshTokenCookieName;
	}
};

