import { Empty, ResultState, Spin } from '@/components/Feedback';
import EntryIcon from '@/components/Icons/EntryIcon';
import { useAgentService, useChatService } from '@/domains';
import type { AgentAsset, AgentDetail, AgentSpec } from '@/domains/Agent';
import { AGENT_ASSET_RESOURCE_TYPE, AgentServicesMap } from '@/domains/Agent';
import {
  buildAdvancedSkillTreeGroups,
  type CapabilityToolOption,
  type ChatWorkspaceContext,
  type SkillScopeTreeGroup,
} from '@/domains/Chat';
import { useEffectForce } from '@/hooks/useEffectForce';
import {
  useWorkspaceLayoutConfig,
  type WorkspaceLayoutConfig,
} from '@/layouts/Workspace/WorkspaceOutletContext';
import { useChatPanelStore } from '@/store';
import { parseErrorMessage } from '@/utils/error';
import {
  buildWorkspaceResourcePath,
  RESOURCE_EDITOR_TYPE,
} from '@/utils/navigation/workspaceRoute';
import { Button, Input, Label, Modal, Switch, TextArea, TextField, toast } from '@heroui/react';
import { useLatest, useRequest } from 'ahooks';
import {
  Bot,
  Database,
  FileUp,
  Pencil,
  Save,
  Settings2,
  Sparkles,
  Trash2,
  Upload,
  Wrench,
  X,
} from 'lucide-react';
import { useCallback, useMemo, useRef, useState, type ReactNode, type UIEvent } from 'react';
import { Link, useBeforeUnload, useBlocker, useNavigate } from 'react-router-dom';

import AgentSkillPickerModal from './_components/AgentSkillPickerModal';
import AgentToolPickerModal from './_components/AgentToolPickerModal';
import AgentVersionDropdown from './_components/AgentVersionDropdown';
import CreateAgentModal from './_components/CreateAgentModal';
import styles from './style.module.less';

interface AgentViewProps {
  resourceId?: string;
}

interface AgentLayoutConfigProps {
  children: ReactNode;
  config?: WorkspaceLayoutConfig;
}

interface AgentToolbarTitleProps {
  title?: string;
  saveStatus?: AgentSaveStatus;
}

interface BooleanFieldProps {
  label: string;
  isSelected: boolean;
  isDisabled?: boolean;
  onChange: (isSelected: boolean) => void;
}

interface AgentInfoDraft {
  agentName: string;
  description: string;
}

interface AgentDebugSnapshot {
  agent?: AgentDetail;
  draftSpec: AgentSpec | null;
  savedSpec: AgentSpec | null;
  draftInfo: AgentInfoDraft;
  draftAssets: AgentAsset[];
  savedAssets: AgentAsset[];
  isDirty: boolean;
}

interface SaveAgentOptions {
  showToast?: boolean;
  refresh?: boolean;
  keepEditing?: boolean;
}

type AgentSaveStatus = 'saved' | 'dirty' | 'saving';
type ToolPolicyTarget = 'allowToolNames' | 'denyToolNames';
type SkillPolicyTarget = 'onDemandSkillIds' | 'forceEnabledSkillIds';

interface ToolPolicyCardProps {
  title: string;
  description: string;
  loading?: boolean;
  disabled?: boolean;
  selectedToolIds: string[];
  toolLabelMap: Map<string, string>;
  onPick: () => void;
  onRemove: (toolId: string) => void;
}

interface SkillPolicyCardProps {
  title: string;
  description: string;
  disabled?: boolean;
  loading?: boolean;
  selectedSkillIds: string[];
  skillLabelMap: Map<string, string>;
  onPick: () => void;
  onRemove: (skillId: string) => void;
}

const CONFIG_SECTIONS: Array<{ id: string; label: string; icon: ReactNode }> = [
  { id: 'agent-basic', label: '基础信息', icon: <Bot size={16} /> },
  { id: 'agent-prompt', label: 'System Prompt', icon: <Pencil size={16} /> },
  { id: 'agent-model', label: '模型策略', icon: <Settings2 size={16} /> },
  { id: 'agent-tools', label: '工具与 Skill', icon: <Wrench size={16} /> },
  { id: 'agent-memory', label: '记忆策略', icon: <Database size={16} /> },
  { id: 'agent-assets', label: '附件资源', icon: <FileUp size={16} /> },
];

const EMPTY_TOOL_OPTIONS: CapabilityToolOption[] = [];

function buildSignature(value: unknown): string {
  return JSON.stringify(value);
}

function formatSaveStatus(status?: AgentSaveStatus): string | null {
  if (status === 'dirty') return '有未保存修改';
  if (status === 'saving') return '保存中...';
  if (status === 'saved') return '已经保存草稿';
  return null;
}

