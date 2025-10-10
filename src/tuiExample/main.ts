/**
 * Example usage of the ComputerCraft TUI framework
 */

import {
  TUIApplication,
  TextLabel,
  InputField,
  OptionSelector,
} from "../lib/ccTUI";

// Create the main application
const app = new TUIApplication();

// Get terminal size
const [termWidth, _termHeight] = term.getSize();

// Create UI components
const title = new TextLabel(
  Math.floor(termWidth / 2) - 10,
  2,
  "CC TUI Framework Demo",
  colors.yellow,
  colors.black,
);

const label1 = new TextLabel(5, 5, "Enter your name:");

const inputField = new InputField(5, 6, 30, "", "Type here...");

const optionLabel = new TextLabel(5, 8, "Select an option:");

const options = ["Option 1", "Option 2", "Option 3", "Option 4"];
const optionSelector = new OptionSelector(5, 9, options, "Choose:", 0);

const statusLabel = new TextLabel(5, 11, "Status: Ready");

// Add components to the application
app.addComponent(title);
app.addComponent(label1);
app.addComponent(inputField);
app.addComponent(optionLabel);
app.addComponent(optionSelector);
app.addComponent(statusLabel);

// Set focus to the input field initially
app.getWindow().setFocusFor(optionSelector);

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
