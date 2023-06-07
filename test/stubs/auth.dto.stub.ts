import { AuthDto } from '../../src/auth/dto';

export const AuthDTOStub = (): AuthDto => {
    return {
        username: 'testuser',
        password: 'testpassword',
        email: 'test@example.com',
    };
};
