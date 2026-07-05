import ChatPanel from '@/components/ChatPanel';
import DriveSidebar from '@/layouts/_common/Sidebar/DriveSidebar';
import { useChatPanelResize } from '@/layouts/_common/useChatPanelResize';
import { useChatPanelStore, useCurrentChatSessionStore } from '@/store';
import { normalizeResourceEditorType } from '@/utils/navigation/workspaceRoute';
import { useUpdateEffect } from 'ahooks';
import clsx from 'clsx';
import { Bot } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { Outlet, useMatch } from 'react-router-dom';
import WorkspaceFrame from './_common/WorkspaceFrame';
import WorkspaceHeader from './_common/WorkspaceHeader';
import styles from './WorkspaceLayout.module.less';
import type { WorkspaceLayoutConfig, WorkspaceOutletContextValue } from './WorkspaceOutletContext';

function WorkspaceLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [layoutConfig, setLayoutConfigState] = useState<WorkspaceLayoutConfig>({});
  const chatPanelCollapsed = useChatPanelStore((state) => state.chatPanelCollapsed);
  const chatPanelDraftOpen = useChatPanelStore((state) => state.chatPanelDraftOpen);
  const setChatPanelCollapsed = useChatPanelStore((state) => state.setChatPanelCollapsed);
  const setChatPanelDraftOpen = useChatPanelStore((state) => state.setChatPanelDraftOpen);
  const currentSessionId = useCurrentChatSessionStore((state) => state.currentSessionId);
  const hasSessionId = Boolean(currentSessionId);
  const chatPanelEnabled = layoutConfig.chatPanel !== false;
  const shouldRenderChatPanel = chatPanelEnabled && (hasSessionId || chatPanelDraftOpen);
  const safeChatPanelCollapsed = !shouldRenderChatPanel || chatPanelCollapsed;
  const resourceRouteMatch = useMatch('/app/workspace/:editorType/:id');
  const { rootRef, chatResizeGuideRef, chatPanelWidth, chatResizing, onResizeStart } =
    useChatPanelResize();
  const routeChatContext = useMemo(() => {
    const resourceId = resourceRouteMatch?.params.id;
    const editorType = normalizeResourceEditorType(resourceRouteMatch?.params.editorType);
    if (!resourceId || !editorType) return undefined;
    return { resourceId, editorType };
  }, [resourceRouteMatch?.params.editorType, resourceRouteMatch?.params.id]);
  const chatWorkspaceContext = layoutConfig.chatContext ?? routeChatContext;

  useUpdateEffect(() => {
    if (shouldRenderChatPanel) {
      setChatPanelCollapsed(false);
      return;
    }
    setChatPanelCollapsed(true);
  }, [setChatPanelCollapsed, shouldRenderChatPanel]);

  useUpdateEffect(() => {
    if (!hasSessionId && !chatPanelDraftOpen) return;
    if (hasSessionId) {
      setChatPanelDraftOpen(false);
    }
  }, [chatPanelDraftOpen, hasSessionId, setChatPanelDraftOpen]);

  const handleChatExpand = () => {
    if (!shouldRenderChatPanel) return;
    setChatPanelCollapsed(false);
  };
  const handleSidebarToggle = useCallback(() => {
    setSidebarCollapsed((collapsed) => !collapsed);
  }, []);

  const setLayoutConfig = useCallback((config: WorkspaceLayoutConfig) => {
    setLayoutConfigState(config);
  }, []);

  const resetLayoutConfig = useCallback(() => {
    setLayoutConfigState({});
  }, []);

  const outletContext = useMemo<WorkspaceOutletContextValue>(
    () => ({
      setLayoutConfig,
      resetLayoutConfig,
    }),
    [resetLayoutConfig, setLayoutConfig]
  );

  const renderHeader = () => {
    if (layoutConfig.header === false) return null;

    return <WorkspaceHeader {...(layoutConfig.header ?? {})} />;
  };

  return (
    <div
      ref={rootRef}
      className={styles.root}
      style={{ ['--chat-panel-width' as string]: `${chatPanelWidth}px` }}
    >
      {chatResizing && <div ref={chatResizeGuideRef} className={styles.chatResizeGuide} />}
      <aside
        className={clsx(styles.leftSider, sidebarCollapsed && styles.leftSiderCollapsed)}
        aria-label="资源侧边栏"
      >
        <DriveSidebar collapsed={sidebarCollapsed} onToggle={handleSidebarToggle} />
      </aside>

      <div className={styles.middleLayout}>
        {shouldRenderChatPanel && safeChatPanelCollapsed && (
          <div className={styles.chatHandleZone}>
            <button
              type="button"
              className={styles.chatExpandHandle}
              onClick={handleChatExpand}
              aria-label="展开聊天面板"
            >
              <Bot />
            </button>
          </div>
        )}
        <main className={clsx(styles.middleContent, styles.workspaceContent)}>
          <WorkspaceFrame
            className={layoutConfig.className}
            bodyClassName={layoutConfig.bodyClassName}
            header={renderHeader()}
          >
            <Outlet context={outletContext} />
          </WorkspaceFrame>
        </main>
      </div>

      <aside
        className={clsx(styles.rightSider, safeChatPanelCollapsed && styles.rightSiderCollapsed)}
        aria-label="聊天面板"
        aria-hidden={safeChatPanelCollapsed ? true : undefined}
      >
        {!safeChatPanelCollapsed && (
          <button
            type="button"
            className={`${styles.chatResizeHandle} ${chatResizing ? styles.chatResizeHandleActive : ''}`}
            onMouseDown={onResizeStart}
            aria-label="调整聊天面板宽度"
          />
        )}
        <div className={styles.rightSiderInner}>
          {shouldRenderChatPanel ? (
            <ChatPanel
              collapsed={safeChatPanelCollapsed}
              workspaceContext={chatWorkspaceContext}
              resolveWorkspaceContext={layoutConfig.resolveChatWorkspaceContext}
            />
          ) : null}
        </div>
      </aside>
    </div>
  );
}

export default WorkspaceLayout;
