import { Dropdown } from '@heroui/react';
import { ChevronDown, GitBranch } from 'lucide-react';

import styles from './AgentVersionDropdown.module.less';

export interface AgentVersionDropdownItem {
  key: string;
  version: number;
  current: boolean;
}

interface AgentVersionDropdownProps {
  items: AgentVersionDropdownItem[];
  disabledKeys?: Set<string>;
  formatVersion: (version: number) => string;
  onSelect?: (version: number) => void;
}

function AgentVersionDropdown({
  items,
  disabledKeys,
  formatVersion,
  onSelect,
}: AgentVersionDropdownProps) {
  const currentItem = items.find((item) => item.current) ?? items[0];

  return (
    <Dropdown>
      <Dropdown.Trigger className={styles.trigger}>
        <GitBranch size={16} />
        <span className={styles.triggerText}>
          <span>{currentItem ? formatVersion(currentItem.version) : '-'}</span>
        </span>
        <ChevronDown size={10} />
      </Dropdown.Trigger>
      <Dropdown.Popover>
        <Dropdown.Menu
          disabledKeys={disabledKeys}
          onAction={(key) => {
            const item = items.find((versionItem) => versionItem.key === key);
            if (item) onSelect?.(item.version);
          }}
        >
          {items.map((item) => (
            <Dropdown.Item key={item.key}>
              {formatVersion(item.version)}
              {item.current ? ' (当前)' : ''}
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}

export default AgentVersionDropdown;
