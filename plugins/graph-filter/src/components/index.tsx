import type { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "@quartz-community/types"
import { Graph as BaseGraph } from "@quartz-community/graph/components"
import { Fragment } from "preact"

const defaultTags = ["timeline", "timelineadl"]

function buildFilterPrelude(): string {
  return `(() => {
  const storageKey = "graph-global-tag-filter-tags";
  const defaultTags = ${JSON.stringify(defaultTags)};

  function normalizeTag(tag) {
    return String(tag || "").trim().replace(/^#/, "").toLowerCase();
  }

  function readSelectedTags() {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return defaultTags;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length === 0) return defaultTags;
      return parsed.map(normalizeTag).filter(Boolean);
    } catch (_) {
      return defaultTags;
    }
  }

  function writeSelectedTags(tags) {
    localStorage.setItem(storageKey, JSON.stringify(tags));
  }

  window.__graphTagFilter = {
    storageKey,
    defaultTags,
    normalizeTag,
    readSelectedTags,
    writeSelectedTags,
  };
})();`
}

function injectGraphFilter(script: string | string[] | undefined): string | string[] | undefined {
  if (!script) return script

  const baseScript = Array.isArray(script) ? script.join("\n") : script
  const marker = "      var width = graph.offsetWidth;"
  const injection = `      var selectedTags = (window.__graphTagFilter && window.__graphTagFilter.readSelectedTags) ? window.__graphTagFilter.readSelectedTags() : ${JSON.stringify(defaultTags)};
      if (renderGeneration === undefined && selectedTags.length > 0) {
        var selectedTagSet = new Set(selectedTags.map(function (tag) {
          return String(tag).trim().replace(/^#/, "").toLowerCase();
        }));
        data = new Map(
          Array.from(data.entries()).filter(function (entry) {
            var slug = entry[0];
            var details = entry[1];
            if (slug.startsWith("tags/")) {
              return selectedTagSet.has(slug.substring(5).toLowerCase());
            }
            var tags = details.tags || [];
            for (var i = 0; i < tags.length; i++) {
              if (selectedTagSet.has(String(tags[i]).trim().replace(/^#/, "").toLowerCase())) {
                return true;
              }
            }
            return false;
          }),
        );
      }
`

  if (!baseScript.includes(marker)) {
    return [buildFilterPrelude(), baseScript]
  }

  return [buildFilterPrelude(), baseScript.replace(marker, `${injection}${marker}`)]
}

function buildControlsScript(): string {
  return `(() => {
  const storageKey = "graph-global-tag-filter-tags";
  const defaultTags = ["timeline", "timelineadl"];

  function normalizeTag(tag) {
    return String(tag || "").trim().replace(/^#/, "").toLowerCase();
  }

  function readSelectedTags() {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return defaultTags;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length === 0) return defaultTags;
      return parsed.map(normalizeTag).filter(Boolean);
    } catch (_) {
      return defaultTags;
    }
  }

  function writeSelectedTags(tags) {
    localStorage.setItem(storageKey, JSON.stringify(tags));
  }

  function syncControls() {
    const selected = new Set(readSelectedTags());
    document.querySelectorAll("[data-graph-filter-tag]").forEach((input) => {
      const tag = normalizeTag(input.getAttribute("data-graph-filter-tag"));
      input.checked = selected.has(tag);
    });
  }

  function selectedFromControls() {
    return Array.from(document.querySelectorAll("[data-graph-filter-tag]")).filter((input) => input.checked).map((input) => normalizeTag(input.getAttribute("data-graph-filter-tag"))).filter(Boolean);
  }

  function refreshOpenGraph() {
    const activeGraph = document.querySelector(".global-graph-outer.active");
    if (!activeGraph) return;
    const icon = document.querySelector(".global-graph-icon");
    if (!icon) return;
    icon.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    window.setTimeout(() => {
      icon.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    }, 0);
  }

  function init() {
    syncControls();
    document.querySelectorAll("[data-graph-filter-tag]").forEach((input) => {
      input.addEventListener("change", () => {
        const selected = selectedFromControls();
        writeSelectedTags(selected.length > 0 ? selected : defaultTags);
        refreshOpenGraph();
      });
    });
    document.querySelectorAll("[data-graph-filter-reset]").forEach((button) => {
      button.addEventListener("click", () => {
        writeSelectedTags(defaultTags);
        syncControls();
        refreshOpenGraph();
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();`
}

export const Graph: QuartzComponentConstructor = (opts) => {
  const baseComponent = BaseGraph(opts as never)
  const patchedBaseScript = injectGraphFilter(baseComponent.afterDOMLoaded)
  const wrapperScript = buildControlsScript()
  const baseCss = Array.isArray(baseComponent.css)
    ? baseComponent.css
    : baseComponent.css
      ? [baseComponent.css]
      : []
  const baseAfterDOMLoaded = Array.isArray(patchedBaseScript)
    ? patchedBaseScript
    : patchedBaseScript
      ? [patchedBaseScript]
      : []

  const GraphFilter: QuartzComponent = (props: QuartzComponentProps) => {
    return (
      <Fragment>
        <div class="graph-filter-panel">
          <div class="graph-filter-panel__title">Global Graph Filter</div>
          <div class="graph-filter-panel__options">
            <label class="graph-filter-panel__option">
              <input data-graph-filter-tag="timeline" type="checkbox" checked />
              <span>#Timeline</span>
            </label>
            <label class="graph-filter-panel__option">
              <input data-graph-filter-tag="timelineADL" type="checkbox" checked />
              <span>#TimelineADL</span>
            </label>
          </div>
          <button class="graph-filter-panel__reset" type="button" data-graph-filter-reset>
            Reset filters
          </button>
        </div>
        {baseComponent(props)}
      </Fragment>
    )
  }

  GraphFilter.css = [
    ...baseCss,
    `
.graph-filter-panel {
  border: 1px solid var(--lightgray);
  background: var(--light);
  border-radius: 12px;
  padding: 0.75rem 0.9rem;
  margin: 0 0 0.75rem 0;
  display: grid;
  gap: 0.6rem;
}

.graph-filter-panel__title {
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--darkgray);
}

.graph-filter-panel__options {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1rem;
}

.graph-filter-panel__option {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.95rem;
}

.graph-filter-panel__reset {
  justify-self: start;
  border: 1px solid var(--lightgray);
  background: transparent;
  color: var(--dark);
  border-radius: 999px;
  padding: 0.35rem 0.8rem;
  cursor: pointer;
}

.graph-filter-panel__reset:hover {
  background: var(--lightgray);
}
    `,
  ]
  GraphFilter.afterDOMLoaded = [wrapperScript, ...baseAfterDOMLoaded]

  return GraphFilter
}
