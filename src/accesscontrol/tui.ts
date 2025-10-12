/**
 * Access Control TUI Implementation
 * A text-based user interface for configuring access control settings
 */

import {
  createSignal,
  createStore,
  div,
  label,
  button,
  input,
  h1,
  render,
  Show,
  For,
} from "../lib/ccTUI";
import {
  AccessConfig,
  UserGroupConfig,
  loadConfig,
  saveConfig,
} from "./config";

// Tab indices
const TABS = {
  BASIC: 0,
  GROUPS: 1,
  WELCOME_TOAST: 2,
  WARN_TOAST: 3,
  NOTICE_TOAST: 4,
} as const;

type TabIndex = (typeof TABS)[keyof typeof TABS];

// Error dialog state
interface ErrorState {
  show: boolean;
  message: string;
}

/**
 * Main TUI Application Component
 */
const AccessControlTUI = () => {
  // Configuration state
  const [config, setConfig] = createStore<AccessConfig>({} as AccessConfig);

  // UI state
  const [currentTab, setCurrentTab] = createSignal<TabIndex>(TABS.BASIC);
  const [selectedGroupIndex, setSelectedGroupIndex] = createSignal(0);
  const [errorState, setErrorState] = createStore<ErrorState>({
    show: false,
    message: "",
  });

  // New user input for group management
  const [newUserName, setNewUserName] = createSignal("");

  // Load configuration on initialization
  const configFilepath = `${shell.dir()}/access.config.json`;
  const loadedConfig = loadConfig(configFilepath);
  setConfig(() => loadedConfig);

  // Tab navigation functions
  const tabNames = [
    "Basic",
    "Groups",
    "Welcome Toast",
    "Warn Toast",
    "Notice Toast",
  ];

  const showError = (message: string) => {
    setErrorState("show", true);
    setErrorState("message", message);
  };

  const hideError = () => {
    setErrorState("show", false);
    setErrorState("message", "");
  };

  // Validation functions
  const validateNumber = (value: string): number | null => {
    const num = parseInt(value);
    return isNaN(num) ? null : num;
  };

  const validateTextComponent = (value: string): boolean => {
    try {
      const parsed = textutils.unserialiseJSON(value);
      return parsed !== undefined && typeof parsed === "object";
    } catch {
      return false;
    }
  };

  // Save configuration with validation
  const handleSave = () => {
    try {
      const currentConfig = config();

      // Validate numbers
      if (
        validateNumber(currentConfig.detectInterval?.toString() ?? "") === null
      ) {
        showError("Invalid Detect Interval: must be a number");
        return;
      }
      if (
        validateNumber(currentConfig.watchInterval?.toString() ?? "") === null
      ) {
        showError("Invalid Watch Interval: must be a number");
        return;
      }
      if (
        validateNumber(currentConfig.noticeTimes?.toString() ?? "") === null
      ) {
        showError("Invalid Notice Times: must be a number");
        return;
      }
      if (
        validateNumber(currentConfig.detectRange?.toString() ?? "") === null
      ) {
        showError("Invalid Detect Range: must be a number");
        return;
      }

      // Validate text components for toast configs
      const toastConfigs = [
        {
          name: "Welcome Toast Title",
          value: currentConfig.welcomeToastConfig?.title,
        },
        {
          name: "Welcome Toast Message",
          value: currentConfig.welcomeToastConfig?.msg,
        },
        {
          name: "Warn Toast Title",
          value: currentConfig.warnToastConfig?.title,
        },
        {
          name: "Warn Toast Message",
          value: currentConfig.warnToastConfig?.msg,
        },
        {
          name: "Notice Toast Title",
          value: currentConfig.noticeToastConfig?.title,
        },
        {
          name: "Notice Toast Message",
          value: currentConfig.noticeToastConfig?.msg,
        },
      ];

      for (const toastConfig of toastConfigs) {
        if (toastConfig.value != undefined) {
          const serialized = textutils.serialiseJSON(toastConfig.value);
          if (!validateTextComponent(serialized)) {
            showError(
              `Invalid ${toastConfig.name}: must be valid MinecraftTextComponent JSON`,
            );
            return;
          }
        }
      }

      // Save configuration
      saveConfig(currentConfig, configFilepath);
      showError("Configuration saved successfully!");
    } catch (error) {
      showError(`Failed to save configuration: ${String(error)}`);
    }
  };

  // Add user to selected group
  const addUser = () => {
    const userName = newUserName().trim();
    if (userName === "") return;

    const groupIndex = selectedGroupIndex();
    if (groupIndex === 0) {
      // Admin group
      const currentAdmin = config().adminGroupConfig;
      setConfig("adminGroupConfig", {
        ...currentAdmin,
        groupUsers: [...currentAdmin.groupUsers, userName],
      });
    } else {
      // Regular group
      const actualIndex = groupIndex - 1;
      const currentGroups = config().usersGroups;
      const currentGroup = currentGroups[actualIndex];
      const newGroups = [...currentGroups];
      newGroups[actualIndex] = {
        ...currentGroup,
        groupUsers: [...(currentGroup?.groupUsers ?? []), userName],
      };
      setConfig("usersGroups", newGroups);
    }
    setNewUserName("");
  };

  // Remove user from selected group
  const removeUser = (userName: string) => {
    const groupIndex = selectedGroupIndex();
    if (groupIndex === 0) {
      // Admin group
      const currentAdmin = config().adminGroupConfig;
      setConfig("adminGroupConfig", {
        ...currentAdmin,
        groupUsers: currentAdmin.groupUsers.filter((user) => user !== userName),
      });
    } else {
      // Regular group
      const actualIndex = groupIndex - 1;
      const currentGroups = config().usersGroups;
      const currentGroup = currentGroups[actualIndex];
      const newGroups = [...currentGroups];
      newGroups[actualIndex] = {
        ...currentGroup,
        groupUsers: (currentGroup?.groupUsers ?? []).filter(
          (user) => user !== userName,
        ),
      };
      setConfig("usersGroups", newGroups);
    }
  };

  // Get all groups for selection
  const getAllGroups = (): UserGroupConfig[] => {
    const currentConfig = config();
    return [currentConfig.adminGroupConfig, ...currentConfig.usersGroups];
  };

  // Get currently selected group
  const getSelectedGroup = (): UserGroupConfig => {
    const groups = getAllGroups();
    return groups[selectedGroupIndex()] ?? config().adminGroupConfig;
  };

  /**
   * Basic Configuration Tab
   */
  const BasicTab = () => {
    return div(
      { class: "flex flex-col" },
      label({}, "Detect Interval (ms):"),
      input({
        type: "text",
        value: () => config().detectInterval?.toString() ?? "",
        onInput: (value) => {
          const num = validateNumber(value);
          if (num !== null) setConfig("detectInterval", num);
        },
      }),

      label({}, "Watch Interval (ms):"),
      input({
        type: "text",
        value: () => config().watchInterval?.toString() ?? "",
        onInput: (value) => {
          const num = validateNumber(value);
          if (num !== null) setConfig("watchInterval", num);
        },
      }),

      label({}, "Notice Times:"),
      input({
        type: "text",
        value: () => config().noticeTimes?.toString() ?? "",
        onInput: (value) => {
          const num = validateNumber(value);
          if (num !== null) setConfig("noticeTimes", num);
        },
      }),

      label({}, "Detect Range:"),
      input({
        type: "text",
        value: () => config().detectRange?.toString() ?? "",
        onInput: (value) => {
          const num = validateNumber(value);
          if (num !== null) setConfig("detectRange", num);
        },
      }),

      label({}, "Is Warn:"),
      input({
        type: "checkbox",
        checked: () => config().isWarn ?? false,
        onChange: (checked) => setConfig("isWarn", checked),
      }),
    );
  };

  /**
   * Groups Configuration Tab
   */
  const GroupsTab = () => {
    const groups = getAllGroups();
    const selectedGroup = getSelectedGroup();

    return div(
      { class: "flex flex-row" },
      // Left side - Groups list
      div(
        { class: "flex flex-col" },
        label({}, "Groups:"),
        For({ each: () => groups }, (group, index) =>
          button(
            {
              class:
                selectedGroupIndex() === index() ? "bg-blue text-white" : "",
              onClick: () => setSelectedGroupIndex(index()),
            },
            group.groupName,
          ),
        ),
      ),

      // Right side - Group details
      div(
        { class: "flex flex-col ml-2" },
        label({}, () => `Group: ${selectedGroup.groupName}`),

        label({}, "Is Allowed:"),
        input({
          type: "checkbox",
          checked: () => selectedGroup.isAllowed,
          onChange: (checked) => {
            const groupIndex = selectedGroupIndex();
            if (groupIndex === 0) {
              const currentAdmin = config().adminGroupConfig;
              setConfig("adminGroupConfig", {
                ...currentAdmin,
                isAllowed: checked,
              });
            } else {
              const actualIndex = groupIndex - 1;
              const currentGroups = config().usersGroups;
              const currentGroup = currentGroups[actualIndex];
              const newGroups = [...currentGroups];
              newGroups[actualIndex] = {
                ...currentGroup,
                isAllowed: checked,
              };
              setConfig("usersGroups", newGroups);
            }
          },
        }),

        label({}, "Is Notice:"),
        input({
          type: "checkbox",
          checked: () => selectedGroup.isNotice,
          onChange: (checked) => {
            const groupIndex = selectedGroupIndex();
            if (groupIndex === 0) {
              const currentAdmin = config().adminGroupConfig;
              setConfig("adminGroupConfig", {
                ...currentAdmin,
                isNotice: checked,
              });
            } else {
              const actualIndex = groupIndex - 1;
              const currentGroups = config().usersGroups;
              const currentGroup = currentGroups[actualIndex];
              const newGroups = [...currentGroups];
              newGroups[actualIndex] = {
                ...currentGroup,
                isNotice: checked,
              };
              setConfig("usersGroups", newGroups);
            }
          },
        }),

        label({}, "Group Users:"),
        // User management
        div(
          { class: "flex flex-row" },
          input({
            type: "text",
            value: newUserName,
            onInput: setNewUserName,
            placeholder: "Enter username",
          }),
          button({ onClick: addUser }, "Add"),
        ),

        // Users list
        For({ each: () => selectedGroup.groupUsers ?? [] }, (user) =>
          div(
            { class: "flex flex-row items-center" },
            label({}, user),
            button(
              {
                class: "ml-1 bg-red text-white",
                onClick: () => removeUser(user),
              },
              "Remove",
            ),
          ),
        ),
      ),
    );
  };

  /**
   * Toast Configuration Tab Factory
   */
  const createToastTab = (
    toastType: "welcomeToastConfig" | "warnToastConfig" | "noticeToastConfig",
  ) => {
    return () => {
      const toastConfig = config()[toastType];

      return div(
        { class: "flex flex-col" },
        label({}, "Title (JSON):"),
        input({
          type: "text",
          value: () => textutils.serialiseJSON(toastConfig?.title) ?? "",
          onInput: (value) => {
            try {
              const parsed = textutils.unserialiseJSON(value);
              if (parsed != undefined && typeof parsed === "object") {
                const currentConfig = config();
                const currentToast = currentConfig[toastType];
                setConfig(toastType, {
                  ...currentToast,
                  title: parsed as MinecraftTextComponent,
                });
              }
            } catch {
              // Invalid JSON, ignore
            }
          },
        }),

        label({}, "Message (JSON):"),
        input({
          type: "text",
          value: () => textutils.serialiseJSON(toastConfig?.msg) ?? "",
          onInput: (value) => {
            try {
              const parsed = textutils.unserialiseJSON(value);
              if (parsed != undefined && typeof parsed === "object") {
                const currentConfig = config();
                const currentToast = currentConfig[toastType];
                setConfig(toastType, {
                  ...currentToast,
                  msg: parsed as MinecraftTextComponent,
                });
              }
            } catch {
              // Invalid JSON, ignore
            }
          },
        }),

        label({}, "Prefix:"),
        input({
          type: "text",
          value: () => toastConfig?.prefix ?? "",
          onInput: (value) => {
            const currentConfig = config();
            const currentToast = currentConfig[toastType];
            setConfig(toastType, { ...currentToast, prefix: value });
          },
        }),

        label({}, "Brackets:"),
        input({
          type: "text",
          value: () => toastConfig?.brackets ?? "",
          onInput: (value) => {
            const currentConfig = config();
            const currentToast = currentConfig[toastType];
            setConfig(toastType, { ...currentToast, brackets: value });
          },
        }),

        label({}, "Bracket Color:"),
        input({
          type: "text",
          value: () => toastConfig?.bracketColor ?? "",
          onInput: (value) => {
            const currentConfig = config();
            const currentToast = currentConfig[toastType];
            setConfig(toastType, { ...currentToast, bracketColor: value });
          },
        }),
      );
    };
  };

  // Create toast tab components
  const WelcomeToastTab = createToastTab("welcomeToastConfig");
  const WarnToastTab = createToastTab("warnToastConfig");
  const NoticeToastTab = createToastTab("noticeToastConfig");

  /**
   * Error Dialog
   */
  const ErrorDialog = () => {
    return Show(
      { when: () => errorState().show },
      div(
        {
          class:
            "fixed top-1/4 left-1/4 right-1/4 bottom-1/4 bg-red text-white border",
        },
        div(
          { class: "flex flex-col p-2" },
          label({}, () => errorState().message),
          button(
            {
              class: "mt-2 bg-white text-black",
              onClick: hideError,
            },
            "OK",
          ),
        ),
      ),
    );
  };

  /**
   * Tab Content Renderer
   */
  const TabContent = () => {
    const tab = currentTab();
    if (tab === TABS.BASIC) return BasicTab();
    if (tab === TABS.GROUPS) return GroupsTab();
    if (tab === TABS.WELCOME_TOAST) return WelcomeToastTab();
    if (tab === TABS.WARN_TOAST) return WarnToastTab();
    if (tab === TABS.NOTICE_TOAST) return NoticeToastTab();
    return BasicTab(); // fallback
  };

  /**
   * Main UI Layout
   */
  return div(
    { class: "flex flex-col h-full" },
    // Header
    h1("Access Control Configuration"),

    // Tab bar
    div(
      { class: "flex flex-row" },
      For({ each: () => tabNames }, (tabName, index) =>
        button(
          {
            class: currentTab() === index() ? "bg-blue text-white" : "",
            onClick: () => setCurrentTab(index() as TabIndex),
          },
          tabName,
        ),
      ),
    ),

    // Content area
    div({ class: "flex-1 p-2" }, TabContent()),

    // Action buttons
    div(
      { class: "flex flex-row justify-center p-2" },
      button(
        {
          class: "bg-green text-white mr-2",
          onClick: handleSave,
        },
        "Save",
      ),
      button(
        {
          class: "bg-gray text-white",
          onClick: () => {
            // Close TUI - this will be handled by the application framework
            error("TUI_CLOSE");
          },
        },
        "Close",
      ),
    ),

    // Error dialog overlay
    ErrorDialog(),
  );
};

/**
 * Launch the Access Control TUI
 */
export function launchAccessControlTUI(): void {
  try {
    render(AccessControlTUI);
  } catch (e) {
    if (e === "TUI_CLOSE" || e === "Terminated") {
      // Normal exit
      return;
    } else {
      print("Error in Access Control TUI:");
      printError(e);
    }
  }
}

// Export the main component for external use
export { AccessControlTUI };
