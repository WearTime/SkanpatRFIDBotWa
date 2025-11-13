import axios, { AxiosResponse } from "axios";
import config from "../config";
import { EncryptionService } from "../utils/encryption";
import { logger } from "./logger";
import { PermissionConfirmation } from "../types/permission.types";
import { generateApiKey } from "./apiKey";

export async function sendPermissionConfirmation(
  confirmationData: PermissionConfirmation
): Promise<AxiosResponse> {
  try {
    const apiUrl = config.webApi.apiUrl;
    const apiKey = generateApiKey();
    const timestamp = Math.floor(Date.now() / 1000);

    const dataToEncrypt = {
      uuid: confirmationData.uuid,
      parent_confirm: confirmationData.parent_confirm,
      parent_confirm_at: confirmationData.parent_confirm_at,
    };

    let encryptData;

    try {
      encryptData = EncryptionService.smartEncrypt(dataToEncrypt, timestamp);
      logger.info("Permission confirmation data encrypted successfully", {
        uuid: confirmationData.uuid,
        status: confirmationData.parent_confirm,
      });
    } catch (encryptError) {
      logger.warn("Encryption failed", {
        error:
          encryptError instanceof Error
            ? encryptError.message
            : String(encryptError),
        uuid: confirmationData.uuid,
      });
      throw encryptError;
    }

    if (!apiKey) {
      throw new Error("Failed to generate API key");
    }

    const requestPayload = {
      data: encryptData.data,
      timestamp: timestamp,
    };

    logger.info("Sending permission confirmation request", {
      url: `${apiUrl}/api/${config.webApi.permsConfirmEndPoint}`,
      uuid: confirmationData.uuid,
      timestamp: requestPayload.timestamp,
      dataLength: requestPayload.data.length,
    });

    const response = await axios.post(
      `${apiUrl}/api/${config.webApi.permsConfirmEndPoint}`,
      requestPayload,
      {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        timeout: 10000,
      }
    );

    logger.info("Permission confirmation sent successfully", {
      uuid: confirmationData.uuid,
      status: response.status,
      responseMessage: response.data?.message,
    });

    return response;
  } catch (error) {
    const errorDetails: Record<string, any> = {
      error: error instanceof Error ? error.message : String(error),
      uuid: confirmationData.uuid,
      confirmationStatus: confirmationData.parent_confirm,
    };

    if (axios.isAxiosError(error)) {
      if (error.response) {
        errorDetails.status = error.response.status;
        errorDetails.data = error.response.data;
        errorDetails.headers = error.response.headers;
      } else if (error.request) {
        errorDetails.request = "No response received";
      }
    }

    logger.error("API confirmation request failed", errorDetails);
    throw error;
  }
}
