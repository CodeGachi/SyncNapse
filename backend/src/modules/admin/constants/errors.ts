/**
 * Admin Error Messages
 * 관리자 모듈 에러 메시지 상수
 */
export const AdminErrors = {
  AUTHENTICATION_REQUIRED: {
    code: 'AUTHENTICATION_REQUIRED',
    message: '인증이 필요합니다.',
    messageEn: 'Authentication required',
  },
  ADMIN_ROLE_REQUIRED: {
    code: 'ADMIN_ROLE_REQUIRED',
    message: '관리자 권한이 필요합니다.',
    messageEn: 'Admin or operator role required',
  },
  ADMIN_ONLY_REQUIRED: {
    code: 'ADMIN_ONLY_REQUIRED',
    message: '최고 관리자 권한이 필요합니다.',
    messageEn: 'Admin role required',
  },
  INSUFFICIENT_PERMISSIONS: {
    code: 'INSUFFICIENT_PERMISSIONS',
    message: '해당 작업을 수행할 권한이 없습니다.',
    messageEn: 'Insufficient permissions',
  },
  USER_NOT_FOUND: {
    code: 'USER_NOT_FOUND',
    message: '사용자를 찾을 수 없습니다.',
    messageEn: 'User not found',
  },
} as const;

/**
 * Helper function to create error response
 */
export const createAdminError = (
  errorKey: keyof typeof AdminErrors,
  useEnglish = false,
) => {
  const error = AdminErrors[errorKey];
  return {
    code: error.code,
    message: useEnglish ? error.messageEn : error.message,
  };
};

