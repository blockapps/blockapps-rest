import RestStatus from "http-status-codes";
import queryString from "query-string";
import ax from "../axios-wrapper";
import { RestError } from "./rest.util";

const blocUrl = "/bloc/v2.2";
const strato12Url = "/strato-api/eth/v1.2";
const strato23Url = "/strato/v2.3";
const cirrusUrl = "/cirrus/search";
const externalStorageUrl = "/apex-api/bloc/file";

const Endpoint = {
  ACCOUNT: `${strato12Url}/account`,
  USERS: `${blocUrl}/users`,
  USER: `${blocUrl}/users/:username`,
  FILL: `${blocUrl}/users/:username/:address/fill`,
  STATE: `${blocUrl}/contracts/:name/:address/state`,
  STATES: `${blocUrl}/contracts/states`,
  TXRESULTS: `${blocUrl}/transactions/results`,
  SEND: `${strato23Url}/transaction`,
  KEY: `${strato23Url}/key`,
  SEARCH: `${cirrusUrl}/:name`,
  CHAIN: `${blocUrl}/chain`,
  CHAINS: `${blocUrl}/chains`,
  COMPILE: `${blocUrl}/contracts/compile`,
  EXT_UPLOAD: `${externalStorageUrl}/upload`,
  EXT_ATTEST: `${externalStorageUrl}/attest`,
  EXT_VERIFY: `${externalStorageUrl}/verify`,
  EXT_DOWNLOAD: `${externalStorageUrl}/download`,
  EXT_LIST: `${externalStorageUrl}/list`,
};

function constructEndpoint(endpointTemplate, options = {}, params = {}) {
  // expand template
  const endpoint = Object.getOwnPropertyNames(params).reduce((acc, key) => {
    return acc.replace(`:${key}`, encodeURIComponent(params[key]));
  }, endpointTemplate);
  // concat query patameters
  const query =
    endpointTemplate === Endpoint.SEARCH
      ? constructQuerySearch(options)
      : constructQuery(options);
  return `${endpoint}${query}`;
}

function constructQuerySearch(options) {
  if (options === undefined) {
    return "";
  }

  const chainIds = options.chainIds;
  if (chainIds !== undefined && chainIds.length !== undefined && chainIds.length > 0) {
    if (chainIds.length == 1) {
      const queryObject = Object.assign(
        { chainId: `eq.${chainIds[0]}` },
        options.query
      );
      const query = `?${queryString.stringify(queryObject)}`;
      return query;
    } else {
      const joinedChainIds = chainIds.join();
      const queryObject = Object.assign(
        { chainId: `in.${joinedChainIds}` },
        options.query
      );
      const query = `?${queryString.stringify(queryObject)}`;
      return query;

    }
  } else {
    const query = `?${queryString.stringify(options.query)}`;
    return query;
  }
}

function constructQuery(options) {
  if (options === undefined) {
    return "";
  }
  const queryObject = Object.assign(
    { chainid: options.chainIds },
    !options.isAsync ? { resolve: true } : {},
    options.stateQuery,
    options.query
  );
  const query = `?${queryString.stringify(queryObject)}`;
  return query;
}

/**
 * This function constructes metadata that can be used to control the history and index flags
 * @method{constructMetadata}
 * @param{Object} options flags for history and indexing
 * @param{String} contractName
 * @returns{()} metadata
 */
function constructMetadata(options, contractName) {
  const metadata = {};
  if (options === {}) return metadata;

  // history flag (default: off)
  metadata.history = "";
  if (options.enableHistory) {
    metadata.history = contractName;
  }
  if (options.hasOwnProperty("history")) {
    if (Array.isArray(options.history)) {
      metadata.history =
        metadata.history.length === 0 ||
        options.history.indexOf(metadata.history) >= 0
          ? options.history.join(",")
          : `${metadata.history},${options.history.join(",")}`;
    } else if (typeof options.history === String) {
      metadata.history =
        metadata.history.length === 0 ||
        options.history.indexOf(metadata.history) >= 0
          ? options.history
          : `${metadata.history},${options.history}`;
    }
  }

  // index flag (default: on)
  if (options.hasOwnProperty("enableIndex") && !options.enableIndex) {
    metadata.noindex = contractName;
  }
  if (options.hasOwnProperty("noindex")) {
    const newContracts = options.noindex
      .filter(contract => contract !== contractName)
      .join();
    metadata.noindex = `${options.noindex},${newContracts}`;
  }
  // VM
  if (options.config.hasOwnProperty("VM")) {
    if (!["EVM", "SolidVM"].includes(options.config.VM)) {
      throw new RestError(
        RestStatus.BAD_REQUEST,
        `Illegal VM type ${options.VM}`,
        { options }
      );
    }
    metadata.VM = options.config.VM;
  }

  // TODO: construct the "nohistory" and "index" fields for metadata if needed
  // The current implementation only constructs "history" and "noindex"

  return metadata;
}

function setAuthHeaders(user, _options) {
  const options = Object.assign({}, _options);
  options.headers = Object.assign({}, _options.headers, {
    Authorization: `Bearer ${user.token}`
  });
  return options;
}

/*
  get the url for the node by node id#
 */
function getNodeUrl(options) {
  const nodeId = options.node || 0;
  const nodeObject = options.config.nodes[nodeId];
  return nodeObject.url;
}

async function post(url, endpoint, _body, options) {
  function createBody(_body, options) {
    // array
    if (Array.isArray(_body)) return _body;
    // object
    const body = Object.assign({}, _body);
    const configTxParams = options.config ? options.config.txParams : undefined;
    // in order of priority: 1:body, 2:options, 3:config, 4:default
    body.txParams = Object.assign(
      { gasLimit: 32100000000, gasPrice: 1 },
      configTxParams,
      options.txParams,
      _body.txParams
    );
    return body;
  }

  const body = createBody(_body, options);
  return ax.post(url, endpoint, body, options);
}

async function get(host, endpoint, options = {}) {
  return ax.get(host, endpoint, options);
}

async function postue(host, endpoint, data, options) {
  // TODO - @samrit do we need txParams here
  return ax.postue(host, endpoint, data, options);
}

export {
  constructEndpoint,
  constructMetadata,
  Endpoint,
  get,
  getNodeUrl,
  post,
  postue,
  setAuthHeaders
};
