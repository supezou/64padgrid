import {
    Plugin,
    MarkdownPostProcessorContext
} from "obsidian";

export default class PadGridPlugin extends Plugin {

    async onload() {

        // console.log("PadGrid loaded");

        this.registerMarkdownCodeBlockProcessor(
            "64padgrid",
            (source, el, ctx) => {

                const lines = source
                    .split("\n")
                    .map(line => line.trim());

                let color = "#44cc66";
                let rootColor = "#ff8c1a";
                let size = 30;
                let label = "";
                let showPattern = false;

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
                        /^([a-zA-Z]+)\s*=\s*(.+)$/
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
                    showPattern
                );
            }
        );
    }

    onunload() {
        // console.log("PadGrid unloaded");
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
        showPattern: boolean
    ) {

        // 'R' marks a root note; everything else is case-insensitive
        const states = grids.map(
            rows => rows.map(
                row => [...row].map(
                    c => c === "R" || c === "r"
                        ? "R"
                        : c.toLowerCase()
                )
            )
        );

        let currentSource = originalSource;

        const settingsSource =
            originalSource
                .split("\n")
                .map(line => line.trim())
                .filter(
                    line =>
                        line.length > 0 &&
                        !line.includes("|")
                )
                .join("\n");

        // Per-block values consumed by styles.css
        container.addClass("pad-grid-block");

        container.setCssProps({
            "--pad-size": `${size}px`,
            "--pad-color": color,
            "--pad-root-color": rootColor
        });

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

                        cell.toggleClass(
                            "active",
                            row[x] === "x" || row[x] === "R"
                        );

                        cell.toggleClass(
                            "root",
                            row[x] === "R"
                        );
                    };

                    refreshCell();

                    cell.addEventListener(
                        "click",
                        async () => {

                            // Cycle: o → x → R → o
                            row[x] =
                                row[x] === "x"
                                    ? "R"
                                    : row[x] === "R"
                                        ? "o"
                                        : "x";

                            refreshCell();

                            const pattern =
                                this.serializeAll(
                                    states
                                );

                            if (output) {
                                output.setText(
                                    pattern
                                );
                            }

                            const newSource =
                                settingsSource.length > 0
                                    ? `${settingsSource}\n\n${pattern}`
                                    : pattern;

                            await this.savePattern(
                                ctx,
                                currentSource,
                                newSource
                            );

                            currentSource =
                                newSource;
                        }
                    );
                });
            });
        });
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
                        row.join("")
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

        newSource = newSource.replace(
            /\n{3,}/g,
            "\n\n"
        );

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
                newBlock
            );

        await this.app.vault.modify(
            file,
            content
        );
    }
}