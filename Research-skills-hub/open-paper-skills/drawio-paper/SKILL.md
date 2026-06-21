---
name: drawio-paper
description: Generate publication-quality academic paper diagrams (.drawio) and statistical plots (.png via Python/matplotlib) using a PaperBanana-inspired multi-agent pipeline. Reads methodology sections, figure captions, and raw data to produce structured, aesthetically refined visualizations with reference-driven design.
allowed-tools: Bash, Write, Read, Glob
---

# Academic Paper Visualization Skill (Diagrams + Plots)

Generate publication-quality academic paper visualizations using a structured multi-agent pipeline inspired by PaperBanana. This skill supports two output modes:

- **Diagram mode**: Transforms methodology sections and figure captions into polished `.drawio` diagrams through retrieval, planning, styling, visualization (XML generation), and critique stages.
- **Plot mode**: Transforms raw data (tabular/JSON) and visual intent into publication-ready statistical plots via Python/matplotlib code generation, following the same retrieval, planning, styling, visualization (code generation + execution), and critique pipeline.

## Setup (run once before first use)

Before generating diagrams or plots, ensure the PaperBananaBench reference dataset is available locally. **Check if `{skill_dir}/PaperBananaBench/diagram/ref.json` and `{skill_dir}/PaperBananaBench/plot/ref.json` both exist.** If either is missing, run the following setup steps:

```bash
# 1. Download PaperBananaBench.zip directly from Hugging Face
curl -L -o "{skill_dir}/PaperBananaBench.zip" https://huggingface.co/datasets/dwzhu/PaperBananaBench/resolve/main/PaperBananaBench.zip

# 2. Run the bundled extraction script (works on Windows, macOS, Linux)
python "{skill_dir}/scripts/extract_bench.py"
```

### Python environment for plots

Plots are generated using Python + matplotlib. Ensure the following packages are available:

```bash
pip install matplotlib numpy pillow
```

**Important notes:**
- `{skill_dir}` refers to the directory containing this SKILL.md file (`.claude/skills/drawio-paper/`)
- Only requires `curl` and Python (stdlib `zipfile`), no git or git-lfs needed
- Python extraction is used instead of `unzip` to reliably handle long paths on Windows
- If the download fails due to network issues, retry or ask the user to manually download from https://huggingface.co/datasets/dwzhu/PaperBananaBench/resolve/main/PaperBananaBench.zip and place it at `{skill_dir}/PaperBananaBench.zip`, then run the Python extraction step
- After setup, `{skill_dir}/PaperBananaBench/diagram/` and `{skill_dir}/PaperBananaBench/plot/` should each contain `ref.json`, `test.json`, and an `images/` folder with reference images

## When to use this skill

### Diagram mode
Use when the user wants to create academic paper diagrams, such as:
- Framework/architecture overview diagrams
- Pipeline/workflow diagrams
- Method illustration diagrams
- Module detail diagrams
- System design diagrams for research papers

Trigger keywords: "paper diagram", "academic diagram", "method diagram", "framework diagram", "pipeline diagram", "research figure", "paper figure", "drawio paper", "academic illustration"

### Plot mode
Use when the user wants to create publication-quality statistical plots, such as:
- Bar charts, grouped bar charts, stacked bar charts
- Line charts with confidence intervals
- Scatter plots with shape/color coding
- Heatmaps and confusion matrices
- Radar/spider charts
- Pie/donut charts
- Box plots, violin plots
- Any statistical visualization for academic papers

Trigger keywords: "paper plot", "academic plot", "research plot", "statistical plot", "bar chart", "line chart", "scatter plot", "heatmap", "paper chart", "matplotlib plot", "publication plot", "results plot", "comparison plot"

### Mode detection
- If the user provides **methodology text + figure caption** → Diagram mode
- If the user provides **raw data (table/JSON/CSV) + visual intent** → Plot mode
- If ambiguous, ask the user which mode they want

## Pipeline overview

Follow this 5-stage pipeline to generate each visualization (diagram or plot). Stages 1-3 and 5 share the same structure for both modes; Stage 4 differs based on the output type.

### Stage 1: Reference Retrieval

Before generating, **always** look at reference images from the benchmark dataset to understand the visual style expected.

**For Diagram mode:**
1. Read the reference metadata from `{skill_dir}/PaperBananaBench/diagram/ref.json` and `{skill_dir}/PaperBananaBench/diagram/test.json`
2. Based on the user's topic (domain) and visual intent (diagram type), select 3-5 relevant reference images to study
3. Use the Read tool to view the selected reference images from `{skill_dir}/PaperBananaBench/diagram/images/`
4. Note the visual patterns: layout structure, color schemes, grouping strategies, icon usage, arrow styles

