export interface MessageTemplates {
  attendance: {
    masuk: { icon: string; type: string };
    keluar: { icon: string; type: string };
  };
}

export interface MessagesConfig {
  templates: MessageTemplates;
  defaultClass: string;
  footer: string;
  approvalMessage: string[];
  rejectedMessage: string[];
}

export interface SendMessageResult {
  successCount: number;
  totalCount: number;
  errors?: Array<{ phone: string; error: string }>;
}
