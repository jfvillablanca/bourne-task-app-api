import { AuthDto } from '../../src/auth/dto';

export const AuthDTOStub = (): AuthDto => {
    return {
        email: 'test@example.com',
        password: 'testpassword',
    };
};
