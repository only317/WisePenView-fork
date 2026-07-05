import { getApiBaseURL } from '@/apis/apiServerAddr';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useCallback } from 'react';
import type {
  ChatCompletionRequest,
  ChatFrontendState,
  SendSessionMessageOptions,
  UseChatSessionOptions,
} from './index.type';

// 调用时求值：apiServerAddr 会在生产环境随网络变化运行时切换，固化会失效
const getCompletionsApi = (): string => `${getApiBaseURL()}chat/completions`;

const buildFrontendStates = ({
  selectedText,
  enableSelected,
  workspaceContext,
  selectedResources,
}: SendSessionMessageOptions): ChatFrontendState[] => {
  const frontendStates: ChatFrontendState[] = [];
  const selectedValue = selectedText?.trim();

  if (selectedValue) {
    frontendStates.push({
      key: 'selected_text',
      value: selectedValue,
      disabled: !enableSelected,
    });
  }

  if (workspaceContext?.resourceId) {
    frontendStates.push({
      key: 'workspace_open_resource',
      value: {
        resource_id: workspaceContext.resourceId,
        editor_type: workspaceContext.editorType,
      },
    });
  }

  if (workspaceContext?.draftAgent) {
    frontendStates.push({
      key: 'draft_agent',
      value: {
        resource_id: workspaceContext.draftAgent.resourceId,
        draft_version: workspaceContext.draftAgent.draftVersion,
        spec: workspaceContext.draftAgent.spec,
        assets: workspaceContext.draftAgent.assets ?? [],
        updated_at: workspaceContext.draftAgent.updatedAt,
      },
    });
  }

  const activeResources = (selectedResources ?? []).filter((resource) => resource.enabled);
  if (activeResources.length > 0) {
    frontendStates.push({
      key: 'selected_resources',
      value: activeResources.map((resource) => ({
        resource_id: resource.resourceId,
        resource_name: resource.resourceName,
        resource_type: resource.resourceType,
      })),
    });
  }

  return frontendStates;
};

const buildRequestBody = ({
  defaultSessionId,
  defaultModel,
  query,
  options,
}: {
  defaultSessionId: string;
  defaultModel?: string;
  query: string;
  options?: SendSessionMessageOptions;
}): ChatCompletionRequest => {
  const resolvedModel = options?.model ?? defaultModel;
  const frontendStates = buildFrontendStates(options ?? {});
  const attachmentIds = (options?.uploadedAttachments ?? [])
    .filter((attachment) => attachment.enabled)
    .map((attachment) => attachment.attachmentId);

  return {
    session_id: options?.sessionId ?? defaultSessionId,
    query,
    ...(resolvedModel ? { model: resolvedModel } : {}),
    ...(options?.providerId ? { provider_id: options.providerId } : {}),
    ...(options?.runtimeOptions ? { runtime_options: options.runtimeOptions } : {}),
    ...(frontendStates.length > 0 ? { frontend_states: frontendStates } : {}),
    ...(attachmentIds.length > 0 ? { user_defined_attachment_ids: attachmentIds } : {}),
    ...(options?.allowToolNames && options.allowToolNames.length > 0
      ? { user_defined_allow_tool_names: options.allowToolNames }
      : {}),
    ...(options?.denyToolNames && options.denyToolNames.length > 0
      ? { user_defined_deny_tool_names: options.denyToolNames }
      : {}),
    ...(options?.onDemandSkillIds && options.onDemandSkillIds.length > 0
      ? { user_defined_on_demand_skill_ids: options.onDemandSkillIds }
      : {}),
    ...(options?.forceEnabledSkillIds && options.forceEnabledSkillIds.length > 0
      ? { user_defined_force_enabled_skill_ids: options.forceEnabledSkillIds }
      : {}),
  };
};

/**
 * 对 useChat 的薄封装：
 * 1) 统一请求地址到 /chat/completions
 * 2) 统一补齐后端 ChatRequest 字段
 * 3) 保留 useChat 原始能力（messages、status、stop 等）
 */
export const useChatSession = ({ sessionId, model }: UseChatSessionOptions) => {
  const chat = useChat({
    transport: new DefaultChatTransport({
      api: getCompletionsApi(),
      fetch: (input, init) =>
        fetch(input, {
          ...init,
          credentials: 'include',
        }),
    }),
  });

  const sendSessionMessage = useCallback(
    async (query: string, options?: SendSessionMessageOptions) => {
      const requestBody = buildRequestBody({
        defaultSessionId: sessionId,
        defaultModel: model,
        query,
        options,
      });
      await chat.sendMessage({ text: query }, { body: requestBody });
    },
    [chat, model, sessionId]
  );

  return {
    ...chat,
    sendSessionMessage,
  };
};
