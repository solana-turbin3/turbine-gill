import { useSignIn } from "@solana/react";
import { SolanaSignInInput, SolanaSignInOutput } from "@solana/wallet-standard-features";
import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import type { UiWallet, UiWalletAccount } from "@wallet-standard/react";

import { GILL_HOOK_CLIENT_KEY } from "../const.js";

// Output of @solana/react useSignIn signIn function
type Output = Omit<SolanaSignInOutput, "account" | "signatureType"> &
  Readonly<{
    account: UiWalletAccount;
  }>;

export function useSolanaSignIn(wallet: UiWallet, input?: SolanaSignInInput, config?: UseMutationOptions) {
  let signInFn: ((input?: SolanaSignInInput) => Promise<Output>) | null = null;
  let isSupported = true;

  // Try to get the feature else warn user that is is not supported (else it can crash frontends)
  try {
    signInFn = useSignIn(wallet);
  } catch (e) {
    isSupported = false;
    console.warn(e);
  }
  const mutation = useMutation({
    mutationFn: async (): Promise<Output> => {
      if (!signInFn || !isSupported) throw new Error("Wallet does not support the sign in feature");

      const result = await signInFn({ ...input });
      return result;
    },
    mutationKey: [GILL_HOOK_CLIENT_KEY, "signIn"],
    networkMode: "offlineFirst",
    ...config,
  });

  return {
    mutation,
    supported: isSupported,
  };
}
