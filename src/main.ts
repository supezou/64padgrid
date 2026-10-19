import {
    App,
    Menu,
    Modal,
    Platform,
    Plugin,
    MarkdownPostProcessorContext,
    setIcon
} from "obsidian";

// One pad in a pattern line: a bracketed label like [C#], or any single
// character that isn't a row separator or whitespace
const PAD_TOKEN = /\[[^\]]+\]|[^\s|]/g;

const SETTING_LINE = /^([a-zA-Z]+)\s*=\s*(.+)$/;

// How long a finger must stay down to open the settings menu
const LONG_PRESS_MS = 500;

// Screen position where a menu or picker opens
interface Point {
    x: number;
    y: number;
}

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

// Used when a block has no setting line for these
const DEFAULTS = {
    color: "#44cc66",
    rootColor: "#ff8c1a",
    size: 30
};

interface PromptOptions {
    title: string;
    initial: string;
    placeholder?: string;
    type?: "text" | "number";
}

// Prompts for a single value; Enter or Save submits, Esc cancels
class PromptModal extends Modal {

    constructor(
        app: App,
        private options: PromptOptions,
        private onSubmit: (text: string) => void
    ) {
        super(app);
    }

    onOpen() {

        this.titleEl.setText(this.options.title);

        const row = this.contentEl.createDiv({
            cls: "pad-prompt-row"
        });

        const input = row.createEl(
            "input",
            {
                type: this.options.type ?? "text",
                value: this.options.initial,
                cls: "pad-prompt-input",
                attr: {
                    placeholder: this.options.placeholder ?? ""
                }
            }
        );

        const submit = () => {
            this.close();
            this.onSubmit(input.value);
        };

        input.addEventListener(
            "keydown",
            (event) => {

                if (event.key === "Enter") {
                    event.preventDefault();
                    submit();
                }
            }
        );

        row.createEl(
            "button",
            {
                text: "Save",
                cls: "mod-cta"
            }
        ).addEventListener("click", submit);

        input.focus();
        input.select();
    }

    onClose() {
        this.contentEl.empty();
    }
}

export default class PadGridPlugin extends Plugin {

    async onload() {

        // console.log("PadGrid loaded");

        this.registerMarkdownCodeBlockProcessor(
            "64padgrid",
            (source, el, ctx) => {

                const lines = source
                    .split("\n")
                    .map(line => line.trim());

                let color = DEFAULTS.color;
                let rootColor = DEFAULTS.rootColor;
                let size = DEFAULTS.size;
                let label = "";
                let showPattern = false;
                let showText = true;

                // Consecutive pattern lines form one grid; a blank or
                // settings line starts the next one
                const patternGroups: string[][] = [];
                let currentGroup: string[] = [];

                const endGroup = () => {
                    if (currentGroup.length > 0) {
                        patternGroups.push(currentGroup);
                        currentGroup = [];
                    }
                };

                for (const line of lines) {

                    if (!line) {
                        endGroup();
                        continue;
                    }

                    const match = line.match(
                        SETTING_LINE
                    );

                    if (match) {

                        const key = match[1];
                        const value = match[2];

                        if (!key || !value) {
                            continue;
                        }

                        switch (key.trim()) {

                            case "label":
                                label = value.trim();
                                break;

                            case "color":
                                color = value.trim();
                                break;

                            case "rootColor":
                                rootColor = value.trim();
                                break;

                            case "size":
                                size = Number(
                                    value.trim()
                                );
                                break;

                            case "showPattern":
                                showPattern =
                                    value
                                        .trim()
                                        .toLowerCase() === "true";
                                break;

                            case "showText":
                                showText =
                                    value
                                        .trim()
                                        .toLowerCase() !== "false";
                                break;
                        }

                        endGroup();
                        continue;
                    }

                    if (line.includes("|")) {
                        currentGroup.push(line);
                    }
                    else {
                        endGroup();
                    }
                }

                endGroup();

                const grids = patternGroups
                    .map(group =>
                        group
                            .join("")
                            .split("|")
                            .map(r => r.trim())
                            .filter(r => r.length > 0)
                    )
                    .filter(rows => rows.length > 0);

                if (grids.length === 0) {
                    return;
                }

                this.renderPadGrid(
                    grids,
                    source,
                    el,
                    ctx,
                    color,
                    rootColor,
                    size,
                    label,
                    showPattern,
                    showText
                );
            }
        );
    }

    onunload() {
        // console.log("PadGrid unloaded");
        this.colorInput?.remove();
        this.closePopover?.(false);
    }

    private closePopover: ((save: boolean) => void) | null = null;

    private activeMenu: Menu | null = null;

