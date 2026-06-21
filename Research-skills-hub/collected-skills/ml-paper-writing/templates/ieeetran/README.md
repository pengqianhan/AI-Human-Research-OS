# IEEE IEEEtran LaTeX Template

Official IEEE LaTeX class for Transactions journals and conferences.

**Source:** [CTAN IEEEtran](https://ctan.org/pkg/IEEEtran) | [IEEE Author Tools](https://www.ieee.org/publications/authors/author-tools/author-tools-overview.html)

---

## File Overview

| File | Purpose |
|------|---------|
| `IEEEtran.cls` | Main document class (v1.8b) |
| `IEEEtran.bst` | Bibliography style |
| `IEEEabrv.bib` | IEEE journal abbreviations |
| `IEEEexample.bib` | Example bibliography entries |
| `bare_jrnl.tex` | Journal paper template |
| `bare_conf.tex` | Conference paper template |
| `bare_jrnl_compsoc.tex` | IEEE Computer Society journal template |
| `bare_conf_compsoc.tex` | IEEE Computer Society conference template |

---

## Which Template to Use

| Venue Type | Template | `\documentclass` mode |
|------------|----------|----------------------|
| IEEE Transactions (TPAMI, TNN, etc.) | `bare_jrnl.tex` | `journal` |
| IEEE Access, Open Access journals | `bare_jrnl.tex` | `journal` |
| IEEE ICCV, WACV (CS Society) | `bare_conf_compsoc.tex` | `conference` |
| IEEE general conferences | `bare_conf.tex` | `conference` |
| IEEE Computer Magazine | `bare_jrnl_compsoc.tex` | `journal` |

**Note:** CVPR and ECCV use their own custom formats, not IEEEtran.

---

## Usage

### Journal Paper (e.g., IEEE TPAMI, IEEE TNNLS)

```latex
\documentclass[journal]{IEEEtran}

\begin{document}

\title{Your Paper Title}
\author{First Author, \IEEEmembership{Member, IEEE},
        Second Author, \IEEEmembership{Senior Member, IEEE}
\thanks{Manuscript received January 1, 2025.}
\thanks{F. Author is with the Department of...}
}

\markboth{IEEE TRANSACTIONS ON PATTERN ANALYSIS AND MACHINE INTELLIGENCE}{Author \MakeLowercase{\textit{et al.}}: Title}

\maketitle

\begin{abstract}
Your abstract here.
\end{abstract}

\begin{IEEEkeywords}
keyword1, keyword2, keyword3.
\end{IEEEkeywords}

\IEEEpeerreviewmaketitle

\section{Introduction}
\IEEEPARstart{T}{his} is the first paragraph...

% ... paper content ...

\section{Conclusion}
Your conclusion.

\appendices
\section{Proof of Theorem 1}

\bibliographystyle{IEEEtran}
\bibliography{IEEEabrv,your_references}

\begin{IEEEbiography}[{\includegraphics[width=1in,height=1.25in,clip,keepaspectratio]{photo.png}}]{First Author}
Biography text here.
\end{IEEEbiography}

\end{document}
```

### Conference Paper (e.g., IEEE WACV, IEEE ICASSP)

```latex
\documentclass[conference]{IEEEtran}

\begin{document}

\title{Paper Title}
\author{
  \IEEEauthorblockN{First Author}
  \IEEEauthorblockA{Department\\University\\City, Country\\email@domain.com}
  \and
  \IEEEauthorblockN{Second Author}
  \IEEEauthorblockA{Department\\University\\City, Country\\email@domain.com}
}

\maketitle

\begin{abstract}
Your abstract.
\end{abstract}

\begin{IEEEkeywords}
keyword1, keyword2.
\end{IEEEkeywords}

\section{Introduction}
% ... content ...

\bibliographystyle{IEEEtran}
\bibliography{IEEEabrv,your_references}

\end{document}
```

---

## Key IEEEtran Commands

### Document Modes

```latex
\documentclass[journal]{IEEEtran}         % Transactions/journals (two-column)
\documentclass[conference]{IEEEtran}      % Conferences (two-column)
\documentclass[compsoc,journal]{IEEEtran} % CS Society journals
\documentclass[compsoc,conference]{IEEEtran} % CS Society conferences
\documentclass[transmag]{IEEEtran}        % IEEE Transactions on Magnetics
```

### First Paragraph Drop Cap

```latex
\IEEEPARstart{F}{irst} word of introduction...
```

### Author Affiliation (Journal)

```latex
\author{First Author, \IEEEmembership{Fellow, IEEE},
        Second Author~\IEEEmembership{Member, IEEE},
        and Third Author
\IEEEcompsocitemizethanks{
  \IEEEcompsocthanksitem F. Author is with Dept., University, City, Country.
  E-mail: author@uni.edu
}
}
```

### Equations

```latex
\begin{equation}
  a + b = c \label{eq:example}
\end{equation}
As shown in~\eqref{eq:example}...
```

### Figures

```latex
\begin{figure}[!t]
  \centering
  \includegraphics[width=\linewidth]{figure.pdf}
  \caption{Caption text.}
  \label{fig:example}
\end{figure}
```

### Double-column Figures and Tables

```latex
\begin{figure*}[!t]
  \centering
  \includegraphics[width=\textwidth]{wide_figure.pdf}
  \caption{Wide figure spanning both columns.}
\end{figure*}
```

---

## Bibliography with IEEEtran

```latex
% In preamble - add journal abbreviations
\bibliographystyle{IEEEtran}

% At end of document
\bibliography{IEEEabrv,your_references}  % IEEEabrv provides standard IEEE abbreviations
```

The `IEEEabrv.bib` file provides abbreviated forms like:
- `IEEE_J_PAMI` → "IEEE Trans. Pattern Anal. Mach. Intell."
- `IEEE_J_NN` → "IEEE Trans. Neural Netw."

---

## Page Limits

| Venue | Limit | Notes |
|-------|-------|-------|
| IEEE Transactions | No fixed limit | Typically 12-14 pages |
| IEEE Access | No fixed limit | Open access, longer papers ok |
| IEEE ICASSP | 5 pages | +1 page with fee |
| IEEE WACV | 8 pages | +2 in references |

---

## Compilation

```bash
pdflatex bare_jrnl.tex
bibtex bare_jrnl
pdflatex bare_jrnl.tex
pdflatex bare_jrnl.tex
```

Or with `latexmk`:
```bash
latexmk -pdf bare_jrnl.tex
```
