export interface FormField {
  name: string;
  label: string;
  type: "text" | "number" | "select" | "textarea" | "toggle" | "key-value" | "tags";
  section: string;
  default: string | number | boolean | Record<string, string> | string[];
  required?: boolean;
  placeholder?: string;
  description?: string;
  options?: { label: string; value: string }[];
  min?: number;
  max?: number;
  condition?: { field: string; value: unknown };
}

export interface ResourceTemplate {
  id: string;
  name: string;
  kind: string;
  apiVersion: string;
  description: string;
  icon: string;
  sections: string[];
  fields: FormField[];
  generateYaml: (values: Record<string, unknown>) => string;
}
