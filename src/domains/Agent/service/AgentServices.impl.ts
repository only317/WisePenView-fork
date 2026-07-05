import type { IResourceService } from '@/domains/Resource';
import { RESOURCE_SORT_BY, RESOURCE_SORT_DIR } from '@/domains/Resource';
import type { IUserService } from '@/domains/User';
import type { AgentAsset, AgentDetail, AgentSpec } from '../entity/agent';
import { AGENT_ASSET_UPLOAD_STATUS, AGENT_VERSION_STATUS } from '../enum';
import { AgentServicesMap } from '../mapper/AgentServices.map';
import type { IAgentService, UploadAgentAssetRequest } from './index.type';

export interface AgentServicesDeps {
  resourceService: IResourceService;
  userService: IUserService;
}

interface StoredAgentVersion {
  version: number;
  status: 'DRAFT' | 'PUBLISHED';
  spec: AgentSpec;
  assets: AgentAsset[];
  updatedAt: string;
}

interface StoredAgent {
  resourceId: string;
  title: string;
  name: string;
  description: string;
  ownerId: string;
  version: number;
  draftVersion: number;
  updatedAt: string;
  versions: StoredAgentVersion[];
}

const STORAGE_KEY = 'wisepen.agent.demo.store';
const MOCK_OWNER_ID = 'mock-user';
const ROOT_PATH = '/';

const seedAgents: StoredAgent[] = [
  {
    resourceId: 'agent-demo',
    title: '论文阅读 Agent',
    name: 'paper_reader_agent',
    description: '用于论文摘要、方法梳理和追问的草稿 Agent',
    ownerId: MOCK_OWNER_ID,
    version: 0,
    draftVersion: 1,
    updatedAt: new Date().toISOString(),
    versions: [
      {
        version: 1,
        status: 'DRAFT',
        updatedAt: new Date().toISOString(),
        spec: {
          ...AgentServicesMap.createDefaultAgentSpec(),
          systemPrompt:
            '你是一个严谨的论文阅读助手。先识别论文主题、核心贡献和实验结论，再用清晰的结构回答用户问题。',
          modelPolicy: {
            defaultModelId: 'gpt-4.1',
            defaultProviderId: 'openai',
            allowRequestOverride: true,
          },
          toolAndSkillPolicy: {
            enableUseTool: true,
            allowToolNames: ['web_search', 'document_reader'],
            denyToolNames: [],
            enableUseSkill: true,
            onDemandSkillIds: ['paper_reading_skill'],
            forceEnabledSkillIds: [],
          },
        },
        assets: [
          {
            id: 'agent-demo-asset-1',
            name: 'background.md',
            path: ROOT_PATH,
            assetResourceType: 'MD',
            uploadStatus: AGENT_ASSET_UPLOAD_STATUS.AVAILABLE,
            objectKey: 'mock-agent/agent-demo/background.md',
            size: 512,
          },
        ],
      },
    ],
  },
];

function cloneAgent<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function readStore(): StoredAgent[] {
  if (typeof window === 'undefined') return cloneAgent(seedAgents);
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seeded = cloneAgent(seedAgents);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }

  try {
    const parsed = JSON.parse(raw) as StoredAgent[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : cloneAgent(seedAgents);
  } catch {
    return cloneAgent(seedAgents);
  }
}

function writeStore(agents: StoredAgent[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(agents));
}

function findAgent(agents: StoredAgent[], resourceId: string): StoredAgent {
  const agent = agents.find((item) => item.resourceId === resourceId);
  if (!agent) {
    throw new Error('未找到 Agent 资源');
  }
  return agent;
}

function findVersion(agent: StoredAgent, version: number): StoredAgentVersion {
  const item = agent.versions.find((versionItem) => versionItem.version === version);
  if (!item) {
    throw new Error('未找到 Agent 版本');
  }
  return item;
}

function normalizeDirectoryPath(path?: string): string {
  const trimmed = path?.trim();
  if (!trimmed || trimmed === ROOT_PATH) return ROOT_PATH;
  const withLeadingSlash = trimmed.startsWith(ROOT_PATH) ? trimmed : `${ROOT_PATH}${trimmed}`;
  return withLeadingSlash.endsWith(ROOT_PATH) ? withLeadingSlash.slice(0, -1) : withLeadingSlash;
}

function mapStoredAgent(agent: StoredAgent, version = agent.draftVersion): AgentDetail {
  const versionBundle = findVersion(agent, version);
  const versions = [...agent.versions]
    .sort((a, b) => b.version - a.version)
    .map((item) => ({
      version: item.version,
      status:
        item.status === AGENT_VERSION_STATUS.PUBLISHED
          ? AGENT_VERSION_STATUS.PUBLISHED
          : AGENT_VERSION_STATUS.DRAFT,
      updatedAt: item.updatedAt,
    }));

  return {
    resourceId: agent.resourceId,
    title: agent.title,
    agentName: agent.name,
    description: agent.description,
    version: agent.version,
    draftVersion: agent.draftVersion,
    status:
      versionBundle.status === AGENT_VERSION_STATUS.PUBLISHED
        ? AGENT_VERSION_STATUS.PUBLISHED
        : AGENT_VERSION_STATUS.DRAFT,
    updatedAt: agent.updatedAt,
    creatorId: agent.ownerId,
    scopeType: 'PERSONAL',
    spec: cloneAgent(versionBundle.spec),
    assets: cloneAgent(versionBundle.assets),
    assetCount: versionBundle.assets.length,
    versions,
    isOwner: true,
  };
}

