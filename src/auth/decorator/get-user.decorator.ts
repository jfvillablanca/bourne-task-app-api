import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const GetUser = createParamDecorator(
    (data: string, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        const user = request.user;
        const attrib = data === 'id' ? user?.['_id'].toString() : user?.[data];
        return data ? attrib : user;
    },
);