    // Floating panel at a point; only one is open at a time. Enter or a
    // tap outside closes it with save = true, Esc with save = false.
    // Saving re-renders the block, so panels preview live and save once
    private openPopover(
        at: Point,
        cls: string,
        build: (popover: HTMLElement, close: (save: boolean) => void) => void,
        onClose: (save: boolean) => void
    ) {

        this.closePopover?.(false);

        const popover = document.body.createDiv({
            cls: `pad-popover ${cls}`
        });

        let closed = false;

        const onPointerDown = (event: PointerEvent) => {

            if (!popover.contains(event.target as Node)) {
                close(true);
            }
        };

        const onKeyDown = (event: KeyboardEvent) => {

            if (event.key === "Escape" || event.key === "Enter") {
                event.preventDefault();
                event.stopPropagation();
                close(event.key === "Enter");
            }
        };

        const close = (save: boolean) => {

            if (closed) {
                return;
            }

            closed = true;

            document.removeEventListener("pointerdown", onPointerDown, true);
            document.removeEventListener("keydown", onKeyDown, true);
            popover.remove();
            this.closePopover = null;

            onClose(save);
        };

        build(popover, close);

        document.addEventListener("pointerdown", onPointerDown, true);
        document.addEventListener("keydown", onKeyDown, true);
        this.closePopover = close;

        // Open at the point, nudged back inside the window if needed
        const rect = popover.getBoundingClientRect();

        popover.setCssStyles({
            left: `${Math.max(8, Math.min(at.x, window.innerWidth - rect.width - 8))}px`,
            top: `${Math.max(8, Math.min(at.y, window.innerHeight - rect.height - 8))}px`
        });
    }

    // Slider that resizes the pads live while dragging
    private pickSize(
        at: Point,
        current: number,
        onPreview: (size: number) => void,
        onDone: (size: number) => void
    ) {

        let size = current;

        this.openPopover(
            at,
            "pad-size-popover",
            (popover) => {

                const slider = popover.createEl(
                    "input",
                    {
                        type: "range",
                        attr: {
                            min: "16",
                            max: String(Math.max(96, current)),
                            step: "1"
                        }
                    }
                );

                slider.value = String(current);

                const readout = popover.createSpan({
                    cls: "pad-size-value",
                    text: `${current}px`
                });

                slider.addEventListener(
                    "input",
                    () => {

                        size = Number(slider.value);

                        readout.setText(`${size}px`);
                        onPreview(size);
                    }
                );

                slider.focus();
            },
            (save) => {

                if (save && size !== current) {
                    onDone(size);
                }
                else {
                    onPreview(current);
                }
            }
        );
    }

    // One hidden <input type="color"> shared by every grid, used only to
    // open the system colour picker on desktop
    private colorInput: HTMLInputElement | null = null;

    private pickColor(
        at: Point,
        title: string,
        current: string,
        onPreview: (hex: string) => void,
        onPick: (hex: string) => void
    ) {

        if (Platform.isMobile) {
            this.pickColorInPanel(at, title, current, onPreview, onPick);
            return;
        }

        const input =
            this.colorInput ??=
                document.body.createEl(
                    "input",
                    {
                        type: "color",
                        cls: "pad-color-picker"
                    }
                );

        // Anchor the picker where the menu was opened
        input.setCssStyles({
            left: `${at.x}px`,
            top: `${at.y}px`
        });

        input.value = this.toHex(current);

        input.oninput = () => onPreview(input.value);
        input.onchange = () => onPick(input.value);

        try {
            input.showPicker();
        }
        catch {
            // Older webviews without showPicker
            input.click();
        }
    }

    // iOS opens its colour picker only for a direct tap on a visible
    // colour input, so mobile shows a small panel holding one. It also
    // tries to open the picker right away, for webviews that allow it
    private pickColorInPanel(
        at: Point,
        title: string,
        current: string,
        onPreview: (hex: string) => void,
        onPick: (hex: string) => void
    ) {

        const start = this.toHex(current);

        let chosen = start;

        this.openPopover(
            at,
            "pad-color-popover",
            (popover, close) => {

                const row = popover.createEl(
                    "label",
                    {
                        cls: "pad-color-row",
                        text: title
                    }
                );

                const input = row.createEl(
                    "input",
                    {
                        type: "color"
                    }
                );

                input.value = start;

                input.addEventListener(
                    "input",
                    () => {
                        chosen = input.value;
                        onPreview(chosen);
                    }
                );

                input.addEventListener(
                    "change",
                    () => {
                        chosen = input.value;
                        close(true);
                    }
                );

                try {
                    input.showPicker();
                }
                catch {
                    // Not allowed here: the user taps the input instead
                }
            },
            (save) => {

                if (save && chosen !== start) {
                    onPick(chosen);
                }
                else {
                    onPreview(current);
                }
            }
        );
    }

