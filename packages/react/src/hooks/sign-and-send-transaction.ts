"use client";

import { useSolanaClient } from "@gillsdk/react";
import {
    SolanaSignTransaction,
    SolanaSignTransactionFeature,
    SolanaSignTransactionInput,
} from "@solana/wallet-standard-features";
import { useMutation } from "@tanstack/react-query";
import { WalletAccount } from "@wallet-standard/core";
import { getWalletFeature } from "@wallet-standard/react";
import { Base64EncodedWireTransaction, getTransactionCodec, Transaction } from "gill";

import { GILL_HOOK_CLIENT_KEY } from "../const.js";
import { useWallet } from "./wallet.js";

interface UseSignAndSendTransactionConfig {
  transaction: Transaction;
}

interface UseSignAndSendTransactionReturn {
  error: Error | null;
  isPending: boolean;
  signAndSendTransaction: () => Promise<string>; // returns signature only
  signedTx: Uint8Array | undefined;
  txSig: string | undefined;
}

export function useSignAndSendTransaction({
  transaction,
}: UseSignAndSendTransactionConfig): UseSignAndSendTransactionReturn {
  const { wallet, account } = useWallet();
  const { rpc } = useSolanaClient();

  const mutation = useMutation<{ signedTx: Uint8Array; txSig: string }, Error>({
    mutationFn: async () => {
      if (!wallet) throw new Error("Wallet not connected");
      if (!account) throw new Error("Invalid account");

      const feature = getWalletFeature(
        wallet,
        SolanaSignTransaction
      ) as SolanaSignTransactionFeature[typeof SolanaSignTransaction] | undefined;

      if (!feature) throw new Error("Wallet does not support signTransaction");

      const codec = getTransactionCodec();
      const serializedTx = new Uint8Array(codec.encode(transaction));

      const input: SolanaSignTransactionInput = {
        account: account as WalletAccount,
        transaction: serializedTx,
      };

      const [signed] = await feature.signTransaction(input);
      const signedTx = signed.signedTransaction;

      const base64Tx = Buffer.from(signedTx).toString(
        "base64"
      ) as Base64EncodedWireTransaction;

      const txSig = await rpc
        .sendTransaction(base64Tx, {
          encoding: "base64",
          preflightCommitment: "confirmed",
          skipPreflight: false,
        })
        .send();

      return { signedTx, txSig };
    },
    mutationKey: [GILL_HOOK_CLIENT_KEY, "signAndSendTransaction"],
    networkMode: "offlineFirst",
    retry: 3,
    retryDelay: (index) => Math.min(1000 * 2 ** index, 3000),
  });

  return {
    error: mutation.error,
    isPending: mutation.isPending,
    // wrap mutateAsync to only return txSig
    signAndSendTransaction: async () => {
      const result = await mutation.mutateAsync();
      return result.txSig;
    },
    signedTx: mutation.data?.signedTx,
    txSig: mutation.data?.txSig,
  };
}
