import { Repository } from "typeorm";

/**
 * Converts a string from snake_case to camelCase.
 * @param str - The string in snake_case format.
 * @returns - The string in camelCase format.
 */
function toCamelCase(str: string): string {
  return str.toLowerCase().replace(/(_\w)/g, matches => matches[1].toUpperCase());
}

/**
 * Creates a TypeORM select query with aliases for all fields of an entity,
 * and allows additional fields to be included, excluding specific fields like 'password'.
 * @param repository - The TypeORM repository of the entity to generate the query for.
 * @param alias - The alias to use for the entity in the query.
 * @param extraFields - Optional array of additional fields to include in the query.
 * @param excludedFields - Optional array of fields to exclude from the query.
 * @returns - The select query string with aliases.
 */
export function createSelectQuery(
  repository: Repository<any>,
  alias: string,
  extraFields: string[] = [],
  excludedFields: string[] = ["password"],
): string {
  const columns = repository.metadata.columns;

  // Generate the select query with entity columns, excluding specific fields
  const selectQuery = columns
    .filter(column => !excludedFields.includes(column.propertyName)) // Exclude specified fields
    .map(column => `${alias}.${column.propertyName} AS ${column.propertyName}`)
    .concat(extraFields)
    .filter(field => field) // Filter out null or undefined fields
    .join(", ");

  return `${selectQuery}`;
}
