import { PartialType } from '@nestjs/mapped-types';
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CreateProjectDto } from '.';
import { Task } from '../types';

export class UpdateProjectDto extends PartialType(CreateProjectDto) {
    @IsString()
    @IsNotEmpty()
    @IsOptional()
    title?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsArray()
    @IsOptional()
    collaborators?: string[];

    @IsArray()
    @IsOptional()
    tasks?: Task[];
}
