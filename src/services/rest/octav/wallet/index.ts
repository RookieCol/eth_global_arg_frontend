import type { Address } from "viem";
import { getAddress, isAddress } from "viem";
import { getHost } from "..";
import axios from "axios";
import type { OctavResponseDTO } from "../../../config/dtos/balance.dto";
import { mapBalanceDtoToBalance } from "../../../config/mappings/map-balance-dto-to-balance";
import type { OctavResponse } from "../../../../models/balance.model";

export function walletService() {
  const { host, config } = getHost();
  const endpoint = "wallet";

  const getBalances = async (
    address: Address
  ): Promise<OctavResponse | null> => {
    try {
      // Validar y normalizar la dirección
      if (!isAddress(address)) {
        throw new Error(`Invalid address format: ${address}`);
      }

      // Normalizar a checksum address (formato estándar)
      const normalizedAddress = getAddress(address);

      // Codificar la dirección en la URL (el endpoint usa 'addresses' en plural)
      const url = `${host}/${endpoint}?addresses=${encodeURIComponent(
        normalizedAddress
      )}`;

      console.log("🔍 Fetching wallet data from:", url);
      console.log("📍 Address:", normalizedAddress);

      const response = await axios.get<OctavResponseDTO | OctavResponseDTO[]>(url, config);

      if (!response.data) {
        throw new Error("No data found");
      }

      // La API puede devolver un array o un objeto único
      const data = Array.isArray(response.data) ? response.data[0] : response.data;
      
      const octavResponse = mapBalanceDtoToBalance(data);

      console.log("octavResponse:", octavResponse);

      return octavResponse;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("❌ API Error:", {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          url: error.config?.url,
        });

        // Si hay un mensaje de error en la respuesta, mostrarlo
        if (error.response?.data) {
          console.error("📋 Error details:", error.response.data);
        }
      } else {
        console.error("❌ Error:", error);
      }
      return null;
    }
  };

  return {
    getBalances,
  };
}
