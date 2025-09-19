const { default: axios } = require("axios");
const config = require("../config");
const { generateApiKey } = require("./apiKey");
const { encryptResponseData, encryptDataCBC } = require("../utils/encryption");
const { logHelpers, logger } = require("./logger");

const sendPermissionConfirmation = async (confirmationData) => {
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
      encryptData = encryptResponseData(dataToEncrypt, timestamp);
      logger.info(
        "Permission confirmation data encrypted successfully with GCM",
        {
          uuid: confirmationData.uuid,
          status: confirmationData.confirmation_status,
        }
      );
    } catch (encryptError) {
      logger.warn("GCM encryption failed, falling back to CBC", {
        error: encryptError.message,
        uuid: confirmationData.uuid,
      });

      encryptData = encryptDataCBC(dataToEncrypt, timestamp);
      logger.info(
        "Permission confirmation data encrypted successfully with CBC",
        {
          uuid: confirmationData.uuid,
          status: confirmationData.confirmation_status,
        }
      );
    }

    if (!apiKey) {
      throw new Error("Failed to generate API key");
    }

    const requestPayload = {
      data: encryptData.data,
      timestamp: timestamp,
    };

    logger.info("Sending permission confirmation request", {
      url: `${apiUrl}/api/${config.webApi.PermsConfirmEndPoint}`,
      uuid: confirmationData.uuid,
      timestamp: requestPayload.timestamp,
      dataLength: requestPayload.data.length,
    });

    const response = await axios.post(
      `${apiUrl}/api/${config.webApi.PermsConfirmEndPoint}`,
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
    const errorDetails = {
      error: error.message,
      studentName: confirmationData.student_name,
      confirmationStatus: confirmationData.confirmation_status,
      uuid: confirmationData.uuid,
    };

    if (error.response) {
      errorDetails.status = error.response.status;
      errorDetails.data = error.response.data;
      errorDetails.headers = error.response.headers;
    } else if (error.request) {
      errorDetails.request = "No response received";
    }

    logger.error("API confirmation request failed", errorDetails);
    throw error;
  }
};

module.exports = { sendPermissionConfirmation };
