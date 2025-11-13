export type PermissionType = "sakit" | "izin" | "dispensasi";

export interface PermissionData {
  uuid: string;
  student_name: string;
  student_class: string;
  parent_phone: string | string[];
  permission_date: string;
  permission_type: PermissionType;
  permission_note: string;
}

export interface PendingConfirmation {
  uuid: string;
  student_name: string;
  student_class: string;
  parent_phone: string;
  permission_date: string;
  permission_type: PermissionType;
  permission_note: string;
  created_at: number;
  message_sent_at: string;
}

export interface PermissionConfirmation {
  uuid: string;
  parent_confirm: boolean;
  parent_confirm_at: string;
}
