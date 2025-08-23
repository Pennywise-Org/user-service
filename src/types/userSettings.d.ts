export type SettingType = 'boolean' | 'number' | 'string' | 'enum';

export type SettingDefinition =
  | {
      type: 'boolean' | 'number' | 'string';
      default: boolean | number | string;
      editable: boolean;
      premiumOnly: boolean;
      description?: string;
    }
  | {
      type: 'enum';
      values: string[] | number[];
      default: string | number;
      editable: boolean;
      premiumOnly: boolean;
      description?: string;
    };

export type userSetting = {
  key: string;
  value: string | number | boolean | null;
};

export type userSettingPrisma = userSetting[];
