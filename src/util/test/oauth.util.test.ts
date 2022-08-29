import * as dotenv from 'dotenv'
import oauthUtil from '../oauth.util'
import fsUtil from '../fsUtil'
import util from '../util'
import { assert } from 'chai'
import { Options } from '../../types';

const loadEnv = dotenv.config()
assert.isUndefined(loadEnv.error)

const config = fsUtil.getYaml(`${util.cwd}/lib/util/test/fixtures/config.yaml`)

const logger = console

describe('OAuth Util', function() {
  this.timeout(config.timeout)

  let oauthUtilInstance
  const options:Options = { config, logger }

  before(async () => {
    assert.isArray(config.nodes, 'config.nodes should be an array')
    assert.isAbove(config.nodes.length, 0, 'config.nodes should have atleast one node')
    assert.isDefined(config.nodes[0].oauth, 'Node oauth config should be defined')
    oauthUtilInstance = await oauthUtil.init(config.nodes[0].oauth)
    assert.isDefined(oauthUtilInstance, `oauthUtilInstance should be defined`)
  })

  it(`should be able to retrieve open id signin url`, () => {
    const signinUrl = oauthUtilInstance.getSigninURL()
    assert.isDefined(signinUrl, 'signinUrl should be defined')
    const urlParts = signinUrl.split('?')
    assert.isArray(urlParts)
    assert.equal(urlParts.length,2)
    assert.equal(
      urlParts[0], 
      oauthUtilInstance.openIdConfig.authorization_endpoint,
      'Sign in url should match the auth url in open id config'
    )
  })

  it(`should be able to retrieve logout url`, () => {
    const logoutUrl = oauthUtilInstance.getLogOutUrl()
    assert.isDefined(logoutUrl, 'signinUrl should be defined')
    const urlParts = logoutUrl.split('?')
    assert.isArray(urlParts)
    assert.equal(urlParts.length,2)
    assert.equal(
      urlParts[0], 
      oauthUtilInstance.openIdConfig.end_session_endpoint,
      'logout url should match the end session url in open id config'
    )
  })

  it('should be able to retrieve access token cookie name', () => {
    const cookieName = oauthUtilInstance.getCookieNameAccessToken()
    assert.equal(cookieName, config.nodes[0].oauth.appTokenCookieName)
  })

  
  it(`should be able to get valid access token using client credential grant`, async () => {
    const tokenResponse = await oauthUtilInstance.getAccessTokenByClientSecret()
    assert.isDefined(tokenResponse)
    assert.isDefined(tokenResponse.token)
    const token = tokenResponse.token
    assert.isDefined(token.access_token)
    assert.isDefined(token.id_token)
    assert.isDefined(token.refresh_token)
    assert.includeMembers(token.scope.split(' '), config.nodes[0].oauth.scope.split(' '))
    const isTokenExpired = oauthUtilInstance.isTokenExpired(token.access_token)
    assert.isNotOk(isTokenExpired)
    const isTokenValid = oauthUtilInstance.isTokenValid(token.access_token) 
    assert.isOk(isTokenValid) 
  })

})
