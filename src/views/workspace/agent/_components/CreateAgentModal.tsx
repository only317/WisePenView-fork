import { useAgentService } from '@/domains';
import { parseErrorMessage } from '@/utils/error';
import { Button, Input, Label, Modal, TextArea, TextField, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useState } from 'react';

import styles from '../style.module.less';

interface CreateAgentModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (resourceId: string) => void;
}

function CreateAgentModal({ isOpen, onOpenChange, onSuccess }: CreateAgentModalProps) {
  const agentService = useAgentService();
  const [title, setTitle] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const { loading, run: runCreate } = useRequest(
    async () => {
      return agentService.createAgent(
        title.trim(),
        name.trim() || undefined,
        description.trim() || undefined
      );
    },
    {
      manual: true,
      onSuccess,
      onError: (error) => {
        toast.danger(parseErrorMessage(error));
      },
    }
  );

  const handleClose = () => {
    setTitle('');
    setName('');
    setDescription('');
    onOpenChange(false);
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Backdrop isDismissable>
        <Modal.Container size="lg" placement="center">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>创建新 Agent</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <div className={styles.createForm}>
                <TextField
                  aria-label="资源展示名"
                  value={title}
                  onChange={setTitle}
                  autoFocus
                  isRequired
                >
                  <Label>资源展示名*</Label>
                  <Input placeholder="例如：论文阅读 Agent" />
                </TextField>
                <TextField aria-label="Agent 名称" value={name} onChange={setName}>
                  <Label>Agent 名称</Label>
                  <Input placeholder="paper_reader_agent" />
                </TextField>
                <TextField aria-label="描述" value={description} onChange={setDescription}>
                  <Label>描述</Label>
                  <TextArea placeholder="描述这个 Agent 的使用场景" rows={3} />
                </TextField>
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="ghost" onPress={handleClose} isDisabled={loading}>
                取消
              </Button>
              <Button
                variant="primary"
                onPress={() => runCreate()}
                isDisabled={!title.trim() || loading}
              >
                创建
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

export default CreateAgentModal;
