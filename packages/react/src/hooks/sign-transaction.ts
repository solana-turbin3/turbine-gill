"use client";

import { useWalletAccountTransactionSigner } from "@solana/react";
import { useMutation } from "@tanstack/react-query";
import { getTransactionCodec, Transaction } from "gill";

import { useSolanaClient } from "./client.js";
import { useWallet } from "./wallet.js";

interface UseSignTransactionReturn {
  account: ReturnType<typeof useWallet>["account"];
  mutation: ReturnType<typeof useMutation<Uint8Array, Error, Transaction>>;
  signer: ReturnType<typeof useWalletAccountTransactionSigner> | undefined;
}

export function useSignTransaction(): UseSignTransactionReturn {
  const { account } = useWallet();
  const {cluster} = useSolanaClient();

  if(!account) throw new Error("Account is undefined")
  const signer =  useWalletAccountTransactionSigner(account, `solana:${cluster}`);

  const mutation = useMutation<Uint8Array, Error, Transaction>({
    mutationFn: async (tx: Transaction) => {
      if (!account || !signer) throw new Error("Wallet not connected");

      const [signedTx] = await signer.modifyAndSignTransactions([tx]);

      const codec = getTransactionCodec();
      const encodedTx = codec.encode(signedTx);

      return new Uint8Array(encodedTx);
    },
  });

  return { account, mutation, signer };
}
