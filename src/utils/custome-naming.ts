import { DefaultNamingStrategy, NamingStrategyInterface } from "typeorm";

export class CustomNamingStrategy extends DefaultNamingStrategy implements NamingStrategyInterface {
  columnName(propertyName: string, customName: string, embeddedPrefixes: string[]): string {
    return embeddedPrefixes
      .concat(customName || propertyName)
      .map((s, i) => (i > 0 ? s.replace(/^(.)/, c => c.toUpperCase()) : s))
      .join("");
  }
}
