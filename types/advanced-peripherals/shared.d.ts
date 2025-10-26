declare interface BlockItemDetailData {
  id: string;
  tag: object;
  Count: number;
  Slot: number;
}

declare interface BlockDetailData {
  Items: Record<string, BlockItemDetailData>;
}

/**
 * Minecraft Text Component format
 * @see https://minecraft.wiki/w/Text_component_format
 */
declare type MinecraftColor =
  | "black"
  | "dark_blue"
  | "dark_green"
  | "dark_aqua"
  | "dark_red"
  | "dark_purple"
  | "gold"
  | "gray"
  | "dark_gray"
  | "blue"
  | "green"
  | "aqua"
  | "red"
  | "light_purple"
  | "yellow"
  | "white"
  | "reset"; // RGB color in #RRGGBB format

declare type MinecraftFont =
  | "minecraft:default"
  | "minecraft:uniform"
  | "minecraft:alt";

declare type ClickEventAction =
  | "open_url"
  | "open_file"
  | "run_command"
  | "suggest_command"
  | "change_page"
  | "copy_to_clipboard";

declare type HoverEventAction = "show_text" | "show_item" | "show_entity";

declare interface ClickEvent {
  action: ClickEventAction;
  value: string | number;
}

declare interface HoverEvent {
  action: HoverEventAction;
  contents?: unknown;
  value?: unknown;
}

declare interface BaseTextComponent {
  type?: "text" | "translatable" | "score" | "selector" | "keybind" | "nbt";
  text?: string;
  translate?: string;
  with?: (MinecraftTextComponent | string)[];
  score?: {
    name: string;
    objective: string;
    value?: string;
  };
  selector?: string;
  keybind?: string;
  nbt?: string;
  interpret?: boolean;
  separator?: MinecraftTextComponent;
  block?: string;
  entity?: string;
  storage?: string;

  // Formatting
  color?: MinecraftColor;
  font?: MinecraftFont;
  bold?: boolean;
  italic?: boolean;
  underlined?: boolean;
  strikethrough?: boolean;
  obfuscated?: boolean;
  insertion?: string;
  clickEvent?: ClickEvent;
  hoverEvent?: HoverEvent;
  shadow_color?: number;

  // Nested components
  extra?: MinecraftTextComponent[];
}

declare interface TextTextComponent extends BaseTextComponent {
  type?: "text";
  text: string;
}

declare interface TranslatableTextComponent extends BaseTextComponent {
  type: "translatable";
  translate: string;
  with?: (MinecraftTextComponent | string)[];
}

declare type MinecraftTextComponent =
  | TextTextComponent
  | TranslatableTextComponent
  | BaseTextComponent;
