import { z } from 'zod';
import { ALLOWED_USER_SETTINGS } from '../config/userSettings';

const zodTypeMap = {
  boolean: () => z.boolean(),
  number: () => z.number(),
  string: () => z.string(),
  enum: (values: any[]) => z.enum(values.map(String) as [string, ...string[]]), // force enum keys to strings
};

const userSettingsShape: Record<string, z.ZodTypeAny> = {};

for (const [key, def] of Object.entries(ALLOWED_USER_SETTINGS)) {
  let baseSchema: z.ZodTypeAny;

  if (def.type === 'enum') {
    if (!def.values || def.values.length === 0) {
      throw new Error(`Missing enum values for setting: ${key}`);
    }

    baseSchema = zodTypeMap.enum(def.values);
  } else {
    baseSchema = zodTypeMap[def.type]();
  }

  const schemaWithDefault =
    def.default !== undefined ? baseSchema.default(def.default) : baseSchema;

  userSettingsShape[key] = schemaWithDefault;
}

export const UserSettingsSchema = z.object(userSettingsShape);