    // The picker only accepts #rrggbb, so resolve names like "red" via canvas
    private toHex(
        color: string
    ): string {

        const ctx = document
            .createElement("canvas")
            .getContext("2d");

        if (!ctx) {
            return "#000000";
        }

        ctx.fillStyle = "#000000";
        ctx.fillStyle = color;

        const resolved = String(ctx.fillStyle);

        return HEX_COLOR.test(resolved)
            ? resolved
            : "#000000";
    }

    private renderPadGrid(
        grids: string[][],
        originalSource: string,
        container: HTMLElement,
        ctx: MarkdownPostProcessorContext,
        color: string,
        rootColor: string,
        size: number,
        label: string,
        showPattern: boolean,
        showText: boolean
    ) {

        const states = grids.map(
            rows => rows.map(
                row => (row.match(PAD_TOKEN) ?? []).map(
                    token => this.parsePad(
                        token.length > 1
                            ? token.slice(1, -1)
                            : token
                    )
                )
            )
        );

        let currentSource = originalSource;

        const saveSource = (newSource: string) => {

            void this.savePattern(
                ctx,
                currentSource,
                newSource
            );

            currentSource = newSource;
        };

        // null removes the setting line, falling back to the default
        const changeSetting = (
            key: string,
            value: string | null
        ) => {

            saveSource(
                this.setSetting(
                    currentSource,
                    key,
                    value
                )
            );
        };

        const promptSetting = (
            key: string,
            options: PromptOptions,
            accept: (text: string) => string | null | undefined
        ) => {

            new PromptModal(
                this.app,
                options,
                text => {

                    // undefined means the input was invalid: change nothing
                    const value = accept(text.trim());

                    if (value !== undefined) {
                        changeSetting(key, value);
                    }
                }
            ).open();
        };

        // Settings menu, opened by right-click, long-press or the ⋯ button
        const openMenu = (at: Point) => {

            // Never stack two menus, whatever opened the first one
            this.activeMenu?.hide();

            const menu = new Menu();

            this.activeMenu = menu;
            menu.onHide(() => {
                if (this.activeMenu === menu) {
                    this.activeMenu = null;
                }
            });

            menu.addItem(item => item
                .setTitle("Show text on pads")
                .setChecked(showText)
                .onClick(() => changeSetting(
                    "showText",
                    showText ? "false" : null
                ))
            );

            menu.addItem(item => item
                .setTitle("Show pattern")
                .setChecked(showPattern)
                .onClick(() => changeSetting(
                    "showPattern",
                    showPattern ? null : "true"
                ))
            );

            menu.addSeparator();

            menu.addItem(item => item
                .setTitle(`Label: ${label || "(none)"}…`)
                .onClick(() => promptSetting(
                    "label",
                    {
                        title: "Label",
                        initial: label,
                        placeholder: "Empty = no label"
                    },
                    text => text || null
                ))
            );

            // Colours open the system picker straight away; pads
            // recolour live while picking and save once it's chosen
            const addColorItem = (
                title: string,
                key: string,
                current: string,
                cssVar: string
            ) => {

                menu.addItem(item => item
                    .setTitle(`${title}: ${current}…`)
                    .onClick(() => this.pickColor(
                        at,
                        title,
                        current,
                        hex => container.setCssProps({ [cssVar]: hex }),
                        hex => changeSetting(key, hex)
                    ))
                );
            };

            addColorItem("Pad color", "color", color, "--pad-color");
            addColorItem("Root color", "rootColor", rootColor, "--pad-root-color");

            menu.addItem(item => item
                .setTitle(`Size: ${size}px…`)
                .onClick(() => this.pickSize(
                    at,
                    size,
                    n => container.setCssProps({ "--pad-size": `${n}px` }),
                    n => changeSetting(
                        "size",
                        n === DEFAULTS.size ? null : String(n)
                    )
                ))
            );

            // Removing the line falls back to the default; greyed out
            // when the value is already the default
            menu.addSeparator();

            const isDefaultColor = (value: string, fallback: string) =>
                this.toHex(value).toLowerCase() === fallback.toLowerCase();

            menu.addItem(item => item
                .setTitle("Reset pad color")
                .setDisabled(isDefaultColor(color, DEFAULTS.color))
                .onClick(() => changeSetting("color", null))
            );

            menu.addItem(item => item
                .setTitle("Reset root color")
                .setDisabled(isDefaultColor(rootColor, DEFAULTS.rootColor))
                .onClick(() => changeSetting("rootColor", null))
            );

            menu.addItem(item => item
                .setTitle("Reset size")
                .setDisabled(size === DEFAULTS.size)
                .onClick(() => changeSetting("size", null))
            );

            menu.showAtPosition(at);
        };

        // Holding a finger still on the block for a moment opens the menu,
        // for touch devices that don't send contextmenu on long-press
        let pressTimer: number | null = null;
        let pressStart: Point | null = null;
        let pressFired = false;

        const cancelPress = () => {

            if (pressTimer !== null) {
                window.clearTimeout(pressTimer);
                pressTimer = null;
            }
        };

        container.addEventListener(
            "contextmenu",
            (event) => {

                event.preventDefault();
                event.stopPropagation();

                // Some touch devices do send contextmenu on long-press as
                // well; whichever comes first wins, so the menu opens once
                cancelPress();

                if (pressFired) {
                    return;
                }

                if (pressStart) {
                    pressFired = true;
                }

                openMenu({
                    x: event.clientX,
                    y: event.clientY
                });
            }
        );

        container.addEventListener(
            "pointerdown",
            (event) => {

                pressFired = false;
                pressStart = null;

                if (event.pointerType !== "touch") {
                    return;
                }

                const at = {
                    x: event.clientX,
                    y: event.clientY
                };

                pressStart = at;

                cancelPress();

                pressTimer = window.setTimeout(
                    () => {
                        pressTimer = null;
                        pressFired = true;
                        openMenu(at);
                    },
                    LONG_PRESS_MS
                );
            }
        );

        container.addEventListener(
            "pointermove",
            (event) => {

                // A finger that drifts is scrolling, not pressing
                if (
                    pressStart &&
                    Math.hypot(
                        event.clientX - pressStart.x,
                        event.clientY - pressStart.y
                    ) > 10
                ) {
                    cancelPress();
                }
            }
        );

        container.addEventListener("pointerup", cancelPress);
        container.addEventListener("pointercancel", cancelPress);

        // The tap that ends a long-press mustn't also toggle a pad
        container.addEventListener(
            "click",
            (event) => {

                if (pressFired) {
                    pressFired = false;
                    event.stopPropagation();
                    event.preventDefault();
                }
            },
            true
        );

        // Per-block values consumed by styles.css
        container.addClass("pad-grid-block");

        container.setCssProps({
            "--pad-size": `${size}px`,
            "--pad-color": color,
            "--pad-root-color": rootColor
        });

        // Visible ⋯ button opening the same menu as right-click/long-press
        const menuButton = container.createEl(
            "button",
            {
                cls: "pad-menu-button clickable-icon",
                attr: {
                    "aria-label": "Pad grid settings"
                }
            }
        );

        setIcon(menuButton, "more-horizontal");

        menuButton.addEventListener(
            "click",
            (event) => {

                event.stopPropagation();

                const rect = menuButton.getBoundingClientRect();

                openMenu({
                    x: rect.left,
                    y: rect.bottom
                });
            }
        );

        if (label) {

            container.createEl(
                "div",
                {
                    text: label,
                    cls: "pad-label"
                }
            );
        }

        // Multiple grids sit side by side, wrapping on narrow panes
        const gridRow = container.createDiv({
            cls: "pad-grid-row"
        });

        const output =
            showPattern
                ? container.createEl(
                    "pre",
                    {
                        text: this.serializeAll(states)
                    }
                )
                : null;

        states.forEach((state) => {

            const grid = gridRow.createDiv({
                cls: "pad-grid"
            });

            state.forEach((row) => {

                const rowEl = grid.createDiv({
                    cls: "pad-row"
                });

                row.forEach((_, x) => {

                    const cell = rowEl.createDiv({
                        cls: "pad-cell"
                    });

                    const refreshCell = () => {

                        const value = row[x] ?? "o";

                        cell.toggleClass("active", value !== "o");
                        cell.toggleClass("root", value === "R");
                        cell.toggleClass("long-label", value.length > 2);

                        // Roots and labelled pads show their text unless
                        // showText = false; plain x pads stay blank
                        cell.setText(
                            !showText || value === "o" || value === "x"
                                ? ""
                                : value
                        );
                    };

                    refreshCell();

                    const commit = () => {

                        refreshCell();

                        if (output) {
                            output.setText(
                                this.serializeAll(
                                    states
                                )
                            );
                        }

                        saveSource(
                            this.rewriteSource(
                                currentSource,
                                states
                            )
                        );
                    };

                    const editLabel = () => {

                        const value = row[x] ?? "o";

                        new PromptModal(
                            this.app,
                            {
                                title: "Pad label",
                                initial:
                                    value === "o" || value === "x"
                                        ? ""
                                        : value,
                                placeholder: "e.g. 3, R, C#m (empty = no label)"
                            },
                            text => {

                                // Empty text keeps the pad lit without a label
                                row[x] = text
                                    ? this.parsePad(text)
                                    : "x";

                                commit();
                            }
                        ).open();
                    };

                    // Saving re-renders the block, so a single click waits
                    // briefly in case a second one follows. Two clicks or
                    // taps inside that window edit the label; detecting it
                    // here rather than via "dblclick" also works on iOS,
                    // which doesn't fire dblclick for double taps
                    let clickTimer: number | null = null;

                    cell.addEventListener(
                        "click",
                        () => {

                            if (clickTimer !== null) {
                                window.clearTimeout(clickTimer);
                                clickTimer = null;
                                editLabel();
                                return;
                            }

                            clickTimer = window.setTimeout(
                                () => {

                                    clickTimer = null;

                                    // Cycle: o → x → R → o; a labelled pad clears to o
                                    row[x] =
                                        row[x] === "o"
                                            ? "x"
                                            : row[x] === "x"
                                                ? "R"
                                                : "o";

                                    commit();
                                },
                                250
                            );
                        }
                    );
                });
            });
        });
    }

