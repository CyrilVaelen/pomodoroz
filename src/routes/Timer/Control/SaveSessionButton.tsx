import React, { useRef, useCallback } from "react";
import { StyledSaveSessionButton } from "styles";
import { useRippleEffect } from "hooks";
import { SVG } from "components";

type Props = {
  title?: string;
} & React.HTMLProps<HTMLButtonElement>;

const SaveSessionButton: React.FC<Props> = ({
  onClick,
  className,
  title = "结束并保存",
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const buttonClickAction = useRippleEffect();

  const onSaveAction = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) =>
      buttonClickAction(e, buttonRef, () => {
        if (onClick) {
          onClick(e);
        }
      }),
    [buttonClickAction, onClick]
  );

  return (
    <StyledSaveSessionButton
      className={className}
      ref={buttonRef}
      onClick={onSaveAction}
      title={title}
      aria-label={title}
    >
      <SVG name="save" />
    </StyledSaveSessionButton>
  );
};

export default React.memo(SaveSessionButton);
