/**
 * Request User Type
 * Express Request에 포함된 사용자 정보 타입
 */
export interface RequestUser {
  id: string;
  email?: string;
  role?: string;
}

/**
 * Type Guard: RequestUser 확인
 */
export const isRequestUser = (user: unknown): user is RequestUser => {
  return (
    typeof user === 'object' &&
    user !== null &&
    'id' in user &&
    typeof (user as RequestUser).id === 'string'
  );
};