    // o = off, x = on, R = root, anything else = on with that text shown
    private parsePad(
        text: string
    ): string {

        // These would break the |row| and [label] syntax
        const clean = text.replace(/[|[\]]/g, "").trim();

        if (clean.length !== 1) {
            return clean || "o";
        }

        const lower = clean.toLowerCase();

        return lower === "r"
            ? "R"
            : lower === "o" || lower === "x"
                ? lower
                : clean;
    }

    // Update a "key = value" line in place (the last one wins when parsing),
    // add it at the top if missing, or remove it when value is null
    private setSetting(
        source: string,
        key: string,
        value: string | null
    ): string {

        const lines = source.split("\n");

        let index = -1;

        for (let i = lines.length - 1; i >= 0; i--) {

            if (
                lines[i]?.trim().match(SETTING_LINE)?.[1] === key
            ) {
                index = i;
                break;
            }
        }

        if (value === null) {

            if (index >= 0) {
                lines.splice(index, 1);
            }
        }
        else if (index >= 0) {

            const indent =
                lines[index]?.match(/^\s*/)?.[0] ?? "";

            lines[index] = `${indent}${key} = ${value}`;
        }
        else {
            lines.unshift(`${key} = ${value}`);
        }

        return lines.join("\n");
    }

    // Swap each pad token in the source for its current value, leaving
    // line breaks, spacing and settings lines exactly as written
    private rewriteSource(
        source: string,
        states: string[][][]
    ): string {

        const pads = states
            .flat(2)
            .map(v => v.length > 1 ? `[${v}]` : v);

        let next = 0;

        return source
            .split("\n")
            .map(line => {

                const trimmed = line.trim();

                if (
                    !trimmed.includes("|") ||
                    SETTING_LINE.test(trimmed)
                ) {
                    return line;
                }

                return line.replace(
                    PAD_TOKEN,
                    token => pads[next++] ?? token
                );
            })
            .join("\n");
    }

