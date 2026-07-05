export const AgentAssetResourceTypeEnum = {
  MD: 'MD',
  PYTHON_SCRIPT: 'PYTHON_SCRIPT',
  TEXT: 'TEXT',
  JSON: 'JSON',
  YAML: 'YAML',
  TOML: 'TOML',
} as const;

export type AgentAssetResourceTypeEnum =
  (typeof AgentAssetResourceTypeEnum)[keyof typeof AgentAssetResourceTypeEnum];

export type AgentUploadStatus = 'UPLOADING' | 'AVAILABLE';
export type AgentVersionApiStatus = 'DRAFT' | 'PUBLISHED';

export interface AgentModelPolicyApiInfo {
  defaultModelId?: string;
  defaultProviderId?: string;
  allowRequestOverride?: boolean;
}

export interface AgentToolAndSkillPolicyApiInfo {
  enableUseTool?: boolean;
  allowToolNames?: string[];
  denyToolNames?: string[];
  enableUseSkill?: boolean;
  onDemandSkillIds?: string[];
  forceEnabledSkillIds?: string[];
}

export interface AgentMemoryPolicyApiInfo {
  enableChatMemory?: boolean;
  enablePersistenceChatMemory?: boolean;
  enableChatMemorySummary?: boolean;
  highWatermarkRatio?: number;
  lowWatermarkRatio?: number;
  summaryPrompt?: string;
  enableLongTermMemory?: boolean;
  longTermMemoryLimit?: number;
  longTermMemoryScoreThreshold?: number;
}

export interface AgentSpecApiInfo {
  systemPrompt?: string;
  autoGenerateTitle?: boolean;
  modelPolicy?: AgentModelPolicyApiInfo;
  toolAndSkillPolicy?: AgentToolAndSkillPolicyApiInfo;
  memoryPolicy?: AgentMemoryPolicyApiInfo;
}

export interface AgentAssetApiInfo {
  id?: string;
  name?: string;
  path?: string;
  objectKey?: string;
  assetResourceType?: AgentAssetResourceTypeEnum;
  uploadStatus?: AgentUploadStatus;
  size?: number;
}

export interface AgentResourceApiItem {
  resourceName?: string;
  resourceType?: string;
  ownerId?: string;
  preview?: string;
  size?: number;
  resourceId?: string;
}

export interface AgentInfoApiResponse {
  resourceInfo?: AgentResourceApiItem;
  agentInfo?: {
    name?: string;
    description?: string;
    version?: number;
    sourceType?: string;
  };
}

export interface AgentVersionBundleApiResponse {
  version?: number;
  status?: AgentVersionApiStatus;
  assets?: AgentAssetApiInfo[];
  resourceId?: string;
  spec?: AgentSpecApiInfo;
}

export interface CreateAgentData {
  body: {
    title: string;
    name?: string;
    description?: string;
    sourceType?: string;
  };
}

export interface GetAgentInfoData {
  query: {
    resourceId: string;
    targetVersion?: number;
  };
}

export interface GetAgentVersionBundleInfoData {
  query: {
    resourceId: string;
    version?: number;
  };
}

export interface UpdateAgentInfoData {
  body: {
    resourceId?: string;
    name?: string;
    description?: string;
  };
}

export interface UpdateAgentSpecData {
  body: {
    resourceId: string;
    draftVersion: number;
    spec: AgentSpecApiInfo;
  };
}

export interface InitUploadAgentAssetsData {
  body: {
    resourceId: string;
    draftVersion: number;
    assets: Array<{
      name: string;
      path: string;
      assetResourceType: AgentAssetResourceTypeEnum;
      md5?: string;
      expectedSize?: number;
    }>;
  };
}

export interface DeleteAgentAssetsData {
  body: {
    resourceId: string;
    draftVersion: number;
    assetIds: string[];
  };
}

export interface PublishAgentVersionData {
  body: {
    resourceId: string;
  };
}

export interface RString {
  data?: string;
}

export interface RVoid {
  data?: Record<string, unknown>;
}

export interface RAssetUploadInitResponse {
  data?: {
    resourceId?: string;
    version?: number;
    assetUploadTickets?: Array<{
      assetId?: string;
      path?: string;
      name?: string;
      objectKey?: string;
      putUrl?: string;
      callbackHeader?: string;
      flashUploaded?: boolean;
    }>;
  };
}

export interface RAgentResourceInfoResponse {
  data?: AgentInfoApiResponse;
}

export interface RAgentVersionBundleInfoResponse {
  data?: AgentVersionBundleApiResponse;
}
