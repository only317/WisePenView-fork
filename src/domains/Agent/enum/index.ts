import type { EnumValue } from '@/utils/enum';
import { createEnum } from '@/utils/enum';

export const AGENT_VERSION_STATUS = createEnum([
  { value: 'DRAFT', key: 'DRAFT', label: '草稿' },
  { value: 'PUBLISHED', key: 'PUBLISHED', label: '已发布' },
] as const);

export const AGENT_ASSET_RESOURCE_TYPE = createEnum([
  { value: 'MD', key: 'MD', label: 'Markdown' },
  { value: 'PYTHON_SCRIPT', key: 'PYTHON_SCRIPT', label: 'Python' },
  { value: 'TEXT', key: 'TEXT', label: '文本' },
  { value: 'JSON', key: 'JSON', label: 'JSON' },
  { value: 'YAML', key: 'YAML', label: 'YAML' },
  { value: 'TOML', key: 'TOML', label: 'TOML' },
] as const);

export const AGENT_ASSET_UPLOAD_STATUS = createEnum([
  { value: 'UPLOADING', key: 'UPLOADING', label: '上传中' },
  { value: 'AVAILABLE', key: 'AVAILABLE', label: '可用' },
] as const);

export type AgentVersionStatus = EnumValue<typeof AGENT_VERSION_STATUS>;
export type AgentAssetResourceType = EnumValue<typeof AGENT_ASSET_RESOURCE_TYPE>;
export type AgentAssetUploadStatus = EnumValue<typeof AGENT_ASSET_UPLOAD_STATUS>;
