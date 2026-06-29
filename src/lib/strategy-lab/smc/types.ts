export type SmcBias = "NONE" | "BUY" | "SELL";

export type SmcState =
  | "WAIT_SWEEP"
  | "WAIT_DISPL"
  | "WAIT_MSS"
  | "WAIT_FVG"
  | "IN_TRADE";

export type FvgCheck = "NOT_YET" | "ENTERED" | "INVALIDATED";

/** Input default — mirror TS_SMC_EA v1.50 mq5 */
export interface SmcInputs {
  h1SwingLen: number;
  pdZoneRatio: number;
  swingLenTrig: number;
  displFactor: number;
  sweepLookback: number;
  equalHlPips: number;
  fvgEntryBuffer: number;
  allowIfvg: boolean;
  fvgTimeout: number;
  fvgMustHold: boolean;
  rrRatio: number;
  slBufferPips: number;
  maxTrades: number;
  useSession: boolean;
  sessionStart: number;
  sessionEnd: number;
}

export const DEFAULT_SMC_INPUTS: SmcInputs = {
  h1SwingLen: 20,
  pdZoneRatio: 0.3,
  swingLenTrig: 10,
  displFactor: 1.8,
  sweepLookback: 30,
  equalHlPips: 5.0,
  fvgEntryBuffer: 2.0,
  allowIfvg: true,
  fvgTimeout: 30,
  fvgMustHold: true,
  rrRatio: 2.0,
  slBufferPips: 3.0,
  maxTrades: 1,
  useSession: true,
  sessionStart: 8,
  sessionEnd: 20,
};

export interface SmcTrigger {
  sweepDone: boolean;
  displDone: boolean;
  mssDone: boolean;
  bias: number;
  sweepLevel: number;
  displHigh: number;
  displLow: number;
  displBar: number;
  displTime: number;
  mssBreakLevel: number;
  trigTime: number;
}

export interface SmcEntryZone {
  top: number;
  bot: number;
  isIFVG: boolean;
  valid: boolean;
  foundTime: number;
  waitBars: number;
}

export function emptyTrigger(): SmcTrigger {
  return {
    sweepDone: false,
    displDone: false,
    mssDone: false,
    bias: 0,
    sweepLevel: 0,
    displHigh: 0,
    displLow: 0,
    displBar: 0,
    displTime: 0,
    mssBreakLevel: 0,
    trigTime: 0,
  };
}

export function emptyZone(): SmcEntryZone {
  return {
    top: 0,
    bot: 0,
    isIFVG: false,
    valid: false,
    foundTime: 0,
    waitBars: 0,
  };
}

export function zoneReady(z: SmcEntryZone): boolean {
  return z.valid && z.top > 0 && z.bot > 0 && z.top > z.bot;
}