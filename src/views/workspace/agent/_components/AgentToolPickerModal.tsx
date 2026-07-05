import { Modal } from '@/components/Overlay';
import type { CapabilityToolOption } from '@/domains/Chat';
import { Button, ListBox, ListBoxItem } from '@heroui/react';
import { Check, Wrench } from 'lucide-react';
import { useState } from 'react';

import styles from './AgentToolPickerModal.module.less';

interface AgentToolPickerModalProps {
  isOpen: boolean;
  title: string;
  hint: string;
  loading?: boolean;
  selectedToolIds: string[];
  tools: CapabilityToolOption[];
  onOpenChange: (open: boolean) => void;
  onConfirm: (toolIds: string[]) => void;
}

function AgentToolPickerModal(props: AgentToolPickerModalProps) {
  if (!props.isOpen) return null;
  return <AgentToolPickerModalContent {...props} />;
}

function AgentToolPickerModalContent({
  title,
  hint,
  loading,
  selectedToolIds,
  tools,
  onOpenChange,
  onConfirm,
}: AgentToolPickerModalProps) {
  const [selectedKeys, setSelectedKeys] = useState<string[]>(selectedToolIds);
  const selectedKeySet = new Set(selectedKeys);

  const handleConfirm = () => {
    const toolIdSet = new Set(tools.map((tool) => tool.toolId));
    onConfirm(selectedKeys.filter((toolId) => toolIdSet.has(toolId)));
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
                    <div className={styles.listNav} />
                  </div>
                </Modal.Body>
              }
            >
              {() => (
                <Modal.Body>
                  <div className={styles.wrapper}>
                    <div className={styles.hint}>{hint}</div>
                    <div className={styles.listNav}>
                      {loading ? (
                        <div className={styles.hint}>正在加载 Tool</div>
                      ) : tools.length > 0 ? (
                        <ListBox
                          aria-label={title}
                          selectionMode="multiple"
                          selectedKeys={selectedKeys}
                          onSelectionChange={(keys) =>
                            setSelectedKeys(
                              keys === 'all'
                                ? tools.map((tool) => tool.toolId)
                                : Array.from(keys, String)
                            )
                          }
                          className={styles.listBox}
                        >
                          {tools.map((tool) => {
                            const selected = selectedKeySet.has(tool.toolId);
                            return (
                              <ListBoxItem
                                key={tool.toolId}
                                id={tool.toolId}
                                textValue={tool.label}
                              >
                                <span className={styles.toolOption}>
                                  <Wrench size={15} />
                                  <span className={styles.toolOptionMain}>
                                    <span>{tool.label}</span>
                                    <span>{tool.toolId}</span>
                                  </span>
                                  {selected ? (
                                    <Check size={14} className={styles.checkIcon} />
                                  ) : null}
                                </span>
                              </ListBoxItem>
                            );
                          })}
                        </ListBox>
                      ) : (
                        <div className={styles.hint}>暂无可选 Tool</div>
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

export default AgentToolPickerModal;
