import { Repository } from "typeorm";

export function includeAll<T extends object>(repository: Repository<T>): Array<keyof T> {
  return repository.metadata.columns.map(col => col.propertyName) as Array<keyof T>;
}
