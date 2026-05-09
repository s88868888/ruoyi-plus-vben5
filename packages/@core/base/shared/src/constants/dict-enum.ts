export const DictEnum = {
  REVIEW_STANDARD_TYPE: 'review_standard_type', // 审核标准类型
  REVIEW_TASK_STATUS: 'review_task_status', // 审核任务状态
  REVIEW_TASK_TYPE: 'review_task_type', // 审核任务类型
  REVIEW_PASS_STATUS: 'review_pass_status', // 审核通过状态
  REVIEW_SEVERITY: 'review_severity', // 规则严重等级
  REVIEW_KNOWLEDGE_TYPE: 'review_knowledge_type', // 知识库类型
  SYS_COMMON_STATUS: 'sys_common_status',
  SYS_DEVICE_TYPE: 'sys_device_type', // 设备类型
  SYS_GRANT_TYPE: 'sys_grant_type', // 授权类型
  SYS_NORMAL_DISABLE: 'sys_normal_disable',
  SYS_NOTICE_STATUS: 'sys_notice_status', // 通知状态
  SYS_NOTICE_TYPE: 'sys_notice_type', // 通知类型
  SYS_OPER_TYPE: 'sys_oper_type', // 操作类型
  SYS_OSS_ACCESS_POLICY: 'oss_access_policy', // oss权限桶类型
  SYS_SHOW_HIDE: 'sys_show_hide', // 显示状态
  SYS_USER_SEX: 'sys_user_sex', // 性别
  SYS_YES_NO: 'sys_yes_no', // 是否
  WF_BUSINESS_STATUS: 'wf_business_status', // 业务状态
  WF_FORM_TYPE: 'wf_form_type', // 表单类型
  WF_TASK_STATUS: 'wf_task_status', // 任务状态
} as const;

export type DictEnumKey = keyof typeof DictEnum;
