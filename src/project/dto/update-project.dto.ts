import { PartialType } from '@nestjs/mapped-types';
import { CreateProjectDto } from './index';

export class UpdateProjectDto extends PartialType(CreateProjectDto) {}