**For Plot mode:**
1. Read the reference metadata from `{skill_dir}/PaperBananaBench/plot/ref.json` and `{skill_dir}/PaperBananaBench/plot/test.json`
2. Based on the user's data type and desired plot type, select 3-5 relevant reference plot images to study
3. Use the Read tool to view the selected reference images from `{skill_dir}/PaperBananaBench/plot/images/`
4. Note the visual patterns: color palette, axis styling, legend placement, annotation style, chart type conventions

**Selection logic (from PaperBanana Retriever Agent):**
- **Match Research Topic:** Find references in the same domain (e.g., Agent/Reasoning, Vision/Perception, Generative/Learning, Science/Applications)
- **Match Visual Intent:** Find references with similar visualization types (e.g., Framework diagram, Bar chart, Line chart, Heatmap)
- **Priority:** Same Topic + Same Visual Intent > Same Visual Intent > Same Topic

### Stage 2: Planning

Based on the user's input and the reference images studied, create a detailed textual description.

**For Diagram mode** (input: methodology section + figure caption):

1. Create a detailed textual description of the diagram to generate, including:
   - All components and their relationships
   - Data flow direction (typically left-to-right or top-to-bottom)
   - Grouping/containment hierarchy
   - Labels for every element
   - Mathematical notation where appropriate

2. The description should be **as detailed as possible**:
   - Clearly describe each element and their connections
   - Include background style, colors, line thickness, icon styles
   - Specify layout structure (horizontal pipeline, vertical stack, grid, etc.)

**For Plot mode** (input: raw data + visual intent):

1. Create a detailed textual description of the plot to generate, including:
   - Precise mapping of variables to visual channels (x-axis, y-axis, hue/color, size, shape)
   - Explicitly enumerate **every raw data point's coordinate** to ensure accuracy
   - Chart type selection and justification
   - All axis labels, tick values, and units
   - Legend content and placement

2. The description should specify **exact aesthetic parameters**:
   - Specific HEX color codes for each data series
   - Font sizes for all labels (title, axes, ticks, legend, annotations)
   - Line widths, marker dimensions, bar widths
   - Grid style (dashed/dotted, color, alpha)
   - Legend placement (inside plot, top horizontal, etc.)

### Stage 3: Style Refinement

**For Diagram mode:**

Apply the NeurIPS 2025 academic diagram style guide (stored at `{skill_dir}/neurips2025_diagram_style_guide.md`) to refine the planned description:

