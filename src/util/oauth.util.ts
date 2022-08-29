import * as jwt from "jsonwebtoken";
import * as simpleOauth from "simple-oauth2";
import { OAuthClient, AccessToken } from "simple-oauth2";
import * as unixTime from "unix-time";
import * as getPem from "rsa-pem-from-mod-exp";
import axios from "axios";
import "@babel/polyfill";
import { OAuthUser } from "../types";

interface OAuthConfig {
  appTokenCookieName:any,
  appTokenCookieMaxAge:any,
  clientId:any,
  clientSecret:any,
  logoutRedirectUri:any,
  openIdDiscoveryUrl:any,
  redirectUri:any,
  scope:any,
  serviceUsername?:any,
  servicePassword?:any,
  tokenField?:any,
  tokenLifetimeReserveSeconds?: number,
  }

/** Class representing the OAuth util. */

class OAuthUtil {
  appTokenCookieName : any;
  appTokenExpirationCookieName : any;
  appTokenCookieMaxAge : any;
  refreshTokenCookieName : any;
  clientId : any;
  clientSecret : any;
  redirectUri : any;
  openIdDiscoveryUrl : any;
  logoutRedirectUri : any;
  scope : any;
  openIdConfig : any;
  jwtAlgorithm : any;
  issuer : any;
  logOutUrl : any;
  keys : any[];
  tokenField : any;
  tokenLifetimeReserveSeconds: number;
  serviceUsername : any;
  servicePassword : any;
  tokenHost : any;
  oauth2 : OAuthClient<"client_id">;

  constructor(oauthConfig:OAuthConfig) {
    this.appTokenCookieName = oauthConfig.appTokenCookieName;
    this.appTokenExpirationCookieName =
      oauthConfig.appTokenCookieName + "_expiry";
    this.appTokenCookieMaxAge = oauthConfig.appTokenCookieMaxAge;
    this.refreshTokenCookieName = oauthConfig.appTokenCookieName + "_refresh";
    this.clientId = oauthConfig.clientId;
    this.clientSecret = oauthConfig.clientSecret;
    this.redirectUri = oauthConfig.redirectUri;
    this.openIdDiscoveryUrl = oauthConfig.openIdDiscoveryUrl;
    this.logoutRedirectUri = oauthConfig.logoutRedirectUri;
    this.scope = oauthConfig.scope || "email openid";
    this.openIdConfig;
    this.jwtAlgorithm;
    this.issuer;
    this.logOutUrl;
    this.keys = [];
    this.tokenField = oauthConfig.tokenField
      ? oauthConfig.tokenField
      : "access_token"; //could use id_token
    this.tokenLifetimeReserveSeconds = oauthConfig.tokenLifetimeReserveSeconds
      ? oauthConfig.tokenLifetimeReserveSeconds
      : 60;
    this.serviceUsername = oauthConfig.serviceUsername;
    this.servicePassword = oauthConfig.servicePassword;
    const url_split = this.openIdDiscoveryUrl.split("/");
    this.tokenHost = url_split[0] + "//" + url_split[2];
  }

