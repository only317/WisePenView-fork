import type { ChatWorkspaceContext } from '@/domains/Chat';
import { useLayoutEffect, type ReactNode } from 'react';
import { useOutletContext } from 'react-router-dom';

export type ResolveChatWorkspaceContext = () =>
  ChatWorkspaceContext | null | undefined | Promise<ChatWorkspaceContext | null | undefined>;

export interface WorkspaceHeaderConfig {
  fallbackTo?: string;
  backLabel?: string;
  inlineTitle?: ReactNode;
  extra?: ReactNode;
  titleBlock?: ReactNode;
  className?: string;
}

export interface WorkspaceLayoutConfig {
  className?: string;
  bodyClassName?: string;
  header?: WorkspaceHeaderConfig | false;
  chatPanel?: boolean;
  chatContext?: ChatWorkspaceContext;
  resolveChatWorkspaceContext?: ResolveChatWorkspaceContext;
}

export interface WorkspaceOutletContextValue {
  setLayoutConfig: (config: WorkspaceLayoutConfig) => void;
  resetLayoutConfig: () => void;
}

function useWorkspaceOutletContext() {
  const context = useOutletContext<WorkspaceOutletContextValue | null>();
  if (!context) {
    throw new Error('useWorkspaceOutletContext 必须在 WorkspaceLayout 的 Outlet 内使用');
  }
  return context;
}

export function useWorkspaceLayoutConfig(config: WorkspaceLayoutConfig) {
  const { setLayoutConfig, resetLayoutConfig } = useWorkspaceOutletContext();

  useLayoutEffect(() => {
    setLayoutConfig(config);
  }, [config, setLayoutConfig]);

  useLayoutEffect(() => resetLayoutConfig, [resetLayoutConfig]);
}