function validatePublish(agent: StoredAgent): void {
  const draft = findVersion(agent, agent.draftVersion);
  if (!draft.spec.systemPrompt.trim()) {
    throw new Error('发布前需要填写 System Prompt');
  }
  const unavailable = draft.assets.find(
    (asset) => asset.uploadStatus !== AGENT_ASSET_UPLOAD_STATUS.AVAILABLE || !asset.objectKey
  );
  if (unavailable) {
    throw new Error(`附件 ${unavailable.name} 尚未上传完成`);
  }
}

function createAsset(params: UploadAgentAssetRequest): AgentAsset {
  const name = params.name.trim();
  return {
    id: `agent-asset:${Date.now()}:${name}`,
    name,
    path: normalizeDirectoryPath(params.path),
    assetResourceType: AgentServicesMap.resolveAssetResourceType(name),
    uploadStatus: AGENT_ASSET_UPLOAD_STATUS.AVAILABLE,
    objectKey: `mock-agent/${Date.now()}-${name}`,
    size: params.size,
  };
}

export const createAgentServices = (deps: AgentServicesDeps): IAgentService => {
  const { resourceService } = deps;

  const getAgentSummaries = async (groupId?: string) => {
    const base = {
      page: 1,
      size: 100,
      sortBy: RESOURCE_SORT_BY.UPDATE_TIME,
      sortDir: RESOURCE_SORT_DIR.DESC,
      resourceType: 'AGENT',
    };

    try {
      const page = groupId
        ? await resourceService.getGroupResources({ ...base, groupId })
        : await resourceService.getUserResources(base);
      const remote = page.list
        .map(AgentServicesMap.mapAgentSummary)
        .filter((item) => item.resourceId);
      if (remote.length > 0) return remote;
    } catch {
      // demo 分支允许后端未接通时使用本地 Agent 数据。
    }

    return readStore().map((agent) => mapStoredAgent(agent));
  };

  const createAgent = async (title: string, name?: string, description?: string) => {
    const agents = readStore();
    const resourceId = `agent-demo-${Date.now()}`;
    const now = new Date().toISOString();
    const agent: StoredAgent = {
      resourceId,
      title,
      name: name ?? '',
      description: description ?? '',
      ownerId: MOCK_OWNER_ID,
      version: 0,
      draftVersion: 1,
      updatedAt: now,
      versions: [
        {
          version: 1,
          status: 'DRAFT',
          spec: AgentServicesMap.createDefaultAgentSpec(),
          assets: [],
          updatedAt: now,
        },
      ],
    };
    writeStore([agent, ...agents]);
    return resourceId;
  };

  const getAgentDetail = async (resourceId: string) => {
    const agents = readStore();
    return mapStoredAgent(findAgent(agents, resourceId));
  };

  const getAgentVersionDetail = async (resourceId: string, version: number) => {
    const agents = readStore();
    return mapStoredAgent(findAgent(agents, resourceId), version);
  };

  const updateAgentInfo = async (resourceId: string, name?: string, description?: string) => {
    const agents = readStore();
    const agent = findAgent(agents, resourceId);
    agent.name = name ?? '';
    agent.description = description ?? '';
    agent.updatedAt = new Date().toISOString();
    writeStore(agents);
  };

  const updateAgentSpec = async (resourceId: string, draftVersion: number, spec: AgentSpec) => {
    const agents = readStore();
    const agent = findAgent(agents, resourceId);
    const draft = findVersion(agent, draftVersion);
    draft.spec = cloneAgent(spec);
    draft.updatedAt = new Date().toISOString();
    agent.updatedAt = draft.updatedAt;
    writeStore(agents);
  };

  const publishVersion = async (resourceId: string) => {
    const agents = readStore();
    const agent = findAgent(agents, resourceId);
    validatePublish(agent);
    const now = new Date().toISOString();
    const draft = findVersion(agent, agent.draftVersion);
    draft.status = 'PUBLISHED';
    draft.updatedAt = now;
    agent.version = draft.version;
    agent.draftVersion = draft.version + 1;
    agent.updatedAt = now;
    agent.versions = [
      {
        version: agent.draftVersion,
        status: 'DRAFT',
        spec: cloneAgent(draft.spec),
        assets: cloneAgent(draft.assets),
        updatedAt: now,
      },
      ...agent.versions,
    ];
    writeStore(agents);
  };

  const deleteAssets = async (resourceId: string, draftVersion: number, assetIds: string[]) => {
    const agents = readStore();
    const agent = findAgent(agents, resourceId);
    const draft = findVersion(agent, draftVersion);
    const deleteIdSet = new Set(assetIds);
    draft.assets = draft.assets.filter((asset) => !deleteIdSet.has(asset.id));
    draft.updatedAt = new Date().toISOString();
    agent.updatedAt = draft.updatedAt;
    writeStore(agents);
  };

  const uploadAsset = async (
    resourceId: string,
    draftVersion: number,
    params: UploadAgentAssetRequest
  ) => {
    const agents = readStore();
    const agent = findAgent(agents, resourceId);
    const draft = findVersion(agent, draftVersion);
    draft.assets = [...draft.assets, createAsset(params)];
    draft.updatedAt = new Date().toISOString();
    agent.updatedAt = draft.updatedAt;
    writeStore(agents);
  };

  return {
    getAgentSummaries,
    createAgent,
    getAgentDetail,
    getAgentVersionDetail,
    updateAgentInfo,
    updateAgentSpec,
    publishVersion,
    deleteAssets,
    uploadAsset,
  };
};