  /**
   * This function calls openIdConfigUrl to get openIdConfig and it also fetches
   * any public keys that maybe used to sign tokens
   * @method{getOpenIdConfig}
   */
  async getOpenIdConfig() {
    try {
      const discoveryClient = axios.create({
        baseURL: this.openIdDiscoveryUrl,
        withCredentials: false
      });
      const response = await discoveryClient
            .get("/")
            .then((res: any) => res.data)
      this.openIdConfig = response;
      this.jwtAlgorithm = this.openIdConfig.id_token_signing_alg_values_supported;
      this.issuer = this.openIdConfig.issuer;
      this.logOutUrl = this.openIdConfig.end_session_endpoint;

      if (this.openIdConfig.jwks_uri) {
        const jwksClient = axios.create({
          baseURL: this.openIdConfig.jwks_uri,
          withCredentials: false
        });
        const keyResponse = await jwksClient
            .get("/")
            .then((res: any) => res.data)
        this.keys = keyResponse.keys;
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * This function creates a new instance of OauthUtil and populates the relevant fields
   * @method{init}
   * @param oauthConfig
   * @returns o an instance of the OAuthUtil
   */
  static async init(oauthConfig:OAuthConfig) {
    try {
      const o = new OAuthUtil(oauthConfig);
      await o.getOpenIdConfig();
      // get tokenHost

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

      o.oauth2 = simpleOauth.create(credentials);

      return o;
    } catch (error) {
      throw error;
    }
  }

  /**
   * This function gets the sign in url for oauth
   * @method{getSigninURL}
   * @param {String} state
   * @returns AuthorizationUri
   */
  getSigninURL(state?) {
    const authorizationUri = this.oauth2.authorizationCode.authorizeURL({
      redirect_uri: this.redirectUri,
      scope: this.scope,
      state: state || ""
    });

    return authorizationUri;
  }

  /**
   * This function gets the access token from the authorization code
   * @method{getAccessTokenByAuthCode}
   * @param {String} authCode
   * @returns AccessTokenResponse
   */
  async getAccessTokenByAuthCode(authCode) {
    const tokenConfig = {
      code: authCode,
      redirect_uri: this.redirectUri,
      scope: this.scope
    };

    const result = await this.oauth2.authorizationCode.getToken(tokenConfig);
    const accessTokenResponse = this.oauth2.accessToken.create(result);

    return accessTokenResponse;
  }

  /**
   * This function gets the access token using the client secret
   * @method{getAccessTokenByClientSecret}
   * @param {String} clientId
   * @param {String} clientSecret
   * @param {String} scope
   * @returns AccessTokenResponse
   */
  async getAccessTokenByClientSecret(
    clientId = undefined,
    clientSecret = undefined,
    scope = undefined
  ):Promise<AccessToken> {
    const tokenConfig = {
      scope: scope || this.scope
    };

    let accessTokenResponse:AccessToken;
    if (clientId && clientSecret) {
      const credentials = {
        client: {
          id: clientId,
          secret: clientSecret
        },
        auth: {
          tokenHost: this.tokenHost,
          tokenPath: this.openIdConfig.token_endpoint,
          authorizePath: this.openIdConfig.authorization_endpoint
        }
      };

      const altOAuth = simpleOauth.create(credentials);
      const altResult = await altOAuth.clientCredentials.getToken(tokenConfig);
      accessTokenResponse = await altOAuth.accessToken.create(altResult);
    } else {
      const result = await this.oauth2.clientCredentials.getToken(tokenConfig);
      accessTokenResponse = this.oauth2.accessToken.create(result);
    }
    return accessTokenResponse;
  }

  /**
   * This function gets the access token using a resource owner credential
   * @method{getAccessTokenByResourceOwnerCredential}
   * @param {String} username
   * @param {String} password
   * @param {String} scope
   * @returns AccessTokenResponse
   */
  async getAccessTokenByResourceOwnerCredential(username, password, scope?):Promise<AccessToken> {
    const tokenConfig = {
      username: username || this.serviceUsername,
      password: password || this.servicePassword,
      scope: scope || this.scope
    };

    const result = await this.oauth2.ownerPassword.getToken(tokenConfig);
    const accessTokenResponse = this.oauth2.accessToken.create(result);

    return accessTokenResponse;
  }

  /** Verify JWT signature - to verify the requests to middleware that are not forwarded to STRATO to be verified on it's side
   * @todo To be fixed to work with all OpenID providers JWKs verification mechanisms. Currently only supports Azure, does not work with Keycloak (RS256 key can't be verified against the JWK cert provided in discovery)
   * @method{isTokenValid}
   * @param {String} accessToken
   * @returns {Boolean}
   */
  isTokenValid(accessToken) {
    const decoded = jwt.decode(accessToken, { complete: true });
    // FIX ME: Very azure specific
    switch (decoded.header.alg) {
      case "RS256":
        const key = this.keys.find(
          k => k.kid == decoded.header.kid && k.x5t == decoded.header.x5t
        );
        try {
          let pemKey = "";
          // azure
          if (key.x5c) {
            pemKey = `-----BEGIN CERTIFICATE-----\n${key.x5c[0]}\n-----END CERTIFICATE-----`;
          }
          // keycloak
          if (key.n && key.e) {
            pemKey = getPem(key.n, key.e);
          }
          const verified = jwt.verify(accessToken, pemKey, {
            ignoreExpiration: false
          });
          return true;
        } catch (e) {
          console.log(e);
          return false;
        }
      case "HS256":
        try {
          const verified = jwt.verify(accessToken, this.clientSecret, {
            ignoreExpiration: false
          });
          return true;
        } catch (e) {
          return false;
        }
      default:
        return false;
    }
  }

  /**
   * This functions validates token expiry with token lifetime reserve, without validating signature
   * @method{isTokenExpired}
   * @param {String} accessToken
   * @param {Number} cookieExpiry
   * @returns {Boolean}
   */
  isTokenExpired(accessToken, cookieExpiry) {
    let expiryTimestamp
    if (!cookieExpiry) {
      const decodedToken = jwt.decode(accessToken);
      expiryTimestamp = decodedToken["exp"];
    } else {
      expiryTimestamp = cookieExpiry
    }
    return expiryTimestamp <= (unixTime(new Date()) + this.tokenLifetimeReserveSeconds);
  }

  /**
   * Refresh an access token, given a token object
   * @method{refreshToken}
   * @param tokenObject
   * @returns Token response with updated token
   */
  async refreshToken(tokenObject) {
    const token = this.oauth2.accessToken.create(tokenObject);
    const tokenResponse = await token.refresh();
    return tokenResponse;
  }

  /**
   * Validate the express.js API request against the tokens validity, refresh access token seamlessly for user if needed
   * @method{validateAndGetNewToken}
   * @param req
   * @param res
   * @returns {Promise<*>}
   */
  async validateAndGetNewToken(req, res) {
    try {
      const accessToken = req["cookies"][this.appTokenCookieName]
        ? req["cookies"][this.appTokenCookieName]
        : null;
      if (!accessToken) throw new Error("Access Token not found");

      const refreshToken = req["cookies"][this.refreshTokenCookieName]
        ? req["cookies"][this.refreshTokenCookieName]
        : null;
      const expiryCookie = req["cookies"][this.appTokenExpirationCookieName]
        ? req["cookies"][this.appTokenExpirationCookieName]
        : null;

      const expired = this.isTokenExpired(accessToken, expiryCookie);

      if (!expired) {
        return;
      }

      if (!refreshToken) {
        res.clearCookie(this.appTokenCookieName);
        res.clearCookie(this.appTokenExpirationCookieName);
        throw new Error("Refresh Token not found");
      }

      const tokenObject = {
        access_token: accessToken,
        refresh_token: refreshToken
      };

      const tokenResponse = await this.refreshToken(tokenObject);
      // signature validation is done on STRATO node side by nginx
      const decoded = jwt.decode(tokenResponse.token[this.tokenField]);

      req["cookies"][this.appTokenCookieName] =
        tokenResponse.token[this.tokenField];
      req["cookies"][this.appTokenExpirationCookieName] = decoded["exp"];
      req["cookies"][this.refreshTokenCookieName] =
        tokenResponse.token["refresh_token"];
      res.cookie(
        this.appTokenCookieName,
        tokenResponse.token[this.tokenField],
        {
          maxAge: this.appTokenCookieMaxAge,
          httpOnly: true
        }
      );
      res.cookie(this.appTokenExpirationCookieName, decoded["exp"], {
        maxAge: this.appTokenCookieMaxAge,
        httpOnly: true
      });
      res.cookie(
        this.refreshTokenCookieName,
        tokenResponse.token["refresh_token"],
        {
          maxAge: this.appTokenCookieMaxAge,
          httpOnly: true
        }
      );

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
   * @method{getCookieNameAccessToken}
   * @returns(String) access token cookie name
   */
  getCookieNameAccessToken() {
    return this.appTokenCookieName;
  }

  /**
   * Get the name of the cookie storing access token expire date
   * @method{getCookieNameAccessTokenExpiry}
   * @returns(String) access token expire date cookie name
   */
  getCookieNameAccessTokenExpiry() {
    return this.appTokenExpirationCookieName;
  }

  /**
   * Get the name of the cookie storing refresh token
   * @method{getCookieNameRefreshToken}
   * @returns(String) refresh token cookie name
   */
  getCookieNameRefreshToken() {
    return this.refreshTokenCookieName;
  }
}

export default OAuthUtil;

export { OAuthConfig, AccessToken };