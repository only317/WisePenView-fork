import {
  AgentAssetResourceTypeEnum,
  type AgentAssetApiInfo,
  type AgentInfoApiResponse,
  type AgentSpecApiInfo,
  type AgentVersionBundleApiResponse,
} from '../apis/AgentApi.type';
import type {
  AgentAsset,
  AgentDetail,
  AgentSpec,
  AgentSummary,
  AgentVersionItem,
} from '../entity/agent';
import type { AgentAssetResourceType, AgentAssetUploadStatus, AgentVersionStatus } from '../enum';
import {
  AGENT_ASSET_RESOURCE_TYPE,
  AGENT_ASSET_UPLOAD_STATUS,
  AGENT_VERSION_STATUS,
} from '../enum';

const ROOT_PATH = '/';

function createDefaultAgentSpec(): AgentSpec {
  return {
    systemPrompt: '',
    autoGenerateTitle: true,
    modelPolicy: {
      defaultModelId: '',
      defaultProviderId: '',
      allowRequestOverride: true,
    },
    toolAndSkillPolicy: {
      enableUseTool: true,
      allowToolNames: [],
      denyToolNames: [],
      enableUseSkill: true,
      onDemandSkillIds: [],
      forceEnabledSkillIds: [],
    },
    memoryPolicy: {
      enableChatMemory: true,
      enablePersistenceChatMemory: false,
      enableChatMemorySummary: true,
      highWatermarkRatio: 0.8,
      lowWatermarkRatio: 0.4,
      summaryPrompt: '',
      enableLongTermMemory: false,
      longTermMemoryLimit: 20,
      longTermMemoryScoreThreshold: 0.6,
    },
  };
}

function formatVersion(version: number): string {
  return `v${version}.0`;
}

function mapStatus(raw: string | undefined): AgentVersionStatus {
  if (raw === AGENT_VERSION_STATUS.PUBLISHED) return AGENT_VERSION_STATUS.PUBLISHED;
  return AGENT_VERSION_STATUS.DRAFT;
}

function normalizeDirectoryPath(path?: string): string {
  const trimmed = path?.trim();
  if (!trimmed || trimmed === ROOT_PATH) return ROOT_PATH;
  const withLeadingSlash = trimmed.startsWith(ROOT_PATH) ? trimmed : `${ROOT_PATH}${trimmed}`;
  return withLeadingSlash.endsWith(ROOT_PATH) ? withLeadingSlash.slice(0, -1) : withLeadingSlash;
}

function normalizeStringList(value?: string[]): string[] {
  return (value ?? []).map((item) => item.trim()).filter(Boolean);
}

function mapAssetResourceType(raw?: string): AgentAssetResourceType {
  if (raw === AGENT_ASSET_RESOURCE_TYPE.MD) return AGENT_ASSET_RESOURCE_TYPE.MD;
  if (raw === AGENT_ASSET_RESOURCE_TYPE.PYTHON_SCRIPT) {
    return AGENT_ASSET_RESOURCE_TYPE.PYTHON_SCRIPT;
  }
  if (raw === AGENT_ASSET_RESOURCE_TYPE.JSON) return AGENT_ASSET_RESOURCE_TYPE.JSON;
  if (raw === AGENT_ASSET_RESOURCE_TYPE.YAML) return AGENT_ASSET_RESOURCE_TYPE.YAML;
  if (raw === AGENT_ASSET_RESOURCE_TYPE.TOML) return AGENT_ASSET_RESOURCE_TYPE.TOML;
  return AGENT_ASSET_RESOURCE_TYPE.TEXT;
}

function mapUploadStatus(raw?: string): AgentAssetUploadStatus {
  if (raw === AGENT_ASSET_UPLOAD_STATUS.UPLOADING) return AGENT_ASSET_UPLOAD_STATUS.UPLOADING;
  return AGENT_ASSET_UPLOAD_STATUS.AVAILABLE;
}

