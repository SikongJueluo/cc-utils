/**
 * ComputerCraft TUI (Terminal User Interface) Framework
 * Based on Qt signal/slot principles for event handling
 * Provides input/output, option selection and keyboard event handling
 */

import { Signal } from "./signal";
import { UIObject } from "./UIObject";
import { UIComponent } from "./UIComponent";
import { TextLabel } from "./TextLabel";
import { InputField } from "./InputField";
import { OptionSelector } from "./OptionSelector";
import { TabWidget } from "./TabWidget";
import { UIWindow } from "./UIWindow";
import { TUIApplication } from "./TUIApplication";
import { Button } from "./Button";

// Export the main classes for use in other modules
export {
  Signal,
  UIObject,
  UIComponent,
  TextLabel,
  InputField,
  OptionSelector,
  TabWidget,
  UIWindow,
  TUIApplication,
  Button,
};