function clampNumber(value: string, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function formatFileSize(size?: number): string {
  if (size == null) return '-';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function buildAgentDebugChatContext(
  agent: AgentDetail,
  spec: AgentSpec,
  assets: AgentAsset[]
): ChatWorkspaceContext {
  return {
    resourceId: agent.resourceId,
    editorType: RESOURCE_EDITOR_TYPE.AGENT,
    draftAgent: {
      resourceId: agent.resourceId,
      draftVersion: agent.draftVersion,
      spec,
      updatedAt: agent.updatedAt,
      assets: assets.map((asset) => ({
        id: asset.id,
        name: asset.name,
        path: asset.path,
        assetResourceType: asset.assetResourceType,
        uploadStatus: asset.uploadStatus,
        objectKey: asset.objectKey,
      })),
    },
  };
}

function getSectionElement(container: HTMLElement, sectionId: string): HTMLElement | null {
  return container.querySelector<HTMLElement>(`[data-agent-section="${sectionId}"]`);
}

function scrollToSection(scrollContainer: HTMLElement | null, sectionId: string): void {
  if (!scrollContainer) return;
  const target = getSectionElement(scrollContainer, sectionId);
  if (!target) return;
  const containerTop = scrollContainer.getBoundingClientRect().top;
  const targetTop = target.getBoundingClientRect().top;
  const nextTop = scrollContainer.scrollTop + targetTop - containerTop - 12;
  scrollContainer.scrollTo({ top: Math.max(0, nextTop), behavior: 'smooth' });
}

function resolveActiveSectionId(scrollContainer: HTMLElement): string {
  const containerTop = scrollContainer.getBoundingClientRect().top;
  let activeSectionId = CONFIG_SECTIONS[0].id;

  for (const section of CONFIG_SECTIONS) {
    const sectionElement = getSectionElement(scrollContainer, section.id);
    if (!sectionElement) continue;
    const distance = sectionElement.getBoundingClientRect().top - containerTop;
    if (distance <= 80) {
      activeSectionId = section.id;
    }
  }

  return activeSectionId;
}

function BooleanField({ label, isSelected, isDisabled, onChange }: BooleanFieldProps) {
  return (
    <div className={styles.booleanField}>
      <span className={styles.switchLabel}>{label}</span>
      <Switch
        aria-label={label}
        className={styles.switchItem}
        isSelected={isSelected}
        isDisabled={isDisabled}
        onChange={(value) => {
          if (typeof value === 'boolean') onChange(value);
        }}
        size="sm"
      >
        <Switch.Content className={styles.switchContent}>
          <Switch.Control className={styles.switchControl}>
            <Switch.Thumb className={styles.switchThumb} />
          </Switch.Control>
        </Switch.Content>
      </Switch>
    </div>
  );
}

function ToolPolicyCard({
  title,
  description,
  loading,
  disabled,
  selectedToolIds,
  toolLabelMap,
  onPick,
  onRemove,
}: ToolPolicyCardProps) {
  return (
    <div className={styles.capabilityCard}>
      <div className={styles.capabilityHeader}>
        <div>
          <h3 className={styles.capabilityTitle}>{title}</h3>
          <p className={styles.capabilityDescription}>{description}</p>
        </div>
        <Button variant="secondary" size="sm" onPress={onPick} isDisabled={disabled || loading}>
          <Wrench size={15} />
          <span>{selectedToolIds.length > 0 ? '调整' : '选择'}</span>
        </Button>
      </div>
      {selectedToolIds.length > 0 ? (
        <div className={styles.skillChipList}>
          {selectedToolIds.map((toolId) => (
            <span key={toolId} className={styles.skillChip}>
              <span>{toolLabelMap.get(toolId) ?? toolId}</span>
              {!disabled ? (
                <button
                  type="button"
                  className={styles.skillChipRemove}
                  aria-label={`移除 ${toolLabelMap.get(toolId) ?? toolId}`}
                  onClick={() => onRemove(toolId)}
                >
                  <X size={13} />
                </button>
              ) : null}
            </span>
          ))}
        </div>
      ) : (
        <div className={styles.capabilityEmpty}>{loading ? '正在加载 Tool' : '未选择 Tool'}</div>
      )}
    </div>
  );
}

function SkillPolicyCard({
  title,
  description,
  disabled,
  loading,
  selectedSkillIds,
  skillLabelMap,
  onPick,
  onRemove,
}: SkillPolicyCardProps) {
  return (
    <div className={styles.capabilityCard}>
      <div className={styles.capabilityHeader}>
        <div>
          <h3 className={styles.capabilityTitle}>{title}</h3>
          <p className={styles.capabilityDescription}>{description}</p>
        </div>
        <Button variant="secondary" size="sm" onPress={onPick} isDisabled={disabled || loading}>
          <Sparkles size={15} />
          <span>{selectedSkillIds.length > 0 ? '调整' : '选择'}</span>
        </Button>
      </div>
      {selectedSkillIds.length > 0 ? (
        <div className={styles.skillChipList}>
          {selectedSkillIds.map((skillId) => (
            <span key={skillId} className={styles.skillChip}>
              <span>{skillLabelMap.get(skillId) ?? skillId}</span>
              {!disabled ? (
                <button
                  type="button"
                  className={styles.skillChipRemove}
                  aria-label={`移除 ${skillLabelMap.get(skillId) ?? skillId}`}
                  onClick={() => onRemove(skillId)}
                >
                  <X size={13} />
                </button>
              ) : null}
            </span>
          ))}
        </div>
      ) : (
        <div className={styles.capabilityEmpty}>未选择 Skill</div>
      )}
    </div>
  );
}

function AgentLayoutConfig({ children, config }: AgentLayoutConfigProps) {
  const frameConfig = useMemo<WorkspaceLayoutConfig>(
    () => ({
      className: styles.pageWrap,
      ...(config ?? {}),
    }),
    [config]
  );
  useWorkspaceLayoutConfig(frameConfig);

  return <>{children}</>;
}

function AgentToolbarTitle({ title, saveStatus }: AgentToolbarTitleProps) {
  const saveStatusText = formatSaveStatus(saveStatus);

  return (
    <span className={styles.toolbarTitleText}>
      <span className={styles.toolbarTitleIcon} aria-hidden="true">
        <EntryIcon entryType="resource" resourceIconType="agent" size={18} />
      </span>
      <span className={styles.toolbarTitleContent}>
        <span className={styles.toolbarTitleName}>{title || '未命名 Agent'}</span>
        {saveStatusText ? (
          <span
            className={`${styles.toolbarSaveStatus} ${
              saveStatus === 'dirty' ? styles.toolbarSaveStatusDirty : ''
            }`}
          >
            {saveStatusText}
          </span>
        ) : null}
      </span>
    </span>
  );
}

function AgentView({ resourceId = '' }: AgentViewProps = {}) {
  const navigate = useNavigate();
  const agentService = useAgentService();
  const chatService = useChatService();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorScrollRef = useRef<HTMLDivElement>(null);
  const debugSaveConfirmResolveRef = useRef<((confirmed: boolean) => void) | null>(null);
  const setChatPanelCollapsed = useChatPanelStore((state) => state.setChatPanelCollapsed);
  const setChatPanelDraftOpen = useChatPanelStore((state) => state.setChatPanelDraftOpen);
  const [draftSpec, setDraftSpec] = useState<AgentSpec | null>(null);
  const [savedSpec, setSavedSpec] = useState<AgentSpec | null>(null);
  const [draftInfo, setDraftInfo] = useState<AgentInfoDraft>({ agentName: '', description: '' });
  const [savedInfo, setSavedInfo] = useState<AgentInfoDraft>({ agentName: '', description: '' });
  const [draftAssets, setDraftAssets] = useState<AgentAsset[]>([]);
  const [savedAssets, setSavedAssets] = useState<AgentAsset[]>([]);
  const [viewingVersion, setViewingVersion] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [activeConfigSection, setActiveConfigSection] = useState(CONFIG_SECTIONS[0].id);
  const [createModalOpen, setCreateModalOpen] = useState(!resourceId);
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);
  const [debugSaveConfirmOpen, setDebugSaveConfirmOpen] = useState(false);
  const [toolPickerTarget, setToolPickerTarget] = useState<ToolPolicyTarget | null>(null);
  const [skillPickerTarget, setSkillPickerTarget] = useState<SkillPolicyTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AgentAsset | null>(null);

  const {
    data: agent,
    loading,
    error,
    refresh: refreshAgent,
  } = useRequest(() => agentService.getAgentDetail(resourceId), {
    ready: Boolean(resourceId),
    refreshDeps: [resourceId],
  });

  const { data: capabilityData, loading: capabilityLoading } = useRequest(
    async () => {
      const [workspace, tools] = await Promise.all([
        chatService.getWorkspace(),
        chatService.getTools(),
      ]);
      return { workspace, tools };
    },
    {
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  /**
   * Agent 详情刷新后重置草稿表单；这些表单是用户可编辑的本地草稿，不适合只靠渲染派生。
   */
  useEffectForce(() => {
    if (!agent) return;
    const info = { agentName: agent.agentName, description: agent.description };
    setDraftSpec(agent.spec);
    setSavedSpec(agent.spec);
    setDraftInfo(info);
    setSavedInfo(info);
    setDraftAssets(agent.assets);
    setSavedAssets(agent.assets);
    setViewingVersion(agent.draftVersion);
    setEditing(false);
  }, [agent]);

  /**
   * 已有 Agent 进入编辑器时打开右侧草稿调试面板，面板内容沿用 Workspace ChatPanel。
   */
  useEffectForce(() => {
    if (!resourceId) return;
    setChatPanelDraftOpen(true);
    setChatPanelCollapsed(false);
  }, [resourceId, setChatPanelCollapsed, setChatPanelDraftOpen]);

  /**
   * 进入无 resourceId 的兼容路由时自动打开创建弹窗；关闭时回到云盘。
   */
  useEffectForce(() => {
    if (!resourceId) setCreateModalOpen(true);
  }, [resourceId]);

  const isViewingDraft = agent ? viewingVersion === agent.draftVersion : false;
  const canEdit = Boolean(agent?.isOwner && isViewingDraft);
  const disabled = !editing || !canEdit || loading;
  const isDirty = useMemo(() => {
    if (!canEdit) return false;
    return (
      buildSignature(draftSpec) !== buildSignature(savedSpec) ||
      buildSignature(draftInfo) !== buildSignature(savedInfo) ||
      buildSignature(draftAssets) !== buildSignature(savedAssets)
    );
  }, [canEdit, draftAssets, draftInfo, draftSpec, savedAssets, savedInfo, savedSpec]);
  const navigationBlocker = useBlocker(isDirty);
  const agentDebugSnapshotRef = useLatest<AgentDebugSnapshot>({
    agent,
    draftSpec,
    savedSpec,
    draftInfo,
    draftAssets,
    savedAssets,
    isDirty,
  });

  useBeforeUnload(
    useCallback(
      (event) => {
        if (!isDirty) return;
        event.preventDefault();
        event.returnValue = '';
      },
      [isDirty]
    ),
    { capture: true }
  );

  const versionItems = useMemo(() => {
    return (agent?.versions ?? []).map((item) => ({
      key: `v${item.version}`,
      version: item.version,
      current: viewingVersion === item.version,
    }));
  }, [agent?.versions, viewingVersion]);

  const disabledVersionKeys = useMemo(
    () => (agent?.isOwner ? new Set<string>() : new Set(versionItems.map((item) => item.key))),
    [agent?.isOwner, versionItems]
  );

  const toolOptions = capabilityData?.tools ?? EMPTY_TOOL_OPTIONS;
  const toolLabelMap = useMemo(() => {
    const mapping = new Map<string, string>();
    toolOptions.forEach((tool) => mapping.set(tool.toolId, tool.label));
    return mapping;
  }, [toolOptions]);
  const skillGroups = useMemo<SkillScopeTreeGroup[]>(() => {
    if (!capabilityData) return [];
    return buildAdvancedSkillTreeGroups(
      capabilityData.workspace.skills,
      capabilityData.workspace.groups
    );
  }, [capabilityData]);
  const skillLabelMap = useMemo(() => {
    const mapping = new Map<string, string>();
    skillGroups.forEach((group) => {
      group.skills.forEach((skill) => mapping.set(skill.skillId, skill.displayName));
    });
    return mapping;
  }, [skillGroups]);

  const chatContext = useMemo<WorkspaceLayoutConfig['chatContext']>(() => {
    if (!agent) return undefined;
    return {
      resourceId: agent.resourceId,
      editorType: RESOURCE_EDITOR_TYPE.AGENT,
    };
  }, [agent]);

  const updateDraftSpec = (updater: (current: AgentSpec) => AgentSpec) => {
    if (!canEdit) return;
    setDraftSpec((current) => (current ? updater(current) : current));
  };

  const updateModelPolicy = <K extends keyof AgentSpec['modelPolicy']>(
    key: K,
    value: AgentSpec['modelPolicy'][K]
  ) => {
    updateDraftSpec((current) => ({
      ...current,
      modelPolicy: { ...current.modelPolicy, [key]: value },
    }));
  };

  const updateToolAndSkillPolicy = <K extends keyof AgentSpec['toolAndSkillPolicy']>(
    key: K,
    value: AgentSpec['toolAndSkillPolicy'][K]
  ) => {
    updateDraftSpec((current) => ({
      ...current,
      toolAndSkillPolicy: { ...current.toolAndSkillPolicy, [key]: value },
    }));
  };

  const updateToolPolicySelection = (target: ToolPolicyTarget, toolIds: string[]) => {
    if (disabled) return;
    updateDraftSpec((current) => {
      const policy = current.toolAndSkillPolicy;
      const oppositeTarget: ToolPolicyTarget =
        target === 'allowToolNames' ? 'denyToolNames' : 'allowToolNames';
      const selectedToolIdSet = new Set(toolIds);

      return {
        ...current,
        toolAndSkillPolicy: {
          ...policy,
          [target]: toolIds,
          [oppositeTarget]: policy[oppositeTarget].filter((item) => !selectedToolIdSet.has(item)),
        },
      };
    });
  };

  const removeToolPolicyItem = (target: ToolPolicyTarget, toolId: string) => {
    if (disabled) return;
    updateToolPolicySelection(
      target,
      draftSpec?.toolAndSkillPolicy[target].filter((item) => item !== toolId) ?? []
    );
  };

  const handleToolPickerConfirm = (toolIds: string[]) => {
    if (!toolPickerTarget) return;
    updateToolPolicySelection(toolPickerTarget, toolIds);
    setToolPickerTarget(null);
  };

  const removeSkillPolicyItem = (target: SkillPolicyTarget, skillId: string) => {
    if (disabled) return;
    updateToolAndSkillPolicy(
      target,
      draftSpec?.toolAndSkillPolicy[target].filter((item) => item !== skillId) ?? []
    );
  };

  const handleSkillPickerConfirm = (skillIds: string[]) => {
    if (!skillPickerTarget) return;
    updateToolAndSkillPolicy(skillPickerTarget, skillIds);
    setSkillPickerTarget(null);
  };

  const updateMemoryPolicy = <K extends keyof AgentSpec['memoryPolicy']>(
    key: K,
    value: AgentSpec['memoryPolicy'][K]
  ) => {
    updateDraftSpec((current) => ({
      ...current,
      memoryPolicy: { ...current.memoryPolicy, [key]: value },
    }));
  };

  const {
    loading: saveLoading,
    run: runSave,
    runAsync: runSaveAsync,
  } = useRequest(
    async (spec: AgentSpec, info: AgentInfoDraft, options?: SaveAgentOptions) => {
      if (!agent) return null;
      await Promise.all([
        agentService.updateAgentInfo(
          agent.resourceId,
          info.agentName.trim() || undefined,
          info.description.trim() || undefined
        ),
        agentService.updateAgentSpec(agent.resourceId, agent.draftVersion, spec),
      ]);
      return { spec, info, options };
    },
    {
      manual: true,
      onSuccess: (result) => {
        if (!result) return;
        setSavedSpec(result.spec);
        setSavedInfo(result.info);
        setSavedAssets(draftAssets);
        if (!result.options?.keepEditing) {
          setEditing(false);
        }
        if (result.options?.showToast !== false) {
          toast.success('保存成功');
        }
        if (result.options?.refresh !== false) {
          void refreshAgent();
        }
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const { loading: publishLoading, run: runPublish } = useRequest(
    async () => {
      if (!agent) return;
      await agentService.publishVersion(agent.resourceId);
    },
    {
      manual: true,
      onSuccess: () => {
        toast.success('发布成功');
        void refreshAgent();
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const { loading: versionLoading, run: runSwitchVersion } = useRequest(
    async (version: number) => {
      if (!agent) return null;
      return agentService.getAgentVersionDetail(agent.resourceId, version);
    },
    {
      manual: true,
      onSuccess: (data, params) => {
        if (!data) return;
        const info = { agentName: data.agentName, description: data.description };
        setViewingVersion(params[0]);
        setDraftSpec(data.spec);
        setSavedSpec(data.spec);
        setDraftInfo(info);
        setSavedInfo(info);
        setDraftAssets(data.assets);
        setSavedAssets(data.assets);
        setEditing(false);
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const { loading: uploadLoading, run: runUpload } = useRequest(
    async (file: File) => {
      if (!agent || !draftSpec) return;
      if (isDirty) {
        await runSaveAsync(draftSpec, draftInfo, {
          showToast: false,
          refresh: false,
          keepEditing: true,
        });
      }
      await agentService.uploadAsset(agent.resourceId, agent.draftVersion, {
        name: file.name,
        path: '/',
        content: await file.text(),
        size: file.size,
      });
    },
    {
      manual: true,
      onSuccess: () => {
        toast.success('上传成功');
        void refreshAgent();
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const { loading: deleteLoading, run: runDelete } = useRequest(
    async (asset: AgentAsset) => {
      if (!agent || !draftSpec) return;
      if (isDirty) {
        await runSaveAsync(draftSpec, draftInfo, {
          showToast: false,
          refresh: false,
          keepEditing: true,
        });
      }
      await agentService.deleteAssets(agent.resourceId, agent.draftVersion, [asset.id]);
    },
    {
      manual: true,
      onSuccess: () => {
        setDeleteTarget(null);
        toast.success('删除成功');
        void refreshAgent();
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const handleCreateSuccess = (newResourceId: string) => {
    setCreateModalOpen(false);
    navigate(buildWorkspaceResourcePath(RESOURCE_EDITOR_TYPE.AGENT, newResourceId), {
      replace: true,
    });
  };

  const handleCloseCreateModal = (open: boolean) => {
    setCreateModalOpen(open);
    if (!open && !resourceId) {
      navigate('/app/drive', { replace: true });
    }
  };

  const handleToggleEditing = useCallback(() => {
    if (editing) {
      setDraftSpec(savedSpec);
      setDraftInfo(savedInfo);
      setDraftAssets(savedAssets);
      setEditing(false);
      return;
    }
    setEditing(true);
  }, [editing, savedAssets, savedInfo, savedSpec]);

  const handleSave = useCallback(() => {
    if (!draftSpec) return;
    runSave(draftSpec, draftInfo);
  }, [draftInfo, draftSpec, runSave]);

  const handlePublish = useCallback(() => {
    if (isDirty) {
      setPublishConfirmOpen(true);
      return;
    }
    runPublish();
  }, [isDirty, runPublish]);

  const handleSaveAndPublish = async () => {
    if (!draftSpec) return;
    try {
      await runSaveAsync(draftSpec, draftInfo, { showToast: false, refresh: false });
      setPublishConfirmOpen(false);
      runPublish();
    } catch {
      // useRequest 已统一 toast 错误信息。
    }
  };

  const handleCancelLeave = () => {
    if (navigationBlocker.state === 'blocked') {
      navigationBlocker.reset();
    }
  };

  const handleSaveAndLeave = async () => {
    if (navigationBlocker.state !== 'blocked' || !draftSpec) return;
    try {
      await runSaveAsync(draftSpec, draftInfo, { showToast: false, refresh: false });
      navigationBlocker.proceed();
    } catch {
      // useRequest 已统一 toast 错误信息。
    }
  };

  const settleDebugSaveConfirm = useCallback((confirmed: boolean) => {
    debugSaveConfirmResolveRef.current?.(confirmed);
    debugSaveConfirmResolveRef.current = null;
    setDebugSaveConfirmOpen(false);
  }, []);

  const requestDebugSaveConfirm = useCallback(() => {
    return new Promise<boolean>((resolve) => {
      debugSaveConfirmResolveRef.current?.(false);
      debugSaveConfirmResolveRef.current = resolve;
      setDebugSaveConfirmOpen(true);
    });
  }, []);

  const resolveChatWorkspaceContext = useCallback(async () => {
    const snapshot = agentDebugSnapshotRef.current;
    const currentAgent = snapshot.agent;
    const currentSpec = snapshot.draftSpec ?? snapshot.savedSpec;

    if (!currentAgent || !currentSpec) return undefined;

    if (!snapshot.isDirty) {
      return buildAgentDebugChatContext(
        currentAgent,
        currentSpec,
        snapshot.savedAssets.length > 0 ? snapshot.savedAssets : snapshot.draftAssets
      );
    }

    const confirmed = await requestDebugSaveConfirm();
    if (!confirmed) return null;

    try {
      await runSaveAsync(currentSpec, snapshot.draftInfo, {
        refresh: false,
        keepEditing: true,
      });
      return buildAgentDebugChatContext(currentAgent, currentSpec, snapshot.draftAssets);
    } catch {
      return null;
    }
  }, [agentDebugSnapshotRef, requestDebugSaveConfirm, runSaveAsync]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && canEdit) {
      runUpload(file);
    }
    event.target.value = '';
  };

  const handleConfigNavClick = (sectionId: string) => {
    setActiveConfigSection(sectionId);
    scrollToSection(editorScrollRef.current, sectionId);
  };

  const handleEditorScroll = (event: UIEvent<HTMLDivElement>) => {
    const nextSectionId = resolveActiveSectionId(event.currentTarget);
    setActiveConfigSection((current) => (current === nextSectionId ? current : nextSectionId));
  };

  const headerConfig = useMemo<WorkspaceLayoutConfig>(
    () => ({
      chatContext,
      resolveChatWorkspaceContext,
      header: {
        inlineTitle: (
          <AgentToolbarTitle
            title={agent?.title}
            saveStatus={
              canEdit ? (saveLoading ? 'saving' : isDirty ? 'dirty' : 'saved') : undefined
            }
          />
        ),
        extra: agent ? (
          <div className={styles.topBarActions}>
            {canEdit ? (
              <>
                <Button variant="secondary" onPress={handleToggleEditing}>
                  <Pencil size={16} />
                  <span>{editing ? '取消' : '编辑'}</span>
                </Button>
                {editing ? (
                  <Button
                    variant="secondary"
                    onPress={handleSave}
                    isDisabled={!isDirty || saveLoading}
                  >
                    <Save size={16} />
                    <span>保存</span>
                  </Button>
                ) : null}
                <Button
                  variant="primary"
                  onPress={handlePublish}
                  isDisabled={publishLoading || saveLoading}
                >
                  <Upload size={16} />
                  <span>发布</span>
                </Button>
              </>
            ) : null}
            <AgentVersionDropdown
              items={versionItems}
              disabledKeys={disabledVersionKeys}
              formatVersion={AgentServicesMap.formatVersion}
              onSelect={(version) => runSwitchVersion(version)}
            />
          </div>
        ) : undefined,
      },
    }),
    [
      agent,
      canEdit,
      chatContext,
      disabledVersionKeys,
      editing,
      handlePublish,
      handleSave,
      handleToggleEditing,
      isDirty,
      publishLoading,
      resolveChatWorkspaceContext,
      runSwitchVersion,
      saveLoading,
      versionItems,
    ]
  );

  if (!resourceId) {
    return (
      <AgentLayoutConfig config={{ header: { inlineTitle: <AgentToolbarTitle title="Agent" /> } }}>
        <div className={styles.middleOverlay}>
          <ResultState
            status="info"
            title="创建 Agent"
            extra={
              <Button variant="primary" onPress={() => setCreateModalOpen(true)}>
                创建新 Agent
              </Button>
            }
          />
        </div>
        <CreateAgentModal
          isOpen={createModalOpen}
          onOpenChange={handleCloseCreateModal}
          onSuccess={handleCreateSuccess}
        />
      </AgentLayoutConfig>
    );
  }

  if (error) {
    return (
      <AgentLayoutConfig config={{ header: { inlineTitle: <AgentToolbarTitle title="Agent" /> } }}>
        <div className={styles.middleOverlay}>
          <ResultState
            status="warning"
            title="无法打开 Agent"
            subTitle={parseErrorMessage(error)}
            extra={
              <Link to="/app/drive">
                <Button variant="secondary">返回云盘</Button>
              </Link>
            }
          />
        </div>
      </AgentLayoutConfig>
    );
  }

  if (loading && !agent) {
    return (
      <AgentLayoutConfig config={{ header: { inlineTitle: <AgentToolbarTitle title="Agent" /> } }}>
        <div className={styles.middleOverlay} aria-busy="true" aria-live="polite">
          <div className={styles.middleOverlayLoading}>
            <Spin size="large" />
            <span>正在加载 Agent...</span>
          </div>
        </div>
      </AgentLayoutConfig>
    );
  }

  if (!agent || !draftSpec) {
    return (
      <AgentLayoutConfig config={{ header: { inlineTitle: <AgentToolbarTitle title="Agent" /> } }}>
        <div className={styles.middleOverlay}>
          <ResultState status="warning" title="无法打开 Agent" />
        </div>
      </AgentLayoutConfig>
    );
  }

  return (
    <AgentLayoutConfig config={headerConfig}>
      <div className={styles.page}>
        <div className={styles.mainArea}>
          <div className={styles.contentRow}>
            <aside className={styles.configNav} aria-label="Agent 配置目录">
              <div className={styles.configNavHeader}>
                <span>配置目录</span>
                <span className={styles.configNavProgress}>
                  {CONFIG_SECTIONS.findIndex((section) => section.id === activeConfigSection) + 1}/
                  {CONFIG_SECTIONS.length}
                </span>
              </div>
              <div className={styles.configNavList}>
                {CONFIG_SECTIONS.map((section, index) => (
                  <button
                    key={section.id}
                    type="button"
                    className={`${styles.configNavButton} ${
                      activeConfigSection === section.id ? styles.configNavButtonActive : ''
                    }`}
                    aria-current={activeConfigSection === section.id ? 'true' : undefined}
                    onClick={() => handleConfigNavClick(section.id)}
                  >
                    <span className={styles.configNavIndex}>
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    {section.icon}
                    <span>{section.label}</span>
                  </button>
                ))}
              </div>
            </aside>

            <main className={styles.editorPanel}>
              <div
                ref={editorScrollRef}
                className={styles.editorScroll}
                onScroll={handleEditorScroll}
              >
                <div className={styles.editorInner}>
                  <section
                    id="agent-basic"
                    data-agent-section="agent-basic"
                    className={styles.section}
                  >
                    <header className={styles.sectionHeader}>
                      <div>
                        <h2 className={styles.sectionTitle}>基础信息</h2>
                        <p className={styles.sectionCaption}>
                          title 是资源展示名，Agent 名称和描述用于模型与运行时识别。
                        </p>
                      </div>
                    </header>
                    <div className={styles.sectionBody}>
                      <div className={styles.fieldGrid}>
                        <TextField aria-label="资源展示名" value={agent.title} isDisabled>
                          <Label>资源展示名</Label>
                          <Input />
                        </TextField>
                        <TextField
                          aria-label="Agent 名称"
                          value={draftInfo.agentName}
                          onChange={(value) =>
                            setDraftInfo((current) => ({ ...current, agentName: value }))
                          }
                          isDisabled={disabled}
                        >
                          <Label>Agent 名称</Label>
                          <Input placeholder="paper_reader_agent" />
                        </TextField>
                        <TextField
                          aria-label="描述"
                          value={draftInfo.description}
                          onChange={(value) =>
                            setDraftInfo((current) => ({ ...current, description: value }))
                          }
                          isDisabled={disabled}
                          className={styles.wideField}
                        >
                          <Label>描述</Label>
                          <TextArea placeholder="描述这个 Agent 的使用场景" rows={3} />
                        </TextField>
                      </div>
                    </div>
                  </section>

                  <section
                    id="agent-prompt"
                    data-agent-section="agent-prompt"
                    className={styles.section}
                  >
                    <header className={styles.sectionHeader}>
                      <div>
                        <h2 className={styles.sectionTitle}>System Prompt</h2>
                        <p className={styles.sectionCaption}>
                          Java 发布校验要求 systemPrompt 非空，发布前会同步校验。
                        </p>
                      </div>
                    </header>
                    <div className={styles.sectionBody}>
                      <TextField
                        aria-label="System Prompt"
                        value={draftSpec.systemPrompt}
                        onChange={(value) =>
                          updateDraftSpec((current) => ({ ...current, systemPrompt: value }))
                        }
                        isDisabled={disabled}
                        isRequired
                      >
                        <Label>System Prompt*</Label>
                        <TextArea
                          placeholder="定义 Agent 的角色、边界、输出风格和任务处理流程"
                          rows={8}
                        />
                      </TextField>
                      <div className={styles.checkboxGrid}>
                        <BooleanField
                          label="自动生成会话标题"
                          isSelected={draftSpec.autoGenerateTitle}
                          isDisabled={disabled}
                          onChange={(value) =>
                            updateDraftSpec((current) => ({
                              ...current,
                              autoGenerateTitle: value,
                            }))
                          }
                        />
                      </div>
                    </div>
                  </section>

                  <section
                    id="agent-model"
                    data-agent-section="agent-model"
                    className={styles.section}
                  >
                    <header className={styles.sectionHeader}>
                      <div>
                        <h2 className={styles.sectionTitle}>模型策略</h2>
                        <p className={styles.sectionCaption}>
                          对应 modelPolicy，后端字段为 defaultModelId、defaultProviderId 和
                          allowRequestOverride。
                        </p>
                      </div>
                    </header>
                    <div className={styles.sectionBody}>
                      <div className={styles.fieldGrid}>
                        <TextField
                          aria-label="默认模型 ID"
                          value={draftSpec.modelPolicy.defaultModelId}
                          onChange={(value) => updateModelPolicy('defaultModelId', value)}
                          isDisabled={disabled}
                        >
                          <Label>默认模型 ID</Label>
                          <Input placeholder="gpt-4.1" />
                        </TextField>
                        <TextField
                          aria-label="默认 Provider ID"
                          value={draftSpec.modelPolicy.defaultProviderId}
                          onChange={(value) => updateModelPolicy('defaultProviderId', value)}
                          isDisabled={disabled}
                        >
                          <Label>默认 Provider ID</Label>
                          <Input placeholder="openai" />
                        </TextField>
                      </div>
                      <div className={styles.checkboxGrid}>
                        <BooleanField
                          label="允许请求侧覆盖模型"
                          isSelected={draftSpec.modelPolicy.allowRequestOverride}
                          isDisabled={disabled}
                          onChange={(value) => updateModelPolicy('allowRequestOverride', value)}
                        />
                      </div>
                    </div>
                  </section>

                  <section
                    id="agent-tools"
                    data-agent-section="agent-tools"
                    className={styles.section}
                  >
                    <header className={styles.sectionHeader}>
                      <div>
                        <h2 className={styles.sectionTitle}>工具与 Skill</h2>
                        <p className={styles.sectionCaption}>
                          对应 toolAndSkillPolicy，Tool 使用真实能力列表，Skill 复用 chat
                          的树形选择模式。
                        </p>
                      </div>
                    </header>
                    <div className={styles.sectionBody}>
                      <div className={styles.checkboxGrid}>
                        <BooleanField
                          label="启用 Tool"
                          isSelected={draftSpec.toolAndSkillPolicy.enableUseTool}
                          isDisabled={disabled}
                          onChange={(value) => updateToolAndSkillPolicy('enableUseTool', value)}
                        />
                        <BooleanField
                          label="启用 Skill"
                          isSelected={draftSpec.toolAndSkillPolicy.enableUseSkill}
                          isDisabled={disabled}
                          onChange={(value) => updateToolAndSkillPolicy('enableUseSkill', value)}
                        />
                      </div>
                      <div className={styles.capabilityGrid}>
                        <ToolPolicyCard
                          title="允许 Tool"
                          description="写入 allowToolNames；为空表示不额外限制允许列表。"
                          loading={capabilityLoading}
                          disabled={disabled || !draftSpec.toolAndSkillPolicy.enableUseTool}
                          selectedToolIds={draftSpec.toolAndSkillPolicy.allowToolNames}
                          toolLabelMap={toolLabelMap}
                          onPick={() => setToolPickerTarget('allowToolNames')}
                          onRemove={(toolId) => removeToolPolicyItem('allowToolNames', toolId)}
                        />
                        <ToolPolicyCard
                          title="禁用 Tool"
                          description="写入 denyToolNames；选择后会从允许列表中移除。"
                          loading={capabilityLoading}
                          disabled={disabled || !draftSpec.toolAndSkillPolicy.enableUseTool}
                          selectedToolIds={draftSpec.toolAndSkillPolicy.denyToolNames}
                          toolLabelMap={toolLabelMap}
                          onPick={() => setToolPickerTarget('denyToolNames')}
                          onRemove={(toolId) => removeToolPolicyItem('denyToolNames', toolId)}
                        />
                        <SkillPolicyCard
                          title="按需 Skill"
                          description="写入 onDemandSkillIds，调试时可由 Agent 按需调用。"
                          loading={capabilityLoading}
                          disabled={disabled || !draftSpec.toolAndSkillPolicy.enableUseSkill}
                          selectedSkillIds={draftSpec.toolAndSkillPolicy.onDemandSkillIds}
                          skillLabelMap={skillLabelMap}
                          onPick={() => setSkillPickerTarget('onDemandSkillIds')}
                          onRemove={(skillId) => removeSkillPolicyItem('onDemandSkillIds', skillId)}
                        />
                        <SkillPolicyCard
                          title="强制启用 Skill"
                          description="写入 forceEnabledSkillIds，保存后作为草稿固定能力。"
                          loading={capabilityLoading}
                          disabled={disabled || !draftSpec.toolAndSkillPolicy.enableUseSkill}
                          selectedSkillIds={draftSpec.toolAndSkillPolicy.forceEnabledSkillIds}
                          skillLabelMap={skillLabelMap}
                          onPick={() => setSkillPickerTarget('forceEnabledSkillIds')}
                          onRemove={(skillId) =>
                            removeSkillPolicyItem('forceEnabledSkillIds', skillId)
                          }
                        />
                      </div>
                    </div>
                  </section>

                  <section
                    id="agent-memory"
                    data-agent-section="agent-memory"
                    className={styles.section}
                  >
                    <header className={styles.sectionHeader}>
                      <div>
                        <h2 className={styles.sectionTitle}>记忆策略</h2>
                        <p className={styles.sectionCaption}>
                          对应 memoryPolicy，数值字段按 Java spec 的 ratio、limit、threshold 保存。
                        </p>
                      </div>
                    </header>
                    <div className={styles.sectionBody}>
                      <div className={styles.checkboxGrid}>
                        <BooleanField
                          label="启用聊天记忆"
                          isSelected={draftSpec.memoryPolicy.enableChatMemory}
                          isDisabled={disabled}
                          onChange={(value) => updateMemoryPolicy('enableChatMemory', value)}
                        />
                        <BooleanField
                          label="持久化聊天记忆"
                          isSelected={draftSpec.memoryPolicy.enablePersistenceChatMemory}
                          isDisabled={disabled}
                          onChange={(value) =>
                            updateMemoryPolicy('enablePersistenceChatMemory', value)
                          }
                        />
                        <BooleanField
                          label="启用聊天记忆总结"
                          isSelected={draftSpec.memoryPolicy.enableChatMemorySummary}
                          isDisabled={disabled}
                          onChange={(value) => updateMemoryPolicy('enableChatMemorySummary', value)}
                        />
                        <BooleanField
                          label="启用长期记忆"
                          isSelected={draftSpec.memoryPolicy.enableLongTermMemory}
                          isDisabled={disabled}
                          onChange={(value) => updateMemoryPolicy('enableLongTermMemory', value)}
                        />
                      </div>
                      <div className={styles.fieldGrid}>
                        <TextField
                          aria-label="高水位比例"
                          value={String(draftSpec.memoryPolicy.highWatermarkRatio)}
                          onChange={(value) =>
                            updateMemoryPolicy(
                              'highWatermarkRatio',
                              clampNumber(value, draftSpec.memoryPolicy.highWatermarkRatio, 0, 1)
                            )
                          }
                          isDisabled={disabled}
                        >
                          <Label>高水位比例</Label>
                          <Input type="number" step="0.1" min="0" max="1" />
                        </TextField>
                        <TextField
                          aria-label="低水位比例"
                          value={String(draftSpec.memoryPolicy.lowWatermarkRatio)}
                          onChange={(value) =>
                            updateMemoryPolicy(
                              'lowWatermarkRatio',
                              clampNumber(value, draftSpec.memoryPolicy.lowWatermarkRatio, 0, 1)
                            )
                          }
                          isDisabled={disabled}
                        >
                          <Label>低水位比例</Label>
                          <Input type="number" step="0.1" min="0" max="1" />
                        </TextField>
                        <TextField
                          aria-label="长期记忆条数"
                          value={String(draftSpec.memoryPolicy.longTermMemoryLimit)}
                          onChange={(value) =>
                            updateMemoryPolicy(
                              'longTermMemoryLimit',
                              Math.round(
                                clampNumber(
                                  value,
                                  draftSpec.memoryPolicy.longTermMemoryLimit,
                                  0,
                                  500
                                )
                              )
                            )
                          }
                          isDisabled={disabled}
                        >
                          <Label>长期记忆条数</Label>
                          <Input type="number" min="0" max="500" />
                        </TextField>
                        <TextField
                          aria-label="长期记忆阈值"
                          value={String(draftSpec.memoryPolicy.longTermMemoryScoreThreshold)}
                          onChange={(value) =>
                            updateMemoryPolicy(
                              'longTermMemoryScoreThreshold',
                              clampNumber(
                                value,
                                draftSpec.memoryPolicy.longTermMemoryScoreThreshold,
                                0,
                                1
                              )
                            )
                          }
                          isDisabled={disabled}
                        >
                          <Label>长期记忆阈值</Label>
                          <Input type="number" step="0.1" min="0" max="1" />
                        </TextField>
                        <TextField
                          aria-label="总结 Prompt"
                          value={draftSpec.memoryPolicy.summaryPrompt}
                          onChange={(value) => updateMemoryPolicy('summaryPrompt', value)}
                          isDisabled={disabled}
                          className={styles.wideField}
                        >
                          <Label>总结 Prompt</Label>
                          <TextArea placeholder="用于压缩上下文记忆的提示词" rows={3} />
                        </TextField>
                      </div>
                    </div>
                  </section>

                  <section
                    id="agent-assets"
                    data-agent-section="agent-assets"
                    className={styles.section}
                  >
                    <header className={styles.sectionHeader}>
                      <div>
                        <h2 className={styles.sectionTitle}>附件资源</h2>
                        <p className={styles.sectionCaption}>
                          对应 Agent assets，支持 MD、Python、TXT、JSON、YAML、TOML。
                        </p>
                      </div>
                    </header>
                    <div className={styles.sectionBody}>
                      <div className={styles.assetToolbar}>
                        <span className={styles.assetSummary}>共 {draftAssets.length} 个附件</span>
                        {canEdit ? (
                          <Button
                            variant="secondary"
                            onPress={() => fileInputRef.current?.click()}
                            isDisabled={uploadLoading || saveLoading}
                          >
                            <FileUp size={16} />
                            <span>上传附件</span>
                          </Button>
                        ) : null}
                      </div>
                      {draftAssets.length > 0 ? (
                        <div className={styles.assetList}>
                          {draftAssets.map((asset) => (
                            <div key={asset.id} className={styles.assetItem}>
                              <div className={styles.assetMain}>
                                <div className={styles.assetNameRow}>
                                  <span className={styles.assetName}>{asset.name}</span>
                                  <span className={styles.assetBadge}>
                                    {AGENT_ASSET_RESOURCE_TYPE.getLabel(asset.assetResourceType)}
                                  </span>
                                </div>
                                <div className={styles.assetMeta}>
                                  <span>{asset.path}</span>
                                  <span>{formatFileSize(asset.size)}</span>
                                  <span>{asset.uploadStatus}</span>
                                </div>
                              </div>
                              {canEdit ? (
                                <button
                                  type="button"
                                  className={styles.iconButton}
                                  aria-label={`删除附件 ${asset.name}`}
                                  onClick={() => setDeleteTarget(asset)}
                                >
                                  <Trash2 size={16} />
                                </button>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <Empty
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                          description={canEdit ? '暂无附件，请上传' : '暂无附件'}
                          className={styles.emptyBlock}
                        />
                      )}
                    </div>
                  </section>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>

      <Modal isOpen={publishConfirmOpen} onOpenChange={setPublishConfirmOpen}>
        <Modal.Backdrop isDismissable={!saveLoading && !publishLoading}>
          <Modal.Container size="sm" placement="center">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>保存并发布</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <p className={styles.deleteModalText}>
                  当前 Agent 有未保存修改，需要先保存草稿再发布。
                </p>
              </Modal.Body>
              <Modal.Footer>
                <Button
                  variant="secondary"
                  onPress={() => setPublishConfirmOpen(false)}
                  isDisabled={saveLoading || publishLoading}
                >
                  取消
                </Button>
                <Button
                  variant="primary"
                  onPress={() => void handleSaveAndPublish()}
                  isDisabled={saveLoading || publishLoading}
                >
                  保存并发布
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <Modal
        isOpen={debugSaveConfirmOpen}
        onOpenChange={(open) => {
          if (!open) settleDebugSaveConfirm(false);
        }}
      >
        <Modal.Backdrop isDismissable={!saveLoading}>
          <Modal.Container size="sm" placement="center">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>保存后调试</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <p className={styles.deleteModalText}>
                  当前 Agent 有未保存修改，需要先保存草稿后再发送调试消息。
                </p>
              </Modal.Body>
              <Modal.Footer>
                <Button
                  variant="secondary"
                  onPress={() => settleDebugSaveConfirm(false)}
                  isDisabled={saveLoading}
                >
                  取消
                </Button>
                <Button
                  variant="primary"
                  onPress={() => settleDebugSaveConfirm(true)}
                  isDisabled={saveLoading}
                >
                  保存并发送
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <Modal isOpen={navigationBlocker.state === 'blocked'} onOpenChange={handleCancelLeave}>
        <Modal.Backdrop isDismissable={!saveLoading}>
          <Modal.Container size="sm" placement="center">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>保存修改</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <p className={styles.deleteModalText}>离开前需要保存当前 Agent 草稿修改。</p>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onPress={handleCancelLeave} isDisabled={saveLoading}>
                  继续编辑
                </Button>
                <Button
                  variant="primary"
                  onPress={() => void handleSaveAndLeave()}
                  isDisabled={saveLoading}
                >
                  保存并离开
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <Modal isOpen={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <Modal.Backdrop isDismissable={!deleteLoading}>
          <Modal.Container size="sm" placement="center">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>删除附件</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <p className={styles.deleteModalText}>
                  确定删除附件「{deleteTarget?.name}」吗？此操作不可撤销。
                </p>
              </Modal.Body>
              <Modal.Footer>
                <Button
                  variant="secondary"
                  onPress={() => setDeleteTarget(null)}
                  isDisabled={deleteLoading}
                >
                  取消
                </Button>
                <Button
                  variant="danger"
                  onPress={() => {
                    if (deleteTarget) runDelete(deleteTarget);
                  }}
                  isDisabled={deleteLoading}
                >
                  删除
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <AgentToolPickerModal
        isOpen={toolPickerTarget !== null}
        title={toolPickerTarget === 'denyToolNames' ? '选择禁用 Tool' : '选择允许 Tool'}
        hint="选择要写入当前 Agent 草稿的 Tool，可多选。AI 端暴露给前端的 Tool 后续可直接出现在这里。"
        loading={capabilityLoading}
        selectedToolIds={toolPickerTarget ? draftSpec.toolAndSkillPolicy[toolPickerTarget] : []}
        tools={toolOptions}
        onOpenChange={(open) => {
          if (!open) setToolPickerTarget(null);
        }}
        onConfirm={handleToolPickerConfirm}
      />

      <AgentSkillPickerModal
        isOpen={skillPickerTarget !== null}
        title={
          skillPickerTarget === 'forceEnabledSkillIds' ? '选择强制启用 Skill' : '选择按需 Skill'
        }
        hint="选择要写入当前 Agent 草稿的 Skill，可多选。"
        loading={capabilityLoading}
        selectedSkillIds={skillPickerTarget ? draftSpec.toolAndSkillPolicy[skillPickerTarget] : []}
        skillGroups={skillGroups}
        onOpenChange={(open) => {
          if (!open) setSkillPickerTarget(null);
        }}
        onConfirm={handleSkillPickerConfirm}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.py,.txt,.json,.yaml,.yml,.toml"
        hidden
        onChange={handleFileChange}
      />
    </AgentLayoutConfig>
  );
}

export default AgentView;
