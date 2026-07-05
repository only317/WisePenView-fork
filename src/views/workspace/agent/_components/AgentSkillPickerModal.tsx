import { Modal } from '@/components/Overlay';
import type { TreeDataNode } from '@/components/Tree';
import Tree from '@/components/Tree';
import { buildOtherSkillTreeGroups, type SkillScopeTreeGroup } from '@/domains/Chat';
import { Button } from '@heroui/react';
import { ChevronDown, Folder } from 'lucide-react';
import { useMemo, useState, type Key } from 'react';

import styles from './AgentSkillPickerModal.module.less';

interface AgentSkillPickerModalProps {
  isOpen: boolean;
  title: string;
  hint: string;
  loading?: boolean;
  selectedSkillIds: string[];
  skillGroups: SkillScopeTreeGroup[];
  onOpenChange: (open: boolean) => void;
  onConfirm: (skillIds: string[]) => void;
}

function AgentSkillPickerModal(props: AgentSkillPickerModalProps) {
  if (!props.isOpen) return null;
  return <AgentSkillPickerModalContent {...props} />;
}

function AgentSkillPickerModalContent({
  title,
  hint,
  loading,
  selectedSkillIds,
  skillGroups,
  onOpenChange,
  onConfirm,
}: AgentSkillPickerModalProps) {
  const [selectedKeys, setSelectedKeys] = useState<Key[]>(selectedSkillIds);

  const { skillMap, treeData } = useMemo(() => {
    const mapping = new Map<string, string>();
    const groups = buildOtherSkillTreeGroups(skillGroups, null);
    const data: TreeDataNode[] = groups.map((group) => ({
      key: group.key,
      title: (
        <span className={styles.nodeTitle}>
          <Folder size={14} color="var(--warning)" />
          <span>{group.label}</span>
        </span>
      ),
      selectable: false,
      children: group.skills.map((skill) => {
        mapping.set(skill.skillId, skill.displayName);
        return {
          key: skill.skillId,
          title: skill.displayName,
        };
      }),
    }));

    return { skillMap: mapping, treeData: data };
  }, [skillGroups]);

  const handleConfirm = () => {
    onConfirm(selectedKeys.map(String).filter((key) => skillMap.has(key)));
  };

  return (
    <Modal isOpen onOpenChange={onOpenChange}>
      <Modal.Backdrop isDismissable={!loading}>
        <Modal.Container size="md" placement="center">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>{title}</Modal.Heading>
            </Modal.Header>
            <Modal.DeferredContent
              fallback={
                <Modal.Body>
                  <div className={styles.wrapper}>
                    <div className={styles.hint}>{hint}</div>
                    <div className={styles.treeNav} />
                  </div>
                </Modal.Body>
              }
            >
              {() => (
                <Modal.Body>
                  <div className={styles.wrapper}>
                    <div className={styles.hint}>{hint}</div>
                    <div className={styles.treeNav}>
                      {loading ? (
                        <div className={styles.hint}>正在加载 Skill</div>
                      ) : (
                        <Tree
                          treeData={treeData}
                          className={styles.tree}
                          multiple
                          selectedKeys={selectedKeys}
                          defaultExpandAll
                          blockNode
                          switcherIcon={
                            <span>
                              <ChevronDown size={14} />
                            </span>
                          }
                          onSelect={(keys: Key[]) => setSelectedKeys(keys)}
                        />
                      )}
                    </div>
                  </div>
                </Modal.Body>
              )}
            </Modal.DeferredContent>
            <Modal.Footer>
              <Button variant="secondary" onPress={() => onOpenChange(false)}>
                取消
              </Button>
              <Button variant="primary" onPress={handleConfirm} isDisabled={loading}>
                确认
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

export default AgentSkillPickerModal;