function mapAgentSpecFromApi(spec?: AgentSpecApiInfo): AgentSpec {
  const defaults = createDefaultAgentSpec();
  const modelPolicy = spec?.modelPolicy;
  const toolAndSkillPolicy = spec?.toolAndSkillPolicy;
  const memoryPolicy = spec?.memoryPolicy;

  return {
    systemPrompt: spec?.systemPrompt ?? defaults.systemPrompt,
    autoGenerateTitle: spec?.autoGenerateTitle ?? defaults.autoGenerateTitle,
    modelPolicy: {
      defaultModelId: modelPolicy?.defaultModelId ?? defaults.modelPolicy.defaultModelId,
      defaultProviderId: modelPolicy?.defaultProviderId ?? defaults.modelPolicy.defaultProviderId,
      allowRequestOverride:
        modelPolicy?.allowRequestOverride ?? defaults.modelPolicy.allowRequestOverride,
    },
    toolAndSkillPolicy: {
      enableUseTool: toolAndSkillPolicy?.enableUseTool ?? defaults.toolAndSkillPolicy.enableUseTool,
      allowToolNames: normalizeStringList(toolAndSkillPolicy?.allowToolNames),
      denyToolNames: normalizeStringList(toolAndSkillPolicy?.denyToolNames),
      enableUseSkill:
        toolAndSkillPolicy?.enableUseSkill ?? defaults.toolAndSkillPolicy.enableUseSkill,
      onDemandSkillIds: normalizeStringList(toolAndSkillPolicy?.onDemandSkillIds),
      forceEnabledSkillIds: normalizeStringList(toolAndSkillPolicy?.forceEnabledSkillIds),
    },
    memoryPolicy: {
      enableChatMemory: memoryPolicy?.enableChatMemory ?? defaults.memoryPolicy.enableChatMemory,
      enablePersistenceChatMemory:
        memoryPolicy?.enablePersistenceChatMemory ??
        defaults.memoryPolicy.enablePersistenceChatMemory,
      enableChatMemorySummary:
        memoryPolicy?.enableChatMemorySummary ?? defaults.memoryPolicy.enableChatMemorySummary,
      highWatermarkRatio:
        memoryPolicy?.highWatermarkRatio ?? defaults.memoryPolicy.highWatermarkRatio,
      lowWatermarkRatio: memoryPolicy?.lowWatermarkRatio ?? defaults.memoryPolicy.lowWatermarkRatio,
      summaryPrompt: memoryPolicy?.summaryPrompt ?? defaults.memoryPolicy.summaryPrompt,
      enableLongTermMemory:
        memoryPolicy?.enableLongTermMemory ?? defaults.memoryPolicy.enableLongTermMemory,
      longTermMemoryLimit:
        memoryPolicy?.longTermMemoryLimit ?? defaults.memoryPolicy.longTermMemoryLimit,
      longTermMemoryScoreThreshold:
        memoryPolicy?.longTermMemoryScoreThreshold ??
        defaults.memoryPolicy.longTermMemoryScoreThreshold,
    },
  };
}

function mapAgentSpecToApi(spec: AgentSpec): AgentSpecApiInfo {
  return {
    systemPrompt: spec.systemPrompt,
    autoGenerateTitle: spec.autoGenerateTitle,
    modelPolicy: {
      defaultModelId: spec.modelPolicy.defaultModelId,
      defaultProviderId: spec.modelPolicy.defaultProviderId,
      allowRequestOverride: spec.modelPolicy.allowRequestOverride,
    },
    toolAndSkillPolicy: {
      enableUseTool: spec.toolAndSkillPolicy.enableUseTool,
      allowToolNames: spec.toolAndSkillPolicy.allowToolNames,
      denyToolNames: spec.toolAndSkillPolicy.denyToolNames,
      enableUseSkill: spec.toolAndSkillPolicy.enableUseSkill,
      onDemandSkillIds: spec.toolAndSkillPolicy.onDemandSkillIds,
      forceEnabledSkillIds: spec.toolAndSkillPolicy.forceEnabledSkillIds,
    },
    memoryPolicy: {
      enableChatMemory: spec.memoryPolicy.enableChatMemory,
      enablePersistenceChatMemory: spec.memoryPolicy.enablePersistenceChatMemory,
      enableChatMemorySummary: spec.memoryPolicy.enableChatMemorySummary,
      highWatermarkRatio: spec.memoryPolicy.highWatermarkRatio,
      lowWatermarkRatio: spec.memoryPolicy.lowWatermarkRatio,
      summaryPrompt: spec.memoryPolicy.summaryPrompt,
      enableLongTermMemory: spec.memoryPolicy.enableLongTermMemory,
      longTermMemoryLimit: spec.memoryPolicy.longTermMemoryLimit,
      longTermMemoryScoreThreshold: spec.memoryPolicy.longTermMemoryScoreThreshold,
    },
  };
}

