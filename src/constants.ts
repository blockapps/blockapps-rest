import BigNumber from "bignumber.js";
export const ETHER = new BigNumber(Math.pow(10, 18));
export const FINNEY = new BigNumber(Math.pow(10, 15));
export const SZABO = new BigNumber(Math.pow(10, 12));
export const GWEI = new BigNumber(Math.pow(10, 9));
export const MWEI = new BigNumber(Math.pow(10, 6));
export const KWEI = new BigNumber(Math.pow(10, 3));

export function formatWei(wei) {
  var b = new BigNumber(wei);
  const sign = b.lt(0) ? -1 : 1;
  b = b.multipliedBy(sign);

  if (b.gte(ETHER)) {
    return (
      b
        .multipliedBy(sign)
        .dividedBy(ETHER)
        .toNumber() + " Ether"
    );
  }
  if (b.gte(FINNEY)) {
    return (
      b
        .multipliedBy(sign)
        .dividedBy(FINNEY)
        .toNumber() + " Finney"
    );
  }
  if (b.gte(SZABO)) {
    return (
      b
        .multipliedBy(sign)
        .dividedBy(SZABO)
        .toNumber() + " Szabo"
    );
  }
  if (b.gte(GWEI)) {
    return (
      b
        .multipliedBy(sign)
        .dividedBy(GWEI)
        .toNumber() + " GWei"
    );
  }
  if (b.gte(MWEI)) {
    return (
      b
        .multipliedBy(sign)
        .dividedBy(MWEI)
        .toNumber() + " Wei"
    );
  }
  if (b.gte(KWEI)) {
    return (
      b
        .multipliedBy(sign)
        .dividedBy(KWEI)
        .toNumber() + " Kwei"
    );
  }
  return b.toNumber() + " Wei";
}
exports.formatWei = formatWei;

export const FAUCET_REWARD = new BigNumber(1000).multipliedBy(ETHER);

export const TxPayloadType = {
  FUNCTION: "FUNCTION",
  CONTRACT: "CONTRACT",
  TRANSFER: "TRANSFER"
};

export enum TxResultStatus {
  PENDING = "Pending",
  SUCCESS = "Success",
  FAILURE = "Failure"
};
