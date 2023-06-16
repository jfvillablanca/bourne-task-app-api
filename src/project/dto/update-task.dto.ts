import { PartialType } from '@nestjs/mapped-types';
import { CreateTaskDto } from '.';

export class UpdateTaskDto extends PartialType(CreateTaskDto) {}
