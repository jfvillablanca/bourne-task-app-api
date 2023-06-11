import * as jwt from 'jsonwebtoken';

export const getUserIdWithToken = (accessToken: string): string => {
    const secret = process.env.JWT_SECRET;
    const id = jwt.verify(accessToken, secret).sub;
    return typeof id === 'string' ? id : '';
};
