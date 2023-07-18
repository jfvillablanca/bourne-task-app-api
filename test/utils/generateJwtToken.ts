import * as jwt from 'jsonwebtoken';
import { JwtPayLoad } from '../../src/auth/types';

export const generateJwtToken = (payload: JwtPayLoad, expiresIn: string) => {
    const secret = process.env.JWT_SECRET;
    return jwt.sign(payload, secret, { expiresIn });
};
