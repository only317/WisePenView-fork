import { apiPost } from '@/apis/request';
import type {
  CreateAgentData,
  DeleteAgentAssetsData,
  GetAgentInfoData,
  GetAgentVersionBundleInfoData,
  InitUploadAgentAssetsData,
  PublishAgentVersionData,
  RAgentResourceInfoResponse,
  RAgentVersionBundleInfoResponse,
  RAssetUploadInitResponse,
  RString,
  RVoid,
  UpdateAgentInfoData,
  UpdateAgentSpecData,
} from './AgentApi.type';

function createAgent(body: CreateAgentData['body']): Promise<RString['data']> {
  return apiPost('/agent/createAgent', body);
}

function getAgentInfo(
  query: GetAgentInfoData['query']
): Promise<RAgentResourceInfoResponse['data']> {
  return apiPost('/agent/getAgentInfo', null, { params: query });
}

function getAgentVersionBundleInfo(
  query: GetAgentVersionBundleInfoData['query']
): Promise<RAgentVersionBundleInfoResponse['data']> {
  return apiPost('/agent/getAgentVersionBundleInfo', null, { params: query });
}

function changeAgentInfo(body: UpdateAgentInfoData['body']): Promise<RVoid['data']> {
  return apiPost('/agent/changeAgentInfo', body);
}

function updateAgentSpec(body: UpdateAgentSpecData['body']): Promise<RVoid['data']> {
  return apiPost('/agent/updateAgentSpec', body);
}

function initUploadAgentAssets(
  body: InitUploadAgentAssetsData['body']
): Promise<RAssetUploadInitResponse['data']> {
  return apiPost('/agent/initUploadAgentAssets', body);
}

function deleteAgentAssets(body: DeleteAgentAssetsData['body']): Promise<RVoid['data']> {
  return apiPost('/agent/deleteAgentAssets', body);
}

function publishAgentVersion(body: PublishAgentVersionData['body']): Promise<RVoid['data']> {
  return apiPost('/agent/publishAgentVersion', body);
}

export const AgentApi = {
  createAgent,
  getAgentInfo,
  getAgentVersionBundleInfo,
  changeAgentInfo,
  updateAgentSpec,
  initUploadAgentAssets,
  deleteAgentAssets,
  publishAgentVersion,
};
