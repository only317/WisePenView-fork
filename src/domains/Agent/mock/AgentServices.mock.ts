import type { AgentDetail, AgentSpec } from '../entity/agent';
import { AGENT_ASSET_UPLOAD_STATUS, AGENT_VERSION_STATUS } from '../enum';
import { AgentServicesMap } from '../mapper/AgentServices.map';
import type { IAgentService, UploadAgentAssetRequest } from '../service/index.type';

const mockSpec: AgentSpec = {
  ...AgentServicesMap.createDefaultAgentSpec(),
  systemPrompt: '你是一个用于演示的 Agent，回答时保持清晰、简洁，并优先说明推理依据。',
  modelPolicy: {
    defaultModelId: 'gpt-4.1',
    defaultProviderId: 'openai',
    allowRequestOverride: true,
  },
};

const mockDetail: AgentDetail = {
  resourceId: 'mock-agent',
  title: 'Mock Agent',
  agentName: 'mock_agent',
  description: 'Mock Agent demo',
  version: 0,
  draftVersion: 1,
  status: AGENT_VERSION_STATUS.DRAFT,
  updatedAt: '',
  creatorId: 'mock-user',
  scopeType: 'PERSONAL',
  spec: mockSpec,
  assetCount: 1,
  isOwner: true,
  versions: [{ version: 1, status: AGENT_VERSION_STATUS.DRAFT, updatedAt: '' }],
  assets: [
    {
      id: 'mock-agent-asset',
      name: 'background.md',
      path: '/',
      assetResourceType: 'MD',
      uploadStatus: AGENT_ASSET_UPLOAD_STATUS.AVAILABLE,
      objectKey: 'mock-agent/background.md',
      size: 512,
    },
  ],
};

export const AgentServicesMock: IAgentService = {
  getAgentSummaries: async () => [mockDetail],
  createAgent: async () => mockDetail.resourceId,
  getAgentDetail: async () => mockDetail,
  getAgentVersionDetail: async () => mockDetail,
  updateAgentInfo: async () => undefined,
  updateAgentSpec: async () => undefined,
  publishVersion: async () => undefined,
  deleteAssets: async () => undefined,
  uploadAsset: async (
    _resourceId: string,
    _draftVersion: number,
    _params: UploadAgentAssetRequest
  ) => undefined,
};
