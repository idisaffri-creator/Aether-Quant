export const AETHER_IDL = {
  version: "0.1.0",
  name: "aether_trade",
  instructions: [
    {
      name: "initializeUser",
      accounts: [
        { name: "userAccount", isMut: true, isSigner: false },
        { name: "signer", isMut: true, isSigner: true },
        { name: "systemProgram", isMut: false, isSigner: false },
      ],
      args: [
        { name: "bump", type: { kind: "u8" } },
      ],
    },
    {
      name: "recordTrade",
      accounts: [
        { name: "tradeAccount", isMut: true, isSigner: false },
        { name: "userAccount", isMut: true, isSigner: false },
        { name: "signer", isMut: true, isSigner: true },
        { name: "systemProgram", isMut: false, isSigner: false },
      ],
      args: [
        { name: "tradeId", type: "string" },
        { name: "asset", type: "string" },
        { name: "side", type: { kind: "u8" } },
        { name: "quantity", type: { kind: "u64" } },
        { name: "price", type: { kind: "u64" } },
        { name: "timestamp", type: { kind: "i64" } },
      ],
    },
    {
      name: "settleTrade",
      accounts: [
        { name: "tradeAccount", isMut: true, isSigner: false },
        { name: "userAccount", isMut: true, isSigner: false },
        { name: "signer", isMut: true, isSigner: true },
      ],
      args: [
        { name: "exitPrice", type: { kind: "u64" } },
      ],
    },
    {
      name: "deactivateUser",
      accounts: [
        { name: "userAccount", isMut: true, isSigner: false },
        { name: "signer", isMut: true, isSigner: true },
      ],
      args: [],
    },
  ],
  accounts: [
    {
      name: "UserAccount",
      type: {
        kind: "struct",
        fields: [
          { name: "owner", type: { kind: "pubkey" } },
          { name: "bump", type: { kind: "u8" } },
          { name: "totalTrades", type: { kind: "u64" } },
          { name: "volumeUsd", type: { kind: "u64" } },
          { name: "isActive", type: { kind: "bool" } },
        ],
      },
    },
    {
      name: "TradeAccount",
      type: {
        kind: "struct",
        fields: [
          { name: "tradeId", type: "string" },
          { name: "owner", type: { kind: "pubkey" } },
          { name: "asset", type: "string" },
          { name: "side", type: { kind: "u8" } },
          { name: "quantity", type: { kind: "u64" } },
          { name: "entryPrice", type: { kind: "u64" } },
          { name: "exitPrice", type: { kind: { option: "u64" } } },
          { name: "timestamp", type: { kind: "i64" } },
          { name: "isSettled", type: { kind: "bool" } },
        ],
      },
    },
  ],
  events: [
    {
      name: "TradeEvent",
      fields: [
        { name: "tradeId", type: "string" },
        { name: "asset", type: "string" },
        { name: "side", type: { kind: "u8" } },
        { name: "quantity", type: { kind: "u64" } },
        { name: "price", type: { kind: "u64" } },
        { name: "timestamp", type: { kind: "i64" } },
      ],
    },
    {
      name: "TradeSettledEvent",
      fields: [
        { name: "tradeId", type: "string" },
        { name: "entryPrice", type: { kind: "u64" } },
        { name: "exitPrice", type: { kind: "u64" } },
        { name: "pnl", type: { kind: "i64" } },
      ],
    },
  ],
  errors: [
    { code: 6000, name: "AccountInactive", msg: "Account is inactive" },
    { code: 6001, name: "AlreadySettled", msg: "Trade already settled" },
    { code: 6002, name: "Unauthorized", msg: "Unauthorized signer" },
  ],
};
