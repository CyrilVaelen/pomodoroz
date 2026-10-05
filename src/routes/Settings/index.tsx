import React from "react";
import { StyledSettings } from "styles";

import FeatureSection from "./FeatureSection";
import ThemeColorSection from "./ThemeColorSection";
import LanguageSection from "./LanguageSection";
import NotificationSoundSection from "./NotificationSoundSection";
import TaskTransferSection from "./TaskTransferSection";
import WorkbenchTransferSection from "./WorkbenchTransferSection";
import CloudSyncSection from "./CloudSyncSection";
import HelpSection from "./HelpSection";
import ShortcutSection from "./ShortcutSection";
import SettingHeader from "./SettingHeader";

export default function Settings() {
  return (
    <StyledSettings>
      <SettingHeader />
      <CloudSyncSection />
      <WorkbenchTransferSection />
      <ThemeColorSection />
      <LanguageSection />
      <FeatureSection />
      <NotificationSoundSection />
      <TaskTransferSection />
      <ShortcutSection />
      <HelpSection />
    </StyledSettings>
  );
}
