"use client";

import {
    SolanaSignTransaction,
    SolanaSignTransactionFeature,
    SolanaSignTransactionInput
} from "@solana/wallet-standard-features";
import { useMutation } from "@tanstack/react-query";
import { WalletAccount } from "@wallet-standard/core";
import { getWalletFeature } from "@wallet-standard/react";
import { getTransactionCodec, Transaction } from "gill";

import { GILL_HOOK_CLIENT_KEY } from "../const.js";
import { useWallet } from "./wallet.js";

interface UseSignTransactionConfig {
  transaction: Transaction;
}

interface UseSignTransactionReturn {
  error: Error | null;
  isPending: boolean;
  signTransaction: () => Promise<Uint8Array>;
  signedTx: Uint8Array | undefined;
}

export function useSignTransaction({
  transaction
}: UseSignTransactionConfig): UseSignTransactionReturn {
  const { wallet , account} = useWallet();

  const mutation = useMutation<Uint8Array, Error>({
    mutationFn: async (): Promise<Uint8Array> => {
      if (!wallet) throw new Error("Wallet not connected");
      
      const feature = getWalletFeature(
        wallet,
        SolanaSignTransaction,
      ) as SolanaSignTransactionFeature[typeof SolanaSignTransaction] | undefined;
      
      if (!feature) {
        throw new Error("Wallet does not support signTransaction");
      }
   
      if (!account) {
        throw new Error("Invalid account ");
      }

      const codec = getTransactionCodec();
      const serializedTxReadonly = codec.encode(transaction); 
      const serializedTx = new Uint8Array(serializedTxReadonly);

      const input: SolanaSignTransactionInput = {
        account: account as WalletAccount,
        transaction: serializedTx,
      };
      
      const [signedTx]= await feature.signTransaction(input);
      
      return signedTx.signedTransaction;
    },
    mutationKey: [GILL_HOOK_CLIENT_KEY, "signTransaction"],
    networkMode: "offlineFirst",
    retry: 3,
    retryDelay: (index) => Math.min(1000 * 2 ** index, 3000),
  });

  return {
    error: mutation.error,
    isPending: mutation.isPending,
    signTransaction: mutation.mutateAsync,
    signedTx: mutation.data,

  };
}
