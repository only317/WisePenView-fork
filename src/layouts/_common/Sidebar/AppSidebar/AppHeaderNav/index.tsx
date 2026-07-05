import { Modal } from '@/components/Overlay';
import { useChatService, useNoteService } from '@/domains';
import {
  clearNewChatSessionStore,
  useChatPanelStore,
  useCurrentChatSessionStore,
  useNewChatSessionStore,
  useNewNoteStore,
} from '@/store';
import { createClientError, FRONTEND_CLIENT_ERROR, parseErrorMessage } from '@/utils/error';
import {
  buildWorkspaceResourcePath,
  RESOURCE_EDITOR_TYPE,
} from '@/utils/navigation/workspaceRoute';
import { Button, Input, ListBox, ListBoxItem, TextField, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import clsx from 'clsx';
import { Bot, CirclePlus, FileText, PenTool, Puzzle, Users, Workflow } from 'lucide-react';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { AppHeaderNavProps } from './index.type';
import styles from './style.module.less';

function AppHeaderNav({ collapsed, onSessionCreated }: AppHeaderNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const chatService = useChatService();
  const noteService = useNoteService();
  const clearCurrentSession = useCurrentChatSessionStore((s) => s.clearCurrentSession);
  const setChatPanelCollapsed = useChatPanelStore((s) => s.setChatPanelCollapsed);
  const setChatPanelDraftOpen = useChatPanelStore((s) => s.setChatPanelDraftOpen);
  const [drawioModalOpen, setDrawioModalOpen] = useState(false);
  const [drawioName, setDrawioName] = useState('未命名图表');

  const isDriveActive = location.pathname.startsWith('/app/drive');
  const isGroupActive = location.pathname.startsWith('/app/my-group');
  const isChatActive = location.pathname.startsWith('/app/chat');
  const isSkillActive =
    location.pathname.startsWith('/app/workspace/skill') ||
    location.pathname.startsWith('/app/skill');
  const isAgentActive = location.pathname.startsWith('/app/workspace/agent');
  const selectedKeys = isChatActive
    ? ['/app/chat']
    : isAgentActive
      ? ['/app/workspace/agent']
      : isSkillActive
        ? ['/app/workspace/skill']
        : isDriveActive
          ? ['/app/drive']
          : isGroupActive
            ? ['/app/my-group']
            : [];
  const { run: runCreateSession, loading: createSessionLoading } = useRequest(
    async () => chatService.createSession(),
    {
      manual: true,
      onSuccess: (session) => {
        useNewChatSessionStore.getState().setNewChatSession({
          id: session.id,
          title: session.title,
        });
        onSessionCreated(session.id, session.title);
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const handleCreateSession = () => {
    if (createSessionLoading) return;

    if (isChatActive) {
      clearCurrentSession();
      clearNewChatSessionStore();
      setChatPanelDraftOpen(false);
      navigate('/app/chat');
      return;
    }

    clearCurrentSession();
    clearNewChatSessionStore();
    setChatPanelDraftOpen(true);
    setChatPanelCollapsed(false);
  };

  const { loading: creatingNote, run: runCreateNote } = useRequest(
    async () => {
      const { resourceId } = await noteService.createNote({ title: '未命名笔记' });
      if (!resourceId) {
        throw createClientError(FRONTEND_CLIENT_ERROR.NOTE_CREATE_RESOURCE_ID_MISSING);
      }
      return { resourceId };
    },
    {
      manual: true,
      onSuccess: ({ resourceId }) => {
        useNewNoteStore.getState().setNewNoteResourceId(resourceId);
        navigate(buildWorkspaceResourcePath(RESOURCE_EDITOR_TYPE.NOTE, resourceId));
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const handleCreateNote = () => {
    if (creatingNote) return;
    const pendingNewNoteId = useNewNoteStore.getState().newNoteResourceId;
    if (pendingNewNoteId != null && pendingNewNoteId !== '') {
      navigate(buildWorkspaceResourcePath(RESOURCE_EDITOR_TYPE.NOTE, pendingNewNoteId));
      return;
    }
    runCreateNote();
  };

  const handleCreateSkill = () => {
    navigate('/app/workspace/skill');
  };

  const handleCreateAgent = () => {
    navigate('/app/workspace/agent');
  };

  const { loading: creatingDrawio, run: runCreateDrawio } = useRequest(
    async () => {
      const title = drawioName.trim() || '未命名图表';
      const { resourceId } = await noteService.createNote({
        title,
        resourceType: 'DRAWIO',
      });
      if (!resourceId) {
        throw createClientError(FRONTEND_CLIENT_ERROR.NOTE_CREATE_RESOURCE_ID_MISSING);
      }
      return { resourceId };
    },
    {
      manual: true,
      onSuccess: ({ resourceId }) => {
        setDrawioModalOpen(false);
        navigate(buildWorkspaceResourcePath(RESOURCE_EDITOR_TYPE.DRAWIO, resourceId));
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const handleOpenDrawioModal = () => {
    if (creatingDrawio) return;
    setDrawioName('未命名图表');
    setDrawioModalOpen(true);
  };

  const handleConfirmCreateDrawio = () => {
    if (creatingDrawio) return;
    runCreateDrawio();
  };

  return (
    <>
      <ListBox
        aria-label="应用导航"
        selectionMode="single"
        selectedKeys={selectedKeys}
        className={clsx(styles.headerMenu, collapsed && styles.headerMenuCollapsed)}
      >
        <ListBoxItem
          id="new-chat"
          textValue="新建对话"
          isDisabled={createSessionLoading}
          className={clsx(styles.menuItem, collapsed && styles.menuItemCollapsed)}
          onPress={handleCreateSession}
        >
          <span className={styles.menuIcon}>
            <CirclePlus size={18} />
          </span>
          {!collapsed && <span className={styles.menuLabel}>新建对话</span>}
        </ListBoxItem>
        <ListBoxItem
          id="new-note"
          textValue="新建笔记"
          isDisabled={creatingNote}
          className={clsx(styles.menuItem, collapsed && styles.menuItemCollapsed)}
          onPress={handleCreateNote}
        >
          <span className={styles.menuIcon}>
            <PenTool size={18} />
          </span>
          {!collapsed && <span className={styles.menuLabel}>新建笔记</span>}
        </ListBoxItem>
        <ListBoxItem
          id="new-drawio"
          textValue="新建 Draw.io 图"
          isDisabled={creatingDrawio}
          className={clsx(styles.menuItem, collapsed && styles.menuItemCollapsed)}
          onPress={handleOpenDrawioModal}
        >
          <span className={styles.menuIcon}>
            <Workflow size={18} />
          </span>
          {!collapsed && <span className={styles.menuLabel}>新建图表</span>}
        </ListBoxItem>
        <ListBoxItem
          id="new-skill"
          textValue="新建 Skill"
          className={clsx(styles.menuItem, collapsed && styles.menuItemCollapsed)}
          onPress={handleCreateSkill}
        >
          <span className={styles.menuIcon}>
            <Puzzle size={18} />
          </span>
          {!collapsed && <span className={styles.menuLabel}>新建 Skill</span>}
        </ListBoxItem>
        <ListBoxItem
          id="new-agent"
          textValue="新建 Agent"
          className={clsx(styles.menuItem, collapsed && styles.menuItemCollapsed)}
          onPress={handleCreateAgent}
        >
          <span className={styles.menuIcon}>
            <Bot size={18} />
          </span>
          {!collapsed && <span className={styles.menuLabel}>新建 Agent</span>}
        </ListBoxItem>
        <ListBoxItem
          id="/app/chat"
          textValue="AI 对话"
          className={clsx(styles.menuItem, collapsed && styles.menuItemCollapsed)}
          onPress={() => navigate('/app/chat')}
        >
          <span className={styles.menuIcon}>
            <Bot size={18} />
          </span>
          {!collapsed && <span className={styles.menuLabel}>AI 对话</span>}
        </ListBoxItem>
        <ListBoxItem
          id="/app/drive"
          textValue="文档与云盘"
          className={clsx(styles.menuItem, collapsed && styles.menuItemCollapsed)}
          onPress={() => navigate('/app/drive')}
        >
          <span className={styles.menuIcon}>
            <FileText size={18} />
          </span>
          {!collapsed && <span className={styles.menuLabel}>文档与云盘</span>}
        </ListBoxItem>
        <ListBoxItem
          id="/app/my-group"
          textValue="我的小组"
          className={clsx(styles.menuItem, collapsed && styles.menuItemCollapsed)}
          onPress={() => navigate('/app/my-group')}
        >
          <span className={styles.menuIcon}>
            <Users size={18} />
          </span>
          {!collapsed && <span className={styles.menuLabel}>我的小组</span>}
        </ListBoxItem>
      </ListBox>
      <Modal isOpen={drawioModalOpen} onOpenChange={setDrawioModalOpen}>
        <Modal.Backdrop isDismissable={!creatingDrawio}>
          <Modal.Container size="sm" placement="center">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>新建 Draw.io 图</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <TextField aria-label="Draw.io 图名称" value={drawioName} onChange={setDrawioName}>
                  <Input
                    placeholder="请输入名称"
                    autoFocus
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        handleConfirmCreateDrawio();
                      }
                    }}
                  />
                </TextField>
              </Modal.Body>
              <Modal.Footer>
                <Button
                  variant="secondary"
                  onPress={() => setDrawioModalOpen(false)}
                  isDisabled={creatingDrawio}
                >
                  取消
                </Button>
                <Button
                  variant="primary"
                  onPress={handleConfirmCreateDrawio}
                  isDisabled={creatingDrawio || !drawioName.trim()}
                >
                  创建
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
}

export default AppHeaderNav;
