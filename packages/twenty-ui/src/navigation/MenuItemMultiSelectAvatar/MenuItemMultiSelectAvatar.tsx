import { type MouseEvent, type ReactNode } from 'react';

import { OverflowingTextWithTooltip } from '@ui/surfaces';
import { Checkbox } from '@ui/input/Checkbox/Checkbox';
import {
  StyledMenuItemBase,
  StyledMenuItemLabel,
  StyledMenuItemLabelLight,
  StyledMenuItemLeftContent,
} from '@ui/navigation/MenuItem/parts/StyledMenuItemBase';

import styles from './MenuItemMultiSelectAvatar.module.scss';

type MenuItemMultiSelectAvatarProps = {
  avatar?: ReactNode;
  selected: boolean;
  isKeySelected?: boolean;
  text?: string;
  contextualText?: string;
  className?: string;
  onSelectChange?: (selected: boolean) => void;
};

export const MenuItemMultiSelectAvatar = ({
  avatar,
  text,
  selected,
  contextualText,
  className,
  isKeySelected,
  onSelectChange,
}: MenuItemMultiSelectAvatarProps) => {
  const handleOnClick = (e: MouseEvent<HTMLDivElement>) => {
    // @base-ui/react/checkbox dispatches a programmatic PointerEvent('click', { bubbles: true })
    // on its hidden <input> after handling the span click. Both events bubble to this handler,
    // causing a double call. Ignore the input's synthetic click to prevent duplication.
    if ((e.target as HTMLElement).tagName.toLowerCase() === 'input') {
      return;
    }
    onSelectChange?.(!selected);
  };

  return (
    <StyledMenuItemBase
      className={className}
      onClick={handleOnClick}
      isKeySelected={isKeySelected}
    >
      <div className={styles.leftContentWithCheckboxContainer}>
        <Checkbox
          checked={selected}
          aria-label={text ?? contextualText ?? 'Select item'}
        />
        <StyledMenuItemLeftContent>
          {avatar}
          <div className={styles.textContainer}>
            <StyledMenuItemLabel>
              <OverflowingTextWithTooltip text={text} />
            </StyledMenuItemLabel>
            {contextualText && (
              <>
                <StyledMenuItemLabelLight>·</StyledMenuItemLabelLight>
                <StyledMenuItemLabelLight>
                  <OverflowingTextWithTooltip text={contextualText} />
                </StyledMenuItemLabelLight>
              </>
            )}
          </div>
        </StyledMenuItemLeftContent>
      </div>
    </StyledMenuItemBase>
  );
};
