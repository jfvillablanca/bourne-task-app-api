import { AuthGuard } from '@nestjs/passport';
import { jwt } from '../constants';

export class JwtGuard extends AuthGuard(jwt) {
    constructor() {
        super();
    }
}
