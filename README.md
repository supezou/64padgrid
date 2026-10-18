# 64 Pad Grid

An [Obsidian](https://obsidian.md) plugin that draws pad patterns for 8×8 grid controllers (Ableton Push, Launchpad and the like) inside your notes. You write a pattern in a `64padgrid` code block and the plugin renders it as a clickable grid. Clicking a pad saves the change back to the note.

Use it to write down scale shapes, chord voicings, finger-drumming layouts or anything else you play on a pad grid.

## Features

- Draws pad patterns as glowing, clickable grids.
- Marks root notes in their own colour.
- Click a pad to cycle it **off → on → root → off**. The note updates as you click.
- Puts several grids side by side in one block, wrapping on narrow panes.
- Lets you set the pad size, colours and a label for each block.
- Can show the raw pattern text under the grids.
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

Each `|` starts a row, and each character after it is one pad.

| Character | Pad |
| --- | --- |
| `x` or `X` | On (pad colour) |
| `R` or `r` | Root (root colour) |
| anything else, e.g. `o` | Off |

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

| Setting | Default | Description |
| --- | --- | --- |
| `label` | *(none)* | Text shown above the grids |
| `color` | `#44cc66` | Colour of pads that are on |
| `rootColor` | `#ff8c1a` | Colour of root pads |
| `size` | `30` | Pad width and height in pixels |
| `showPattern` | `false` | `true` shows the pattern text under the grids |

`color` and `rootColor` take any CSS colour, such as `#3399ff`, `tomato` or `rgb(255 0 128)`.

### Editing by clicking

Clicking a pad rewrites the code block in your note:

- Settings lines move to the top of the block.
- Each grid is saved as a single pattern line, with a blank line between grids.

If the block in the file changed while the note was open (for example, you edited it in source mode), the plugin doesn't overwrite it. Reopen the note and click again.

## Installation

The plugin isn't in the Community Plugins directory yet, so install it by hand:

1. Download `main.js`, `manifest.json` and `styles.css` from the latest release.
2. Copy them into `<your vault>/.obsidian/plugins/64padgrid/`.
3. Reload Obsidian, then turn on **64 Pad Grid** in **Settings → Community plugins**.

The plugin works on desktop and mobile and needs Obsidian 1.5.0 or later.

## Customising the look

All styling is in `styles.css`. To change the look without editing the plugin, override these classes in a [CSS snippet](https://help.obsidian.md/Extending+Obsidian/CSS+snippets):

| Class | Element |
| --- | --- |
| `.pad-grid-block` | The whole code block |
| `.pad-label` | The label |
| `.pad-grid-row` | The row that holds the grids |
| `.pad-grid` | One grid |
| `.pad-row` | One row of pads |
| `.pad-cell` | One pad (gets `.active` when on and `.root` for a root) |

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

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.