import { AuthService } from './auth.service';

describe('AuthService', () => {
    const jwtService = { signAsync: jest.fn() } as any;
    const usersService = {} as any;
    const oauthService = {
    buildAuthUrl: jest.fn(),
    handleCallback: jest.fn(),
    } as any;

    let service: AuthService;

    beforeEach(() => {
        jest.resetAllMocks();
        service = new AuthService(usersService, jwtService, oauthService);
    });

    it('getOAuthAuthorizationUrl delegates to OAuthService', async () => {
        oauthService.buildAuthUrl.mockReturnValue('http://auth-url');
        const url = await service.getOAuthAuthorizationUrl('google');
        expect(oauthService.buildAuthUrl).toHaveBeenCalledWith('google');
        expect(url).toBe('http://auth-url');
    });

    it('authenticateWithOAuth issues JWT after callback', async () => {
        oauthService.handleCallback.mockResolvedValue({ user: { id: 'user-1' } });
        jwtService.signAsync.mockResolvedValue('jwt-token');
        const result = await service.authenticateWithOAuth('google', 'code-xyz');
        expect(oauthService.handleCallback).toHaveBeenCalledWith('google', 'code-xyz');
        expect(jwtService.signAsync).toHaveBeenCalledWith({ sub: 'user-1' });
        expect(result).toEqual({ token: 'jwt-token' });
    });
});
