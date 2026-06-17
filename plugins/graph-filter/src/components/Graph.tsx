import OriginalGraph, { type GraphOptions } from "@quartz-community/graph/components"
import type {
  QuartzComponent,
  QuartzComponentConstructor,
  QuartzComponentProps,
} from "@quartz-community/types"

const DEFAULT_TAGS = ["Timeline", "TimelineADL"]
const STORAGE_KEY = "graph-filter-selected-tags"

function patchGraphScript(script: string): string {
  const insertion = `
      function getSelectedGraphTags() {
        try {
          var raw = localStorage.getItem("${STORAGE_KEY}")
          if (!raw) return ${JSON.stringify(DEFAULT_TAGS)}
          var parsed = JSON.parse(raw)
          if (!Array.isArray(parsed)) return ${JSON.stringify(DEFAULT_TAGS)}
          return parsed.filter(function (tag) {
            return typeof tag === "string" && tag.length > 0
          })
        } catch (err) {
          return ${JSON.stringify(DEFAULT_TAGS)}
        }
      }

      if (graph.classList.contains("global-graph-container")) {
        var selectedTags = getSelectedGraphTags()
        if (selectedTags.length === 0) {
          data = new Map()
        } else {
          var filteredData = new Map()
          data.forEach(function (details, source) {
            var tags = details.tags || []
            var matches = tags.some(function (tag) {
              return selectedTags.indexOf(tag) !== -1
            })
            if (matches) {
              filteredData.set(
                source,
                Object.assign({}, details, {
                  tags: tags.filter(function (tag) {
                    return selectedTags.indexOf(tag) !== -1
                  }),
                }),
              )
            }
          })
          data = filteredData
        }
      }
`

  return script.replace("      var width = graph.offsetWidth;", `${insertion}\n      var width = graph.offsetWidth;`)
}

function controlsScript(): string {
  return `
(function () {
  var storageKey = "${STORAGE_KEY}";
  var selector = "[data-graph-filter-tag]";
  var defaultTags = ${JSON.stringify(DEFAULT_TAGS)};

  function readSelection() {
    try {
      var raw = localStorage.getItem(storageKey);
      if (!raw) return defaultTags.slice();
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return defaultTags.slice();
      return parsed.filter(function (tag) {
        return typeof tag === "string" && tag.length > 0;
      });
    } catch (err) {
      return defaultTags.slice();
    }
  }

  function writeSelection(tags) {
    localStorage.setItem(storageKey, JSON.stringify(tags));
  }

  function currentSelectionFromControls() {
    var inputs = document.querySelectorAll(selector);
    var selected = [];
    for (var i = 0; i < inputs.length; i++) {
      var input = inputs[i];
      if (input.checked) {
        selected.push(input.getAttribute("data-graph-filter-tag") || "");
      }
    }
    return selected.filter(Boolean);
  }

  function syncControls() {
    var selection = new Set(readSelection());
    var inputs = document.querySelectorAll(selector);
    for (var i = 0; i < inputs.length; i++) {
      var input = inputs[i];
      input.checked = selection.has(input.getAttribute("data-graph-filter-tag") || "");
    }
  }

  function refreshOpenGraphs() {
    var activeGraphs = document.querySelectorAll(".global-graph-outer.active");
    for (var i = 0; i < activeGraphs.length; i++) {
      var outer = activeGraphs[i];
      var icon = outer.parentElement && outer.parentElement.querySelector(".global-graph-icon");
      if (!icon) continue;
      icon.click();
      icon.click();
    }
  }

  document.addEventListener("change", function (event) {
    var target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (!target.matches(selector)) return;
    writeSelection(currentSelectionFromControls());
    refreshOpenGraphs();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", syncControls);
  } else {
    syncControls();
  }
})();
`
}

const controlsCss = `
.graph-filter-wrapper {
  display: grid;
  gap: 0.75rem;
}

.graph-filter-panel {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 0.75rem;
  align-items: center;
  padding: 0.65rem 0.8rem;
  border: 1px solid var(--lightgray);
  border-radius: 0.8rem;
  background: color-mix(in srgb, var(--light) 92%, var(--lightgray));
}

.graph-filter-label {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.9rem;
  cursor: pointer;
  user-select: none;
}

.graph-filter-label input {
  accent-color: var(--secondary);
}

.graph-filter-hint {
  font-size: 0.8rem;
  color: var(--gray);
}
`

const Graph: QuartzComponentConstructor<GraphOptions> = (opts?: GraphOptions) => {
  const originalGraph = OriginalGraph(opts)
  const patchedScript = patchGraphScript(Array.isArray(originalGraph.afterDOMLoaded) ? originalGraph.afterDOMLoaded.join("\n") : originalGraph.afterDOMLoaded ?? "")
  const wrapperScript = controlsScript()

  const GraphWrapper: QuartzComponent = (props: QuartzComponentProps) => {
    return (
      <div class="graph-filter-wrapper">
        <div class="graph-filter-panel">
          <span class="graph-filter-hint">Global graph tags</span>
          <label class="graph-filter-label">
            <input type="checkbox" data-graph-filter-tag="Timeline" defaultChecked />
            <span>#Timeline</span>
          </label>
          <label class="graph-filter-label">
            <input type="checkbox" data-graph-filter-tag="TimelineADL" defaultChecked />
            <span>#TimelineADL</span>
          </label>
        </div>
        {originalGraph(props)}
      </div>
    )
  }

  GraphWrapper.css = [originalGraph.css, controlsCss].filter(Boolean).join("\n")
  GraphWrapper.afterDOMLoaded = [patchedScript, wrapperScript].filter(Boolean).join("\n")
  GraphWrapper.displayName = "Graph"

  return GraphWrapper
}

export default Graph