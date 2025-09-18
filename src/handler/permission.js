const { default: axios } = require("axios");
const config = require("../config");
const { generateApiKey } = require("./apiKey");
const { encryptResponseData, encryptDataCBC } = require("./encryption");

const sendPermissionConfirmation = async (confirmationData) => {
  try {
    const apiUrl = config.webApi.apiUrl;
    const apiKey = generateApiKey();
    const timestamp = Math.floor(Date.now() / 1000);

    const dataToEncrypt = {
      nisn: confirmationData.nisn,
      permission_type: confirmationData.permission_type,
      permission_date: confirmationData.permission_date,
      permission_note: confirmationData.permission_note,
      confirmation_status: confirmationData.confirmation_status,
      confirmed_at: confirmationData.confirmed_at,
      parent_phone: confirmationData.parent_phone,
    };

    let encryptData;

    try {
      encryptData = encryptResponseData(dataToEncrypt, timestamp);
      logger.info("Permission confirmation data encrypted successfully", {
        studentNisn: confirmationData.nisn,
        status: confirmationData.confirmation_status,
      });
    } catch (encryptError) {
      logger.error("Failed to encrypt permission confirmation data", {
        error: encryptError.message,
        studentNisn: confirmationData.nisn,
      });

      encryptData = encryptDataCBC(dataToEncrypt, timestamp);
    }

    if (!apiKey) {
      throw new Error("Failed to generate API key");
    }

    const response = await axios.post(
      `${apiUrl}/api/${config.webApi.PermsConfirmEndPoint}`,
      {
        data: encryptData.encrypted_data,
        timestamp: timestamp,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        timeout: 10000,
      }
    );

    return response;
  } catch (error) {
    logger.error("API confirmation request failed", {
      error: error.message,
      status: error.response?.status,
      data: error.response?.data,
      studentName: confirmationData.student_name,
      confirmationStatus: confirmationData.confirmation_status,
    });
    throw error;
  }
};

module.exports = { sendPermissionConfirmation };
