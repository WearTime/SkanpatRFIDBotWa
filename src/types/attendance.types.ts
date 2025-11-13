export type AttendanceType = "masuk" | "keluar";

export interface AttendanceData {
  student_name: string;
  student_class: string;
  parent_phone: string | string[];
  attendance_time: string;
  attendance_type: AttendanceType;
  is_late?: boolean;
  late_duration?: string;
}
