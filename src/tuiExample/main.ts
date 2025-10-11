/**
 * Example usage of the ComputerCraft TUI framework
 */

import {
  TUIApplication,
  TextLabel,
  InputField,
  OptionSelector,
  TabBar,
  Button,
} from "../lib/ccTUI";

// Create the main application
const app = new TUIApplication();

// Get terminal size
const [termWidth, _termHeight] = term.getSize();

// Create UI components
const title = new TextLabel(
  "LabelTitle",
  Math.floor(termWidth / 2) - 10,
  2,
  "CC TUI Framework Demo",
  colors.yellow,
  colors.black,
);

const label1 = new TextLabel("Label1", 5, 5, "Enter your name:");

const inputField = new InputField("LabelInput", 5, 6, 30, "", "Type here...");

const optionLabel = new TextLabel("LableOption", 5, 8, "Select an option:");

const options = ["Option 1", "Option 2", "Option 3", "Option 4"];
const optionSelector = new OptionSelector(
  "OptionSelector",
  5,
  9,
  options,
  "Choose:",
  0,
);

const statusLabel = new TextLabel("LableStatus", 5, 11, "Status: Ready");

// Create a button
const button = new Button(
  "ButtonSubmit",
  5,
  13,
  "Submit",
  colors.white,
  colors.blue,
);

// Create tab widget with sample tabs - using longer tab names for testing
const tabNames = [
  "Home",
  "Settings",
  "User Profile",
  "Messages",
  "About Us",
  "Documentation",
  "Advanced Settings",
  "Account Management",
];
const tabBar = new TabBar("TabWidget", 5, 3, 50, tabNames, 0);

// Add components to the application
app.addComponent(title);
app.addComponent(label1);
app.addComponent(inputField);
app.addComponent(optionLabel);
app.addComponent(optionSelector);
app.addComponent(statusLabel);
app.addComponent(button);
app.addComponent(tabBar);

// Set focus to the input field initially
app.getWindow().setFocusFor(tabBar);

// Connect events
optionSelector.onSelectionChanged.connect((data) => {
  statusLabel.setText(
    `Status: Selected ${data?.value} (index: ${data?.index})`,
  );
});

inputField.onTextChanged.connect((value) => {
  if (value != undefined && value.length > 0) {
    statusLabel.setText(`Status: Input changed to "${value}"`);
  } else {
    statusLabel.setText("Status: Input cleared");
  }
});

tabBar.onTabChanged.connect((data) => {
  statusLabel.setText(
    `Status: Tab changed to ${data?.name} (index: ${data?.index})`,
  );
});

button.onClick.connect(() => {
  const inputValue = inputField.getValue();
  const selectedOption = optionSelector.getSelectedValue();
  statusLabel.setText(
    `Status: Submitted - Input: "${inputValue}", Option: "${selectedOption}"`,
  );
});

// Run the application
try {
  print("Starting CC TUI Demo. Press Ctrl+T to quit.");
  app.run();
} catch (e) {
  if (e === "Terminated") {
    print("Application terminated by user.");
  } else {
    print(`Error running application:`);
    printError(e);
  }
} finally {
  app.stop();
}
