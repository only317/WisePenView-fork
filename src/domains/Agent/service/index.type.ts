import type { AgentDetail, AgentSpec, AgentSummary } from '../entity/agent';

export interface UploadAgentAssetRequest {
  name: string;
  path: string;
  content?: string | Blob;
  size?: number;
  md5?: string;
}

export interface IAgentService {
  getAgentSummaries(groupId?: string): Promise<AgentSummary[]>;
  createAgent(title: string, name?: string, description?: string): Promise<string>;
  getAgentDetail(resourceId: string): Promise<AgentDetail>;
  getAgentVersionDetail(resourceId: string, version: number): Promise<AgentDetail>;
  updateAgentInfo(resourceId: string, name?: string, description?: string): Promise<void>;
  updateAgentSpec(resourceId: string, draftVersion: number, spec: AgentSpec): Promise<void>;
  publishVersion(resourceId: string): Promise<void>;
  deleteAssets(resourceId: string, draftVersion: number, assetIds: string[]): Promise<void>;
  uploadAsset(
    resourceId: string,
    draftVersion: number,
    params: UploadAgentAssetRequest
  ): Promise<void>;
}
