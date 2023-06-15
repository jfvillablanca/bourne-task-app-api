import { JwtPayLoad } from './jwt-payload.type';

export type JwtPayloadWithRt = JwtPayLoad & { refresh_token: string };
