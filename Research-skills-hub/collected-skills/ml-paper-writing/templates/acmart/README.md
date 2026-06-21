# ACM acmart LaTeX Template

Official ACM LaTeX class for all ACM publications (CHI, SIGGRAPH, SIGCOMM, CSCW, MM, etc.).

**Source:** [CTAN acmart](https://ctan.org/pkg/acmart) | [GitHub](https://github.com/borisveytsman/acmart) | [ACM Author Guide](https://authors.acm.org/proceedings/production-information/preparing-your-article-with-latex)

---

## File Overview

| File | Purpose |
|------|---------|
| `acmart.cls` | Main class file (v2.14, copied from TeX Live 2025) |
| `ACM-Reference-Format.bst` | Bibliography style |
| `sample-sigconf.tex` | Conference template (CHI, KDD, MM, SIGCOMM) |
| `sample-manuscript.tex` | General manuscript / preprint format |
| `sample-acmtog.tex` | ACM Transactions on Graphics (SIGGRAPH) |
| `sample-acmsmall.tex` | Small single-column journals |
| `sample-base.bib` | Main example bibliography |
| `abbrev.bib` | ACM journal abbreviations |
| `software.bib` | Software citation examples |
| `sampleteaser.pdf` | Sample teaser figure (used by sample .tex) |
| `sample-franklin.png` | Sample photo (used by sample .tex) |
| `acmart.dtx` + `acmart.ins` | CTAN source (for reference / regeneration) |
| `samples.dtx` + `samples.ins` | CTAN sample source (for reference) |

---

## Ready to Use

This template is **ready to compile** — `acmart.cls` is included (copied from TeX Live 2025, v2.14).

```bash
# Compile a sample:
pdflatex sample-sigconf.tex
bibtex sample-sigconf
pdflatex sample-sigconf.tex
pdflatex sample-sigconf.tex
```

### Updating `acmart.cls` in the Future

If you need to update to a newer version:

```bash
# Option A: Replace from your TeX Live installation
kpsewhich acmart.cls   # find the path
cp <path> ./acmart.cls

# Option B: Regenerate from source
latex acmart.ins
```

### Using on Overleaf

Upload the entire directory as a ZIP. `acmart.cls` is also pre-installed on Overleaf.

---

## Document Format Options

ACM uses a single class (`acmart`) with different format options:

```latex
% === ACM Conference Formats ===
\documentclass[sigconf]{acmart}       % CHI, SIGCOMM, MM, KDD, etc. (two-column)
\documentclass[sigconf,anonymous]{acmart}  % Anonymous submission

% === ACM Journal Formats ===
\documentclass[acmtog]{acmart}        % ACM Transactions on Graphics (SIGGRAPH)
\documentclass[acmsmall]{acmart}      % Small single-column journals
\documentclass[acmlarge]{acmart}      % Large single-column journals

% === Manuscript / Preprint ===
\documentclass[manuscript]{acmart}    % Manuscript format (for review)
```

---

## Usage (Conference Paper — sigconf)

```latex
\documentclass[sigconf]{acmart}

% Optional: use natbib instead of biblatex
\setcitestyle{authoryear,open={[},close={]}}

\begin{document}

\title{Your Paper Title}
\subtitle{Optional Subtitle}

\author{First Author}
\authornote{Corresponding author.}
\email{author@university.edu}
\affiliation{%
  \institution{University Name}
  \city{City}
  \country{Country}
}

\author{Second Author}
\email{second@institution.org}
\affiliation{%
  \institution{Research Lab}
  \city{City}
  \country{Country}
}

\begin{abstract}
Your abstract (150 words max for sigconf).
\end{abstract}

\begin{CCSXML}
<ccs2012>
  <concept>
    <concept_id>10010147.10010257</concept_id>
    <concept_desc>Computing methodologies~Machine learning</concept_desc>
    <concept_significance>500</concept_significance>
  </concept>
</ccs2012>
\end{CCSXML}
\ccsdesc[500]{Computing methodologies~Machine learning}

\keywords{keyword1, keyword2, keyword3}

\maketitle

\section{Introduction}
% ...

\bibliographystyle{ACM-Reference-Format}
\bibliography{sample-base}

\end{document}
```

---

## Usage (Journal Paper — ACM TOG / SIGGRAPH)

```latex
\documentclass[acmtog]{acmart}

\begin{document}

\title{Your Paper Title}

\author{First Author}
\email{author@university.edu}
\affiliation{%
  \institution{University}
  \country{Country}
}

\begin{abstract}
Your abstract.
\end{abstract}

\keywords{keyword1, keyword2}

\maketitle

\section{Introduction}
% ...

\bibliographystyle{ACM-Reference-Format}
\bibliography{your_references}

\end{document}
```

---

## Anonymous Submission

For double-blind review (CHI, CSCW, etc.):

```latex
\documentclass[sigconf,anonymous,review]{acmart}
```

This hides author names and affiliations. The `review` option adds line numbers.

---

## Key ACM Commands

### Figures

```latex
\begin{figure}[htbp]
  \centering
  \includegraphics[width=\linewidth]{figure.pdf}
  \caption{Caption text.}
  \Description{Alt text for accessibility (required by ACM).}
  \label{fig:example}
\end{figure}

% Full-width (two-column documents):
\begin{figure*}
  \centering
  \includegraphics[width=\textwidth]{wide-figure.pdf}
  \caption{Wide figure.}
  \Description{Alt text.}
\end{figure*}
```

**Note:** ACM requires `\Description{}` for every figure for accessibility compliance.

### Tables

```latex
\begin{table}[htbp]
  \caption{Table caption (above table in ACM format).}
  \label{tab:results}
  \begin{tabular}{lcc}
    \toprule
    Method & Accuracy & F1 \\
    \midrule
    Baseline & 85.2 & 0.84 \\
    Ours & \textbf{92.1} & \textbf{0.91} \\
    \bottomrule
  \end{tabular}
\end{table}
```

### CCS Concepts (Required)

Generate CCS taxonomy codes at: https://dl.acm.org/ccs

```latex
\begin{CCSXML}
<ccs2012>
  <concept>
    <concept_id>10010147.10010257.10010293</concept_id>
    <concept_desc>Computing methodologies~Neural networks</concept_desc>
    <concept_significance>500</concept_significance>
  </concept>
</ccs2012>
\end{CCSXML}
\ccsdesc[500]{Computing methodologies~Neural networks}
```

---

## Page Limits by Venue

| Venue | Format | Limit |
|-------|--------|-------|
| CHI (Papers) | sigconf | 10 pages + refs |
| SIGGRAPH / TOG | acmtog | No fixed limit (typically 10-12 pages) |
| CSCW | sigconf | No fixed limit |
| SIGCOMM | sigconf | 12 pages + refs |
| MM (ACM Multimedia) | sigconf | 8 pages + refs |
| KDD (Research) | sigconf | 9 pages + refs |

---

## Compilation

```bash
# Standard workflow
pdflatex sample-manuscript.tex
bibtex sample-manuscript
pdflatex sample-manuscript.tex
pdflatex sample-manuscript.tex

# With latexmk
latexmk -pdf sample-manuscript.tex
```

---

## Common Issues

**"Class acmart not found"**: Run `latex acmart.ins` in this directory, or install via `tlmgr install acmart`.

**Missing `\Description{}`**: ACM requires alt text for all figures. Add `\Description{Description text}` after each `\caption{}`.

**CCS concepts warning**: Required for final submission. Generate at https://dl.acm.org/ccs and insert the XML block.
