import { Injectable } from '@nestjs/common';

@Injectable()
export class UserService {
    async getMe(userId: string) {
        return Promise.resolve(userId);
    }
}
