import { createContext, useContext, useMemo, type ReactNode } from "react";
import {
  ConnectionProvider,
  WalletProvider,
  useWallet,
} from "@solana/wallet-adapter-react";
import {
  WalletModalProvider,
  WalletMultiButton,
} from "@solana/wallet-adapter-react-ui";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";

const SOLANA_NETWORK = (import.meta as any).env?.VITE_SOLANA_RPC_URL || "https://api.devnet.solana.com";

interface WalletContextValue {
  connected: boolean;
  publicKey: string | null;
  balance: number | null;
  connect: () => void;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextValue>({
  connected: false,
  publicKey: null,
  balance: null,
  connect: () => {},
  disconnect: () => {},
});

function WalletContextInner({ children }: { children: ReactNode }) {
  const { connected, publicKey, disconnect } = useWallet();
  const balance = null;

  const value = useMemo<WalletContextValue>(() => ({
    connected,
    publicKey: publicKey?.toBase58() || null,
    balance,
    connect: () => {},
    disconnect,
  }), [connected, publicKey, disconnect]);

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

export function SolanaWalletProvider({ children }: { children: ReactNode }) {
  const wallets = useMemo(() => [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
  ], []);

  return (
    <ConnectionProvider endpoint={SOLANA_NETWORK}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <WalletContextInner>
            {children}
          </WalletContextInner>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export function useWalletContext() {
  return useContext(WalletContext);
}

export { WalletMultiButton };
