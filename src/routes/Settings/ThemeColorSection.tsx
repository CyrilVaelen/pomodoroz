import React, { useState } from "react";
import styled from "styled-components";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "hooks/storeHooks";
import {
  resetThemeSettings,
  setCustomPrimaryColor,
  setThemePreset,
} from "store";
import {
  THEME_PRESETS,
  resolvePrimaryColors,
} from "styles/themePresets";
import { StyledSettingSection, StyledSectionHeading } from "styles";

const StyledThemeSectionContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  margin-top: 1rem;
`;

const StyledPresetGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr));
  gap: 0.8rem;
`;

const StyledPresetCard = styled.button<{
  $active: boolean;
  $color: string;
}>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  padding: 0.8rem 0.6rem;
  border-radius: 6px;
  background-color: var(--color-bg-secondary);
  border: 2px solid
    ${(p) =>
      p.$active
        ? "var(--color-primary-border)"
        : "var(--color-border-primary)"};
  cursor: pointer;
  transition: all 120ms ease;

  &:hover {
    background-color: var(--color-bg-tertiary);
  }

  &:focus-visible {
    outline: 2px solid var(--color-primary-focus);
    outline-offset: 2px;
  }
`;

const StyledColorCircle = styled.span<{ $color: string }>`
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background-color: ${(p) => p.$color};
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
`;

const StyledPresetName = styled.span`
  font-size: 1.1rem;
  color: var(--color-heading-text);
  font-weight: 500;
`;

const StyledCustomColorRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.8rem 1rem;
  border-radius: 6px;
  background-color: var(--color-bg-secondary);
  border: 1px solid var(--color-border-primary);
`;

const StyledCustomColorLabel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
`;

const StyledCustomTitle = styled.span`
  font-size: 1.2rem;
  color: var(--color-heading-text);
  font-weight: 500;
`;

const StyledCustomHint = styled.span`
  font-size: 1.1rem;
  color: var(--color-body-text);
`;

const StyledCustomControls = styled.div`
  display: flex;
  align-items: center;
  gap: 0.8rem;
`;

const StyledColorInput = styled.input`
  width: 3.2rem;
  height: 3.2rem;
  padding: 0;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  background: transparent;

  &::-webkit-color-swatch-wrapper {
    padding: 0;
  }
  &::-webkit-color-swatch {
    border: 1px solid var(--color-border-primary);
    border-radius: 4px;
  }
`;

const StyledResetButton = styled.button`
  padding: 0.4rem 0.8rem;
  font-size: 1.1rem;
  border-radius: 4px;
  border: 1px solid var(--color-border-primary);
  background-color: var(--color-bg-primary);
  color: var(--color-body-text);
  cursor: pointer;
  transition: all 120ms ease;

  &:hover {
    color: var(--color-heading-text);
    background-color: var(--color-bg-tertiary);
  }
`;

const ThemeColorSection: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const isDarkMode = useAppSelector(
    (state) => state.settings.enableDarkTheme
  );
  const themePreset = useAppSelector(
    (state) => state.settings.themePreset || "default"
  );
  const customPrimaryColor = useAppSelector(
    (state) => state.settings.customPrimaryColor
  );

  const [customInput, setCustomInput] = useState<string>(
    () =>
      customPrimaryColor ||
      resolvePrimaryColors(themePreset, null, isDarkMode).hex
  );

  const onSelectPreset = (presetId: string) => {
    dispatch(setThemePreset(presetId));
    // 选择预设时若有自定义色，清除自定义色以便使用预设的主题色
    if (customPrimaryColor) {
      dispatch(setCustomPrimaryColor(null));
    }
  };

  const onChangeCustomColor = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const color = e.target.value;
    setCustomInput(color);
    dispatch(setCustomPrimaryColor(color));
  };

  const onResetTheme = () => {
    dispatch(resetThemeSettings());
    const defaultColor = resolvePrimaryColors(
      "default",
      null,
      isDarkMode
    ).hex;
    setCustomInput(defaultColor);
  };

  const currentColor = resolvePrimaryColors(
    themePreset,
    customPrimaryColor,
    isDarkMode
  ).hex;

  return (
    <StyledSettingSection>
      <StyledSectionHeading>
        {t("settings.themeColorsTitle", "全局主题配色")}
      </StyledSectionHeading>
      <StyledThemeSectionContent>
        <StyledPresetGrid>
          {THEME_PRESETS.map((preset) => {
            const previewColor = isDarkMode
              ? preset.darkPrimary
              : preset.lightPrimary;
            const isPresetActive =
              !customPrimaryColor && themePreset === preset.id;
            return (
              <StyledPresetCard
                key={preset.id}
                $active={isPresetActive}
                $color={previewColor}
                onClick={() => onSelectPreset(preset.id)}
                type="button"
                title={t(preset.nameKey)}
              >
                <StyledColorCircle $color={previewColor} />
                <StyledPresetName>{t(preset.nameKey)}</StyledPresetName>
              </StyledPresetCard>
            );
          })}
        </StyledPresetGrid>

        <StyledCustomColorRow>
          <StyledCustomColorLabel>
            <StyledCustomTitle>
              {t("settings.customPrimaryColor", "自定义主色")}
            </StyledCustomTitle>
            <StyledCustomHint>
              {customPrimaryColor
                ? t("settings.customColorActive", "当前使用自定义配色")
                : t(
                    "settings.customColorHint",
                    "选择任意颜色覆盖全局主色"
                  )}
            </StyledCustomHint>
          </StyledCustomColorLabel>
          <StyledCustomControls>
            <StyledColorInput
              type="color"
              value={customPrimaryColor || currentColor}
              onChange={onChangeCustomColor}
              title={t("settings.pickCustomColor", "选取主色")}
            />
            {(customPrimaryColor || themePreset !== "default") && (
              <StyledResetButton onClick={onResetTheme} type="button">
                {t("settings.resetThemeDefault", "恢复默认主题")}
              </StyledResetButton>
            )}
          </StyledCustomControls>
        </StyledCustomColorRow>
      </StyledThemeSectionContent>
    </StyledSettingSection>
  );
};

export default React.memo(ThemeColorSection);
