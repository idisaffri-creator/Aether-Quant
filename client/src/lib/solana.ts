import {
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
  Transaction,
  SystemProgram,
} from "@solana/web3.js";

const SOLANA_RPC = import.meta.env.VITE_SOLANA_RPC_URL || "https://api.devnet.solana.com";

let connection: Connection | null = null;

export function getConnection(): Connection {
  if (!connection) {
    connection = new Connection(SOLANA_RPC, "confirmed");
  }
  return connection;
}

export async function getBalance(publicKey: string): Promise<number> {
  const conn = getConnection();
  const pk = new PublicKey(publicKey);
  const balance = await conn.getBalance(pk);
  return balance / LAMPORTS_PER_SOL;
}

export async function createTransferTransaction(
  fromPubkey: string,
  toPubkey: string,
  amountSOL: number
): Promise<Transaction> {
  const conn = getConnection();
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: new PublicKey(fromPubkey),
      toPubkey: new PublicKey(toPubkey),
      lamports: amountSOL * LAMPORTS_PER_SOL,
    })
  );
  transaction.feePayer = new PublicKey(fromPubkey);
  const { blockhash } = await conn.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  return transaction;
}

export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}
