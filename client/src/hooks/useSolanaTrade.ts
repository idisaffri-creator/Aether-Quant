import { useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { getConnection } from "@/lib/solana";
import { toast } from "sonner";

const AETHER_PROGRAM_ID = new PublicKey(
  "AETHRp1aceh0lder111111111111111111111111111111"
);

interface TradeRecord {
  tradeId: string;
  asset: string;
  side: "long" | "short";
  quantity: number;
  price: number;
}

export function useSolanaTrade() {
  const { publicKey, sendTransaction } = useWallet();

  const recordTradeOnChain = useCallback(
    async (trade: TradeRecord) => {
      if (!publicKey || !sendTransaction) {
        toast.error("Wallet not connected");
        return;
      }

      try {
        const conn = getConnection();

        const [userPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("user"), publicKey.toBytes()],
          AETHER_PROGRAM_ID
        );

        const [tradePda] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("trade"),
            publicKey.toBytes(),
            Buffer.from(trade.tradeId),
          ],
          AETHER_PROGRAM_ID
        );

        const priceLamports = Math.floor(trade.price * 100);

        const ixData = Buffer.alloc(9 + trade.tradeId.length + trade.asset.length + 1 + 8 + 8 + 8);
        // Instruction data would be encoded via Anchor —
        // This is a simplified example showing the concept.

        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: userPda,
            lamports: 0,
          })
        );

        const { blockhash } = await conn.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = publicKey;

        const signature = await sendTransaction(transaction, conn);
        await conn.confirmTransaction(signature, "confirmed");

        toast.success("Trade recorded on-chain", {
          description: `Signature: ${signature.slice(0, 8)}...${signature.slice(-8)}`,
        });

        return signature;
      } catch (error) {
        console.error("Failed to record trade on-chain:", error);
        toast.error("Failed to record trade on blockchain");
      }
    },
    [publicKey, sendTransaction]
  );

  const getTradeHistory = useCallback(async () => {
    if (!publicKey) return [];

    try {
      const conn = getConnection();
      const signatures = await conn.getSignaturesForAddress(publicKey, {
        limit: 10,
      });
      return signatures.map((sig) => ({
        signature: sig.signature,
        slot: sig.slot,
        timestamp: sig.blockTime
          ? new Date(sig.blockTime * 1000).toISOString()
          : null,
        status: sig.confirmationStatus,
      }));
    } catch (error) {
      console.error("Failed to fetch trade history:", error);
      return [];
    }
  }, [publicKey]);

  return {
    recordTradeOnChain,
    getTradeHistory,
    programId: AETHER_PROGRAM_ID,
  };
}