    // One pattern line per grid, separated by blank lines
    private serializeAll(
        states: string[][][]
    ): string {

        return states
            .map(state => this.serialize(state))
            .join("\n\n");
    }

    private serialize(
        state: string[][]
    ): string {

        return (
            state
                .map(
                    row =>
                        "|" +
                        row
                            .map(v => v.length > 1 ? `[${v}]` : v)
                            .join("")
                )
                .join("") +
            "|"
        );
    }

    private async savePattern(
        ctx: MarkdownPostProcessorContext,
        oldSource: string,
        newSource: string
    ) {

        const file =
            this.app.vault.getFileByPath(
                ctx.sourcePath
            );

        if (!file) {
            return;
        }

        let content =
            await this.app.vault.read(
                file
            );

        const oldBlock =
[
    "```64padgrid",
    oldSource,
    "```"
].join("\n");

        const newBlock =
[
    "```64padgrid",
    newSource,
    "```"
].join("\n");

        if (
            !content.includes(
                oldBlock
            )
        ) {

            console.warn(
                "64padgrid: block not found"
            );

            return;
        }

        content =
            content.replace(
                oldBlock,
                // A function stops "$" in labels acting as a replace pattern
                () => newBlock
            );

        await this.app.vault.modify(
            file,
            content
        );
    }
}