**Key style principles:**
- **Color:** "Soft Tech & Scientific Pastels" - use light pastel backgrounds (#E6F3FF, #F3E5F5, #E0F2F1, #F5F5DC) for zones, medium saturation for active modules
- **Shapes:** "Softened Geometry" - rounded rectangles for processes, 3D cuboids for tensors, cylinders for databases
- **Lines:** Orthogonal edges for architectures, curved for data flow; solid for forward pass, dashed for auxiliary/gradient flow
- **Typography:** Sans-serif (Arial) for labels, serif (Times New Roman) for math variables
- **Icons:** Use semantic icons (snowflake=frozen, fire=trainable, gear=processing)
- **Background:** Pure white or very light pastels; avoid saturated backgrounds
- **No figure caption text** inside the diagram itself

**Domain-specific styles:**
- **Agent/LLM papers:** Illustrative, friendly, chat bubbles, robot avatars
- **Computer Vision/3D:** Spatial, dense, geometric, RGB color coding, heatmaps
- **Theoretical/Optimization:** Minimalist, abstract, graph nodes, mostly grayscale

**For Plot mode:**

Apply the NeurIPS 2025 statistical plot aesthetics guide (stored at `{skill_dir}/neurips2025_plot_style_guide.md`) to refine the planned description. Focus on specifying visual attributes without altering data content.

**Key style principles:**
- **Color palettes:** Soft pastels for categorical data; Viridis/Magma for sequential; avoid Jet/Rainbow
- **Axes & grids:** Fine dashed or dotted grid lines in light gray, behind data; either "boxed" (4 spines) or "open" (no top/right)
- **Typography:** Sans-serif fonts (Arial, Helvetica, DejaVu Sans); rotate x-labels 45° only when necessary
- **Legends:** Float inside plot area or place as horizontal row above plot
- **Annotations:** Prefer direct labeling over forcing legend references
- **Background:** White or very light gray (Seaborn-style)
- **Accessibility:** Combine color with shape/pattern (hatches, markers) for colorblind support
- **No figure caption** inside the plot itself

**Chart-type-specific guidelines:**
- **Bar charts:** Black outlines or borderless fills; tight grouping; error bars with black flat caps
- **Line charts:** Always include geometric markers at data points; dashed lines for baselines; shaded confidence bands
- **Scatter plots:** Different marker shapes for categories; solid opaque fills
- **Heatmaps:** Square cells; annotate exact values inside cells; use perceptually uniform colormaps
- **Pie/Donut:** Thick donut preferred; white borders between slices; explode key slices
- **Radar charts:** Translucent polygon fills (alpha ~0.2); solid outer perimeter

### Stage 4: Visualization Generation

**Choose the appropriate sub-stage based on mode:**

### Stage 4A: Draw.io XML Generation (Diagram mode)

Transform the styled description into draw.io XML. Follow ALL rules from the base drawio skill:

#### Basic XML structure

```xml
<mxGraphModel>
  <root>
    <mxCell id="0"/>
    <mxCell id="1" parent="0"/>
    <!-- Diagram cells go here with parent="1" -->
  </root>
</mxGraphModel>
```

#### Academic diagram design patterns

**Pattern 1: Horizontal Pipeline (most common)**
- Left-to-right flow with major stages as titled swimlane containers
- Internal components as rounded rectangles within each stage
- Arrows connecting stages with orthogonal edges

**Pattern 2: Vertical Architecture Stack**
- Top-to-bottom layer stack (input at top, output at bottom)
- Each layer as a rounded rectangle with fill color indicating type
- Skip connections shown as curved dashed lines

**Pattern 3: Multi-module Detail**
- Central overview with breakout detail boxes connected by lines
- "Macro-Micro" pattern: overview container + zoomed-in module details

#### Color palette for academic diagrams

| Purpose | Color | Hex |
|---------|-------|-----|
| Background zone - blue | Pale Ice Blue | #E6F3FF |
| Background zone - green | Pale Mint | #E0F2F1 |
| Background zone - purple | Pale Lavender | #F3E5F5 |
| Background zone - warm | Cream/Beige | #FFF8E1 |
| Active module - blue | Soft Blue | #DAE8FC |
| Active module - green | Soft Green | #D5E8D4 |
| Active module - orange | Soft Orange | #FFE6CC |
| Active module - pink | Soft Pink | #F8CECC |
| Frozen/static element | Light Grey | #F5F5F5 |
| Highlight/output | Gold accent | #FFF2CC |
| Trainable element | Warm tone | #FFE0B2 |
| Frozen element | Cool grey | #E0E0E0 |
| Border - blue | Medium Blue | #6C8EBF |
| Border - green | Medium Green | #82B366 |
| Border - orange | Medium Orange | #D6B656 |
| Border - red | Medium Red | #B85450 |

#### Layout rules

- **Generous spacing:** At least 200px horizontal gap, 120px vertical gap between major groups
- **Grid alignment:** Align all nodes to multiples of 10
- **Container padding:** At least 20px padding inside containers; startSize=30 for swimlane headers
- **Font sizes:** 14-16px for major labels, 11-12px for detail labels, 10px for annotations
- **Edge routing:** Use orthogonalEdgeStyle with rounded=1 for clean bends
- **Leave room for arrowheads:** At least 20px straight segment before targets

#### Container usage for grouping

Use draw.io containers for logical grouping (stages, modules):

```xml
<!-- Stage container using swimlane -->
<mxCell id="stage1" value="Stage 1: Encoding" style="swimlane;startSize=30;fillColor=#E6F3FF;strokeColor=#6C8EBF;rounded=1;arcSize=8;fontStyle=1;fontSize=14;fontFamily=Arial;" vertex="1" parent="1">
  <mxGeometry x="40" y="80" width="300" height="400" as="geometry"/>
</mxCell>

<!-- Components inside the stage (note parent="stage1" and relative coords) -->
<mxCell id="enc1" value="Encoder" style="rounded=1;whiteSpace=wrap;fillColor=#DAE8FC;strokeColor=#6C8EBF;fontSize=12;fontFamily=Arial;" vertex="1" parent="stage1">
  <mxGeometry x="20" y="50" width="120" height="50" as="geometry"/>
</mxCell>
```

#### Math notation in labels

Use HTML formatting for mathematical symbols:
```xml
<mxCell id="loss" value="&lt;i&gt;L&lt;/i&gt; = &amp;sum; &lt;i&gt;L&lt;/i&gt;&lt;sub&gt;i&lt;/sub&gt;" style="text;html=1;align=center;fontFamily=Times New Roman;fontSize=12;" vertex="1" parent="1">
  <mxGeometry x="200" y="500" width="100" height="30" as="geometry"/>
</mxCell>
```

#### Semantic icons as text labels

Use Unicode/emoji characters in `value` attributes for semantic icons. Place them as standalone text cells or inline with labels.

```xml
<mxCell id="icon_example" value="&#10052;" style="text;fontSize=16;align=center;" vertex="1" parent="1">
  <mxGeometry x="150" y="90" width="24" height="24" as="geometry"/>
</mxCell>
```

**Complete emoji reference for academic diagrams:**

**Model State**

| Icon | Emoji | HTML Entity | Meaning | Usage |
|------|-------|-------------|---------|-------|
| Snowflake | ❄ | `&#10052;` | Frozen / Non-trainable | Frozen encoder, fixed weights |
| Fire | 🔥 | `&#128293;` | Trainable / Active learning | Fine-tuning layers, trainable heads |
| Lightning | ⚡ | `&#9889;` | Fast / Accelerated | Efficient inference, speedup |
| Lock | 🔒 | `&#128274;` | Locked / Protected | Frozen parameters, access control |
| Unlock | 🔓 | `&#128275;` | Unlocked / Released | Unfrozen for training |
| Stop sign | 🛑 | `&#128721;` | Stopped / Blocked | Non-trainable, gradient stop |

**Agents & Roles**

| Icon | Emoji | HTML Entity | Meaning | Usage |
|------|-------|-------------|---------|-------|
| Robot | 🤖 | `&#129302;` | AI Agent / Model | LLM agent, autonomous module |
| Person | 👤 | `&#128100;` | User / Human | Human input, user query |
| People | 👥 | `&#128101;` | Multi-user / Crowd | Collaborative systems, multi-user |
| Brain | 🧠 | `&#129504;` | Reasoning / Intelligence | LLM core, reasoning module |
| Thinking | 🤔 | `&#129488;` | Evaluation / Critique | Critic agent, reviewer |
| Detective | 🕵 | `&#128373;` | Investigation / Analysis | Anomaly detection, inspection |
| Teacher | 👨‍🏫 | `&#128104;&#8205;&#127979;` | Teaching / Supervision | Teacher model, supervisor |
| Student | 👨‍🎓 | `&#128104;&#8205;&#127891;` | Learning / Student | Student model, distillation target |

**Data & Content**

| Icon | Emoji | HTML Entity | Meaning | Usage |
|------|-------|-------------|---------|-------|
| Document | 📄 | `&#128196;` | Text / Document | Input text, paper, prompt |
| Clipboard | 📋 | `&#128203;` | Plan / List | Structured plan, task list |
| Folder | 📁 | `&#128193;` | Dataset / Collection | Data directory, file collection |
| File cabinet | 🗃 | `&#128451;` | Storage / Archive | Knowledge base, data store |
| Database | 🗄 | `&#128452;` | Database / Repository | Vector DB, model repository |
| Image | 🖼 | `&#128444;` | Image / Visual data | Image input, visual features |
| Speech | 💬 | `&#128172;` | Chat / Dialogue | Prompt, conversation, chat bubble |
| Label | 🏷 | `&#127991;` | Tag / Annotation | Class label, metadata tag |
| Book | 📚 | `&#128218;` | Knowledge / Corpus | Training corpus, reference library |
| Newspaper | 📰 | `&#128240;` | Article / Report | Paper, news, generated report |

**Operations & Processing**

| Icon | Emoji | HTML Entity | Meaning | Usage |
|------|-------|-------------|---------|-------|
| Gear | ⚙ | `&#9881;` | Processing / Computation | Model inference, computation |
| Magnifier | 🔍 | `&#128269;` | Search / Retrieval | Retrieval, attention, inspection |
| Wrench | 🔧 | `&#128295;` | Configuration / Tuning | Hyperparameter tuning, adjustment |
| Scissors | ✂ | `&#9986;` | Pruning / Cutting | Model pruning, token trimming |
| Filter | 🔽 | `&#128317;` | Filtering / Selection | Feature selection, data filtering |
| Shuffle | 🔀 | `&#128256;` | Random / Shuffle | Data augmentation, random sampling |
| Cycle | 🔄 | `&#128260;` | Loop / Iteration | Iterative refinement, feedback loop |
| Link | 🔗 | `&#128279;` | Connection / Linking | Cross-attention, entity linking |
| Merge | 🔀 | `&#128256;` | Merge / Combine | Feature fusion, model merging |

**Evaluation & Results**

| Icon | Emoji | HTML Entity | Meaning | Usage |
|------|-------|-------------|---------|-------|
| Checkmark | ✅ | `&#9989;` | Pass / Correct | Correct prediction, quality pass |
| Cross | ❌ | `&#10060;` | Fail / Incorrect | Wrong prediction, rejected |
| Trophy | 🏆 | `&#127942;` | Best / Winner | Best model, SOTA result |
| Chart up | 📈 | `&#128200;` | Improvement / Growth | Performance gain, metric increase |
| Chart down | 📉 | `&#128201;` | Decline / Degradation | Performance drop, quality loss |
| Target | 🎯 | `&#127919;` | Goal / Objective | Target task, loss objective |
| Star | ⭐ | `&#11088;` | Highlight / Key result | Key contribution, important |
| Warning | ⚠ | `&#9888;` | Caution / Issue | Potential problem, limitation |

**Domain-Specific**

| Icon | Emoji | HTML Entity | Meaning | Usage |
|------|-------|-------------|---------|-------|
| Eye | 👁 | `&#128065;` | Vision / Observation | Visual encoder, image perception |
| Ear | 👂 | `&#128066;` | Audio / Listening | Speech recognition, audio input |
| Pen | ✍ | `&#9997;` | Writing / Generation | Text generation, authoring |
| Globe | 🌐 | `&#127760;` | Web / Global | Internet retrieval, world knowledge |
| DNA | 🧬 | `&#129516;` | Biology / Sequence | Protein, genomics, molecular |
| Atom | ⚛ | `&#9883;` | Physics / Science | Scientific computing, simulation |
| Microscope | 🔬 | `&#128300;` | Research / Analysis | Detailed analysis, micro-level |
| Telescope | 🔭 | `&#128301;` | Far-sighted / Overview | Macro-level, global view |
| Pill | 💊 | `&#128138;` | Medical / Drug | Drug discovery, medical AI |
| Tree | 🌳 | `&#127795;` | Tree structure / Hierarchy | Decision tree, parse tree |
| Network | 🕸 | `&#128376;` | Graph / Network | Neural network, knowledge graph |
| Dice | 🎲 | `&#127922;` | Random / Stochastic | Sampling, probability, noise |
| Thermometer | 🌡 | `&#127777;` | Temperature | Softmax temperature, scaling |
| Hourglass | ⏳ | `&#9203;` | Time / Temporal | Time series, sequence, latency |
| Layer | 📊 | `&#128202;` | Layers / Stack | Model layers, feature maps |
| Key | 🔑 | `&#128273;` | Key / Authentication | Attention key, API key, decryption |
| Light bulb | 💡 | `&#128161;` | Idea / Insight | Innovation, key finding |
| Rocket | 🚀 | `&#128640;` | Launch / Deploy | Model deployment, fast execution |
| Shield | 🛡 | `&#128737;` | Defense / Protection | Adversarial defense, safety |
| Sword | ⚔ | `&#9876;` | Attack / Adversarial | Adversarial attack, red-teaming |

**Mathematical Operators** (use with `fontFamily=Times New Roman`)

| Symbol | Name | HTML Entity | Usage |
|--------|------|-------------|-------|
| ⊕ | Circled plus | `&#8853;` | Element-wise addition, concatenation |
| ⊗ | Circled times | `&#8855;` | Element-wise multiplication, outer product |
| ⊙ | Circled dot | `&#8857;` | Hadamard product, dot product |
| ∑ | Summation | `&#8721;` | Sum, aggregation |
| ∏ | Product | `&#8719;` | Product operation |
| → | Right arrow | `&#8594;` | Mapping, transformation |
| ↔ | Left-right arrow | `&#8596;` | Bidirectional, mutual |
| σ | Sigma | `&#963;` | Sigmoid, activation |
| ∇ | Nabla | `&#8711;` | Gradient |
| ∞ | Infinity | `&#8734;` | Unbounded, continuous |
| ∈ | Element of | `&#8712;` | Membership, belongs to |
| ≈ | Approximately | `&#8776;` | Approximation |
| ∥ | Parallel | `&#8741;` | Norm, parallel |

#### Dashed lines for auxiliary flow

```xml
<mxCell id="grad_flow" value="Gradient" style="edgeStyle=orthogonalEdgeStyle;dashed=1;strokeColor=#999999;fontColor=#999999;fontSize=10;" edge="1" source="loss_node" target="encoder" parent="1">
  <mxGeometry relative="1" as="geometry"/>
</mxCell>
```

#### Mathematical operators on edges

```xml
<!-- Addition operator on connection -->
<mxCell id="add_op" value="&#8853;" style="ellipse;whiteSpace=wrap;fillColor=#FFFFFF;strokeColor=#666666;fontSize=14;fontFamily=Times New Roman;aspect=fixed;" vertex="1" parent="1">
  <mxGeometry x="295" y="195" width="30" height="30" as="geometry"/>
</mxCell>
```

### Stage 4B: Python/Matplotlib Code Generation (Plot mode)

Transform the styled description into a complete, self-contained Python script using matplotlib. The script must generate and save a publication-quality plot.

#### Code generation rules

1. **Self-contained script:** The generated Python code must be a single, complete script that can run independently. All data must be embedded directly in the code (no external file reads).

2. **Required imports:** Always include these at the top:
```python
import matplotlib
matplotlib.use('Agg')  # Headless backend - MUST be before pyplot import
import matplotlib.pyplot as plt
import numpy as np
```

3. **Reset defaults:** Always call `plt.rcdefaults()` before setting custom styles to avoid inheriting stale state.

4. **Output format:** Save the plot as PNG at 300 DPI with tight bounding box:
```python
plt.savefig('output_filename.png', format='png', dpi=300, bbox_inches='tight', facecolor='white')
plt.close('all')
```

5. **No interactive elements:** Never use `plt.show()`. Always use `plt.savefig()` only.

#### Matplotlib style template

Apply these NeurIPS 2025 style settings programmatically:

```python
# Font settings
plt.rcParams.update({
    'font.family': 'sans-serif',
    'font.sans-serif': ['Arial', 'Helvetica', 'DejaVu Sans'],
    'font.size': 12,
    'axes.titlesize': 14,
    'axes.labelsize': 13,
    'xtick.labelsize': 11,
    'ytick.labelsize': 11,
    'legend.fontsize': 11,
})

# Grid and spine settings
plt.rcParams.update({
    'axes.grid': True,
    'grid.alpha': 0.3,
    'grid.linestyle': '--',
    'grid.color': '#cccccc',
    'axes.spines.top': True,     # or False for "open" look
    'axes.spines.right': True,   # or False for "open" look
})

# Figure settings
plt.rcParams.update({
    'figure.facecolor': 'white',
    'axes.facecolor': 'white',
    'savefig.facecolor': 'white',
    'figure.figsize': (8, 6),    # Adjust per chart type
})
```

#### Recommended color palettes

**Categorical (soft pastels for academic look):**
```python
# Soft academic palette
COLORS_PASTEL = ['#7EB6D9', '#F4A582', '#92C5A9', '#D4A5D0', '#F7DC6F', '#B0B0B0', '#E8927C', '#A8D8EA']

# Muted earth tones
COLORS_EARTH = ['#4E79A7', '#F28E2B', '#E15759', '#76B7B2', '#59A14F', '#EDC948', '#B07AA1', '#FF9DA7']

# High-contrast (use sparingly)
COLORS_CONTRAST = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f']
```

**Sequential/Heatmap:** Use `'viridis'`, `'magma'`, `'plasma'`. Never use `'jet'` or `'rainbow'`.

**Diverging:** Use `'coolwarm'` or `'RdBu_r'` for positive/negative splits.

#### Chart-type code patterns

**Grouped bar chart:**
```python
x = np.arange(len(categories))
width = 0.25
fig, ax = plt.subplots(figsize=(10, 6))
for i, (label, values) in enumerate(data_series.items()):
    bars = ax.bar(x + i * width, values, width, label=label,
                  color=COLORS_PASTEL[i], edgecolor='black', linewidth=0.8)
ax.set_xticks(x + width * (len(data_series) - 1) / 2)
ax.set_xticklabels(categories)
ax.legend(loc='upper left', framealpha=0.9)
```

**Line chart with markers and confidence bands:**
```python
fig, ax = plt.subplots(figsize=(10, 6))
for i, (label, y_vals) in enumerate(data_series.items()):
    ax.plot(x_vals, y_vals, marker='o', markersize=6, linewidth=2,
            color=COLORS_EARTH[i], label=label)
    # Optional: confidence band
    # ax.fill_between(x_vals, y_lower, y_upper, alpha=0.15, color=COLORS_EARTH[i])
ax.legend(loc='best', framealpha=0.9)
```

**Heatmap with annotations:**
```python
fig, ax = plt.subplots(figsize=(8, 8))
im = ax.imshow(data_matrix, cmap='viridis', aspect='equal')
# Annotate cells
for i in range(data_matrix.shape[0]):
    for j in range(data_matrix.shape[1]):
        text_color = 'white' if data_matrix[i, j] > threshold else 'black'
        ax.text(j, i, f'{data_matrix[i, j]:.2f}', ha='center', va='center',
                color=text_color, fontsize=10)
plt.colorbar(im, ax=ax, shrink=0.8)
```

**Radar/Spider chart:**
```python
angles = np.linspace(0, 2 * np.pi, len(categories), endpoint=False).tolist()
angles += angles[:1]  # Close the polygon
fig, ax = plt.subplots(figsize=(8, 8), subplot_kw=dict(polar=True))
for i, (label, values) in enumerate(data_series.items()):
    vals = values + values[:1]
    ax.plot(angles, vals, linewidth=2, color=COLORS_EARTH[i], label=label)
    ax.fill(angles, vals, alpha=0.15, color=COLORS_EARTH[i])
ax.set_xticks(angles[:-1])
ax.set_xticklabels(categories)
ax.legend(loc='upper right', bbox_to_anchor=(1.3, 1.1))
```

#### Code execution workflow

1. **Write** the generated Python script to a `.py` file using the Write tool
2. **Execute** the script using `python <script.py>` via Bash
3. **Check** that the output `.png` file was created successfully
4. If execution fails, read the error, fix the code, and re-execute (up to 3 attempts)
5. **Open** the result image

#### Common pitfalls to avoid

- **Never use `plt.show()`** — it blocks in headless mode
- **Always set `matplotlib.use('Agg')` before importing pyplot**
- **Always embed all data** directly in the script; do not read external files unless the user explicitly provides a file path
- **Avoid default matplotlib styling** — always customize colors, fonts, and grid to avoid the "Veto Rule" of looking like unmodified default output
- **Do not include figure titles/captions** inside the plot (e.g., no `fig.suptitle("Figure 3: ...")`) — captions belong in the paper, not the image
- **Handle tight layout** — use `plt.tight_layout()` before `savefig` to prevent label clipping
- **Use `bbox_inches='tight'`** in `savefig` to avoid whitespace
- **For bar charts with many categories**, rotate x-labels 45° with `ha='right'`

### Stage 5: Critique and Refinement

After generating the initial output (XML for diagrams, or executing the Python script for plots), perform a self-critique:

**For Diagram mode:**
1. **Content fidelity:** Does the diagram accurately reflect the methodology? Are all key components present?
2. **Text QA:** Check for typos, unclear labels, nonsensical text
3. **Layout clarity:** Is the flow clear? Is there visual clutter?
4. **Style compliance:** Does it follow the academic style guide?
5. **Caption exclusion:** Ensure no figure caption text appears inside the diagram
6. **Legend management:** Remove redundant color legends if present

If issues are found, revise the XML and regenerate.

**For Plot mode (4 evaluation dimensions from PaperBanana Critic Agent):**
1. **Faithfulness:** Does the plot correctly represent all data values? Are axis labels, legend entries, and annotations accurate? No fabricated data points or wrong chart types?
2. **Conciseness:** No redundant labeling (e.g., both bar height AND text labels on many bars)? No unnecessary subplots? No text overload?
3. **Readability:** Are axes labeled with units? Is text legible (no overlapping, sufficient contrast)? Are data series distinguishable? Legend present when needed? No data elements hidden behind legend?
4. **Aesthetics:** Professional color scheme (not default matplotlib)? Consistent styling? No pixelation? No black background? No excessive 3D effects?

If issues are found, revise the Python code and re-execute.

## Output workflow

### Diagram mode
1. **Generate draw.io XML** following the full pipeline above
2. **Write the XML** to a `.drawio` file using the Write tool
3. **If the user requested an export format** (png, svg, pdf), export using the draw.io CLI with `--embed-diagram`, then delete the source `.drawio` file
4. **Open the result**

### Plot mode
1. **Generate Python script** following the full pipeline above
2. **Write the script** to a `.py` file using the Write tool
3. **Execute the script** via Bash: `python <script.py>`
4. **Verify** the output `.png` file exists
5. **Open the result** image
6. Optionally, keep the `.py` file for the user to modify later (do not delete by default)

## Choosing the output format

### Diagram format
- `/drawio-paper create a framework diagram` -> `framework.drawio`
- `/drawio-paper png pipeline for my method` -> `method-pipeline.drawio.png`
- `/drawio-paper svg: architecture overview` -> `architecture-overview.drawio.svg`

If no format is mentioned, write the `.drawio` file and open it.

### Plot format
- `/drawio-paper plot a bar chart of model accuracy` -> `model-accuracy.png` + `model-accuracy.py`
- `/drawio-paper plot pdf: training curve comparison` -> `training-curve.pdf` + `training-curve.py`
- `/drawio-paper plot svg: ablation results` -> `ablation-results.svg` + `ablation-results.py`

Default output is `.png` at 300 DPI. For PDF/SVG, change the `format` parameter in `plt.savefig()`.

### Supported export formats

| Format | Embed XML | Notes |
|--------|-----------|-------|
| `png` | Yes (`-e`) | Viewable everywhere, editable in draw.io |
| `svg` | Yes (`-e`) | Scalable, editable in draw.io |
| `pdf` | Yes (`-e`) | Printable, editable in draw.io |

## draw.io CLI

Try `drawio` first, then fall back to platform-specific path:
- **macOS**: `/Applications/draw.io.app/Contents/MacOS/draw.io`
- **Linux**: `drawio`
- **Windows**: `"C:\Program Files\draw.io\draw.io.exe"`

### Export command

```bash
drawio -x -f <format> -e -b 10 -o <output> <input.drawio>
```

Key flags:
- `-x` / `--export`: export mode
- `-f` / `--format`: output format (png, svg, pdf)
- `-e` / `--embed-diagram`: embed diagram XML in output
- `-o` / `--output`: output file path
- `-b` / `--border`: border width (default: 0)
- `-s` / `--scale`: scale diagram size

### Opening the result

- **macOS**: `open <file>`
- **Linux**: `xdg-open <file>`
- **Windows**: `start <file>`

## File naming

- Use descriptive filenames based on content
- Lowercase with hyphens for multi-word names
- **Diagrams:** For export: double extensions (`name.drawio.png`, `name.drawio.svg`). After successful export, delete the intermediate `.drawio` file
- **Plots:** Output `name.png` (or `.pdf`/`.svg`) alongside `name.py` (the source script). Keep both files

## CRITICAL: XML well-formedness

- **NEVER use double hyphens (`--`) inside XML comments.** Use single hyphens or rephrase.
- Escape special characters in attribute values: `&amp;`, `&lt;`, `&gt;`, `&quot;`
- Always use unique `id` values for each `mxCell`
- Always set `html=1` in style when using HTML formatting in `value`

## Common styles reference

| Property | Values | Use for |
|----------|--------|---------|
| `rounded=1` | 0 or 1 | Rounded corners |
| `whiteSpace=wrap` | wrap | Text wrapping |
| `fillColor=#dae8fc` | Hex color | Background color |
| `strokeColor=#6c8ebf` | Hex color | Border color |
| `fontColor=#333333` | Hex color | Text color |
| `shape=cylinder3` | shape name | Database cylinders |
| `ellipse` | style keyword | Circles/ovals |
| `rhombus` | style keyword | Diamonds |
| `edgeStyle=orthogonalEdgeStyle` | style keyword | Right-angle connectors |
| `dashed=1` | 0 or 1 | Dashed lines |
| `swimlane` | style keyword | Titled containers |
| `group` | style keyword | Invisible containers |
| `container=1` | 0 or 1 | Enable container behavior |
| `pointerEvents=0` | 0 or 1 | Prevent container from capturing connections |

## Edge routing

- Use `edgeStyle=orthogonalEdgeStyle` for right-angle connectors
- Space nodes generously (200px horizontal, 120px vertical gaps)
- Use `exitX`/`exitY` and `entryX`/`entryY` (0-1) to control connection points
- Add explicit waypoints when edges would overlap
- Use `rounded=1` on edges for cleaner bends
- Use `jettySize=auto` for better port spacing

## Containers and groups

Set `parent="containerId"` on child cells. Children use relative coordinates.

| Type | Style | When to use |
|------|-------|-------------|
| **Group** (invisible) | `group;` | No visual border needed |
| **Swimlane** (titled) | `swimlane;startSize=30;` | Needs visible title bar |
| **Custom container** | Add `container=1;pointerEvents=0;` | Any shape as container |

Always add `pointerEvents=0;` to container styles unless the container itself needs connections.
