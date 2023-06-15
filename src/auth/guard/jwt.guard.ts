import { AuthGuard } from '@nestjs/passport';
import { jwt, jwt_refresh } from '../constants';

export class JwtGuard extends AuthGuard(jwt) {
    constructor() {
        super();
    }
}

export class JwtGuardRefresh extends AuthGuard(jwt_refresh) {
    constructor() {
        super();
    }
}
