import { walletService } from "./wallet";

export function getHost() {
  const apiKey = import.meta.env.VITE_OCTAV_API_KEY;

  const headers = {
    Authorization: `Bearer ${apiKey}`,
  };

  const config = {
    headers,
  };

  const host: string = "https://api.octav.fi/v1";
  return { host, config };
}

export function axelarService() {
  const { getBalances } = walletService();

  return { getBalances };
}