function mapAgentAssetFromApi(asset: AgentAssetApiInfo): AgentAsset {
  const name = asset.name ?? '';
  const path = normalizeDirectoryPath(asset.path);

  return {
    id: asset.id ?? `${path}:${name}`,
    name,
    path,
    objectKey: asset.objectKey,
    assetResourceType: mapAssetResourceType(asset.assetResourceType),
    uploadStatus: mapUploadStatus(asset.uploadStatus),
    size: asset.size,
  };
}

function mapAgentDetail(params: {
  resourceId: string;
  info?: AgentInfoApiResponse;
  bundle?: AgentVersionBundleApiResponse;
  currentUserId?: string;
}): AgentDetail {
  const resourceInfo = params.info?.resourceInfo;
  const agentInfo = params.info?.agentInfo;
  const version = agentInfo?.version ?? 0;
  const assets = (params.bundle?.assets ?? []).map(mapAgentAssetFromApi);
  const ownerId = resourceInfo?.ownerId ?? '';
  const status = mapStatus(params.bundle?.status);
  const updatedAt = '';
  const versions: AgentVersionItem[] =
    version > 0
      ? [
          { version: version + 1, status: AGENT_VERSION_STATUS.DRAFT, updatedAt },
          ...Array.from({ length: version }, (_, index) => ({
            version: version - index,
            status: AGENT_VERSION_STATUS.PUBLISHED,
            updatedAt,
          })),
        ]
      : [{ version: 1, status: AGENT_VERSION_STATUS.DRAFT, updatedAt }];

  return {
    resourceId: params.resourceId,
    title: resourceInfo?.resourceName ?? '',
    agentName: agentInfo?.name ?? '',
    description: agentInfo?.description ?? '',
    version,
    draftVersion: version + 1,
    status,
    updatedAt,
    creatorId: ownerId,
    scopeType: 'PERSONAL',
    spec: mapAgentSpecFromApi(params.bundle?.spec),
    assets,
    assetCount: assets.length,
    versions,
    isOwner: Boolean(params.currentUserId && ownerId === params.currentUserId),
  };
}

function mapAgentSummary(item: {
  resourceId?: string;
  resourceName?: string;
  ownerId?: string;
}): AgentSummary {
  return {
    resourceId: item.resourceId ?? '',
    title: item.resourceName ?? '',
    agentName: '',
    description: '',
    version: 0,
    status: AGENT_VERSION_STATUS.DRAFT,
    updatedAt: '',
    creatorId: item.ownerId ?? '',
    scopeType: 'PERSONAL',
  };
}

function resolveAssetResourceType(name: string): AgentAssetResourceTypeEnum {
  const ext = name.split('.').pop()?.toLowerCase();
  const typeMap: Record<string, AgentAssetResourceTypeEnum> = {
    md: AgentAssetResourceTypeEnum.MD,
    py: AgentAssetResourceTypeEnum.PYTHON_SCRIPT,
    txt: AgentAssetResourceTypeEnum.TEXT,
    json: AgentAssetResourceTypeEnum.JSON,
    yaml: AgentAssetResourceTypeEnum.YAML,
    yml: AgentAssetResourceTypeEnum.YAML,
    toml: AgentAssetResourceTypeEnum.TOML,
  };
  return typeMap[ext ?? ''] ?? AgentAssetResourceTypeEnum.TEXT;
}

export const AgentServicesMap = {
  createDefaultAgentSpec,
  formatVersion,
  mapAgentDetail,
  mapAgentSummary,
  mapAgentSpecFromApi,
  mapAgentSpecToApi,
  resolveAssetResourceType,
};
