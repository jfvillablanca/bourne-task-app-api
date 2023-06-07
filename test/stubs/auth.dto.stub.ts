import { RegisterDto } from '../../src/auth/dto';

export const RegisterDTOStub = (): RegisterDto => {
    return {
        username: 'testuser',
        password: 'testpassword',
        email: 'test@example.com',
    };
};
