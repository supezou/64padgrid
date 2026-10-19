# 64 Pad Grid

**Version 1.0.2** · Requires Obsidian 1.5.7 or later · [Changelog](#changelog)

An [Obsidian](https://obsidian.md) plugin that draws pad patterns for 8×8 grid controllers (Ableton Push, Launchpad and the like) inside your notes. You write a pattern in a `64padgrid` code block and the plugin renders it as a clickable grid. Clicking a pad saves the change back to the note.

Use it to write down scale shapes, chord voicings, finger-drumming layouts or anything else you play on a pad grid.

## Features

- Draws pad patterns as glowing, clickable grids.
- Marks root notes in their own colour.
- Shows text on pads, such as finger numbers or note names.
- Click a pad to cycle it **off → on → root → off**. The note updates as you click.
- Double-click a pad to give it a text label.
- Change settings from a menu: colours, pad size, label and more, with a live preview.
- Keeps your code block's line breaks and layout when it saves.
- Puts several grids side by side in one block, wrapping on narrow panes.
- Can show the raw pattern text under the grids.
- Works with touch on mobile.
- Isn't limited to 8×8: a grid has as many rows and columns as you write.

## Usage

Create a code block with the language `64padgrid`:

````markdown
```64padgrid
label = My shape

|oooooooo|oooooooo|ooxooxoo|oRooooRo|ooxooxoo|oooooooo|oooooooo|oooooooo|
```
````

### Pattern syntax

Each `|` starts a row, and each character after it is one pad. Spaces inside a row are ignored.

| Character | Pad |
| --- | --- |
| `o` or `O` | Off |
| `x` or `X` | On (pad colour) |
| `R` or `r` | Root (root colour), showing "R" |
| any other character, e.g. `3` | On (pad colour), showing that character |
| `[text]`, e.g. `[C#m]` | On (pad colour), showing the text |

Pad text is available from version 1.0.2. Use brackets for labels longer than one character. A label can't contain `|`, `[` or `]`.

````markdown
```64padgrid
|o3xoxoxo
|Roxoxxoo
|oo[C#m]xoooo
```
````

The first row you write is drawn at the top. You can keep a pattern on one line or split it across lines, one row per line:

````markdown
```64padgrid
|oooooooo
|oooxoooo
|ooRoxooo
|oooxoooo
```
````

### Multiple grids

Put a blank line between patterns to draw them side by side:

````markdown
```64padgrid
label = Two shapes
size = 24

|oooo|oxxo|oRxo|oooo|

|xooo|oxoo|ooRo|ooox|
```
````

A settings line between patterns also starts a new grid.

### Settings

Write settings as `key = value` lines anywhere in the block. They apply to every grid in the block.

| Setting | Default | Description | Since |
| --- | --- | --- | --- |
| `label` | *(none)* | Text shown above the grids | 1.0.1 |
| `color` | `#44cc66` | Colour of pads that are on | 1.0.1 |
| `rootColor` | `#ff8c1a` | Colour of root pads | 1.0.1 |
| `size` | `30` | Pad width and height in pixels | 1.0.1 |
| `showPattern` | `false` | `true` shows the pattern text under the grids | 1.0.1 |
| `showText` | `true` | `false` hides the text on pads; labelled pads stay lit | 1.0.2 |

`color` and `rootColor` take any CSS colour, such as `#3399ff`, `tomato` or `rgb(255 0 128)`.

You can also change every setting from the [settings menu](#settings-menu) instead of typing it.

### Editing pads

- **Click** a pad to cycle it **off → on → root → off**. A click on a labelled pad turns it off.
- **Double-click** a pad to type a label for it (from 1.0.2). Leave the field empty to keep the pad on without a label. Typing `o`, `x` or `R` sets the pad to off, on or root.

A single click waits a quarter of a second before it takes effect, so that a double-click can be told apart from it.

### Settings menu

*Added in 1.0.2.* Open the menu by clicking the **⋯** button in the block's top-right corner, right-clicking the block, or long-pressing it on a touch screen.

| Item | What it does |
| --- | --- |
| **Show text on pads** | Turns `showText` on or off |
| **Show pattern** | Turns `showPattern` on or off |
| **Label** | Opens a field to type the label |
| **Pad color**, **Root color** | Opens the colour picker. The pads recolour as you pick |
| **Size** | Opens a slider. The pads resize as you drag. Press Enter or click outside to keep the size, or Esc to cancel |
| **Reset pad color**, **Reset root color**, **Reset size** | Puts the setting back to its default. Greyed out when it's already the default |

On mobile, **Pad color** and **Root color** open a small panel. If the colour picker doesn't open by itself, tap the colour box in the panel.

### How changes are saved

Every change is written straight back into the code block in your note:

- Clicking or labelling a pad changes only that pad's characters. Line breaks, blank lines and indentation stay as you wrote them. (Up to 1.0.1, saving moved settings to the top and put each grid on one line.)
- Changing a setting from the menu edits its line where it is, or adds a new line at the top of the block. Going back to a default removes the line.

If the block in the file changed while the note was open (for example, you edited it in source mode), the plugin doesn't overwrite it. Reopen the note and click again.

## Installation

The plugin isn't in the Community Plugins directory yet, so install it by hand:

1. Download `main.js`, `manifest.json` and `styles.css` from the latest release.
2. Copy them into `<your vault>/.obsidian/plugins/64padgrid/`.
3. Reload Obsidian, then turn on **64 Pad Grid** in **Settings → Community plugins**.

The plugin works on desktop and mobile and needs Obsidian 1.5.7 or later.

## Customising the look

All styling is in `styles.css`. To change the look without editing the plugin, override these classes in a [CSS snippet](https://help.obsidian.md/Extending+Obsidian/CSS+snippets):

| Class | Element |
| --- | --- |
| `.pad-grid-block` | The whole code block |
| `.pad-label` | The label |
| `.pad-grid-row` | The row that holds the grids |
| `.pad-grid` | One grid |
| `.pad-row` | One row of pads |
| `.pad-cell` | One pad (gets `.active` when on, `.root` for a root and `.long-label` for labels over two characters) |
| `.pad-menu-button` | The ⋯ settings button |

Each block also sets the CSS variables `--pad-size`, `--pad-color` and `--pad-root-color` from its settings.

## Development

You need Node.js 18 or later.

```bash
npm install
```

```bash
npm run dev
```

`npm run dev` rebuilds `main.js` whenever you change a file. Use `npm run build` for a production build and `npm run lint` to run ESLint.

For quicker testing, clone the repo straight into `<your vault>/.obsidian/plugins/64padgrid/` and reload Obsidian after each build.

## Changelog

### 1.0.2

- **Pad text:** any character other than `o`, `x` or `R` lights the pad and shows that character; `[text]` shows longer labels. Root pads show "R".
- **Labels:** double-click or double-tap a pad to edit its label.
- **Settings menu:** open it with the ⋯ button, right-click or long-press to toggle options, pick colours and resize pads with a live preview, or reset to defaults.
- **New setting:** `showText` hides or shows the text on pads.
- **Touch support:** double-tap and long-press work on mobile, and iOS no longer shows its own long-press popup over grids.
- **Layout kept on save:** clicking a pad changes only that pad's characters instead of rewriting the whole block.
- **Changed:** characters other than `o`, `x` and `R` used to show as empty pads; they now show as labelled pads. Spaces inside a row are ignored.
- **Fixed:** a `$` in a label no longer garbles the saved text.
- **Docs:** the README now gives the correct minimum Obsidian version, 1.5.7 (unchanged since 1.0.1).

### 1.0.1

- First release: clickable pad grids with root notes, multiple grids per block, and the `label`, `color`, `rootColor`, `size` and `showPattern` settings.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.