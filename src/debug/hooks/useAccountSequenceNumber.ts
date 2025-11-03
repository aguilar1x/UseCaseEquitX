/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/only-throw-error */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { MuxedAccount, StrKey } from "@stellar/stellar-sdk";
import { useQuery } from "@tanstack/react-query";
import { NetworkHeaders } from "../types/types";

export const useAccountSequenceNumber = ({
  publicKey,
  horizonUrl,
  headers,
  uniqueId,
  enabled = false,
}: {
  publicKey: string;
  horizonUrl: string;
  headers: NetworkHeaders;
  uniqueId?: string;
  enabled?: boolean;
}) => {
  const query = useQuery({
    queryKey: ["accountSequenceNumber", { publicKey, uniqueId }],
    queryFn: async () => {
      let sourceAccount = publicKey;

      if (StrKey.isValidMed25519PublicKey(publicKey)) {
        const muxedAccount = MuxedAccount.fromAddress(publicKey, "0");
        sourceAccount = muxedAccount.baseAccount().accountId();
      }

      try {
        // Note: The browser console may show a 404 error when the account doesn't exist.
        // This is normal and expected behavior - the error is handled properly below.
        const response = await fetch(
          `${horizonUrl}/accounts/${sourceAccount}`,
          { headers },
        );

        // Handle 404 specifically - account doesn't exist
        if (!response.ok && response.status === 404) {
          // Don't parse JSON if it's a 404, just throw a clear error
          // The 404 in console is expected and handled gracefully
          const errorMessage = "Account not found. Make sure the correct network is selected and the account is funded/created.";
          const error = new Error(errorMessage);
          (error as Error & { status?: number }).status = 404;
          throw error;
        }

        if (!response.ok) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const responseJson = await response.json().catch(() => ({}));
          throw new Error(
            responseJson?.extras?.reason ||
            responseJson?.detail ||
            `HTTP ${response.status}: ${response.statusText}`
          );
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const responseJson = await response.json();

        if (responseJson?.status === 0) {
          throw new Error(`Unable to reach server at ${horizonUrl}.`);
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        if (responseJson?.status?.toString()?.startsWith("4")) {
          if (responseJson?.title === "Resource Missing") {
            throw new Error("Account not found. Make sure the correct network is selected and the account is funded/created.");
          }

          throw new Error(
            responseJson?.extras?.reason ||
            responseJson?.detail ||
            "Something went wrong when fetching the transaction sequence number. Please try again."
          );
        }

        return (BigInt(responseJson.sequence) + BigInt(1)).toString();
      } catch (e: unknown) {
        if (e instanceof Error) {
          throw e;
        }
        throw new Error(`${String(e)}. Check network configuration.`);
      }
    },
    enabled,
    retry: false, // Don't retry if account doesn't exist
    throwOnError: false, // Don't throw errors immediately, let React Query handle them
  });

  return query;
};
