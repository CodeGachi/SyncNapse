import { OAuthService } from './oauth.service';

describe('OAuthService (direct implementation)', () => {
  const realEnv = process.env;
  let service: OAuthService;
  const usersService = {
    upsertGoogleUser: jest.fn(),
  } as any;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = { ...realEnv };
    process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';
    process.env.GOOGLE_CALLBACK_URL = 'http://localhost:3000/auth/google/callback';
    service = new OAuthService(usersService);
    (global as any).fetch = jest.fn();
  });

  afterAll(() => {
    process.env = realEnv;
  });

  it('buildAuthUrl constructs authorization URL with required params', () => {
    const url = service.buildAuthUrl('google');
    expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth');
    expect(url).toContain('client_id=test-google-client-id');
    expect(url).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fauth%2Fgoogle%2Fcallback');
    expect(url).toContain('response_type=code');
  });

  it('handleCallback exchanges code and fetches userinfo, then upserts user', async () => {
    (global as any).fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'access-token-abc' }),
        text: async () => '',
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sub: 'google-sub-1', email: 'user@example.com', name: 'Test User' }),
        text: async () => '',
      });

    usersService.upsertGoogleUser.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      displayName: 'Test User',
      role: 'user',
    });

    const { user } = await service.handleCallback('google', 'code-xyz');
    expect((global as any).fetch).toHaveBeenCalledTimes(2);
    expect(usersService.upsertGoogleUser).toHaveBeenCalledWith({
      email: 'user@example.com',
      displayName: 'Test User',
    });
    expect(user).toMatchObject({ id: 'user-1' });
  });
});
