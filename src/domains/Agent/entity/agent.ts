import type { AgentAssetResourceType, AgentAssetUploadStatus, AgentVersionStatus } from '../enum';

export type AgentScopeType = 'PERSONAL' | 'GROUP';

export interface AgentModelPolicy {
  defaultModelId: string;
  defaultProviderId: string;
  allowRequestOverride: boolean;
}

export interface AgentToolAndSkillPolicy {
  enableUseTool: boolean;
  allowToolNames: string[];
  denyToolNames: string[];
  enableUseSkill: boolean;
  onDemandSkillIds: string[];
  forceEnabledSkillIds: string[];
}

export interface AgentMemoryPolicy {
  enableChatMemory: boolean;
  enablePersistenceChatMemory: boolean;
  enableChatMemorySummary: boolean;
  highWatermarkRatio: number;
  lowWatermarkRatio: number;
  summaryPrompt: string;
  enableLongTermMemory: boolean;
  longTermMemoryLimit: number;
  longTermMemoryScoreThreshold: number;
}

export interface AgentSpec {
  systemPrompt: string;
  autoGenerateTitle: boolean;
  modelPolicy: AgentModelPolicy;
  toolAndSkillPolicy: AgentToolAndSkillPolicy;
  memoryPolicy: AgentMemoryPolicy;
}

export interface AgentAsset {
  id: string;
  name: string;
  path: string;
  assetResourceType: AgentAssetResourceType;
  uploadStatus: AgentAssetUploadStatus;
  objectKey?: string;
  size?: number;
}

export interface AgentSummary {
  resourceId: string;
  title: string;
  agentName: string;
  description: string;
  version: number;
  status: AgentVersionStatus;
  updatedAt: string;
  creatorId: string;
  scopeType: AgentScopeType;
  groupId?: string;
  groupName?: string;
}

export interface AgentVersionItem {
  version: number;
  status: AgentVersionStatus;
  updatedAt: string;
}

export interface AgentDetail extends AgentSummary {
  draftVersion: number;
  spec: AgentSpec;
  assets: AgentAsset[];
  assetCount: number;
  versions: AgentVersionItem[];
  isOwner: boolean;
}
