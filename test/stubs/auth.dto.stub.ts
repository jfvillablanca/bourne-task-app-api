import { LoginDto, RegisterDto } from '../../src/auth/dto';

export const RegisterDTOStub = (): RegisterDto => {
    return {
        username: 'testuser',
        password: 'testpassword',
        email: 'test@example.com',
    };
};

export const LoginDTOStub = ({
    useEmail = false,
}: { useEmail?: boolean } = {}): LoginDto => {
    if (useEmail) {
        return {
            usernameOrEmail: 'test@example.com',
            password: 'testpassword',
        };
    }
    return {
        usernameOrEmail: 'testuser',
        password: 'testpassword',
    };
};
