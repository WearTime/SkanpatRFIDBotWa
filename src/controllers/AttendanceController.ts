import { Request, Response } from 'express';
import { logHelpers, logger } from '../handlers/logger';
import { EncryptionService } from '../utils/encryption';
import { AttendanceData } from '../types/attendance.types';
import { WhatsAppFactory } from '../services/WhatsAppFactory';
import { QueueManager } from '../services/QueueManager';
import config from '../config';
import { ApiResponse } from '../types/api.types';
import { formatAttendanceMessage, formatPhoneNumber } from '../handlers/formatMessage';
import { SendMessageResult } from '../types/message.types';

export class AttendanceController {
  static async sendAttendance(req: Request, res: Response): Promise<void> {
    try {
      const { data, timestamp } = req.body;

      let decryptedData: AttendanceData;
      try {
        decryptedData = EncryptionService.smartDecrypt(data, timestamp);

        logger.info('Decryption successful', {
          dataKeys: Object.keys(decryptedData),
          studentName: decryptedData.student_name,
          parentPhoneType: typeof decryptedData.parent_phone,
          parentPhoneIsArray: Array.isArray(decryptedData.parent_phone),
        });
      } catch (error) {
        logHelpers.securityEvent('Decryption Failed', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          error: error instanceof Error ? error.message : String(error),
          timestamp: timestamp,
        });

        res.status(400).json({
          success: false,
          message: 'Failed to read request data',
        });
        return;
      }

      const { student_name, student_class, parent_phone, attendance_time, attendance_type } =
        decryptedData;

      if (!student_name || !parent_phone || !attendance_time || !student_class) {
        logger.error('Missing required fields', {
          hasStudentName: !!student_name,
          hasParentPhone: !!parent_phone,
          hasAttendanceTime: !!attendance_time,
          hasStudentClass: !!student_class,
        });

        res.status(400).json({
          success: false,
          message: 'Data tidak lengkap semua wajib diisi',
        });
        return;
      }

      if (!['masuk', 'keluar'].includes(attendance_type)) {
        res.status(400).json({
          success: false,
          message: 'attendance_type harus "masuk" atau "keluar"',
        });
        return;
      }

      const message = formatAttendanceMessage(decryptedData);

      let whatsappNumbers: string[] = [];
      try {
        if (Array.isArray(parent_phone)) {
          whatsappNumbers = parent_phone.map((phone) => formatPhoneNumber(phone));
        } else {
          whatsappNumbers = [formatPhoneNumber(parent_phone)];
        }

        logger.info('Phone numbers formatted', {
          originalPhones: parent_phone,
          formattedCount: whatsappNumbers.length,
          firstFormatted: whatsappNumbers[0]?.replace(/\d(?=\d{4})/g, '*'),
        });
      } catch (phoneError) {
        logger.error('Phone number formatting failed', {
          error: phoneError instanceof Error ? phoneError.message : String(phoneError),
          parentPhone: parent_phone,
        });

        res.status(400).json({
          success: false,
          message: `Invalid phone number format: ${phoneError instanceof Error ? phoneError.message : String(phoneError)}`,
        });
        return;
      }

      const whatsappClient = WhatsAppFactory.getInstance();
      const queueManager = QueueManager.getInstance();

      let successCount = 0;
      const errors: Array<{ phone: string; error: string }> = [];
      const queueIds: string[] = [];

      // Check if queue is enabled
      if (queueManager.isEnabled()) {
        logger.info('Queue is enabled, adding messages to queue');

        for (let i = 0; i < whatsappNumbers.length; i++) {
          const whatsappNumber = whatsappNumbers[i];

          try {
            const queueId = await queueManager.addToQueue(
              whatsappNumber,
              message,
              'attendance',
              student_name
            );

            queueIds.push(queueId);
            successCount++;

            logger.info(`Message queued ${i + 1}/${whatsappNumbers.length}`, {
              queueId,
              student: student_name,
              attendanceType: attendance_type,
              phone: whatsappNumber.replace(/\d(?=\d{4})/g, '*'),
            });
          } catch (queueError) {
            logger.error(`Failed to queue message ${i + 1}`, {
              phone: whatsappNumber.replace(/\d(?=\d{4})/g, '*'),
              error: queueError instanceof Error ? queueError.message : String(queueError),
            });

            errors.push({
              phone: whatsappNumber,
              error: queueError instanceof Error ? queueError.message : String(queueError),
            });
          }
        }

        if (successCount > 0) {
          const responseData: ApiResponse<SendMessageResult & { queueIds?: string[] }> = {
            success: true,
            message: `${successCount}/${whatsappNumbers.length} pesan berhasil ditambahkan ke antrian`,
            data: {
              successCount: successCount,
              totalCount: whatsappNumbers.length,
              queueIds: queueIds,
              errors: errors.length > 0 ? errors : undefined,
            },
          };

          if (config.security.encryptResponse) {
            try {
              const encryptedResponse = EncryptionService.smartEncrypt(responseData, timestamp);
              res.status(200).json(encryptedResponse);
            } catch (encryptError) {
              logHelpers.error(
                encryptError instanceof Error ? encryptError : new Error(String(encryptError)),
                { context: 'Response Encryption' }
              );
              res.status(200).json(responseData);
            }
          } else {
            res.status(200).json(responseData);
          }
        } else {
          res.status(500).json({
            success: false,
            message: 'Gagal menambahkan pesan ke antrian',
            data: { errors },
          });
        }
      } else {
        // Queue disabled - send immediately (original behavior)
        logger.info('Queue is disabled, sending messages immediately');

        for (let i = 0; i < whatsappNumbers.length; i++) {
          const whatsappNumber = whatsappNumbers[i];

          try {
            logger.info(`Sending message ${i + 1}/${whatsappNumbers.length}`, {
              student: student_name,
              attendanceType: attendance_type,
              phone: whatsappNumber.replace(/\d(?=\d{4})/g, '*'),
            });

            await whatsappClient.sendMessage(whatsappNumber, message);

            logHelpers.messageSent(whatsappNumber, student_name, attendance_type, true);
            successCount++;
          } catch (sendError) {
            logger.error(`Failed to send message ${i + 1}`, {
              phone: whatsappNumber.replace(/\d(?=\d{4})/g, '*'),
              error: sendError instanceof Error ? sendError.message : String(sendError),
            });

            errors.push({
              phone: whatsappNumber,
              error: sendError instanceof Error ? sendError.message : String(sendError),
            });

            logHelpers.messageSent(whatsappNumber, student_name, attendance_type, false);
          }
        }

        if (successCount > 0) {
          const responseData: ApiResponse<SendMessageResult> = {
            success: true,
            message: `Pesan berhasil dikirim ke ${successCount}/${whatsappNumbers.length} nomor`,
            data: {
              successCount: successCount,
              totalCount: whatsappNumbers.length,
              errors: errors.length > 0 ? errors : undefined,
            },
          };

          if (config.security.encryptResponse) {
            try {
              const encryptedResponse = EncryptionService.smartEncrypt(responseData, timestamp);
              res.status(200).json(encryptedResponse);
            } catch (encryptError) {
              logHelpers.error(
                encryptError instanceof Error ? encryptError : new Error(String(encryptError)),
                { context: 'Response Encryption' }
              );
              res.status(200).json(responseData);
            }
          } else {
            res.status(200).json(responseData);
          }
        } else {
          res.status(500).json({
            success: false,
            message: 'Gagal mengirim pesan ke semua nomor',
            data: { errors },
          });
        }
      }
    } catch (error) {
      logHelpers.error(error instanceof Error ? error : new Error(String(error)), {
        context: 'Send Attendance',
        hasEncryptedData: !!req.body.data,
      });

      const errorResponse: ApiResponse = {
        success: false,
        message: 'Gagal mengirim pesan',
        error:
          process.env.NODE_ENV === 'development' && error instanceof Error
            ? error.message
            : 'Internal server error',
      };

      res.status(500).json(errorResponse);
    }
  }
}
