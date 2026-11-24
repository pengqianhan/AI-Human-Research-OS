# Plugin registry and view plugins: working design

The design the step 1 and step 2 work follows (ADR-0006; [HANDOFF.md](../HANDOFF.md)
Active Work). Parts 1 and 2 were written by a design agent on 2026-11-21 and reviewed
before implementation; Part 3, step 2's Idea, Skeleton, and Assets views, by another
design agent on 2026-11-23. Each part is its author's report, kept as written, so "I"
is that agent and line numbers refer to the code as it was that day.

Status on 2026-11-24:

- **Step 2's three views are designed** (Part 3, against commit `5874a32`): the
  Skeleton, Assets, and Idea views as the Human Owner chose them in
  [mockups/step2/views.html](mockups/step2/views.html), one pull request each in that
  order, with no new dependency and no change to contract 1.0. **2.1, the Skeleton
  view, is built** on branch `step2-skeleton-view`, **2.2, the Assets view**, on
  branch `step2-assets-view`, and **2.3, the Idea view**, on branch
  `step2-idea-view` (all below). 2.4, `nanochat_cpu`'s `idea_graph.md` and the
  template's, is not.
  The Human Owner answered Part 3 §7 on 2026-11-23 (§7's head says how).

- **2.3, the Idea view**, is the bundled plugin
  [frontend/plugins/idea-view/](frontend/plugins/idea-view/) (manifest as §6 "2.3",
  `reads` exactly `idea_graph.md` and `paper_skeleton.md`), with `logic.ts` (§5.1's
  grammar and §5.2's validation over md-kit's table, the labels, every screen's
  words), `layout.ts` (§5.3), and `main.ts`, which only draws. md-kit gained one
  additive thing, an optional cut for `splitCells` (default 2,000), so the view reads
  a row's Links and Points to whole: a long files list would otherwise lose paths at
  the cut. site-kit is unchanged; the Skeleton, Assets, and Code views' tests are
  untouched and pass. It is wired in as the Idea tab (`layoutState.ts`), the `spark`
  icon, and the client's policy and read-channel tests; the Plugins page's planned
  card is gone. An independent review (2026-11-24) found 4 must-fix and 6
  should-fix problems; the fix round, on the same branch, fixed eight of them and
  records the other two as limits (below), and built two rule changes decided
  since: `files: none` (the Human Owner) and the cycle rule (a default the
  directing agent took, not yet confirmed). In short, what the review found and
  what changed, each detailed in the points marked "after the review":
  - must-fix 1 and should-fix 9, lines under boxes they do not join and words on
    the wrong node or each other: lanes and slots ("Lines and their words");
  - must-fix 2, IDs and statuses cut on the map: never cut, boxes measured ("An
    ID and a status are never cut");
  - must-fix 3, the ask bar and the page disagreeing after a Reload that ended
    while the workspace was hidden: fixed in the host ("Selection and Reload");
  - must-fix 4, tests that could not fail (four DOM-sink mutants, the caps by
    name, the generation check): each now fails a test ("The map is the page's
    own SVG", "The 50 ms bound", "Selection and Reload");
  - should-fix 5, 6, and 10, rows under a list item dropped silently, a fenced
    header reported as no table, blank-looking statements and paths: said,
    named, and marked ("What md-kit leaves unread", "Absence", "The panel");
  - should-fix 7 and 8: recorded limits, not redesigned ("Limits that stay").

  Where the code differs from Part 3 or the mockup:
  - **The map is the page's own SVG.** The mockup placed nodes with inline styles;
    `PLUGIN_CSP` and the views' source checks allow none, so the geometry is numbers
    from `layout.ts` set as SVG attributes (`x`, `y`, `width`, `height`, `d`,
    `viewBox`), the scale comes from the `viewBox` against the drawn width, and each
    box is the page's HTML (a `<button>`, so Enter and Space work) in a
    `foreignObject`, which keeps the mockup's look and its cut of a statement by the
    box. `dom.test.ts` pins every attribute the page sets, with its value, and every
    tag it makes; after the review, also every method `main.ts` and `site-kit.ts`
    call and every property they set (a new one, such as `setHTMLUnsafe`,
    `insertRule`, or `dataset`, fails it until it is reviewed), a class only toggled
    by a literal name, no HTML parser and no style or rule set from code anywhere in
    the bundle, and no member reached by a string. The first build's checks let the
    review's four mutants through (`setHTMLUnsafe` on a problem line and on the
    statement, `classList.add` of Source words, `insertRule` of a Source cell); each
    now fails this test.
  - **An ID and a status are never cut** (after the review: §5.1 allows 16
    characters, and the first build capped the badge at 92 px with no ellipsis, so
    `Experiment_runA1` and `Experiment_runA2` both drew "Experiment_ru", "running"
    drew "runr", and the tooltip gave only the statement). A long ID wraps inside
    its badge, and a status that no longer fits beside it takes a row of its own;
    the box grows by that much. The page measures each box's top row in a hidden
    box of the column's width, so any font is measured as drawn, and `layout.ts`
    places boxes, line ends, and the gaps at those heights. A frame laid out while
    hidden in the same process measures nothing, so its boxes are 48 px until the
    page shows, when they are measured and placed again (a headless probe checks
    this path). In the app the suite's Reload drawn on the Code tab left no ID cut
    even with that path removed, so the view's frame, on another origin and so
    probably in another process, seems to stay laid out while hidden; that is an
    inference from the test, not read in Chromium's code, and the path stays for
    the case it is wrong. Boxes with short IDs keep the mockup's 150 × 48.
    The tooltip names the ID, kind, status, and statement, marked as the box marks
    them. The suite draws IDs of sixteen W's in every kind and status and checks
    that no ID or status is cut, no two boxes overlap or draw one ID, and a short
    ID's box is 48 px; the layout tests cover boxes of other heights. This departs
    from the mockup's fixed box, which never met a long ID.
  - **The map's box** keeps a stable scrollbar gutter, so the width the
    scale is fitted to does not change when a classic scrollbar (Windows, Linux)
    comes and goes, which would otherwise resize the map in a loop.
  - **The legend** takes the top of the last column, whose nodes start under it: the
    mockup's corner was empty only because its nodes were placed by hand, and a rule
    has to guarantee no overlap (the layout tests include the legend). A word with no
    line reads "motivates · none" (the mockup's "· none here" does not fit a column's
    150 px for "motivates"), and the result's experiment is named on three short
    rows, "the result's / experiment / (from Points to)". The suite checks that no
    legend row is cut.
  - **Lines within one column** are arcs on the column's right side, within half the
    gap.
  - **Lines and their words (a departure from §5.3 rule 4, after the review; no
    mockup shows the case).** Rule 4 drew every line as one curve from side to side,
    and the word of an open node's line at 0.34 or 0.66 along it. The review found
    that a line skipping a column passed under that column's boxes (E1 `tests` Q1
    past three hypotheses ran under H1 and out of H3 and read as two other links),
    and that the word landed on a box it does not join ("tests" on H2's ID, so the
    map read "E1 tests H2"): over 12 seeded random graphs, 99 of 570 words lay on
    node text, 83 of them on a node the line does not join, and two words between
    one pair of nodes covered the legend and touched. Now a line that skips a
    column runs straight through it at its left node's middle, in a lane of 20 px
    that column's boxes keep clear of (they move down past it), curving only inside
    the gaps; and the word of each of the open node's lines (a pill of 9.5 px bold,
    at most 63 px wide even in a face as wide as Verdana) sits in a 64 × 16 slot
    beside the other node, where the line meets it, in the gap and on that box's
    padding only, the first free slot down its side nearest the line's end. Free
    means on no box the line does not join, no other word, the legend, a column
    head, and inside the map; when none beside the box is free, the slot is inside
    that box, which only the open node's lines to it can take (three at most, as
    the link words allow, and a box has three slots), so a place always exists. An
    arc beside the last column widens the map by 39 px, room for a word there, not
    by half a gap. Graphs with no line skipping a column (the mockup's) are drawn
    where they were. `layout.test.ts` checks both rules on 40 seeded graphs that
    follow §5.1's grammar (some boxes taller), on 200 nodes with 1,000 links, on
    200 nodes in one column, and on 1,000 lines between two columns and through a
    third, with each node opened in turn; a growth case covers the lanes and the
    words of a node with as many lines as the graph has experiments. The review's
    probes, rerun on this build: the skipping line passes under no box, and over its
    12 random graphs no word lies on node text, on the legend, or on another word
    (0, 0, 0, and 0 of 570); the end-to-end suite checks that no word of E2's lines
    is cut, outside its slot, or on a node's text.
  - **Problems**: every one is counted ("3 problems in idea_graph.md"), and those of
    rows and links are listed up to 500, then "and N more problems are not listed";
    the caps, cycles, a second table, and what md-kit leaves unread are always
    listed. A claim's two statuses read "C2 is “planned” here, “verified” in
    paper_skeleton.md:116." (quotes for §5.2's italics; the page draws text only).
    File text inside a problem is marked as a label is (invisible characters and
    spaces other than U+0020) and cut at 60 characters.
  - **What md-kit leaves unread is said** (the brief's lesson 6): rows past its 500
    a table, lines past its 20,000 when the table reaches them, lines of only
    invisible characters inside the table, a second table with the graph's header
    (only the first is read), lines starting with "|" after the table ended (a
    blank line or other text ends a table, and md-kit reads such lines as a
    paragraph: rows an agent grouped with blank lines; after the review, also
    rows indented under a list item, which md-kit reads as the item's text and
    the first build dropped with no note), and, on the no-table
    screen, everything after a code fence never closed. A statement or a source over 2,000 characters is drawn cut
    and the panel says so beside it; the quote holds the row as written.
  - **Absence is worded by what was searched**: "No table with the expected header was
    found in idea_graph.md." with the first header found (or "No table was found");
    after the review, the graph's header inside a code block or a list item, where
    md-kit reads no table, is named with its line and why ("The graph's header is on
    line 6, inside the code block on lines 3–12, which is read as code, not as a
    table: write the table outside the fence."), since §5.1 prints its own example
    in a fence and an agent copying it got "No table was found";
    a link to nothing reads "no node in the table has the ID Q9" ("no node among the
    rows the view reads" when some were not read: past md-kit's 500 rows or 20,000
    lines, or after the table ended), and a link to a node not drawn names
    why: "Q2 (line 6) is left out for a problem of its own", "P201 (line 206) is
    past the first 200 nodes". The panel's count says "none is a hypothesis" of the
    nodes drawn, where the mockup said "no hypotheses are recorded".
  - **Selection and Reload** (the brief, over the Skeleton and Assets views, which
    clear the selection when Reload starts): a node is identified by its ID in ASCII
    lower case. A click opens and selects it, a second click (or Escape, or the
    host's clear) ends the selection and leaves it open, as in the mockup, and a link
    chip in the panel opens and selects the node it names. The old map stays
    clickable while Reload reads; after its render, a selected node still in the file
    is open, marked, and posted again with its row as it is now (the label can stay
    while the quote changes), otherwise `null` is posted, and every screen that
    replaces the map (empty, no table, too large, not UTF-8, a channel error) posts
    `null` too. The suite clicks during a slow Reload both ways. A load carries a
    generation, and an answer that arrives after a later Reload's is dropped: the
    suite holds the first of two Reloads' bytes for 3 s past the second's render,
    and with the check removed the old file overwrote the new one on screen (the
    test is red then; the first build had no test that noticed).
    After the review, the page and the ask bar also agree after a Reload that
    ends while the workspace is hidden (Home shown): the host ignored a
    selection posted then (`selectGate`'s "only while the screen is shown"), so
    the bar came back holding the old row, or offering a node the page no longer
    marked. Switching to another tab during the read was safe, since leaving a
    tab clears both sides. The fix is the host's (`heldWhileHidden` in
    [frontend/src/plugins/select.ts](frontend/src/plugins/select.ts), used by
    [frontend/src/pages/WorkspacePage.tsx](frontend/src/pages/WorkspacePage.tsx)):
    the last valid message the active view posted while hidden is kept and
    applied through the gate when the workspace shows again, so a node still in
    the file stays selected with its row as it is now, and a node gone leaves no
    bar; clearing the selection meanwhile (Escape on Home, which the workspace
    still hears) drops it too. No message is added. It covers every view, so the Assets view's render-time `null` (and
    the Skeleton view's, when a clicked item is gone) is no longer dropped either.
    That was checked by reading those two views' code, and the reading missed the
    Paper view (below). The suite tests the Idea view: it reproduces both variants
    with a 3 s read and Home shown during it, and Escape pressed on Home while the
    page's post is held.
    Since what a view posts while hidden is now applied on return, a view must not
    post what it merely cannot read while hidden. The Paper view did: its 400 ms
    settle timer, firing after Home was shown, found the selection still in place
    but its text empty (a hidden frame is not laid out) and posted "nothing
    selected", so back in the workspace the bar was gone while the page still
    showed its text selected. The directing agent's probe found it after the fix
    round. The fix is the Paper view's: while the page is not laid out (its
    scroller has no boxes), it leaves its last report as it is (`laidOut` in
    [frontend/plugins/paper-view/site/main.ts](frontend/plugins/paper-view/site/main.ts));
    a collapsed selection is still reported as none, and Escape on Home still
    clears both sides. The suite selects the paper's title, shows Home at once,
    and checks on return that the bar holds what the page selects.
  - **The panel** for a result shows "from: " and a chip to its experiment, and an
    experiment's files under "Result files, not opened here", each path marked as a
    label is (a no-break space in it showed as a plain space before the review). A
    statement whose words draw nothing visible (only a no-break space, or an image
    with no alt text) is drawn as written with its spaces marked, in the box, its
    tooltip, and the panel, where the first build drew a blank box; a claim node with an
    empty Points to says it names no row of paper_skeleton.md. In a narrow view only
    the hint is hidden (the mockup hid every note), so a note on what the panel
    leaves out stays.
  - **The 50 ms bound** (§5.3, §6) and §1 fact 6's hostile input are tested by
    growth ([frontend/plugins/growth.ts](frontend/plugins/growth.ts)), not a wall
    clock, in [logic.test.ts](frontend/plugins/idea-view/site/logic.test.ts) and
    [layout.test.ts](frontend/plugins/idea-view/site/layout.test.ts). The fix
    round's pull request failed macos-x64 twice, on two hostile cases at 128 then
    512 KiB: the bad items (12.3 times the time, 825 ms at 4n), then the `;` cell
    (21.2 times, 624 ms). The cause is the collector, not a pass per element:
    `parse` and `buildGraph` of one huge line grow 2 times a doubling up to 128 KiB,
    about 4 times a doubling to 512 KiB, then 2 times again to 2 MiB, and under
    `node --max-semi-space-size=64` they grow 2 times a doubling all the way to
    512 KiB. So from 128 to 512 KiB every hostile case grows 9 to 38 times on every
    runner, this machine included, and passed only by the 500 ms floor, which
    macos-x64 (6 to 14 times slower than the machine the view was built on, and
    about twice as slow on some days as others) crossed. The collector's work comes
    from md-kit's `splitCells`, which builds each cell a character at a time: on a
    scratch copy that slices each cell instead, the huge statement, the `;` cell,
    the bad items, the backticks, and the files list grow 3.7 to 4.3 times here
    from 128 to 512 KiB, and take 1.5 to 5 times less. md-kit is shared, so that change is
    left for its own pull request. (The row's line number was also formatted again
    for every bad link, listed or not; it is now formatted once a row, and a test
    counts the numbers formatted for 50,000 bad links, which was 50,000.)

    Every case is now sized by one rule, with the case run alone on the machine
    the view was built on (an M1 Pro): 1. the code as it is takes at most about
    17 ms at 4n, so a runner 15 times slower on a day twice as slow stays under the
    floor; 2. the mistake the case guards against, put back on a scratch copy,
    takes at least 2 s at 4n and fails the case. Each case's comment names its
    mistake, quoted as code, and both numbers; below, the size n (then 4n), the
    worst honest time at 4n in twelve runs or more, and the mistake's ratio and
    time at 4n (one run, timed as the test times it):
    - **Both hold.** One huge statement, 96 KiB, 10.5 ms; md-kit's `splitCells`
      looking for the cell's end again from every character, 17.9 times, 3.5 s. A
      Links cell of `;` only, 24 KiB, 7.2 ms; a link that scans its whole cell again,
      empty items included, 20.1 times, 3.9 s. A Links cell of bad items, 32 KiB,
      15.5 ms; the same mistake, 23.3 times, 2.8 s. Backticks in Points to, 8 KiB,
      2.3 ms; a backtick run measured again from each of its backticks, 15.9 times,
      4.0 s.
    - **The first holds, the mistake fails under 2 s.** A files list of distinct
      paths, 64 KiB, 14.8 ms; checked against itself (`paths.includes`), 39.8 times,
      692 ms (as a search of the files text, 16.8 times, 1.7 s). At 80 KiB the honest
      time is 18.8 ms and the mistake still 1.6 s, so no size meets both.
    - **No mistake found that fails it; sized by the first rule.** Links all to one
      node, 16 KiB, 9.4 ms (a link scanning its cell again, or a row looking its ID
      up among the rows, stays under 11 ms, since each row is short). The case of
      rows past the caps, 32 KiB, 3.0 ms (md-kit's 500 rows and the 200 nodes bound
      it; its rows are a chain, not the cycle its name says). The 50- then 200-node
      graph, 4.6 ms. Routing and words, now 200 then 800 nodes, 11.6 ms: at 2,000
      then 8,000 it took 1,202 ms at 4n on macos-x64 and passed by a hair at 10.0
      times, and neither a line looking itself up among the lines nor three
      mistakes in `labelsFor` failed it there.
    - **Resting on the ratio alone.** The layout with the caps lifted, now 6,000
      nodes and 30,000 edges then four times as many: a pass per line needs
      thousands of nodes, where one pass takes 484 to 547 ms at 4n here (5.4 to 6.1
      times), about 2.7 s on macos-x64, which took 2,158 ms (5.7 times) at 4,000
      nodes. A line looking itself up among the lines (a first draft did) fails it
      by a thin margin, in eight runs of eight: 10.7 to 11.2 times, 2.0 s. At
      4,000, the old size, it sat on the line (9.4 to 10.2 times); at 8,000 it
      fails by more (11.4 to 11.7 times, 3.5 s), but one pass's ratio was less
      steady there (5.8 to 7.3 times beside four busy loops, against 5.3 to 6.5 at
      6,000), and ten tries in place of five did not steady it at 4,000 (5.0 to 7.2
      times: a lower best at n raises the ratio). This
      machine's ratios do not predict macos-x64's: routing's was about 6 here and
      10.0 there.

    This departs from the design: 512 KiB of hostile input in one pass (§1 fact 6),
    which the first build showed by growth at 128 then 512 KiB, is no longer shown
    at 512 KiB by a test; the largest input timed is now 384 KiB (the huge
    statement at 4n). What remains for 512 KiB is the review's measurement in the
    running app: a longest task of 81 ms on a hostile 512 KiB file. Fourteen more
    mutations, each on a scratch copy, fail a test: an
    ID of 17 characters, `tests` reaching a claim, boxes overlapping, ⟨ and ⟩ left
    unmarked in a label, `toLowerCase` for ASCII case, a duplicate ID kept, a
    statement as markup, an `<img>`, a class from file text passed to `el()`, a
    `style` or `href` attribute on the map, an unmarked tooltip, rows after a blank
    line dropped without a note, and no stable gutter. The review found tests that
    could not fail: they used the caps by name, so `READ_MAX` at 5 MiB, the skeleton's
    1 MiB at 32 MiB, 5,000 problems listed, or "Still open" without `running` failed
    nothing. Each is now pinned with its literal value and its sentence (524,288 and
    524,289 bytes and "larger than 512 KiB"; 1,048,576 and 1,048,577 and "larger
    than 1 MiB", with the skeleton's check moved from `main.ts` into `logic.ts`; 550
    problems, 500 listed, "and 50 more problems are not listed"; every status of
    every kind against "Still open"), and each of those mutants fails a test.
    md-kit's own `splitCells` builds each cell a character at a time: that is the
    collector's work in the growth cases above.
  - **Points §5.1 and §5.2 leave open, decided and tested:**
    - two rows with one ID ignoring case: the later is left out, naming the earlier's
      line and spelling; a row's ID counts for this even when the row is left out
      for another problem, or has another number of cells (the rule is about the
      file), so a node never shows another row's details under its ID;
    - the 200 are the first 200 valid rows, the 1,000 the first 1,000 valid links in
      file order; a result's experiment is no link and is not capped apart (one per
      result at most);
    - a trailing `;`, and empty items in Links, Points to, and a files list, are
      ignored: nothing is left out;
    - `;` and `,` inside a code span do not split Points to; paths are separated by
      ", " (a comma and a space or tab), so a bare path may hold a comma alone; a
      path is refused with a leading "/", a "\", an address, an empty segment (a
      trailing "/" too), or a segment starting with ".";
    - a planned experiment may leave Points to empty; one that does not needs both
      keys; a done, running, or failed one needs both, and `files:` names paths or
      `none`, the run's "no result file" (the Human Owner, 2026-11-24), as
      `commit: none` is its "no commit". `none` stands alone: beside paths it is a
      problem naming what was found; a file named `none` is a code span. The
      panel says "Result files: none (the row says “files: none”)". The mockup's
      E1 ("no result file and no commit") is the fixture's E1 again,
      `commit: none; files: none`;
    - a claim node may leave Points to empty (§5.1 says "required" of `from:` and of
      an experiment's keys only): it is drawn and names no skeleton row;
    - header cells compare exactly but for ASCII case and surrounding spaces
      (`**ID**` is another header, and so is `Kind` spelled with the Kelvin sign);
      kinds, statuses, link words, and keys are the lower-case words as written;
      IDs are checked against their ASCII pattern before they are lower-cased;
      claim IDs compare exactly; a claim's status is compared with the skeleton's
      ignoring ASCII case and surrounding spaces;
    - a `claim:` that two skeleton rows start with is not resolved: the problem names
      both lines; an unreadable skeleton is one problem only when a drawn claim
      node has a `claim:`;
    - a cycle is found with each link counted from what must exist first to what
      follows from it (§5.1 "A DAG": `A motivates B` is A → B, `E tests X` X → E,
      `R supports` or `refutes X` X → R, `from: E` E → R), a default the
      directing agent took on 2026-11-24 and told the Human Owner, not yet
      confirmed. A result that motivates its own experiment closes a cycle; a
      hypothesis that motivates the experiment testing it no longer does (the first
      build counted each link from its row to its target and listed it). The
      problem names the nodes and one loop, each step with the link that makes it.
      Reversing the rule is one constant, `FIRST` in
      [logic.ts](frontend/plugins/idea-view/site/logic.ts).
  - **Test fixtures:** [frontend/plugins/fixtures/](frontend/plugins/fixtures/README.md)
    holds §5.1's example byte for byte and the mockup's graph of nanochat_cpu in the
    confirmed format (its two inferred links left out); the 50- and 200-node graphs
    are generated in `layout.test.ts`. The end-to-end suite deletes any
    `idea_graph.md` in its copy of nanochat_cpu (the empty state), then writes the
    mockup's graph there; malformed, hostile, and changing files go to a project of
    its own, `idea_e2e`. It runs the graph at 1000 × 728 (windows-x64 CI's window)
    and 1440 × 900, and a failure names the view's and the map's geometry.
  - **Limits that stay:** the barycentre order can leave crossings; the detail panel
    is the mockup's 156 px (200 px narrow) and scrolls; result files and commits are
    shown, never opened or checked (§5.5); a link or a pointer to a row the view did
    not read (past 500 rows or 20,000 lines, or after the table ended) is reported
    as missing among the rows read; the scrollbar gutter's fix is checked in the
    source, not in a window with classic scrollbars (the suite runs on macOS). A
    lane moves the boxes of a column a line skips down past it, so a graph with many
    such lines draws that column taller; a word that finds no free slot beside its
    node is drawn inside that node's box, over its text (3 of the 4,202 words of the
    40 seeded graphs; none of the 6,884 in the large ones, none in the review's
    probes). Two found by the review are recorded, not redesigned:
    - **review 7, the host's rate gate:** thirteen Enter presses on a focused node
      within about 0.3 s (each a click: select, unselect, …) pass the host's ten
      accepted selections a second, and the host then hides the ask bar while the
      page keeps its mark: the review saw the bar empty and Q2 marked
      (`selectGate`'s "over", by design rather than showing an older selection than
      the page marks). A click after the second has passed agrees again;
    - **review 8, a narrow window with the conversation open:** at about 1000 × 728
      the map is drawn at its 0.8 floor, 640 px in a box 451 px wide, so the Claims
      column starts off-screen and the map scrolls sideways (the page itself does
      not); with a node selected, about 163 px of the map show between the detail
      panel and the ask bar. Collapsing the conversation, or a wider window, shows
      the map whole (at 1440 × 900 it is 800 px wide and about 420 px of it show).
  - **Covered by unit tests only, not in the running app:** the caps (200 nodes,
    1,000 links, 500 rows, 20,000 lines, 500 problems listed; each by its literal
    value since the review), cycles, every Points
    to and status error, a claim's pointer missing, ambiguous, or with another
    status, the skeleton's unreadable states, the 413, 503, unreachable, binary,
    other-encoding, and over-512 KiB screens, statements over 2,000 characters,
    hostile labels and quotes through the host's `readSelect`, CRLF and lone CRs,
    the cycle rule's table, list-item rows and fenced headers, lanes and word slots
    on random and large graphs, and the growth cases. In the running app since the
    review: the generation check, IDs of sixteen wide characters, a Reload ending
    while Home is shown, and the words of E2's lines.
  - Not verified: Windows and Linux (the suite ran on macOS arm64 only), and the
    Human Owner's checklist line.

- **2.2, the Assets view**, is the bundled plugin
  [frontend/plugins/assets-view/](frontend/plugins/assets-view/) (manifest as §4.1,
  `reads` exactly §1 fact 1's six roots), with `walk.ts` (the folder walk),
  `queue.ts` (the picture queue), `svg.ts` (the SVG check, after the review), and
  `logic.ts` (every rule of §4.2, the CSV reader, labels, words) beside `main.ts`.
  md-kit and site-kit are unchanged (md-kit's timing tests changed, below); the
  Skeleton view's tests are untouched. An independent review (2026-11-24) found 3
  must-fix and 7 should-fix problems, and CI failed on Windows and macOS x64; the
  points marked "after the review" are its fixes. Where the code differs from Part 3
  or the mockup:
  - **Labels** (the brief for 2.2 over §1 fact 5's `clipLabel`; after the review): a
    file's label is its project path, each name with the host's own classes
    (`visibleName`'s) and the look-alikes of a label's own forms shown as
    `⟨U+XXXX⟩` markers: the middle dot and its kin and curly quotes (so no name
    reads as `… · claim C1` or `· section “…”`), `:` (so `x.csv:12` cannot read as a
    line), a backslash, slashes other than `/` (so no name shows a second, deeper
    path), `⟨` and `⟩` themselves (so a name that spells a marker, `a⟨U+003A⟩b.svg`,
    never shares a label with `a:b.svg`), and a space at either end of a name (so
    `a.svg ` never reads as `a.svg`). All of it is marked in one pass, so a label
    decodes to exactly one path: a seeded test of 20,000 hostile paths decodes
    every uncut label back to its path and finds no two paths with one label. A
    label over the host's 200 characters is cut once, in the middle, with one "…":
    the file's name stays whole after the cut where it fits, else its last 99
    characters do, never inside a marker or a surrogate pair (`clipLabel` cut from
    the left and could split either; the first build cut at the end, so
    `sweep_…seed1.png` to `seed5.png` shared a label). A dataset's label is
    `Code/README.md:<line> · dataset <name>`, the name as plain text with blank runs
    one space and markers as above, marked in one pass too; the name is what is cut.
    Whenever a label is not the item as written (it holds a marker, it was cut, or
    a dataset name's blank runs were joined), the panel says so in one sentence
    under the item's name: "The agent gets this name: `<label>` (characters that could
    be misread are written as ⟨U+…⟩; the path is shortened)." Every label is
    checked through the host's own `readSelect` in `logic.test.ts`. No quote is
    posted.
  - **Identity**: an item is its project path (`file:Figs/a/plot.svg`) or its
    README line (`dataset:208`); the open item, the selection, a card's picture,
    and the panel are found by that key, never by a name shown, so two files of one
    name in two folders, or two datasets of one name, each open their own detail.
    Reload keeps the open item (a dataset only while its line has the same name),
    clears the selection, and keeps the list's scroll. The old list stays clickable
    while Reload reads (after the review): an item clicked then is open and marked
    on the new list when it is still there with the same label; otherwise the page
    posts `null`, so the workspace never holds a selection the page dropped.
  - **The walk** (§4.2): "depth 4" is four folder levels below the group's folder
    (`Figs/a/b/c/d/` is listed, `…/d/e/` is not); the 40 listings count the group's
    own; the walk stops at the 501st file. Beside the group, in words: "No Figs/
    folder this view can read" (404), "Figs/ is empty" (nothing listed), "Figs/
    holds only empty folders", "could not be listed" with the reason, and a sentence
    beginning "More files than shown:" for each stop (depth, listings, files) and
    for a listing the channel cut at 5,000 names; a subfolder that could not be
    listed is named. `Code/Datasets/`'s state is said under the dataset rows.
  - **The bar's count** names a group's folder when it was listed, and "datasets"
    when `Code/README.md` was read or `Code/Datasets/` listed.
  - **Descriptions**: a list's top-level items and a table's body rows, in file
    order; a link inside bold counts, a `<…>` address too, and a link's title is
    left out (after the review); a link to a file of another folder (a subfolder's) describes nothing; an item
    with nothing after its link gives no second line. The panel's What adds "from
    <README.md>:<line>" under the text, and a README.md that could not be read is
    named beside its group and in the panel. After the review, README.md files are
    read in walk order while their listed sizes add up to 8 MiB; each is reduced to
    its descriptions as soon as it is read, and no parsed document is held. The rest
    are named in one line beside their group ("README.md files past the first 8 MiB
    are not read for descriptions: …") and in the panel of their files. The
    review's 160 READMEs of 1 MiB (four groups of 40 folders) took 4.4 s in
    `buildModel` and held about 0.9 GB; now 8 are read in 0.3 s, `buildModel` takes
    0.01 s, and 6 MiB is held.
  - **Used in** (after the review): each line of `paper_skeleton.md` and
    `Code/README.md` is read for link and image addresses after `](`, outside code
    spans: a `<…>` address, or one up to white space with balanced parentheses
    (`loss (1).png`), a title left out, whatever the link's text holds
    (`[Figure [1]]`). A `](` counts only when its `]` closes an unescaped `[`, on
    its line or an earlier line of the same paragraph or item, so `\[f](x)` names
    nothing, as md-kit reads it. A code span whose whole text is the path counts
    too; a path in plain text does not. Paths are compared in Unicode NFC, never by
    case. A table row is read as written, so a link in a cell md-kit cut
    at 2,000 characters, or past the header's cells, is found. The place is the
    line that names the file (a table row with its first cell, cut at 80
    characters); a link whose text breaks across a paragraph's or item's lines
    gives the block's lines; headings and a table's header row are read, code
    blocks are not. When `paper_skeleton.md` or `Code/README.md` could not be read,
    or not whole, the panel says so beside the places it found; when both were read
    whole and nothing names the file, it says "No link or path to this file was
    found in paper_skeleton.md or Code/README.md.", what was searched, not a fact
    about the file (the first build's "Not named in …" was said of files named by
    a link with a title, a `<…>` address, or parentheses). Reference-style links
    and HTML `<img>` are outside what is read and get that sentence.
  - **What md-kit leaves unread is said**: past its caps (20,000 lines, 500 rows or
    30 columns of a table), a sentence names what of `paper_skeleton.md` or
    `Code/README.md` was not read for Used in, what of `Code/README.md` for the
    datasets, and what of a folder's `README.md` for descriptions (beside its group,
    and in the panel of its files without one); a Markdown preview names a table cut
    to 500 rows or 30 columns. After the review, the Used in, datasets, and
    descriptions sentences also name everything after a code fence never closed
    (md-kit reads it as code; a Data section after it is not seen, and the group
    still reads "Code/README.md has no Data section" above that sentence), and the
    descriptions one cells cut at 2,000 characters and cells past the header's
    count.
  - **Datasets**: a row shows its cells as `<header>: <text>` but an empty one and
    the one that is just the name (`Source: cais/mmlu all` stays); a row with no
    name reads "(no name)". Notes say when the dataset table has rows past 500,
    columns past 30, or rows of another width, and when the Data section goes on
    after the table (that text is not shown).
  - **Previews**: a CSV's first record is drawn as its header and N counts the
    records after it; a record ends at LF or CRLF only (a lone CR is a character),
    a blank line is a record, a quote not at a field's start is a character; notes
    name rows of another width, columns past 30, cut cells, and a quote never
    closed; "All N rows" when there are 20 or fewer. When the 2 MiB read stops
    inside a record (after the review), that record is neither shown nor counted
    (the first build blamed a row that is whole in the file), a quoted field still
    open there is said ("A quoted field opened in row 1 is still open where the
    preview stops reading, at 2 MiB; that row is not shown."), and with no whole
    row the preview says "No complete row in the first 2 MiB". A JSON or text file:
    "N lines" when 40 or fewer. A Markdown preview says it is drawn as text, links
    not followed and images not loaded. Sizes divide by 1,024, as the mockup's
    `fmtBytes` does. A PDF's heading is "File", as §4.2's list has it.
  - **Pictures** (§4.3): the `<img>` has `src` and an empty `alt` only, the name
    being the card's caption. Every picture's URL carries the Reload's generation
    beside its path, `…/files?path=…&v=<n>` (after the review: Chromium reuses a
    picture it already drew for a URL, `no-store` or not, so two files that
    swapped contents on disk kept each other's picture after Reload); the card,
    the panel's large picture, a retry, and the `HEAD` after an error use it, and
    the channel ignores the extra parameter (`protocol.test.ts` pins it). The queue
    also retries once a load that failed while the channel's `HEAD` answers 200 (a
    busy moment can fail the load and free its slots before the `HEAD`), ends a
    load after 30 s with "Try again", and runs the panel's large picture too, first
    in line, dropping it when another item opens. Reload frees every slot at once
    and drops the answers of loads it cancelled; each render resets the queue, and
    a picture is placed only into the render it was asked for, so a **Show**
    clicked while Reload reads loads again on the new card (after the review; it
    stayed blank until the next Reload). Leaving the tab cancels nothing (a picture
    keeps loading while the frame is hidden), and no load holds a slot past its
    time-out; the end-to-end suite Reloads and leaves the tab while sixty pictures
    load, and all sixty are drawn. A card past the 200th figure shows **Show**. A
    card is a `div` with `role="button"` (Enter and Space click it), since its
    picture box may hold a button and a `<button>` holds none.
  - **The SVG check** (after the review; a 1.2 KB SVG of `<use>` nested 6 levels of
    10 froze the page for 80 s and more as Figures opened, and on the click as a
    row; the time-out runs on the same thread and could not help): before an
    `.svg` goes to an `<img>`, card or panel, the page reads its text through the
    channel in the same queue slot, at most 4 MiB, and `svg.ts` counts the elements
    it draws through `<use>` (every attribute whose local name is `href`, whatever
    its prefix, and each of them when a `<use>` has several; same-document `#id`,
    XML escapes and percent-encoding read), with a scanner over the text (no document
    is built and nothing of it reaches the page; `dom.test.ts` pins both) and one
    memoised, cycle-safe pass, linear in the file's size. It fails closed: over
    4 MiB, not UTF-8, not read as it expects (an unclosed or mismatched tag, its own
    document type entries), a reference cycle, or more than 200,000 elements means
    no picture, the reason in one sentence ("This SVG repeats its parts 6,802,462
    times over; drawing it may freeze the view."), and **Show**, which draws it
    anyway, the human's choice. The card and the panel each read the text before
    their draw, so an SVG opened in the panel is fetched four times on a Reload
    (two reads, two picture loads). The bound, measured in headless Chromium on
    macOS arm64: 68,020 elements (4 levels of 10) draw in 313 ms with the page
    answering in 5 ms; 680,241 (5 of 10, refused: the review left 5 of 10 to this
    build's call) block it about 1.1 s; 2.45 million about 5 s; 6 and 7 of 10
    never finish. nanochat_cpu's two SVGs (91 and 113 elements)
    and a matplotlib-style figure (glyphs and a marker in `<defs>`, 5,000 `<use>`,
    an embedded `data:image/png` raster) draw without a click. Another picture held
    inside is refused too (a recheck after the review wrapped the 6×10 bomb in one
    `<image href="data:image/svg+xml;base64,…">`, and wrote its `<use>` with
    `x:href`): an attribute's value on any element, or a `url(` in one (a style, a
    fill), that is a `data:` URL of any type but `image/png`, `jpeg`, `gif`, or
    `webp` (XML references read, leading white space and control characters
    skipped, tabs and line breaks dropped, case ignored) gives "This SVG holds
    another picture the view cannot check; drawing it may freeze the view." and
    **Show**. What stays a declared limit: a `data:` URL inside a `<style>` sheet,
    or written with CSS escapes in a style (`\64 ata:`); HTML inside
    `foreignObject`; filters and patterns; a file changed between the check and
    the draw.
  - **Narrow window**: below 760 px of the frame's width (the mockup's container
    rule), the preview sits above the list, at most 270 px tall.
  - **Results' sentence**, "The Code view also lists these files.", shows also when
    `Code/results/` is not there, under it the folder's state.
  - **Test fixtures and the end-to-end suite** (the brief for 2.2 over §6): no test
    reads a live project file. [frontend/plugins/fixtures/](frontend/plugins/fixtures/README.md)
    holds frozen copies of nanochat_cpu's `Figs/`, `Baselines/` (its 6,501-row
    reference CSV cut to 300 rows), `Code/results/`, `Code/Datasets/`, and
    `Code/README.md`, and of the template's. The suite checks the view on
    `assets_e2e`, a project it makes from the template with that copy laid over it,
    not on nanochat_cpu, whose copy it only photographs; the hostile names and files
    (the design's, plus a markup-named SVG, one name in two folders, two datasets of
    one name, binary data, a depth past the cap, a name with a no-break space) are
    in a third project, `assets_odd`, so they never change what the first checks,
    and the `<use>` bombs in a fourth, `assets_bomb`. The isolation test asks for
    files that are there (`AGENTS.md`, `PROJECT_MEMORY.md`, `Code/README_zh.md`,
    another project's `Code/` file) rather than §6's `Code/tools/…` and
    `Code/nanochat/…`, which `assets_e2e` has not. The hostile SVG holds a script,
    `onload`, two external images, `@import`, a `foreignObject` with an image and a
    frame, a `<use>` to an outside URL, and a `javascript:` link, all aimed at a
    local HTTP listener; drawn as a card and large (natural width 320), it ran
    nothing and the listener heard no request (§1 fact 3 is now pinned). That SVG
    covers fewer vectors than the reviewer's `hostile.mjs`, which found nothing
    either. After the review the suite also swaps two pictures on disk and Reloads,
    clicks during a Reload, and opens the bombs in `Figs/` and `Code/results/`.
  - **Source checks** (`dom.test.ts`, after the review): sources are read with LF
    line endings, as the Skeleton view's are, so the checks hold on a Windows
    checkout (two failed there on CRLF). Besides the plain spellings, every site
    file and kit is scanned for a sink reached the long way round: its name as a
    quoted string or a piece of one (`"inner" + "HTML"`), a write through a
    string-indexed bracket, a sink as an object key, `Object.assign`,
    `Reflect.set`, `defineProperty`, `as any` and other casts, `.src` outside
    `draw()`, `createElement` outside site-kit, and an `el()` tag outside a fixed
    list; the review's mutations are each caught.
  - **Timing tests** (after the review; one helper,
    [frontend/plugins/growth.ts](frontend/plugins/growth.ts)): md-kit's hostile
    inputs and Snapshot cases, the CSV reader's, Used in's, and the SVG check's time
    the input at n and at 4n, best of five after a warm-up of both, and a case fails
    only when the ratio is 10 or more and its best time at 4n is over 500 ms. One
    pass grows about 4 times, a pass per element about 16; a ratio alone was noise
    on a few milliseconds (macOS x64 failed the old 100 ms and 500 ms bounds, then a
    ratio of 13.4 on a 14 ms case). The sizes keep every case at 50 ms or less at 4n
    here, and each test's quadratic code, put back on a scratch copy (f1bd371's
    Snapshot split, the CSV reader walking earlier records every 64th record, or a
    pass over the input every 1st to 128th element), fails it at 2.7 s or more at 4n.
    Run 20 times each beside four busy loops, no case failed; the worst was 10.6
    times on 63 ms (the SVG check's entities in an id, passed by the floor) and the
    longest 70 ms.
  - **The protocol tests** (`client/test/protocol.test.ts`, "the Assets view's
    reads", on the bundled origin): its six roots are read; `AGENTS.md`,
    `PROJECT_MEMORY.md`, `index.md`, `Code/` besides `results/`, `Datasets/` and
    `README.md`, `paper/`, and listings of the project, `Code/`, `paper/` and the two
    file roots are 404; a link inside a declared folder leaving the workspace,
    reaching `human/private`, or reaching `Code/`, and a project whose `Figs` or
    `Code/results` is itself such a link, are 404 and left out of listings. Widening
    a root in `plugin.json` (`Code/results` to `Code`, or `Figs` to the project)
    fails the first group; dropping `serveRead`'s containment check, or its
    declared-root check, fails the second.
  - **The checklist** asks the Human Owner to look at nanochat_cpu and change
    nothing. §6's "Click `training-metrics.csv`" is `training_metrics.csv` under
    Results (943 rows); the hyphenated one is the reference run's.
  - **Limits that stay** (found by the review, not changed): Used in also finds a
    path inside an HTML comment, a code span broken across lines, and a path with
    `%2F` used as a separator; a CSV with lone CRs for line ends reads as one row,
    and a UTF-16 file as binary; a lone surrogate in a name is passed to the host as
    it is. As §1 fact 3 says, the memory to decode a very large picture is not
    bounded.
  - Not verified: Windows and Linux (the suite ran on macOS arm64 only; the
    Windows and macOS x64 CI failures are fixed locally and not yet rerun in CI),
    and the Human Owner's checklist line.

- **2.1, the Skeleton view**, is the bundled plugin
  [frontend/plugins/skeleton-view/](frontend/plugins/skeleton-view/) (manifest as
  §3.1), the shared [frontend/plugins/md-kit.ts](frontend/plugins/md-kit.ts),
  `readStart(res, maxBytes)` and `readText` moved into
  [frontend/plugins/site-kit.ts](frontend/plugins/site-kit.ts) unchanged (the Code
  view passes its 2 MiB), with `inlineNodes` and `markInvisible` added there. Where the
  code differs from Part 3 or the mockup:
  - **What one click selects in an open section:** a paragraph, a list item (with its
    nested items), a table row, or a fenced code block, the mockup's units, which §1
    fact 5's label row cites (`views.html:1192-1196`) and which the checklist's "click
    a line" needs. md-kit's block (a whole table or list) is not a selection unit.
  - **A quote longer than the host takes:** the host ignores, rather than cuts, a
    message whose quote is over 2,000 characters
    ([src/plugins/select.ts](frontend/src/plugins/select.ts) `readSelect`, the
    `quote.length > QUOTE_MAX` check), so a click on a long block would show no ask
    bar. The page cuts every quote to 2,000 characters ending in the host's own
    `…[cut]` (not §1 fact 6's `clip` with a bare "…", which could not be told from
    text that ends so; after the review, 2026-11-24), by the host's rule: never inside
    a `⟨U+XXXX⟩` marker or a surrogate pair (site-kit's new `cutMarked`; the Code view
    keeps `clip`). Labels are cut by the same rule, ending in "…". A claim row can be
    60,000 characters (30 cells of 2,000); `logic.test.ts` sends a 40-line block
    (3,669 characters), cut, through `readSelect`, and shows the uncut one ignored.
  - **Labels** (after the review): a claim is `paper_skeleton.md:<line> · claim <ID>`
    (`· Claims and Evidence` without an ID); anything else in a section, a Snapshot
    line included, is `paper_skeleton.md:<lines> · section “<title>”`, the title as
    plain text with a middle dot (or look-alike) made "-" and curly quotes straight,
    so no title can forge a claim's label; text before the first heading is
    `· before the first heading`. §1 fact 5 had `· <section>`.
  - **Line numbers are LF-counted** (after the review): a lone CR is no line break,
    so a label's line is the one `grep -n` and the Code view give; the CR stays in its
    line, drawn as `⟨U+000D⟩`. The host takes CR, VT, FF, NEL, U+2028, and U+2029 in a
    quote for line breaks, so the page quotes each as its marker, and the quote has
    one line for each line its label cites; U+2028 and U+2029 are drawn as markers too.
  - **Two claims with one ID:** the open claim is kept by its line (by its ID only
    across a Reload, and only when one row has it), and a note names the ID and its
    lines.
  - **The 1 MiB cap** is read as `readStart(res, READ_MAX + 1)`: `readStart` says
    `cut` when the body reaches its limit, so a file of exactly 1 MiB is read and one
    byte more is the "too large" screen.
  - **"The rest of paper_skeleton.md" lists everything not drawn above it** (after
    the review; §3.2 listed sections of levels 2 to 6 only): text before the first
    heading; sections at any level; "Snapshot, other items" (items the card does not
    draw, such as Contributions, and the section's other blocks); "Claims and
    Evidence, besides the table". The file's level-1 title and the paragraph under it
    stay out, and a muted line says so, as does one naming headings with nothing
    under them. "Nothing else in paper_skeleton.md." appears only when it is true; a
    test accounts for every non-blank line of both fixtures and of the reviewer's
    skeletons. The card draws a Snapshot line's own text only, so items nested under
    it are listed under "Snapshot, other items" too; a fenced block's info string,
    which its quote holds, is drawn as a caption above it.
  - **Entries in a section's summary** count table rows (those past 500 too), list
    items, paragraphs, and also fenced code blocks, which §3.2 does not name.
  - **Notes the design does not list:** more than 20,000 lines read; a table's rows
    past 500, columns past 30, rows of another width than the header, and lines of
    only invisible characters inside it (which do not end it); more than 300
    sections; a missing column, the Claim column included (then no row is a claim,
    and the view says "No claims yet" with that note); the claims table's columns it
    does not draw ("Columns not shown here: Retracted?, Status (2nd)"); its rows with
    an empty Claim cell; a repeated claim ID; a Snapshot section with no list, or
    none of the items the card draws (the card says so).
  - **Labels and headers by their plain text** (after the review): `**Status:**
    draft`, `**Status**: draft`, and `` `Status`: draft `` are the Status item, and
    `**Claim**`, `` `Claim` ``, and `Claim` are one header, wherever md-kit finds a
    column by name; "Used by" reads the Experiments Claim cell's plain text, split
    on "," and ";".
  - **"Files it names"** shows a project path in monospace, an address as text with
    "(an address, not a file of the project)", and a target that leaves the project
    "(outside the project)". "Used by" reads "Main result (paper_skeleton.md:83)", as
    the mockup has it. The empty panel says "the files it names" where the mockup
    said "what the source file itself says" (N-3).
  - **Reload** keeps the open claim (by its ID when one row has it, else by its line)
    and the open sections, keeps the scroll, and clears the selection.
  - **A wide table in an open section** (the Experiments table's seven columns in the
    main column at a 1,440 px window) wraps paths in code anywhere and, if still wider,
    scrolls inside its card; the end-to-end suite checks that neither the page nor a
    section's card is wider than its box.
  - **md-kit's subset, as built** (its header and tests): LF (or CRLF) ends a line,
    a lone CR does not; a blank line holds only spaces and tabs (U+FEFF, a no-break
    space, U+3000 … are text), and md-kit trims only spaces and tabs; an ATX heading
    starts at column 0, and "#" alone is text; a fence may be indented by up to three
    spaces, opening and closing, as in CommonMark; a list ends at a blank line, and
    another marker kind starts another list; a bare "1." is an empty item; a
    paragraph ends at a heading, a fence, a list marker, or a "|" line followed by a
    delimiter row; `\|` in a cell is a pipe, inside code spans too (as GFM); a link's
    text holds no "[" and its target runs to the first ")" (no titles). md-kit drops
    no byte-order mark: the decoder drops one, and a second is drawn as `⟨U+FEFF⟩`.
    Nested items carry whether they are numbered, for drawing.
  - **Test fixtures:** md-kit's and the view's tests, and the end-to-end suite, read
    frozen copies of `nanochat_cpu`'s and the template's `paper_skeleton.md` in
    [frontend/plugins/fixtures/](frontend/plugins/fixtures/README.md), not the live
    files. That folder has no `plugin.json`, so `server/registry.test.ts`, which
    required every folder in `plugins/` to be a bundled plugin, now allows exactly it,
    and the build skips it. The end-to-end suite writes the nanochat copy over the
    temporary workspace's file and makes a project `skeleton_e2e` from the template
    there; e2e expectations are computed with `split(/\r?\n/)`, so a CRLF checkout
    passes.
  - **Files the design's list missed:** `src/pages/PluginsPage.tsx` (its planned
    "Skeleton view" card is removed, as its comment asks once a manifest is bundled),
    `src/shell/layoutState.test.ts`, the client test's other plugin lists
    (`protocol.test.ts`, besides the policy literal), and the
    [README.md](README.md)/[README_zh.md](README_zh.md) pair, which said Skeleton
    comes in step 2.
  - **File roots in `reads`** are under tests in `client/test/protocol.test.ts` ("a
    file root"); the channel is unchanged. A root names a path: when a project holds
    a *folder* named `paper_skeleton.md`, its own contents are readable as a folder
    root's are, and a link in it leaving the root is 404 (pinned; Part 3 §1 fact 1
    is corrected). Twelve of fourteen mutations of
    `serveRead`, `matchRoot`, and `safeDecodedRelative` (each breaking one rule: most
    change one line, three rewrite `matchRoot`'s matching) made these tests fail. The two
    that did not are cases two layers hold: a listing of a file root stays 404
    without the is-a-folder check (`opendir` fails into the catch-all), and on POSIX
    a `::$DATA` spelling stays 404 without the `:` check (the literal segment does
    not match, and no such file exists). A path below the file root has no line of
    its own (`realpath` fails with ENOTDIR); making file-system errors throw instead
    of answering 404 fails it. In the `*` segment the disk decides:
    `alpha` reads Alpha's file on a case-insensitive file system, as S5 documents for
    folder roots.
  - Not verified: Windows and Linux (the suite ran on macOS arm64 only), and the
    Human Owner's checklist line.

- **S1 to S5 are done**: the manifest parser, the server-side registry with the dev
  server built from it, the client serving plugin origins from the registry (S3), the
  frontend registry (S4), and the read channel (S5, merged as PR #42).
  `createMounts`, `splitMounts`, and the client's `WIKI_*` constants are gone. The
  code is the authority where it differs from Part 1:
  - Manifests (S1): paths must be plain, a `reads` root may not start with `*`, and `*`
    does not match a dot segment.
  - On `app://<id>`, only `/api/<id>` and `/api/<id>/...` reach the plugin's mounts. Any
    other `api/` path is a plain 404 file miss, as it was for the wiki, also when no
    folder is open. What changed on Paper Wiki's origin:
    - its own unknown endpoint paths (`/api/paper-wiki/other`) answer a JSON
      `no endpoint` 404, or 503 with no folder open, where they were a plain 404;
    - `_os/` is never a file, so a file under `paper-wiki/_os/` that was served (200)
      is 404, and a write there 404 rather than 405;
    - `api` and `_os` are reserved in any case and without a trailing dot or space
      (`API/`, `_OS/`, `api./`), which a case-insensitive file system or Windows would
      otherwise resolve to `paper-wiki/api/` or `paper-wiki/_os/`.
  - `createHandler`'s state has no `csp`: `route` derives the app policy from `sites`,
    so the framed origins and the served sites cannot disagree.
  - The app policy no longer allows Google Fonts, which the frontend does not load, so
    `appCsp(["paper-wiki"])` is not byte-identical to the old `CSP`; the test pins the
    new literal. `appCsp([])` gives `frame-src 'none'`.
  - `WIKI_CSP` is `WORKSPACE_CSP` (any workspace-folder site); `PLUGIN_CSP` is built for
    plugin-folder sites, which are tested on a fixture only (no plugin has `site/` until
    S6). They need no open folder and have no index fallback (`app://<id>/` is 404). A
    bundled plugin's `site/` is confined lexically (it may sit in the asar archive);
    any other plugin's by real path, so a link inside it cannot leave it.
  - A bundled plugin that fails to load is logged as `ERROR` and its compiled-in
    handlers are left out. If a loaded plugin's declared handlers and the compiled-in
    factories disagree (a bundling bug), `createRegistry` still throws; the client's
    `workspaceRegistry` then logs an `ERROR` and serves the trunk's endpoints alone. It
    is built before any poller or timer starts, so a folder never opens half-way and
    the window still opens.
  - The end-to-end suite runs through the new layout, not the dock. The Help menu item
    keeps its label, "System and Prerequisites": it opens Settings, which holds that
    check, and the suite and the client README name it by that label.
  - The frontend registry (S4) is `frontend/src/plugins/`. `pages.ts` exports
    `pluginPages(plugins, { desktop })` with no `selfOrigin`: a page's `origin` is
    `app://<id>` in the client and `null` in a browser. It has no `viewSrc`,
    `AskMessage`, or `readAsk` yet; project views and the page-to-host message come
    with S6. It adds `bundledManifests`, which parses each bundled manifest and skips
    one that fails, or whose id is not its folder's, with a reason that `registry.ts`
    logs as a console error.
  - Paper Wiki's manifest differs from §2's example: its panel title is "Paper wiki"
    (the left-navigation label the end-to-end suite clicks), and its description is
    the Plugins page card's text. `src/plugins/pages.test.ts` pins that label and both
    frame URLs against the real `plugins/` folder in the required CI, since
    `npm test` now also runs `src/**/*.test.ts`.
  - A plugin's left-navigation page is a `PluginScreen`, remembered in the saved
    layout by its key, `paper-wiki/viewer`; a layout saved as `wiki` opens it.
    `PaperWikiPage` stays, with no props, for the dock alone. There is no `icon`
    field (A8): the renderer maps a bundled plugin's id to an icon. The Plugins card
    has one chip per page; handlers get none.
  - The read channel (S5) is `serveRead` in
    [client/src/main/protocol.ts](client/src/main/protocol.ts), described with its
    known limits in [client/DESIGN.md](client/DESIGN.md) §3.2. No bundled plugin
    declares `reads` until S6, so it is proven by fixture tests in
    `client/test/protocol.test.ts` only. Where it differs from §3's "The read
    channel", after an independent security review:
    - The URL shape is `app://<id>/_os/files?path=<rel>` and
      `app://<id>/_os/list?path=<rel>`, not `_os/files/<rel>`. For an `app://`
      URL, Chromium runs a `<script src>` whose path ends in `.js` or `.mjs`
      whatever its Content-Type and `nosniff` (the review showed it in Electron
      44), so a path naming the file let a plugin page run a workspace script.
      With the path in the query the URL path names no type, and a probe under the
      real `PLUGIN_CSP` saw classic, module, `import()` and worker loads all
      blocked. The contract is not frozen until step 2 (A1).
    - Only the exact, lower-case `/_os/files` and `/_os/list` are the channel,
      with exactly one `path` parameter, which the URL parser decodes once (`+` is
      a space) and `serveRead` checks as `safeRelative` would, without decoding
      again (`safeDecodedRelative` in `frontend/server/manifest.ts`). A missing,
      empty or repeated `path` is 404; other parameters are ignored. Every other
      `_os` path, `/_os/files/<rel>` included, stays 404.
    - The declared pattern is the boundary: a root's real path must itself be one
      of the plugin's roots as written, so a link planted at or above a root (a
      cloned project's `Code` pointing at `human/private`) is 404, while a root
      linked to another declared root is followed. To follow links to any folder
      of the workspace again, drop the one check `declaredRoot(...)` in
      `serveRead`. On a case-insensitive file system a `*` segment in another case
      reads the same root, and a folder spelled on disk otherwise than declared is
      404 by either spelling ([client/DESIGN.md](client/DESIGN.md) §3.2).
    - The root must also lie inside the workspace, not be it, and not be a dot
      folder of it; the dot check also runs below the root's real path (a link
      named `x` to the root's `.git` is 404). Paper Wiki's site folder follows a
      link out of the workspace; the channel deliberately does not. To reverse
      that, drop the one check `isInside(top, rootReal)` in `serveRead`; the
      declared-root check applies inside the workspace only, so that alone lets
      such a root be read (a test shows it).
    - A file is checked by path, opened with `O_NOFOLLOW` and `O_NONBLOCK`,
      checked again as opened, and streamed 64 KiB at a time, never past its
      `stat` size, closing on end, error and cancel. A file above 32 MiB
      (`READ_MAX_BYTES`) answers 413 before a byte is read, also when it is
      unreadable. At most 16 files (`READ_MAX_STREAMS`) are open for reading at
      once per plugin origin; above that a file read answers 503 without opening
      the file, and the slot comes back on end, error, cancel, HEAD, or refusal.
      Part 1 had no such cap.
    - A listing reads at most 5,000 names (`LIST_MAX_ENTRIES`), kept or not, in
      the file system's order, sorts them in UTF-16 code-unit order, and adds
      `"truncated": true` when the folder has more; HEAD on a listing stops at
      opening the folder. Listings also leave out dangling links and anything that
      is neither a regular file nor a folder (a FIFO).
    - Every answer carries `nosniff`, `no-store`, and `READ_CSP`. `.html`, `.htm`,
      and `.xhtml` are sent as `text/plain` too, besides `.js`, `.mjs`, and `.cjs`;
      SVG keeps `image/svg+xml`, which an `<img>` needs. Anything but GET and HEAD
      is 405 (with `Allow: GET, HEAD`) before the no-folder 404.
    - `safeRelative` also refuses `CONIN$`, `CONOUT$`, and `COM¹`-`COM³`,
      `LPT¹`-`LPT³`.
- **The layout shell is built** (Part 1's S7), ahead of S3 to S6, with Code and Paper as
  placeholder tabs until S6a-2 and S6b replaced them. The dock shell in `frontend/src/desktop/` is unreferenced and is
  deleted in S8.
- **S6 is split in three**, all merged (PRs #43, #44, #45): S6a-1, the
  Code view's Git handler; S6a-2, the Code view plugin (stacks on S6a-1); S6b,
  the Paper view plugin (stacks on S6a-2), with PDF.js vendored as the Human
  Owner allowed on 2026-11-22 ([HANDOFF.md](../HANDOFF.md) Decisions). The
  end-to-end suite reaches the read channel through both views. What is left
  of step 1 is S8 (deleting the dock shell), after the Human Owner's run of
  the [client checklist](client/README.md#check-it-on-your-machine).
- **S6b** is the bundled plugin [frontend/plugins/paper-view/](frontend/plugins/paper-view/)
  (manifest as Part 2's, `reads: ["projects-folder/*/paper"]`, one project
  view `paper`, no handlers) and the workspace's Paper tab, last in the row as
  in the mockup. Where the code differs from Part 2:
  - PDF.js is `pdfjs-dist` 6.5.438 from the npm registry (its tarball checked
    against the registry's published integrity before anything was copied):
    `pdf.min.mjs`, `pdf.worker.min.mjs`, and the package's `LICENSE`,
    unmodified, in `site/vendor/` with a README giving the version, the
    source URL, the integrity, and each file's SHA-256. `vendor.test.ts`
    recomputes the hashes, checks the folder holds nothing else, and that no
    `package.json` or lockfile in `os-ui/` names `pdfjs-dist` or
    `@napi-rs/canvas`; `.gitattributes` marks the three files `binary`, so a
    Windows checkout keeps their bytes. The README and `LICENSE` are the
    third-party notice: the repository has no notices file of its own, and
    the package has no `NOTICE`.
  - The two files are not bundled: the page `import()`s `pdf.min.mjs` from its
    own origin at run time and starts `pdf.worker.min.mjs` itself as a module
    worker. So what ships is the hashed bytes (the end-to-end suite checks
    `out/` and what the frame fetches), PDF.js never wraps a worker in a
    `blob:` URL, and it cannot fall back to parsing on the page's thread: a
    worker that does not start shows "The PDF reader could not start".
  - **One worker per document** ([site/opener.ts](frontend/plugins/paper-view/site/opener.ts),
    after the review of S6b): each open starts its own worker and hands it to
    PDF.js as a `PDFWorker` port (PDF.js's shared, cached worker let one
    stuck document strand the next, and threw `PDFWorker.create - the worker
    is being destroyed` uncaught). Opening a document closes the one before
    without waiting for it: its worker is terminated once PDF.js lets it go,
    or after 2 s. An open that does not finish within 20 s (the worker not
    starting, or not answering) is ended, its worker terminated, with a
    screen and Try again. A Reload takes its number before anything waits,
    so two in one task leave one document.
  - **Bounds** (logic.ts). The review's numbers come first; the new ones
    were measured in the app on macOS arm64 with a probe script of the same
    shape as the review's (one app per probe, peak working set of the
    frame's process sampled every 0.5 s), the nested forms in a two-page
    fixture whose page 2 is ordinary:
    - A page that takes longer than 15 s to draw (its content read in the
      worker, then drawn) is stopped: it shows a note, its worker is
      terminated, and the paper is opened again in a fresh one at the same
      place without that page, until Reload. Only time the page can be seen
      counts: PDF.js draws in animation-frame steps, which stop while the tab
      is hidden or the window is in the background, so that time (and a
      sleep) is not counted. 15 s is many times what an ordinary page needs
      (the nanochat paper's take well under a second). The review's nested
      forms (20 levels, 4.6 KB) ran 35 s and reached 6.4 GB in the frame's
      process; now page 1 is stopped at 15.2 s, page 2 drawn, at a peak of
      2.9-3.5 GB, of which about 1.3 GB was still held 20 to 50 s after the
      ordinary paper was reloaded. That bound is per page, and pages add up:
      a stopped page's memory is not all given back before the next page is
      drawn. In the second review, four such pages in one paper peaked at
      4.8 GB in the frame's process (5.2 GB in all), which still held 3.2 GB
      8 s after the ordinary paper was reloaded and about 1.45 GB later.
      Here, under other conditions (four such pages, scrolled to the end once
      the first two were stopped, no reload), the peak was 5.1 GB in the
      frame's process (5.5 GB in all), and it still held 3.9 GB 10 s after
      the fourth page was stopped.
    - A page's text is cut at 10,000 runs (a note says so) and gets the same
      15 s budget: the review's 100,000 one-character runs took 138 s and
      about 1 GB; now 10,000 are laid out in about 1 s at a peak of 388 MB.
    - At most 1,000 pages are laid out, and only as many as fit in one
      scrolling column at 300% under Chromium's 16,777,216 px clamp on an
      element's height (a page read later that is taller than the first lays
      out fewer: the review's one-point page followed by a 14,400-point one
      shows one page and says so); the bar and the end of the column say
      "first 1,000 of 300,000". The review's 300,000 pages made 600,050 elements, about 2 s a
      scroll frame, and pages past the clamp unreachable; now 2,049
      elements, 7 ms a frame, the column 838,215 px tall at fit width.
    - `maxImageSize` is 4096 × 4096 (64 MiB decoded), down from 8192², which
      bounds each image, not a page: the review's twelve 8192² images (peak
      3.4 GB) are now left out (peak 186 MB in the frame's process); twelve
      at the new cap still peak at 1.8 GB there. A 400-dpi full-page scan
      fits; a 600-dpi one is not drawn.
    - Far pages give back their canvas, what PDF.js kept to draw them
      (`page.cleanup()`), and their text layer unless the selection reaches
      it. Scrolling through 200 pages of 1,500 runs each ended with 11,000
      text spans and 1.1 GB in the frame's process, against 341,000 spans
      and 3.0 GB without.
    Still unbounded, as known limits: memory within each page's 15 s, which
    adds up over the pages of one paper (four pages of nested forms reached
    4.8 GB in the frame's process in the review, above); the sum of many
    images on one page; PDF.js's own work on a file within
    the 32 MiB cap while it opens (300,000 pages open in about 1 s).
  - **`PLUGIN_CSP` is unchanged.** Part 2 expected it to gain
    `worker-src 'self'`; with no `worker-src`, Chromium takes a worker's
    source from `script-src 'self'`, so the worker loads from the site's own
    origin as it is. The end-to-end suite pins that the worker runs under
    `PLUGIN_CSP` as served (its WebAssembly is refused and the violation
    carries exactly that policy); that a `worker-src 'none'` stops the worker
    was tried by hand on 2026-11-23, not by a committed test. Nothing changes
    for the Code view's page either: it could already start a same-origin
    worker, and still can. No `'wasm-unsafe-eval'`, `blob:`, or font source
    was needed.
  - `isEvalSupported` no longer exists in PDF.js 6, which evaluates no code
    (`vendor.test.ts` checks both files for `eval(` and `new Function`). The
    options the page sets, each pinned by `site.test.ts` and checked by
    `vendor.test.ts` to be read by this PDF.js's `getDocument` from its
    argument: `enableXfa: false`, `useWasm: false` (PostScript functions run
    as JavaScript, not compiled wasm), `disableFontFace: true` (glyphs drawn
    as paths, so no font from the PDF reaches Chromium's font engine; the
    policy would not stop a FontFace made from bytes, so the end-to-end suite
    checks the frame's `document.fonts` stays empty), `useSystemFonts: false`,
    `isImageDecoderSupported: false` (JPEG bytes from the PDF are decoded by
    PDF.js's own code, not Chromium's ImageDecoder; a 12-megapixel JPEG page
    takes about 560 ms to appear instead of 150 ms), `useWorkerFetch: false`,
    `disableWorkerRendering: true` (`pdf.renderer.min.mjs` is not vendored),
    `maxImageSize` 4096², and `verbosity: 1`. Pixels PDF.js has decoded
    still reach Chromium when it scales a very large image down (a BMP it
    writes itself). No URL is given for character maps, standard fonts, ICC
    profiles, or wasm, none of which is vendored: JPX, JBIG2, and CCITTFax
    images (decoded with the package's `wasm/` files), ICC colour, and CJK
    text in fonts the PDF does not embed do not render as in a full reader. A
    line in a non-embedded Helvetica, a JPEG, and a raw RGB picture do draw,
    under the unchanged policy (an e2e test reads the canvas's pixels);
    pdfTeX output embeds its fonts.
  - Nothing the PDF carries is run or followed: no annotation layer (links
    are inert; the e2e clicks one and sees no navigation or dialog), no
    attachments, no scripting sandbox, no XFA; the text layer is PDF.js's own
    `TextLayer` (text nodes, positioned through CSSOM), without marked-content
    ids. Its style rules, which are in `web/pdf_viewer.css` and not vendored,
    are written into the site's `style.css` after that file.
  - Every state has a screen with "Try again": the paper; not built yet
    (Part 2's sentence, with `paper/main.tex` selectable); no `paper/`
    folder; neither `main.pdf` nor `main.tex`; not a PDF ("it is not a valid
    PDF file", or PDF.js's message); password-protected; no pages; larger than
    32 MiB (413); busy (503); the app unreachable; PDF.js not starting; PDF.js
    not opening the file within 20 s. A page stopped for its budget, or one
    that could not be drawn, says so on its sheet while the others show.
  - The label is `paper/main.pdf p. 2 · Setup`, or `pp. 2–3` across pages:
    the pages whose text the quote holds (a selection that starts at the very
    end of page 1's text names page 2 only), and the last outline entry at or
    above where that text starts (by page and by the destination's top). The
    paper's outline titles carry no section numbers, so there is no "§2". A
    title's invisible characters (the host's class: controls, format and
    default-ignorable characters, the Braille blank) show as markers, its
    blank runs collapse to one space as the host collapses a label's, and the
    title, not the page, is what is cut to keep the label within 200
    characters. The quote is the selected text trimmed, cut on the page to
    2,000 characters ending `…[cut]` (the host's own mark). Shared with the
    Code view through [frontend/plugins/site-kit.ts](frontend/plugins/site-kit.ts),
    which replaces its `dom.ts`; each site's bundle includes it.
  - **What a selection quotes is the PDF's text layer, which can differ from
    what is drawn.** PDF.js's text layer holds every text run on the page,
    whether the canvas shows it or not: text in the invisible render mode,
    white on white, a fifth of a point tall, clipped away, or under a white
    box is selected along with what is around it, and a font's `/ToUnicode`
    map can make glyphs drawn as "ABC" extract as a whole sentence, which
    nothing in the text layer can tell apart. So the Paper view does not
    guess at hidden text: the workspace shows the start and the size of the
    quote in the ask bar before asking, and after asking the composer shows
    exactly what will be sent, with no click. The human should read it before
    pressing Send (the end-to-end suite's `hiddenPdf` checks both).
  - Against the mockup: the pages scroll continuously, one sheet under
    another, so that only pages near the view are drawn (far canvases are
    released, each canvas at most 4096 × 4096 pixels, at most 1,000 pages);
    previous and next scroll to a page, and the label names the page a
    quarter down the view.
    100% is the mockup's 640px-wide sheet; the steps are the mockup's 80% to
    150% and then 200%, 250%, 300% for reading a figure; Fit width is the
    mockup's (80% to 150%). The note reads "paper/main.pdf · 4 pages · select
    text to ask the agent about it", followed by **Reload**. Selection is of
    text, not of a paragraph; next and previous clear it as in the mockup,
    and zoom keeps it. The place is kept across zoom, a resize, Reload, and
    another tab.
  - A layout saved on the trunk's old tab `paper` opens `paper-view/paper`;
    the Plugins page lists the Paper view as enabled. In a browser the tab
    says the view opens in the desktop app (no frame URL there).
- **S6a-2** is the bundled plugin [frontend/plugins/code-view/](frontend/plugins/code-view/)
  (manifest as Part 2's, `reads: ["projects-folder/*/Code"]`, handler `git`), the
  workspace's Code tab, and the host side of the selection message. Where the code
  differs from Parts 1 and 2:
  - The mount: `BUNDLED_HANDLERS["code-view/git"]` is `codeGitApi`; the dev server
    passes `DESKTOP_ONLY_HANDLERS` (`code-view/git`) as `skip`, so it never answers
    `/api/code-view/git` (`devServer.test.ts`); the client skips none and replaces
    the factory with `desktopHandlers` ([client/src/main/codeView.ts](client/src/main/codeView.ts)):
    the git it runs is found in the children's environment (the login shell's
    PATH laid over the inherited one), by the handler's own rules, never the
    Command Line Tools stub at `/usr/bin/git` (which opens an install dialog when
    run); none found is looked for again after 5 s. What Git prints on a failure
    goes to the client's `main.log`. `codeGitHandler` takes `null` for "no git".
  - The page is static files in the plugin's `site/` (A4): `main.ts` and its
    modules are type-checked by the frontend's `tsc`, unit-tested by its
    `npm test` (`plugins/**/*.test.ts`), and bundled by `client/scripts/build.mjs`
    into `out/plugins/code-view/site/main.js`; no TypeScript ships. It uses the
    real API (full hashes, `{repo: null, problem?}`, `openable`, `sizes`, `stat`,
    `truncated`, `more`), shows every answer state in plain words, and caps what
    it reads and shows (2 MiB and 5,000 lines of a file, 5,000 rows of a diff).
  - `os.select` replaces A6's `os.ask`, as Part 2 says: `{type: "os.select",
    label: string, quote?: string}` or `{label: null}`, accepted only from the
    active view's frame at its own origin, while the workspace is the screen
    shown and that view's tab is selected, not while the Ask button is held
    down, and at most 10 a second per frame (past that the bar is hidden, never
    left stale). Since step 2.3's review, the last valid message the active
    view posts while the workspace is hidden is not lost: it is kept and
    applied, through the same checks, when the workspace shows again
    (`heldWhileHidden`; see 2.3's "Selection and Reload"). The rule is that what Send passes is exactly what the user can
    read in the composer ([frontend/src/plugins/select.ts](frontend/src/plugins/select.ts)):
    the host never rewrites a label: it shows and sends it exactly as the page
    posted it, or ignores the message. A label must be 1 to 200 characters, not
    blank, with no tab, no space character other than U+0020 (U+00A0, U+2000 to
    U+200A, U+3000 and the rest of `\p{Zs}`), no line break (CR, LF, VT, FF, NEL, U+2028, U+2029) and no
    invisible character (`\p{Cc}`, `\p{Cf}`, `\p{Default_Ignorable_Code_Point}`
    and U+2800: zero-width characters, U+2060, U+FEFF, the soft hyphen, bidi
    controls, U+FFF9-FFFB, tag characters, variation selectors, Hangul fillers,
    the combining grapheme joiner, the Braille blank), or the message is
    ignored; homoglyphs are allowed, since a real file can be named so. Runs of
    ASCII spaces pass unchanged (`Code/a  b.md` and `Code/a b.md` are two
    files), so blank padding with them is the page's business; the Code view
    marks the refused characters in a name as `⟨U+XXXX⟩`, so such a file
    still gets a label. A quote
    of at most 2,000 characters keeps its spaces, has every line break made LF,
    so every line gets its `> `, and every such invisible character but tab
    shown as a marker (`⟨U+200B⟩`), except U+FE0F right after an emoji
    (`\p{Extended_Pictographic}`), which is ordinary emoji presentation; this
    holds in the text shown and sent alike, and if the markers take it past
    2,000 characters it is cut there with `…[cut]`. The page applies the same
    markers to names in its labels.
    Added: the host answers `{type: "os.select.clear"}`, posted to the page's
    origin only, when the user clears the selection or asks about it in the host,
    so the page drops its highlight. "Ask the agent about this" adds a reference
    chip (at most 8) to the project's composer and never sends; Send puts each
    chip before the typed text as `About <label>` and the quote as a blockquote.
    What the user is about to send is on screen as text, since a view can
    quote what it did not show (a PDF's hidden text run): before asking, the
    ask bar shows the start of the quote (up to 160 characters, line breaks as
    `↵`) and its size, in every view. Whether a chip opens by itself depends
    on the view (the Human Owner's decision, 2026-11-23): the host keeps
    `QUOTES_AS_DRAWN` in [frontend/src/plugins/select.ts](frontend/src/plugins/select.ts),
    the bundled views whose quote is exactly the text they draw (today only the
    Code view, which quotes the characters it draws with invisible ones
    marked). `readSelect` marks a reference from such a view by the plugin of
    the frame the message came from; the message has no field for it, so no
    page can ask for it. A chip from a listed view is added closed, as in
    mockup C: its label, "· N lines", and the hint "click a reference to see
    exactly what is sent". A chip from any other view (the Paper view, whose
    PDF text layer can differ from what is drawn, or any third-party view)
    opens its "Sent before your message, exactly:" text under the chips at
    once (the newest opens, the one before closes); a closed chip added later
    leaves the open one as it was. An open text scrolls when long, with a line
    under it giving its size and saying it scrolls whenever it is taller than
    its box. Clicking a chip (or Enter or Space on it) opens or closes it; a
    chip with a quote says how many lines it carries, and the tooltip shows
    the text too. Ask adds the reference the bar showed
    when the pointer went down on it. The host cannot reach
    `/api/code-view/git`, so the mockup's header pill (latest commit) is not shown.
  - `viewSrc(page, project)` appends `?project=<encoded name>`; the tab row takes
    project views from the registry, and a layout saved with tab `code` opens
    `code-view/code`. A view's frame stays loaded once opened.
  - The client cancels `will-download` on every session it creates, so a frame
    sent to a file it cannot show starts no download.
  - `PLUGIN_CSP` (a site in its plugin folder, the Code view's) has no
    `'unsafe-inline'`: `script-src 'self'; style-src 'self'`. Paper Wiki's
    generated viewer keeps `WORKSPACE_CSP`, which needs inline script.
  - Myers is pinned by `--diff-algorithm=myers` on every `log` and `show`
    (`HISTORY`), beside `-c diff.algorithm=myers`. The `-c` setting alone did
    not hold: a `diff.<driver>.algorithm=patience`, picked by an attribute in
    `info/attributes`, beats it, while the command-line option beats both. Under
    patience two files just under 4 MiB of one-byte lines need 320 MiB in one
    allocation, over `GIT_ALLOC_LIMIT=256m`, and every route answered 500; under
    myers they need about 96 MiB (measured by bisecting the limit), so the limit
    stays.
- **S6a-1** is [frontend/server/codeGit.ts](frontend/server/codeGit.ts) with
  `codeGit.test.ts` in the required CI job. S6a-2 declares and mounts it. The code is the
  authority where it differs from Part 2's Gap 1, after the S5 review and an
  independent review of S6a-1 itself:
  - Answers: every route answers `{ repo: null }`, or `{ repo: null, problem }`
    when git is missing, too old, or the repository is refused, with status 200.
    Otherwise each answer carries `repo` ("project" or "workspace"), `root` (the
    repository's top, relative to the workspace) and `filter` (the path filter,
    relative to `root`: `.` or `projects-folder/<name>`), so the view can name the
    command it reflects; file paths are always relative to the project, and
    `short` is a hash's first 7 digits whatever `core.abbrev` says. `/` gives `head`
    (merges left out, as in `/log`). `/log` gives commits with `files`, `added`,
    `deleted` under the filter. `/commit` gives `files` (each with `status`, null
    counts for a binary file, the blobs' `sizes` for a binary file from
    `cat-file --batch-check`, and `openable`), plus `stat`, the exact totals even
    when the list is cut. `/diff` gives the patch.
  - Status codes: 400 for a bad query, including a `hash` that is not a full 40- or
    64-digit object id (a short one could name a ref first). 404 for an unknown
    project or one named in another case than its folder, an unknown commit, a
    commit outside HEAD's history or changing nothing under the filter, or a path
    that is not exactly one file the commit changes. 405 for anything but GET. 500
    when a git step fails, with a fixed text naming the step (`git log failed (exit
    128)`, `… took longer than 10 s`, `… printed more than its cap`), or
    `the Code view could not read this repository (<error code>)` when the file
    system refuses: nothing Git printed reaches the caller, it goes to the server's
    log. 503 while the workspace has 20 requests in flight or the project 8. A
    `hash` is looked up with `cat-file --batch-check`, which reads only the
    object's header, so a tag object's hash is 404 like any non-commit; a
    repository Git cannot read at all (a bad `include.path`) is the fixed 500,
    not a missing commit.
  - Git 2.45 or later, for `--no-lazy-fetch` (release notes 2.45.0), not 2.31. On
    2026-11-22 packages.ubuntu.com listed 2.43.0 for Ubuntu 24.04 and 2.34.1 for
    22.04, and packages.debian.org 2.39.5 for Debian 12, all below it;
    packages.debian.org listed 2.47.3 for Debian 13 and packages.fedoraproject.org
    2.56.1 for Fedora 43 to 45. Known limit, with its reversal path: Git 2.41 to
    2.44 could be served by refusing a repository whose config (asked through Git
    under the same guards) has `extensions.partialclone` or `remote.*.promisor`,
    with `protocol.allow=never` beneath. It is not done because it is a second code
    path that would need its own CI job on stock Ubuntu 24.04 Git.
    Compared on 2026-11-22, at the Human Owner's suggestion, with
    [OpenResearch](https://github.com/alphaXiv/OpenResearch) at `b742758`: it runs
    the user's installed `git` by bare name with no minimum version, reaches
    GitHub through the user's `gh`, and adds guards on clone, the first commit and
    push only; its reads trust the repository. The agent's reading is that this
    shows the installed Git is the right dependency, which the Code view already
    uses, and says nothing for running the handler's reads with fewer guards.
    The Human Owner has not yet chosen between keeping the 2.45 floor and the
    2.41 to 2.44 path ([HANDOFF.md](../HANDOFF.md) Decisions).
  - Which git runs: an absolute path given to `codeGitHandler(ctx, git)`, or a bare
    name looked up in the absolute entries of the runner's PATH only
    (`RunOptions.lookup`), never the working folder (spawn tries it on Windows
    before PATH, and on POSIX through an empty or relative entry); on Windows only
    `git.com` or `git.exe`. Never a program whose real path lies in the workspace
    either (`RunOptions.lookupOutside`): a PATH entry there, such as the
    `<workspace>/node_modules/.bin` that `npm run` puts first, is skipped, so is a
    link elsewhere that points in, and an absolute `git` there is refused. Anything
    else is "git was not found". The probe accepts only output starting
    `git version `, so no other program passes the floor.
  - More guards than `--no-ext-diff` and `--no-textconv`: no `GIT_*` from the
    caller, the global and system config not read (`trace2.*Target` there writes
    files), no grafts (`GIT_GRAFT_FILE=/dev/null`), `--no-lazy-fetch` with
    `protocol.allow=never` beneath it (which stops the transport only: a fetch that
    starts still writes `remote.<name>.partialclonefilter` into `.git/config`, so
    `--no-lazy-fetch` is what keeps `.git` unchanged), `--no-replace-objects`,
    `--literal-pathspecs`, `core.fsmonitor=false`, `--no-show-signature`,
    `--submodule=short`, `--no-follow`, `core.bigFileThreshold=4m`,
    `core.warnAmbiguousRefs=false` (for a full hash Git otherwise looks for a ref of
    that name, opening `.git/<hash>`: a FIFO there stalled every route),
    `GIT_ALLOC_LIMIT=256m` (below), and flags that
    keep the output's shape (`--root`, `--no-renames`, `--diff-merges=first-parent`,
    `--encoding=UTF-8`, `--no-color`, prefixes, `core.quotePath=false`). The literal
    `/dev/null` is used on every platform, as Git documents it for
    `GIT_CONFIG_GLOBAL`. That Git for Windows maps that literal in `compat/mingw.c`
    is the reviewer's reading of its source, not run on Windows here. Where it is
    not mapped it names a missing file, as neutral for `GIT_CONFIG_GLOBAL`,
    `GIT_GRAFT_FILE` and `core.attributesFile`, while `-O/dev/null` would fail every
    diff, which the `diff.orderFile` test shows. The table at the end of the file
    accounts for every `git help config`
    key that names a program. An explicit `--git-dir` skips Git's `safe.directory`
    check (tried with `GIT_TEST_ASSUME_DIFFERENT_OWNER=1`), so these guards are the
    only ones.
  - Not read: any `.gitattributes`, the working tree's or a committed one
    (`--attr-source=<the empty tree>`: a committed 90 MB one that compressed to
    almost nothing took 1.1 GB and 3 s per command when read from the commit), so a
    file is binary by its content, its size over 4 MiB, or `info/attributes`; the
    working tree's `.mailmap` (`--no-use-mailmap`) and `.gitmodules`
    (`--ignore-submodules=none`; its `ignore = all` would hide gitlink changes); and
    files the config names: `diff.orderFile` (`-O/dev/null`; a missing one failed
    every diff), `core.attributesFile` (`/dev/null`), `mailmap.file`,
    `info/grafts`. Read still: `include.path` and `includeIf` name another file,
    from anywhere and unchecked (not its type, size or links, so the 1 MiB config
    cap and the FIFO checks do not apply to it), read as config under the same
    guards; whether it parses shows (every command fails), what it sets shapes the
    output (an outside include changed `diff.context`), and a FIFO or a huge file
    there stalls or loads until the 10 s limit.
  - Refused with a `problem`, never falling back to the workspace's repository: a
    `.git` that is a link or a gitfile (a linked worktree, as an agent's worktree
    is, or a submodule checkout); a link directly inside `.git`; a `commondir` or
    `objects/info/alternates`; `HEAD`, `config`, `config.worktree`, `packed-refs`
    or `shallow` that is not a plain file (a link, FIFO or device) or is over its
    cap (4 KiB, 1 MiB, 1 MiB, 64 MiB, 16 MiB); anything in `info/` that is not a
    plain file under 16 MiB, and `info/attributes` over 1 MiB (Git parses it whole:
    16 MiB of short lines took 204 MB, 1 MiB takes 22 MB); anything under `refs/`
    or `reftable/` but folders and
    plain files (a loose ref under 4 KiB); a link or other non-plain file among
    `objects/<xx>/`, `objects/pack/` (and its `multi-pack-index.d/`) or
    `objects/info/` (and `commit-graphs/`); more than 100,000 entries to check, read
    entry by entry so a huge folder costs at most that. The walk is synchronous and
    runs once per admitted request: about 15 ms on this repository's own `.git`,
    90 to 150 ms at the 100,000-entry budget, so the 20 requests a workspace admits
    at once can hold the server for about 3 s at worst; there is no cache. Not
    looked at, because these commands do not read them (a FIFO at each was swept on
    2.55 by the reviewer): the index, `logs/`, `hooks/`, `modules/`, `worktrees/`,
    `ORIG_HEAD`, `FETCH_HEAD`, `MERGE_HEAD`, `description`, and `.git/<hash>`, which
    `core.warnAmbiguousRefs=false` keeps Git from opening; a socket such as
    `fsmonitor--daemon.ipc` is fine. The check runs before git, so a file swapped in
    between is not caught.
  - Bounded work, per handler, that is per open workspace: at most 20 requests in
    flight and 5 git processes running, each project at most 8 and 2 of them, so
    two projects whose commands stall still leave a third 4 requests and 1
    process (S6a-2's review; it was 10 of 20 and 2 of 4, and two stalled
    projects shut a third out for about 50 s); a request
    past either share is 503 before its `.git` is walked. Each command has 10 s,
    output caps (4 KiB for one line, 256 KiB for `/log`, 512 KiB for a file list,
    64 KiB for a message, 1 MiB for a patch, each cut back to whole records), and
    16 KiB of stderr kept. A blob over 4 MiB is binary: such a text file shows as
    binary with its sizes, and Git reads only its header. Measured with `/usr/bin/time
    -l` on the reviewer's two 500 MB text blobs, `log --shortstat` went from 3.37 GB
    in 2.9 s to 9.4 MB in 15 ms. Commit and tree objects are read whole whatever the
    threshold says, so `GIT_ALLOC_LIMIT=256m` makes Git die rather than make one heap
    allocation above 256 MiB (Git's `wrapper.c` checks it in `xmalloc`, `xrealloc`
    and `xcalloc`, which xdiff uses too; it is undocumented, and `mmap` is not
    covered). A 400 MB commit message took 392 MB in `log -1` and 773 MB in
    `show -s`, and now stops at 9 MB with the fixed failure text. 256 MiB is about
    twice the largest ordinary single allocation under the threshold, xdiff's array
    for two 4 MiB files of one-byte lines (about 134 MB); this repository's history
    as a project (all `/log` pages, 150 `/commit`, 834 `/diff`), a commit changing a
    300 MB binary and a 3.9 MiB text file, and a commit touching 50,000 files all
    answered 200 under it. (The figures come from running the handler's own
    arguments under `time -l`; a sampler around the handler saw no git process live
    long enough to measure.) Not bounded: the sum of many allocations each under
    256 MiB, and time (the 50,000-file commit took 6.6 s in `/log` and 8.8 s in
    `/commit`, near the 10 s limit); mapped files (packs, the commit-graph); packed
    objects, which are not checked one by one; loose objects, checked by type and not
    by size; and whatever an `include.path` file holds.
  - `/commit` and `/diff` serve only commits in HEAD's history (`merge-base
    --is-ancestor`); `/commit` of a commit that changes nothing under the filter is
    404, so other workspace commits' messages stay out. `/diff` opens exactly one
    file the commit changes, never a folder; a path with a segment starting with
    "." is 400, and `/commit` lists such files with their counts and
    `openable: false`. `/log` answers `more: false` once the next `skip` would pass
    10,000, so the list ends at about 10,050 commits.
  - `processRunner` decodes output once (a split character survives) and gains
    `maxOutputBytes` (stdout, `truncated`), `maxErrorBytes` (stderr past it is
    dropped, the child runs on), `timedOut`, and `lookup`. `createRegistry` takes
    `skip`: declared handler keys that need no factory and are not mounted; a
    factory for a skipped key is no orphan, and a skipped key no bundled manifest
    declares throws.
  - Each guard has a test that fails without it (checked by removing each in turn),
    except `--work-tree`, `--no-optional-locks`, `--no-ext-diff`,
    `GIT_CONFIG_NOSYSTEM`, the 16 KiB stderr cap, and `core.fsmonitor=false` (which
    `--ignore-submodules=none` makes a second layer: removing both starts the
    monitor), which no output of these commands can show; tests of the arguments
    and the environment pin them. The tests whose marker programs are shell scripts
    or that need FIFOs skip on Windows. A Windows-only test plants a copy of
    `where.exe` as `git.exe` in the workspace and in the project and checks that `/`
    and `/log` answer from the real git; a probe that ran the copy would get no
    `git version` line and answer that problem instead.
  - `codeGitHandler(ctx, git, log)`: the client passes the git it found (see
    S6a-2 above) and its own log.
- **Waiting on the Human Owner:** whether a third-party plugin may add a
  left-navigation item (Part 1, Q-PO1).

---

# Part 1. Registry and manifest


The design keeps the five decided contribution kinds and closes two gaps the decided rows leave open:
- **Left-menu pages.** A home panel gets a `placement: "home" | "nav"` field, so Paper Wiki can have its own left-menu item without a sixth kind.
- **Code and Paper views.** They are framed pages on their own `app://<id>` origin, reading files through a new path-checked channel.

Steps S1 to S5 of the change sequence can land before the layout is chosen; S6 to S8 must wait for mockups. One question needs the product owner (Q-PO1). Nothing was written or run: this is a read-only design.

All paths are relative to the repository root.

## 1. Findings

**The window list.** `APPS` (`os-ui/frontend/src/desktop/apps.tsx:78-138`) holds six apps. Each has an id, title, icon, default size, `fill` and `render(state)`. The `LIVE`/`DESKTOP` filter is at :136-138. Every consumer is in the dock shell:
- `Desktop.tsx:19-27` reads the size.
- `:59` opens `dash` at start.
- `:72-74` maps the Help-menu `open-system` command to `system`.
- `:158-181` renders the windows and the Dock.
- `Dock.tsx:2-10` and `:79-81` use `data-dock-app` and title-as-aria-label.
- The e2e tests click by those titles: `os-ui/client/e2e/app.test.ts:182` "System", `:189` "Root Agent", `:220` "Paper Wiki".
- `frontend/README.md:45,112` documents the list.

**The mount list exists twice.**
- `createMounts` (`os-ui/frontend/server/api.ts:15-22`) is used only by the client (`os-ui/client/src/main/index.ts:158`).
- The dev server never calls it. Four Vite plugins repeat the prefix and token: `skill-toggle-plugin.ts:20`, `paper-status-plugin.ts:17`, `paper-sources-plugin.ts:19-20`, `chat-plugin.ts:36-37`. They are registered at `vite.config.ts:15`.
- Tests pin both: `api.test.ts:12-22` (order and flags) and `devServer.test.ts:44-67` (real Vite).

**Paper Wiki is also compiled in at six more places:**
- `protocol.ts:17-21`: host and status prefix.
- `protocol.ts:31`: `frame-src`.
- `protocol.ts:126-134`: wiki routing, which reserves `api/`.
- `protocol.ts:219-224`: `splitMounts`.
- `index.ts:302-305`: subframe navigation.
- `PaperWikiPage.tsx:15`: the frame src.

The dev server and Pages also get a cache copy (`start.sh:28-33`, `pages.yml:49-50`). The registry must own all of these.

**The security model to preserve.** The registry supplies data; the adapters keep their rules.
- **Token.** Created per launch at `index.ts:44`. Reaches only the top frame (`index.ts:333`, `preload/index.ts:21-24`). On the dev server it comes from `chat-plugin.ts:14`. It gates `/api/chat` and `/api/paper-sources` only.
- **The two adapters order checks differently, on purpose.** The dev server checks the token before routing and has no 415. The client returns 404, then 415, then 401 (`protocol.ts:241-247`).
- **Each origin reaches only its own mounts.** Covered by `protocol.test.ts:202-207` and e2e `:218-251`. The scheme is not CORS-enabled (`index.ts:55`).
- **CSP.** `frame-src` names only the wiki (`protocol.ts:31`). `WIKI_CSP` goes on every wiki response (`:131-133`).
- **Paths.** `safeRelative` is at `:94-105`. Workspace files are confined by real path, renderer files lexically (`:162-176`, tests `:153-174`).
- **Electron guards in `index.ts`.** The navigation guard is at `:302-359`, `window.open` is denied, IPC answers the top frame only (`:379-382`), and permissions are at `:430-433`.

**Two gaps in the decided rows:**
- **(a) Left-menu pages.** The Layout row puts Paper wiki (and later Skills) in the left menu, but none of the five kinds is a menu page. I read "home panel" as a page that belongs to the workspace rather than to one project, with `placement: "home" | "nav"`. `"nav"` is for bundled plugins only until Q-PO1 is answered. No sixth kind.
- **(b) Framed views.** Rows 558 and 561 mean the Code and Paper views are framed pages on their own origin, so they need a file channel in step 1 (§3).

**CI.** The required `ci.yml` runs only `os-ui/frontend` `npm test` (`server/**/*.test.ts`) and `npm run build`. All client tests and the e2e suite run in the advisory `desktop.yml`.

## 2. Manifest

- **File.** One `plugin.json` per plugin. JSON is row 557's "one structured file".
- **Location.** Bundled plugins live in `os-ui/frontend/plugins/<id>/`. That package is the one the dev server and the client already build from, so plugin tests run in the required job and `tsc` checks them with no new package. Step 3's split moves them with the app.
- **Version.** The host's contract version is `CONTRACT` in `server/manifest.ts`. Each manifest declares a caret range.

```ts
// os-ui/frontend/server/manifest.ts — pure, no Node imports (the renderer imports it too)
export const CONTRACT = { major: 1, minor: 0 } as const;
/** Set by the loader from where the folder came from; never read from the manifest. */
export type PluginSource = "bundled" | "local";       // "local" loads from step 2; validated from day one
export interface PluginManifest {
  contract: string;              // "^1.0": this major, at least this minor
  id: string;                    // /^[a-z][a-z0-9-]{1,30}[a-z0-9]$/, not "research-os"; host of app://<id>; permanent
  name: string;                  // 1–40 chars (Plugins page)
  version: string;               // free text
  description?: string;          // ≤ 200 chars
  site?: { workspace: string };  // bundled only: serve app://<id>/ from this workspace folder, not <dir>/site/
  reads?: string[];              // workspace roots readable via app://<id>/_os/; "*" = exactly one segment
  contributes: {
    homePanels?: HomePanel[];
    projectViews?: Page[];
    handlers?: string[];         // bundled only: mounted at /api/<id>/<handler>, on app://<id> only
  };
}
export interface Page { id: string; title: string; entry: string }   // id /^[a-z][a-z0-9-]*$/, unique per plugin
export interface HomePanel extends Page { placement?: "home" | "nav" } // "nav": bundled only in 1.0
export type Parsed = { ok: true; manifest: PluginManifest } | { ok: false; problems: string[] };
export function parseManifest(raw: unknown, source: PluginSource): Parsed;
export function contractAccepts(range: string, host?: typeof CONTRACT): boolean;
export function safeRelative(pathname: string): string | null; // moved from protocol.ts, re-exported there
export function matchRoot(rel: string, roots: readonly string[]): string | null; // concrete matched root or null
```

**Parse rules:**
- Unknown keys are refused at any level, with the key and the host contract named in the message.
- The range must be `^M.m`, with the same major as the host and a minor no higher than the host's.
- `site`, `handlers` and `placement: "nav"` are refused unless the source is `bundled`.
- Every path must pass `safeRelative`, be non-empty, and contain no segment starting with `.`.
- `entry` may not start with `api/` or `_os/`.

**Deferred.** `skills` and `agents` come later as compatible 1.x minors. `paper-wiki-manager` stays in the hub, because `ci.yml` and `desktop.yml` reference its path.

```jsonc
// os-ui/frontend/plugins/paper-wiki/plugin.json   (S2)
{ "contract": "^1.0", "id": "paper-wiki", "name": "Paper Wiki", "version": "1.0.0",
  "description": "The paper-wiki/ graph viewer and its reading-status buttons.",
  "site": { "workspace": "paper-wiki" },
  "contributes": { "homePanels": [{ "id": "viewer", "title": "Paper Wiki", "entry": "viz.html", "placement": "nav" }],
                   "handlers": ["status"] } }      // → /api/paper-wiki/status: today's prefix, which viz.html fetches
// os-ui/frontend/plugins/code-view/plugin.json    (S6)
{ "contract": "^1.0", "id": "code-view", "name": "Code view", "version": "0.1.0",
  "description": "A project's code files, read-only.", "reads": ["projects-folder/*/Code"],
  "contributes": { "projectViews": [{ "id": "code", "title": "Code", "entry": "index.html" }] } }
// os-ui/frontend/plugins/paper-view/plugin.json   (S6)
{ "contract": "^1.0", "id": "paper-view", "name": "Paper view", "version": "0.1.0",
  "description": "A project's paper: main.pdf and its LaTeX sources, read-only.", "reads": ["projects-folder/*/paper"],
  "contributes": { "projectViews": [{ "id": "paper", "title": "Paper", "entry": "index.html" }] } }
```

## 3. Registry

### Server side

```ts
// os-ui/frontend/plugins/bundled.ts — pure; the list order is the menu and project-tab order
export const BUNDLED_IDS = ["paper-wiki"] as const;  // S6 → ["paper-wiki", "code-view", "paper-view"]

// os-ui/frontend/server/pluginHandlers.ts — server only; the one way plugin code becomes a mount
export const BUNDLED_HANDLERS: Readonly<Record<string, HandlerFactory>> = { "paper-wiki/status": paperStatusApi };

// os-ui/frontend/server/api.ts — Mount and matchMount unchanged
export const TRUNK_MOUNTS: readonly TrunkMount[] = [
  { prefix: "/api/skill/toggle", factory: skillToggleApi, token: false },
  { prefix: "/api/paper-sources", factory: paperSourcesApi, token: true },
  { prefix: "/api/chat", factory: chatApi, token: true },
];

// os-ui/frontend/server/registry.ts
export type HandlerFactory = (ctx: ApiContext) => ApiHandler;
export interface TrunkMount { prefix: string; factory: HandlerFactory; token: boolean }
export interface LoadedPlugin { manifest: PluginManifest; source: PluginSource; dir: string }
/** <root>/<id>/plugin.json per id, in order. Reported and skipped, never thrown: a manifest that fails
 *  to parse, a repeated id, a local plugin taking a bundled id, or /api/<id> overlapping a trunk prefix. */
export function loadPlugins(root: string, ids: readonly string[], source: PluginSource,
  taken: { trunk: readonly TrunkMount[]; plugins: readonly LoadedPlugin[] }): { plugins: LoadedPlugin[]; problems: string[] };
export interface Registry {
  plugins: readonly LoadedPlugin[];
  app: readonly Mount[];                            // app://research-os: trunk only
  byPlugin: ReadonlyMap<string, readonly Mount[]>;  // app://<id>: its handlers only, always token: false
  all: readonly Mount[];                            // dev server's single origin: trunk, then plugins
}
/** Per open workspace. Mounts handlers only for source "bundled". Throws only on factory drift
 *  (declared handler without factory, factory nobody declares): a bundling bug the tests catch. */
export function createRegistry(input: { ctx: ApiContext; trunk: readonly TrunkMount[];
  plugins: readonly LoadedPlugin[]; factories: Readonly<Record<string, HandlerFactory>> }): Registry;
```

**How "host-side handlers are bundled-only" is enforced.** Three independent locks:
1. `source` is an argument to the loader, never a manifest field.
2. The parser refuses `handlers` unless the source is bundled.
3. Handler code exists only in the compiled-in `BUNDLED_HANDLERS`. `createRegistry` mounts a factory only for a bundled plugin. No code path ever `import()`s from a folder.

Tests prove that a local plugin that declares a handler is reported as a problem and gets no mount.

**The token flag.** Trunk mounts keep `Mount.token` as it is. Plugin mounts are always `token: false`, with no manifest switch:
- The token never reaches a plugin frame, so a token-gated plugin handler could not be called from its own page.
- What protects a plugin handler is its own origin plus JSON-only writes.
- On the dev server it is exactly as exposed as today's status endpoint.
- A handler that runs an agent or touches keys belongs in the trunk.

A test asserts that every `byPlugin` mount has `token: false` and that none appears in `app`.

**Dev server.** A serve-only `api-plugin.ts` replaces the four plugin files:
- It mounts `all`, loading plugins from `<frontend>/plugins`.
- Token mounts call `hasToken` before routing.
- `TOKEN`, `hasToken` and the startup line move there.

### Client side

```ts
// os-ui/client/src/main/protocol.ts
export interface PluginSite { id: string; reads: readonly string[];
  files: { kind: "plugin"; dir: string } | { kind: "workspace"; rel: string } }  // lexical | real-path confined
export function pluginSites(plugins: readonly LoadedPlugin[]): ReadonlyMap<string, PluginSite>;
export function appCsp(hosts: readonly string[]): string;   // frame-src app://<id> per host
export function allowedNavigation(url: string, isMainFrame: boolean, hosts: readonly string[]): boolean; // from index.ts
export type Route =
  | { kind: "api"; pathname: string; host: string }        // "research-os" → registry.app, else byPlugin.get(host)
  | { kind: "file"; root: string; rel: string; fallback: string | null; csp: string | null; confined: boolean }
  | { kind: "read"; site: PluginSite; rel: string; list: boolean }
  | { kind: "not-found" };
export function route(url: string, roots: { renderer: string; workspace: string | null },
  sites: ReadonlyMap<string, PluginSite>): Route;
export function createHandler(state: () => { renderer: string; workspace: string | null;
  sites: ReadonlyMap<string, PluginSite>; registry: Registry | null; token: string; csp: string }): (r: Request) => Promise<Response>;
```

**CSP.** The host picks the profile; a manifest never supplies one:
- `WIKI_CSP`, unchanged, for workspace sites.
- `PLUGIN_CSP` for plugin-folder sites: `WIKI_CSP` plus `'self'` in `script-src` and `style-src`.
- `READ_CSP` (`sandbox; default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'`) on channel responses.

`appCsp(["paper-wiki"])` is byte-identical to today's `CSP`, and a test pins the literal.

**The read channel.** `app://<id>/_os/files/<rel>` returns bytes; `app://<id>/_os/list/<rel>` returns `{entries: {name, dir, size}[]}`. Rules:
- GET and HEAD only; otherwise 405. 404 when no workspace is open.
- The path is decoded once with `safeRelative`. Any segment starting with `.` is refused: `.env`, `.git`, `.venv`.
- `matchRoot` must succeed, and the target's real path must lie inside the matched root's real path.
- Listings drop dot entries and anything that resolves outside the root.
- Responses carry `nosniff`, and `.js`/`.mjs`/`.cjs` are served as `text/plain`.
- Served on plugin origins only: not on the app origin, and not on the dev server in step 1 (A3).

### Frontend side

```ts
// os-ui/frontend/src/plugins/pages.ts — pure, node-testable (imports only ../../server/manifest.ts)
export type Slot = "nav" | "home" | "project";
export interface PluginInfo { id: string; name: string; version: string; description: string; source: PluginSource }
export interface PluginPage { key: string /* "<plugin>/<page>" */; plugin: string; slot: Slot; title: string;
  src: string | null /* null where this environment cannot serve it */; origin: string /* accepted message origin */ }
export function pluginPages(plugins: readonly PluginManifest[], env: { desktop: boolean; selfOrigin: string }): PluginPage[];
export function viewSrc(page: PluginPage, project: string): string | null;   // appends ?project=<folder name>
export interface AskMessage { type: "os.ask"; text: string }                  // contract 1.0's only page→host message
export function readAsk(event: { origin: string; data: unknown }, page: PluginPage): AskMessage | null;

// os-ui/frontend/src/plugins/registry.ts — Vite only
/** Step 1: import.meta.glob("../../plugins/*/plugin.json"), parsed, ordered by BUNDLED_IDS.
 *  Step 2: plus local plugins fetched from the main process; callers do not change. */
export function usePlugins(): { plugins: readonly PluginInfo[]; pages: readonly PluginPage[] };
```

**`src` per environment:**
- Desktop client: `app://<id>/<entry>`.
- Browser and Pages: `./<site.workspace>/<entry>` (the existing cache copy), or `null`, in which case the view says "open in the desktop app".

**Avoiding double duty.** The dock consumes the registry only through `PaperWikiPage`'s src. Its six apps do not map onto the new menu (Home is Dashboard plus Root Agent), so a dock adapter would be throwaway work. Trunk pages stay React and keep the `LIVE`/`DESKTOP` filter. `apps.tsx` goes away by deletion in S8.

## 4. Migration

| Today | Goes to |
|---|---|
| `dash` Dashboard | Trunk Home. The portfolio becomes the project cards; the Home mockup places Active Work, Activity and Governance. |
| `proj` Projects | Trunk Projects and the project workspace: the conversation on the left, `project`-slot tabs on the right. |
| `store` Skill Store | Trunk Skills page (`StorePage` unchanged) in step 1; the `skills-hub` plugin in step 2. |
| `paperwiki` | Plugin `paper-wiki`, panel `viewer`, placement `nav`. |
| `agent` Root Agent | Trunk Home, above the project cards. |
| `system` System | Trunk Settings; the `open-system` command opens it. |
| `/api/skill/toggle` (no token) | Trunk in step 1; a `skills-hub` handler `toggle` in step 2. |
| `/api/paper-wiki/status` (no token) | `paper-wiki` handler `status`, same prefix, on `app://paper-wiki` only. |
| `/api/paper-sources` (token) | Trunk (the conversation's Papers button). |
| `/api/chat` (token) | Trunk. |

## 5. Sequence

S1 to S5 can land before the layout is chosen. S6 to S8 must wait.

**S1. Manifest.** Adds `manifest.ts` and its test. Checked by required CI.

**S2. Server registry; dev server built from it.**
- Adds `paper-wiki/plugin.json`, `bundled.ts`, `registry.ts`, `pluginHandlers.ts` and `api-plugin.ts`, and deletes the four plugin files.
- `createMounts` stays unchanged for the client.
- Tests:
  - A new test shows `createRegistry(...).all` has exactly `createMounts`' prefixes and token flags.
  - `devServer.test.ts` and `api.test.ts` pass unchanged.
  - New registry and loader tests cover factory drift, local handlers getting no mount, trunk overlap being reported, and the real `plugins/` folder matching `BUNDLED_IDS`.
- Checked by required CI.

**S3. Client serves plugin origins.**
- Changes `protocol.ts` and `index.ts`.
- `build.mjs` copies every `plugins/*/` folder that has a `plugin.json` (manifest plus `site/`) into `out/plugins/`.
- Removes `createMounts`, `splitMounts` and `WIKI_*`.
- Test edits: `protocol.test.ts` keeps every assertion except `:68` and `:87` (`host`) and the `CSP` pin. `api.test.ts:12-22` is rewritten against the registry.
- The e2e suite is unchanged: endpoint refusals, isolation, Status buttons and the navigation guard, all through the dock.
- Advisory CI only: require a green `desktop.yml` run before merging.

**S4. Frontend registry.**
- Adds `pages.ts` (with tests; the `npm test` script gains `"src/**/*.test.ts"`) and `registry.ts`.
- `PaperWikiPage` takes its src from the registry.
- Proof: unit tests, the required build, and the advisory e2e check at `:222`.

**S5. Read channel.** Protocol tests on a fake site cover traversal, dot segments, `.env`, symlink and junction escapes, paths outside the roots, 405, listing filters and headers. Advisory CI.

**S6. Code and Paper view plugins** (waits for the view mockups).
- Adds both ids and updates the pinned CSP literal to three hosts.
- e2e: each frame loads on its own origin, reads a `nanochat_cpu` file, gets 404 for `.env`, and sees `typeof window.osDesktop === "undefined"`.

**S7. New layout** (waits for the layout mockup).
- `App.tsx` switches to it; `src/desktop/` is left unreferenced, so reverting is one line.
- The e2e suite is rewritten for the new menu with every security assertion carried over, and the README checklist is rewritten.

**S8. Remove the dock shell.** `pages.yml` then publishes only `viz.html`. This lands after the owner's checklist run.

## 6. Open questions

**The implementing agent decides (my recommendation in each):**
- **A1. When the contract freezes.** It may still change until step 2's folder loader lands, since no third-party plugin can exist before then. Freeze it in that commit.
- **A2. Unknown keys** are refused, not ignored.
- **A3. No read channel on the dev server in step 1.** It would expose project files to a tunnel without the token.
- **A4. Plugin sites** are static files, with `site/main.ts` bundled by esbuild in `build.mjs`.
- **A5. Code view scope.** It reads `projects-folder/*/Code` unless its mockup says otherwise; changing it is a one-line manifest edit.
- **A6. `os.ask`** only fills in the conversation input and never sends. At most 4,000 characters, and only from the active frame at its own origin.
- **A7.** `paperStatus.ts` stays in `server/` for step 1.
- **A8.** One plugin per view, and no `icon` field until the menu mockup needs one.
- **A9. How the Paper view shows `main.pdf` (verify in the client first).** As specified, `PLUGIN_CSP` inherits `frame-src 'none'` and no `object-src`, and `READ_CSP` sandboxes the PDF response. I recommend trying a narrow PDF path first: allow `frame-src 'self'` in `PLUGIN_CSP` and serve `.pdf` without `sandbox`. Check that Electron's built-in viewer renders it inside the sandboxed window before committing. If it does not, bundle a JS PDF renderer, which is a new dependency, and fetch the bytes over the channel. I did not verify Electron's PDF behaviour.

**The product owner decides:**
- **Q-PO1.** "Paper wiki has its own item in the left-hand menu. When you install a plugin someone else made, may it add its own menu item too, or only panels on Home and tabs inside a project?" Needed before step 2's folder loading.

## 7. Risks

1. **The plugin id is permanent.** It is the origin host and the handler namespace, so renaming a plugin breaks its URLs and its saved storage. Ids are validated strictly now and bundled ids are chosen once.
2. **`site.workspace` is an exception.** The Paper Wiki viewer's code is generated into workspace data, against "a plugin is code on the app side". It is bundled-only, so no third party depends on it. The way out: move `viz.js` and `viz.css` into the plugin and read the notes through the channel.
3. **Read access is coarse.** `*` gives a view every project, and the listing format becomes a third-party API in step 2. It is kept GET-only and minimal and freezes with A1. Step 2's enable screen should show `reads`.
4. **Enablement must live outside the workspace.** In step 2 it goes in `userData`, written only through top-frame IPC, because agents write workspace files.
5. **Framed pages lack the app's styles.** A trunk `/_os/theme.css` can be added later as a 1.x change.
6. **Two manifest sources from step 2.** The renderer will read bundled manifests at build time and fetch local ones at runtime. `usePlugins()` hides this, so switching to fetch-only changes no caller.
7. **The security-boundary steps have the weakest checks.** S3 and S5 move the boundary but are verified only by the advisory `desktop.yml`.

### Critical Files for Implementation
- os-ui/frontend/server/api.ts
- os-ui/client/src/main/protocol.ts
- os-ui/client/src/main/index.ts
- os-ui/client/test/protocol.test.ts
- os-ui/frontend/src/desktop/apps.tsx
---

# Part 2. Code view Git data and Paper view rendering


Both gaps can be closed without any new manifest field. The Code view gets one desktop-only Git handler. The Paper view should render with a bundled copy of PDF.js, because as the client is configured, Chromium's built-in PDF viewer will not render the file at all. Bundling PDF.js needs the product owner's yes. One message in the contract changes: `os.ask` becomes `os.select`, because the chosen mockup puts the "Ask the agent about this" bar in the host.

All paths are relative to the repository root. I read the S1/S2 code in `.claude/worktrees/agent-a0508108fb31fb6ee`.

## Gap 1: Code view, Git data

**Design.** One bundled handler, `git`, mounted at `/api/code-view/git`. It lives in a new `os-ui/frontend/server/codeGit.ts` and is listed in `pluginHandlers.ts` as `"code-view/git": codeGitApi`. All routes are GET only; anything else gets 405.

**Validating the project.**
- The name must match `^[A-Za-z][A-Za-z0-9_-]*$` (the rule in `chat.ts:8`).
- `resolveCwd(ctx.repoRoot, "projects-folder/<name>")` must be non-null. That function (`chat.ts:79-86`) accepts only registered projects, meaning folders with a `PROJECT_MEMORY.md`.
- The project folder's real path must lie inside `realpath(repoRoot)/projects-folder`.
- A malformed name gets 400; a project that is not registered gets 404.

**Validating the commit hash.**
- It must match `^[0-9a-f]{7,64}$`, otherwise 400. Because it is lowercase hex, it can never be read as an option.
- `git rev-parse --verify --quiet <hash>^{commit}` must then print one full hash, otherwise 404. Every later command uses the full hash.

**Validating the file path** (for diffs): `safeRelative(path) === path`, non-empty, at most 1,000 characters. **The `skip` value** must be an integer from 0 to 10,000.

**Which repository is read.** The handler never relies on Git's own discovery, so it can never pick up a repository above the workspace:

| Case | Repository used | Path filter | Diff paths |
|---|---|---|---|
| `projects-folder/<name>/.git` exists (step 3 layout) | the project's own | `.` | already project-relative |
| else `<repoRoot>/.git` exists (today) | the workspace's | `projects-folder/<name>` | made project-relative with `--relative=projects-folder/<name>/` |
| neither | none | | answers `{ repo: null }` with status 200 |

In both repository cases the file paths come back relative to the project, as the mockup shows ("Files changed in projects-folder/nanochat_cpu"). The `kind` field lets the view show which command it reflects. When `git` itself is missing, the answer is `{ repo: null, problem: "git was not found; see Settings" }`.

**How git is run.** Always as an argument list through `ctx.run`; `processRunner` spawns without a shell.
- `--git-dir=<root>/.git --work-tree=<root>` is always passed. This overrides any `GIT_DIR` in the user's environment, and as far as I know Git also accepts a `.git` file there.
- `--no-ext-diff --no-textconv` stop programs configured in the repository from running.
- Each command has a 10-second limit.
- Output is capped by size. This needs one small host change: `RunOptions.maxOutputBytes` and `RunResult.truncated` in `server/types.ts` and `process.ts`. The runner stops collecting and kills the child at the cap, and the handler cuts the output back to the last complete record.

```text
git --git-dir=<root>/.git --work-tree=<root> -c core.quotePath=false <subcommand…>    cwd = <root>

GET /        ?project              log --max-count=1 --format=%H%x1f%h%x1f%cs -- <spec>               (header pill)
GET /log     ?project&skip         log --no-merges --max-count=51 --skip=<n>
                                       --format=%x1e%H%x1f%h%x1f%cs%x1f%s --shortstat -- <spec>        cap 256 KiB
GET /commit  ?project&hash         show --no-ext-diff --no-textconv --no-renames --diff-merges=first-parent
                                       --numstat -z --format=%H%x1f%h%x1f%cs%x1f%an%x1f%s%x1f%b%x1e
                                       [--relative=projects-folder/<name>/] <full> -- <spec>            cap 512 KiB
GET /diff    ?project&hash&path    show --no-ext-diff --no-textconv --no-renames --diff-merges=first-parent
                                       --no-color --format= [--relative=…] <full> -- <spec>/<path>      cap 1 MiB
```

`--diff-merges` needs Git 2.31 or later; this machine has 2.55.0.

```ts
type Summary = { repo: "project" | "workspace" | null; head: { hash: string; short: string; date: string } | null; problem?: string };
type Log     = { commits: { hash: string; short: string; date: string; subject: string; files: number; added: number; deleted: number }[]; more: boolean };
type Commit  = { hash: string; short: string; date: string; author: string; subject: string; body: string;
                 files: { path: string; added: number | null; deleted: number | null }[]; truncated: boolean }; // null = binary
type Diff    = { path: string; diff: string; truncated: boolean };
```

**Files sub-view scope.** It keeps `reads: ["projects-folder/*/Code"]`, which matches the mockup's tree root `nanochat_cpu/Code/`.
- Paths outside `Code/` that appear in Changes (`index.md`, `paper/main.tex`) come only from Git, as file lists and diffs. They cannot be opened in Files.
- If they should be, widening the scope to `projects-folder/*` is a one-line manifest edit.

**Dev server: desktop only.** Plugin handlers carry no token, and diffs return project file contents, which A3 already keeps off a dev server that may be reached through a tunnel. The Code view's page cannot load in the browser anyway, because its `src` is null there. Two host-only changes make this work:
- `pluginHandlers.ts` exports `DESKTOP_ONLY_HANDLERS = new Set(["code-view/git"])`.
- `createRegistry` gains `skip?: ReadonlySet<string>`, for declared handlers that are neither required nor mounted. `api-plugin.ts` passes that set.

## Gap 2: Paper view

**What I read.**
- `os-ui/client/package.json` pins Electron 44.4.5.
- The window's `webPreferences` (`index.ts:331-339`) set preload, `contextIsolation`, `sandbox: true`, no `nodeIntegration`, `webSecurity` and no spellcheck. There is no `plugins` key, and Electron's WebPreferences page says `plugins` defaults to `false`.
- Subframes may navigate only to the wiki origin, `about:blank` or `about:srcdoc` (`index.ts:302-305`, `:358-359`).
- Every web permission except clipboard writes is denied (`:430-433`).
- `PLUGIN_CSP` inherits `default-src 'none'` and `frame-src 'none'` from `WIKI_CSP` (`protocol.ts:42-51`), so `object-src` falls back to `'none'`. `READ_CSP` sandboxes every channel response.
- Electron's own issue reports set `plugins: true` to view PDFs: electron/electron#25350, #33519, and #33907 ("Can't embed remote or local PDFs in iframes or webviews; crash when using custom protocol"). None of these is about Electron 44.

**Conclusion.** As configured, the built-in viewer cannot render `app://paper-view/_os/files/…/main.pdf`: plugins are off, the CSP forbids framing or embedding the file, the response is sandboxed, and the navigation guard will likely cancel the viewer's own internal frame. It also fails the mockup by design. The mockup's host-owned ask bar needs the reader's selection and page from the view's script, but the built-in viewer is a closed, separate document. That last point is from my knowledge of Chromium; I did not verify it.

**The one experiment** (about an hour, on a scratch branch, in `npm start`):
1. Set `plugins: true`.
2. Serve `main.pdf` without `sandbox`, and add `frame-src 'self'` to `PLUGIN_CSP`.
3. Log every `will-frame-navigate` URL and allow each one.
4. In the view page, put `<iframe src="./_os/files/projects-folder/nanochat_cpu/paper/main.pdf">` and a button that reads `iframe.contentDocument?.getSelection()?.toString()`.

Choose the built-in viewer only if the PDF renders, the selected text is readable from the view's script, and the owner accepts `plugins: true` for the whole window, which would include step 2's third-party plugin pages. I expect the selection check to fail.

**Fallback: PDF.js.** The npm package is `pdfjs-dist` 6.5.438 (latest when I checked), licensed Apache-2.0. The package is 37.6 MB unpacked, but the app would ship only two files: `build/pdf.min.mjs` (474 kB) and `build/pdf.worker.min.mjs` (1.27 MB), about 1.75 MB in total.
- **How to include it:** copy those two files, plus its LICENSE, into `plugins/paper-view/site/vendor/`, with a README giving the version, source URL and SHA-256. That is the same precedent as `paper-wiki-manager/scripts/vendor/`.
- **Why vendor:** installing the package through npm would also pull its optional native dependency `@napi-rs/canvas` into `npm ci`.
- **How the page uses it:** fetch the bytes over the channel and call `getDocument({ data, isEvalSupported: false })`. No eval, no wasm, no character maps.
- **Host change:** `PLUGIN_CSP` gains `worker-src 'self'`.
- **What will not render:** JPX images inside a PDF; pdfTeX output embeds its fonts.

Adding it needs the owner's yes: *"To show the paper inside the app with your selection passed to the agent, the app needs to include Mozilla's PDF.js (Apache-2.0 licence, about 1.8 MB). May it?"*

**What the Paper view shows**, based on a listing of `paper/`:

| Situation | The view shows |
|---|---|
| `main.pdf` exists | The rendered paper. |
| No `main.pdf`, but `main.tex` exists | "The paper has not been built yet: paper/main.tex exists, paper/main.pdf does not." `paper/main.tex` is selectable, so the user can ask the agent about it. |
| No `paper/` folder | "This project has no paper/ folder." |
| The PDF cannot be parsed | "paper/main.pdf could not be opened (\<error\>)." |

The view never builds the PDF itself, because the Bare-CLI row forbids write actions that exist only in the GUI.

## Manifests and contract

```jsonc
// os-ui/frontend/plugins/code-view/plugin.json
{ "contract": "^1.0", "id": "code-view", "name": "Code view", "version": "0.1.0",
  "description": "A project's files and its Git changes, read-only.",
  "reads": ["projects-folder/*/Code"],
  "contributes": { "projectViews": [{ "id": "code", "title": "Code", "entry": "index.html" }],
                   "handlers": ["git"] } }
// os-ui/frontend/plugins/paper-view/plugin.json
{ "contract": "^1.0", "id": "paper-view", "name": "Paper view", "version": "0.1.0",
  "description": "Renders the project's paper/main.pdf, read-only.",
  "reads": ["projects-folder/*/paper"],
  "contributes": { "projectViews": [{ "id": "paper", "title": "Paper", "entry": "index.html" }] } }
```

**Changes to contract 1.0** (it is not frozen yet, see A1):
- **The manifest schema does not change.**
- **The page-to-host message changes.** A6's `os.ask` becomes `{ type: "os.select", label: string, quote?: string }`, and `{ type: "os.select", label: null }` clears it. In the mockup (`c-document.html:674-678`, `:1185-1224`), the host owns the "Ask the agent about this" bar and the reference chips in the composer, so the view reports a selection rather than asking. Labels look like "Code/README.md:12", "63ead0b" or "main.pdf p. 2 · §2 Setup", the last taken from the PDF's outline. A quote is at most 2,000 characters. The host applies on return what the active view posts while the workspace is hidden, so a view must not post what it merely cannot read then: a hidden frame is not laid out, and its selected text reads as empty (step 2.3's "Selection and Reload").
- **`PLUGIN_CSP` gains `worker-src 'self'`**, if PDF.js is used.
- **From the S1/S2 implementer notes:**
  - The parser should refuse a `reads` root whose first segment is `*`.
  - S5 must apply the dot-segment rule to the whole requested path.
  - S3 copies `plugins/` into `out/plugins/`.

## Verification

**Required CI** (covers the parts that do not need the read channel):
- `server/codeGit.test.ts` runs against real temporary repositories:
  - the workspace layout, the project's-own-repository layout, and no repository at all;
  - a bad name, `../x`, an unregistered project, `hash=--output=x`, an unknown hash, and `path=../AGENTS.md`;
  - truncation at the cap;
  - a repository whose `.git/config` sets `diff.external` and a textconv to a script that writes a marker file, which must never appear.
- `process.test.ts`: `maxOutputBytes`.
- The registry test: a `skip`ped handler raises no drift error.
- `devServer.test.ts`: `/api/code-view/git?project=nanochat_cpu` is not answered with the handler's JSON.
- The loader and pages tests: both manifests load, and both views get a null `src` in the browser.

**Advisory e2e** (`desktop.yml`). The e2e workspace is copied without `.git` (`e2e/app.test.ts:25-35`), so the test asserts `repo: null` first, then runs `git init` inside the copied project:

```ts
writeFileSync(join(workspace, ".env"), "SECRET=1");
const frame = await pluginFrame(page, "app://code-view/");           // generalizes wikiFrame (:123-133)
const q = (p: string) => frame.evaluate(async (u) => (await fetch(u)).status, p);
assert.equal((await frame.evaluate(async () => (await fetch("/api/code-view/git?project=nanochat_cpu")).json())).repo, null);
gitCommit(join(workspace, "projects-folder/nanochat_cpu"), "e2e commit");  // fixed author/committer env
assert.deepEqual(await Promise.all([
  q("./_os/files/projects-folder/nanochat_cpu/Code/README.md"), q("./_os/files/projects-folder/nanochat_cpu/AGENTS.md"),
  q("./_os/files/.env"), q("/api/code-view/git/log?project=..%2Fx"), q("/api/code-view/git/diff?project=nanochat_cpu&hash=--output%3Dx&path=index.md"),
]), [200, 404, 404, 400, 400]);
assert.equal(await frame.evaluate(() => typeof (window as { osDesktop?: unknown }).osDesktop), "undefined");
await frame.getByText("e2e commit").waitFor();

const paper = await pluginFrame(page, "app://paper-view/");
await paper.locator("canvas").first().waitFor();
await paper.getByText("nanochat on a Laptop CPU", { exact: false }).first().waitFor();   // PDF.js text layer
// select text → host ask bar → "Ask the agent about this" → a chip appears in the project composer
renameSync(pdf, `${pdf}.bak`); await paper.evaluate(() => location.reload());
await paper.getByText("has not been built yet", { exact: false }).waitFor(); renameSync(`${pdf}.bak`, pdf);
```

The existing CSP-violation test (`:283-286`) should then come back empty with both frames loaded. Whether it actually sees console messages from subframes needs checking.

### Critical Files for Implementation
- os-ui/frontend/server/registry.ts
- os-ui/frontend/server/process.ts
- os-ui/frontend/server/chat.ts
- os-ui/client/src/main/index.ts
- os-ui/mockups/step1/c-document.html

---

# Part 3. Step 2's project views: Skeleton, Assets, Idea

Written on 2026-11-23 as a read-only design, on branch `step2-design` from
`origin/step1-docs-after-s6` at commit `5874a32`; line numbers refer to that commit.
Paths in code spans are relative to the repository root, and a path that does not
exist yet is a code span, not a link.

**What is decided** (read, not reopened): the [HANDOFF.md](../HANDOFF.md) Decisions
rows Project views, Idea view, View editing, Step 2 view designs, Assets view, Idea
file format, Bare-CLI use, Plugin contract, Selected text on screen, and Paper view
renderer (`HANDOFF.md:605-611`, `:613`, `:632`, `:634`), and Active Work → Step 2
(`HANDOFF.md:80-92`). In [mockups/step2/views.html](mockups/step2/views.html) the
Human Owner chose **Idea A** (a drawn graph), **Skeleton B** (claims first), and
**Assets B** (`Figs/`, `Baselines/`, `Code/results/`, and the datasets); the other
alternatives are ignored here.

**Outcome.** The three views can be built as three bundled plugins on contract 1.0
as it stands, with no new dependency. Each reads one to six workspace roots through
the read channel, turns Markdown into text with one small parser the three share,
and reports a selection with `os.select`. The mockup's content was put together by
hand from `nanochat_cpu`; §3 to §5 give every field it shows either a rule over the
project's own files, checked against a project fresh from
[the template](../projects-folder/templates/ai_research_template/), or "dropped".
Dropped in the first version, to be told to the Human Owner: a claim's "What the
source file says" excerpt, the jump buttons between Idea and Skeleton, Assets'
"Made by" and "Committed" lines, and the per-project notes on Assets' groups. The
order is Skeleton, Assets, Idea (§6); only the Idea view waits for a decision, the
idea file's format (§5.1, §7).

## 1. Contract facts

**1. A manifest's `reads` may name a single file, and needs no contract change.**
- The parser takes any plain relative path in `reads` (`os-ui/frontend/server/manifest.ts:225`,
  rules at `:162-183`): it refuses a leading `*` (`:181`) and dot segments (`:174`),
  and nothing in it asks for a folder.
- The read channel treats a root as a path, not a folder. `matchRoot` matches
  whole segments and returns the matched root (`manifest.ts:106-115`). In
  `serveRead` (`os-ui/client/src/main/protocol.ts:554-620`), every containment
  check passes when the target is the root itself, because `isInside` accepts
  equal paths (`protocol.ts:331-334`); the declared-root check compares the root's
  real path with the declared pattern (`:410-414`); and a file is served when
  `stat` says it is one (`:594-595`). A listing of a file root is 404 (`:586-587`).
- **Correction (2026-11-24, after the review of 2.1):** a root names a path, not a
  kind of entry. When that path is a file, nothing below it is read; when a project
  holds a *folder* named `paper_skeleton.md`, the folder is the root, and its own
  contents are readable (its listing and the files in it are 200) as a folder
  root's are. Its limit is a folder root's: a link in it that leaves the root is
  404. The channel is unchanged; `client/test/protocol.test.ts` ("a file root")
  pins this.
- No test covers it: every fixture declares folders (`os-ui/client/test/protocol.test.ts:858-870`).
  So I ran a throwaway probe (macOS, Node 22.23.1, the commit's `protocol.ts` and
  `manifest.ts`, a temporary workspace; not committed) with
  `reads: ["projects-folder/*/paper_skeleton.md", "projects-folder/*/idea_graph.md"]`.
  The manifest parses. `projects-folder/Alpha/paper_skeleton.md` is 200. These
  are 404: a listing of that file, a path below it, a missing `idea_graph.md`, a
  sibling `AGENTS.md`, and a listing of the project. A `paper_skeleton.md` that is
  a link to `human/private/notes.md` is 404; one that is a link to another
  project's `paper_skeleton.md` is 200, as for a folder root linked to another
  declared root.
- The first pull request (§6, 2.1) commits these cases as protocol tests. Once
  the contract freezes (A1), file roots are part of the third-party API.
- **What a page cannot tell.** With a file root, a view cannot list the project.
  A 404 means either that the file is missing or that the channel refused it (a
  link leaving the project), so the empty states below say both.
- **The narrowest `reads`:**
  - Skeleton: `["projects-folder/*/paper_skeleton.md"]`.
  - Idea: `["projects-folder/*/idea_graph.md", "projects-folder/*/paper_skeleton.md"]`.
    The second root is for resolving a claim node's pointer (§5.1); dropping it
    leaves the pointer as plain text.
  - Assets: `["projects-folder/*/Figs", "projects-folder/*/Baselines",
    "projects-folder/*/Code/results", "projects-folder/*/Code/Datasets",
    "projects-folder/*/Code/README.md", "projects-folder/*/paper_skeleton.md"]`.
    The two files serve the dataset list and "Used in" (§4).
- None of these roots is the whole project, so `AGENTS.md`, `PROJECT_MEMORY.md`,
  `paper/`, and the rest of `Code/` stay unreadable to these views. Names are
  case-sensitive as the template spells them: a project with `figs/` shows "no
  `Figs/` folder" (PLUGINS.md status, S5).

**2. Markdown: a small purpose-built parser, shared, no library.**
- The frontend depends on React alone (`os-ui/frontend/package.json:13-27`).
- Plugin pages run under `PLUGIN_CSP`, with no inline script or style
  (`protocol.ts:107-116`). Their code may put untrusted text on screen only as
  text (`os-ui/frontend/plugins/site-kit.ts:10-14`, `el` at `:19-24`). Each site's
  test scans its code for HTML sinks: `innerHTML`, `DOMParser`, `on…=`, and others
  (`os-ui/frontend/plugins/code-view/site/dom.test.ts:28`).
- Libraries such as marked or markdown-it produce an HTML string, which would need
  `innerHTML` plus a sanitizer. The views also need what such output does not keep
  directly: each block's first and last line (for labels like
  `paper_skeleton.md:113–119`), its source lines (for quotes), and table cells by
  column.
- So I recommend no dependency: a line-based parser for the subset these files
  use, in a shared `os-ui/frontend/plugins/md-kit.ts` (§2). It does not render
  anything outside that subset: setext headings, blockquotes, HTML, footnotes,
  reference links, tables without a leading `|`, and lists nested deeper than one
  level are shown as their literal text in a paragraph. Nothing in the file is
  hidden, and nothing becomes markup.
- **Untrusted text.** The parser returns tokens, never HTML. `site-kit.ts`
  draws them with `textContent` and `createElement` only: `<script>` in a cell
  shows as those characters. A link's target is never set as an `href`, so no
  link is followed; it is kept for resolution and shown as a tooltip. A Markdown
  image is drawn as its alt text and never loaded.
- The quote-class characters (`QUOTE_INVISIBLE`, `os-ui/frontend/src/plugins/select.ts:76`:
  controls, format and default-ignorable characters, the Braille blank) are drawn
  as `⟨U+XXXX⟩` markers, as the host already shows them in every quote
  (`visibleQuote`, `select.ts:122-135`), so bidi controls cannot reorder a claim
  on screen. This goes beyond the Code view, which marks them in names only
  (`code-view/site/logic.ts:143-150`) and draws file text as it is.
- Since nothing new is vendored, the "Paper view renderer" row (`HANDOFF.md:632`)
  has no counterpart question here.

**3. Images come through the read channel as `<img>`; the mockup's inline SVG is not
used.**
- The channel sends `.svg` as `image/svg+xml` (`protocol.ts:190`). It sends only
  scripts and HTML as text (`READ_AS_TEXT`, `:219-224`), and its comment says
  SVG keeps its type because "an `<img>` needs it, an image never runs script".
- Every channel response carries `READ_CSP` (`sandbox; default-src 'none'; …`,
  `:123`), so an SVG opened as a document is sandboxed too.
- `PLUGIN_CSP` allows `img-src 'self' data:` (`:111`), so
  `<img src="./_os/files?path=…">` on the page's own origin loads. The Code view
  already shows images this way, and on an error asks the channel for the status
  with a `HEAD` (`code-view/site/main.ts:382-403`). In image mode an SVG runs no
  script and loads nothing external. That is Chromium's behaviour, not read in
  this code or tried here; 2.2's end-to-end test pins it (§6).
- Inlining the SVG as the mockup does (`views.html:582` onward) would need an
  HTML sink, and it would put the file's markup into the page's DOM. The app must
  not do that.
- Known limit, shared with the Code view: the memory to decode a very large image
  is not bounded.

**4. Git: the Assets view cannot use the Code view's handler, so the "Committed" line
is dropped.**
- A page reaches only `/api/<its own id>/...`: `siteRoute` routes `api` paths
  for the site's own id only (`protocol.ts:314-316`), and any other `api/` path
  is reserved, so 404 (`:247-250`, `:319-320`). The Paper view's end-to-end test
  pins that its frame gets 404 from `/api/code-view/git` (`os-ui/client/e2e/app.test.ts:1390`).
  The contract rule is "each origin reaches only its own mounts" (Part 1, "The
  security model to preserve").
- Assets, as a bundled plugin, could declare a handler of its own
  (`handlers: ["git"]`; handlers are bundled-only, `manifest.ts:272`). That would
  mean:
  - a key `assets-view/git` in `BUNDLED_HANDLERS` and `DESKTOP_ONLY_HANDLERS`
    (`os-ui/frontend/server/pluginHandlers.ts:15-18`, `:27`), with the client
    wrapping it with the git it found, as it wraps `code-view/git`
    (`os-ui/client/src/main/codeView.ts:75-88`);
  - a new per-file route, since the handler answers only `/`, `/log`, `/commit`,
    and `/diff`, with no path filter on `/log` (`os-ui/frontend/server/codeGit.ts:739`);
  - accepting that the handler's limits on requests and Git processes are per
    instance (`codeGit.ts:631-636`), so a second mount doubles what one open
    workspace may run at once.
- The mockup's line is one constant for every file, `c4d4a85 · 2026-09-28 (git log)`
  (`views.html:1410`).
- I recommend dropping it from the first version (question N-4 in §7). The Code
  view's Changes already shows the history.

**5. Selection: what each view posts, and whether its quote is what it draws.** The
host accepts only `{type: "os.select", label, quote?}` (`select.ts:8-9`,
`readSelect` at `:98-114`, which refuses any other key or type at `:103-106`). A view
that is not in `QUOTES_AS_DRAWN` (`select.ts:49`, today only the Code view) gets
chips that open by themselves (`previewAfter`, `:228-232`); the mockup opens chips in
all three new views for that reason (`views.html:1482-1485`). This design does not
decide the list; for each view:

| View | Label (one line, `visibleName` and `clipLabel`, `site-kit.ts:78-91`) | Quote as the mockup has it | What the page draws | Quote is exactly what is drawn? |
|---|---|---|---|---|
| Skeleton | `paper_skeleton.md:115 · claim C1`; a Snapshot line `paper_skeleton.md:8–9 · Snapshot` (the working title, written over two lines); a line in a folded section `paper_skeleton.md:<a>–<b> · <section>` (`views.html:1192-1196`) | The block's source lines as written, for a claim the whole row: `\| C1: every stage runs; … \| first-run stage log \| [Code/README.md](Code/README.md) "What to expect", "Results" \| fresh run 2026-09-26 \| verified \|` | The cells as text, without `\|`, link targets, backticks, or `**`, and in B rearranged (ID and status, claim, evidence · result, then source) | **No.** The quote carries link targets and Markdown marks the page does not draw; that is also its use: a link's hidden target is seen before Send |
| Skeleton, if the quote were the drawn text | same | — | the cells' text in the order drawn, invisible characters marked | Could hold, at the cost of the line-exact text and link targets the agent would edit by |
| Idea | `idea_graph.md · E2 (experiment)` (`views.html:1132`) | The node's source row as written (`nodeRow`, `views.html:834-837`) | In the graph, the ID, status, and statement cut to one line; in the detail panel the full statement and decoded links | **No**, for the same reason, and the graph cuts the statement |
| Assets | The file's project path, `Figs/probe_comparison.svg`; a dataset `Code/README.md:208 · dataset karpathy/climbmix-400b-shuffle` (`views.html:1417-1418`) | None | The path in the detail panel | **Trivially yes**: there is no quote, so an open chip shows only `About Figs/probe_comparison.svg` |

For Skeleton and Idea to join `QUOTES_AS_DRAWN`, they would have to quote the
drawn text. The Human Owner is asked in N-1 and N-2 (§7); unless they answer
otherwise, the three views stay off the list, and their chips open by themselves.

**6. Limits.** The built views needed these, found in their reviews (the status
section above; `code-view/site/logic.ts:21-26`, `:70-71`; `protocol.ts:131-145`;
the end-to-end fixtures at `app.test.ts:162-181`):

| Built view's limit or hostile case | Skeleton | Assets | Idea |
|---|---|---|---|
| Channel: 32 MiB cap (413), 16 open files per origin (503), 5,000 names a listing (`truncated`) | 413 and 503 screens | the same, plus a thumbnail queue under the 16 (§4.3) and "more files than shown" | 413 and 503 screens |
| Code view reads at most 2 MiB and 5,000 lines of a file | reads at most 1 MiB of `paper_skeleton.md` (the template's is 3,384 bytes, `nanochat_cpu`'s 6,608) | CSV preview 2 MiB; other previews 256 KiB; `Code/README.md` and `paper_skeleton.md` 1 MiB each | reads at most 512 KiB of `idea_graph.md` |
| A line over 2,000 characters is cut | each drawn cell or line cut at 2,000 characters with ` …[cut]`; quotes cut to 2,000 (`clip`, `site-kit.ts:73-75`) | the same in previews | the same for statements |
| Not UTF-8 or binary: said so (`readText`, `code-view/site/logic.ts:44-48`) | the same | the same, per previewed file | the same |
| Markup in names and text (`MARKUP_NAME`, `MARKUP_TEXT`, `app.test.ts:162-167`) | markup in a claim and a section title | the same file name in `Figs/` and `Code/results/` (not on Windows), and in a CSV cell | markup in a statement and in Source |
| Odd names through `encodeURIComponent` (`ODD_NAMES`, `:166-167`) | — | `a+b.csv`, `has#hash.svg`, `100%.json`, `with space.md` in the groups | — |
| A huge input with a cost per element (the Paper view's 300,000 pages) | at most 20,000 lines parsed, 500 rows a table, 30 columns, 300 sections | walk depth 4, 40 listings and 500 files a group, 20 rows × 30 columns a CSV preview, 200 thumbnails | 200 nodes, 1,000 links |
| A time budget (the Paper view's 15 s a page) | none needed: the parser makes one pass with no backtracking; a test of 100,000 `[` and backticks in one line finishes within 100 ms | the same for the CSV parser | the same, plus a layout of 200 nodes and 1,000 links within 50 ms in Node |
| Hidden text reaching a quote (the Paper view's PDF text layer) | quote-class characters drawn as markers; link targets shown in the quote | — | the same as Skeleton |

## 2. What the three views share

**`os-ui/frontend/plugins/md-kit.ts`** (new, pure, no DOM; beside `site-kit.ts`, bundled
into each site that imports it, as `site-kit.ts` is; `site-kit.ts:5-6`):
- **Blocks**, in one pass over the lines, each with its first and last line number
  and its source lines:
  - an ATX heading (1 to 6 `#` and a space);
  - a fenced code block (three or more backticks or tildes, to the matching fence
    or the end of the file);
  - a table: a line starting with `|`, then a delimiter row, then the following
    lines that start with `|`. Cells split on `|` but not `\|`, and the outer
    pipes are dropped. A row with another number of cells is kept, padded or cut
    to the header's count, and flagged;
  - a list: `- `, `* `, `+ `, or `1. ` items, with continuation lines indented by
    two or more spaces, one nested level;
  - a paragraph: any other run of non-blank lines.

  Every non-blank line belongs to exactly one block; a unit test checks that on
  both real skeletons.
- **Inline tokens**, in one left-to-right scan: code spans, `[text](target)`,
  `![alt](target)`, `**bold**`, and backslash escapes. Everything else stays
  literal.
- **`sections(doc)`**: flat, as in the mockup (`views.html:1148-1177`). A
  section is a heading at any level and the blocks up to the next heading of any
  level. `section(doc, title)` finds the first one whose text equals `title`,
  ignoring case.
- **`resolveLink(target, fromFile)`**: a project path, or null. A target with a
  scheme (`https:`) or a leading `/` or `#` stays as written, shown as text. Any
  other target loses its `#…` and `?…`, is percent-decoded once, and is resolved
  from `fromFile`'s folder. It is null when it leaves the project or has a dot
  segment.
- **The `paper_skeleton.md` conventions**, from the template's own headings and
  labels (`projects-folder/templates/ai_research_template/paper_skeleton.md:6-16`,
  `:125-132`, `:157-161`):
  - `snapshot(doc)`: the first list of section "Snapshot". An item reads
    `<Label>: <value>`, continuation lines joined. Labels match ignoring case, as
    `research-project-manager` matches `PROJECT_MEMORY.md` labels
    (`research-skills-hub/open-paper-skills/research-project-manager/assets/project-contract.toml:76-77`).
  - `claims(doc)`: the first table of section "Claims and Evidence", with columns
    found by header name: Claim, Evidence, Source file or link, Citation/result,
    Status. A row whose Claim cell is empty is not a claim; that is the template's
    placeholder row, whose Status cell lists the choices "planned / verified /
    weak / removed" (`:161`). A claim's **ID** is the leading
    `^[A-Z]{1,4}[0-9]{1,4}[a-z]?: ` of its Claim cell (`C1: `, as in
    `nanochat_cpu`). A claim without one is known by its line only, and an idea
    node cannot point to it.
  - `studies(doc)`: the first table of section "Experiments", column "Claim"
    split on `,`. Each ID it lists is "used by" that row's first cell, the Study.

**`os-ui/frontend/plugins/site-kit.ts`** gains three things:
- `readStart(res, maxBytes)` and `readText(bytes, cut)`, moved from the Code view
  (`code-view/site/main.ts:138-163`, `code-view/site/logic.ts:34-60`), which
  then imports them from here with no change in behaviour;
- `inlineNodes(tokens)`, which draws md-kit's inline tokens as text nodes,
  `<code>`, `<b>`, and a link's text in a `<span>` with its target as the
  `title`, never an `href`;
- `markInvisible(text)`, the quote class drawn as markers.

**Every new site's `dom.test.ts`** scans `md-kit.ts` and `site-kit.ts` with its own
code, as the Code view's does (`dom.test.ts:17-22`). It pins the page's fetches
to `filesUrl` and `listUrl` (`:38-49`) and its one `postMessage` to the app's
origin (`:51-55`).

**Page behaviour common to the three**, following the Code and Paper views:
- The page takes its project from `?project=` (`projectFrom`, `site-kit.ts`) and
  has a screen, with "Try again" where it can help, for each of these: no
  project, a bad project name, 404 (the file is missing or a link the view may
  not follow), 413, too large for the view's own cap, not UTF-8, 503 (busy), and
  0 (the app is unreachable).
- **Reload** in the view's top bar reads the files again. This adds to the
  mockup, as the Paper view did: a view's frame stays loaded once opened
  (PLUGINS.md status, S6a-2), and an agent writes these files while the app is
  open.
- A click selects an item and posts `os.select`; a second click, Escape, or the
  host's `os.select.clear` (`isHostClear`, `site-kit.ts:94-98`) clears it.
- Nothing is written, ever: the Bare-CLI row (`HANDOFF.md:611`) and View editing
  (`:607`).

## 3. Skeleton view (alternative B, claims first)

### 3.1 Manifest

```jsonc
// os-ui/frontend/plugins/skeleton-view/plugin.json
{ "contract": "^1.0", "id": "skeleton-view", "name": "Skeleton view", "version": "0.1.0",
  "description": "A project's paper_skeleton.md, its claims and their evidence first, read-only.",
  "reads": ["projects-folder/*/paper_skeleton.md"],
  "contributes": { "projectViews": [{ "id": "skeleton", "title": "Skeleton", "entry": "index.html" }] } }
```

### 3.2 Every field, its rule

The table is checked against `nanochat_cpu`'s file and against the template's,
whose Snapshot values are empty but for Status, which still lists its choices,
and whose claims table holds only the placeholder row. All rules are md-kit's (§2) over `paper_skeleton.md`.

| Field (mockup) | Rule | Absent or malformed | Against the mockup |
|---|---|---|---|
| Top bar: `paper_skeleton.md`, its path, the hint | Fixed words; `projects-folder/<P>/paper_skeleton.md`; **Reload** | — | Reload added |
| Snapshot status pill (`views.html:1284`) | `snapshot()` item "Status" | No item: no pill. Empty: "not filled in". The template's unfilled "idea / outline / draft / submitted / revised" shows as written | Kept |
| Working title, Thesis, Audience, Research question (`views.html:1283-1288`) | Items "Working title", "One-sentence thesis", "Target venue or audience", "Main research question" | No item: the line is left out. Empty: "not filled in". No Snapshot section: no card | Kept |
| "5 claims · 5 verified · paper_skeleton.md:113–119" (`views.html:1289`) | `claims()`. "Verified" counts Status cells equal to "verified", ignoring case. The range runs from the table's first line to its last | No table: "No Claims and Evidence table in paper_skeleton.md". No filled row, as in the template: "No claims yet: the Claims and Evidence table has no filled row" | Kept |
| Claim row: ID and status | The ID rule. The Status cell as written, with "verified" styled as done and any other word neutral | No ID: "—" in the ID column, and the row is known by its line | Kept; the ID rule is new |
| Claim text; evidence · result; source | The Claim cell after its ID; the Evidence and Citation/result cells; the Source cell, drawn with `inlineNodes` | A missing column leaves its part out, and a note under the table names the header | Kept |
| Panel, "Evidence, as the skeleton states it" | The same three cells | — | Kept |
| Panel, "What the source file says · `<file>`" | **Dropped.** The mockup picks a passage per claim by hand (`views.html:1221-1231`); no rule over one file root can. Shown instead, as "Files it names": each link target in the Source cell through `resolveLink`, as project paths, with outside addresses as text. Nothing is opened | No link: "The source cell names no file" | **Departure** (N-3) |
| Panel, "Used by" (`views.html:1208-1213`) | `studies()`: the Study and line of each Experiments row whose Claim cell lists the ID | No table or no Claim column: "No Experiments table in paper_skeleton.md". Not listed: "No study in the Experiments table names C1". No ID: the line is left out | Kept |
| "Show C1 in the Idea view", "supported there by R2" (`views.html:1241-1242`) | **Dropped.** It needs a page-to-host message the contract does not have (§1, fact 5), and the idea file in this view's `reads` | — | **Departure** (N-5) |
| "The rest of paper_skeleton.md", folded, "line N · K entries" (`views.html:1304-1311`) | Every section, by headings of levels 2 to 6, except Snapshot and Claims and Evidence, that has at least one block, in file order. K counts table rows, list items, and paragraphs. An open section stays open while the page lives | — | Kept. The level-1 title and the paragraph under it are not shown, as in the mockup (`:1306`) |
| Narrow window: the evidence opens under its row (`views.html:362-366`) | Below 780 px of the view's width | — | Kept |

### 3.3 Selection, limits, what the first version does not do

- **Selectable:** the four Snapshot lines, every claim row, and every block of an
  open section. Labels and quotes are as in §1, fact 5. A claim row also opens
  its evidence.
- **Limits:** see §1, fact 6.
- **Not in the first version:**
  - the source excerpt and the jumps to and from the Idea view;
  - selecting part of a line by dragging (the mockup selects whole blocks);
  - Markdown beyond md-kit's subset, which is shown as literal text;
  - the file's title and intro paragraph;
  - following links;
  - editing.

## 4. Assets view (alternative B)

### 4.1 Manifest

```jsonc
// os-ui/frontend/plugins/assets-view/plugin.json
{ "contract": "^1.0", "id": "assets-view", "name": "Assets view", "version": "0.1.0",
  "description": "A project's figures, reference runs, results, and listed datasets, read-only.",
  "reads": ["projects-folder/*/Figs", "projects-folder/*/Baselines", "projects-folder/*/Code/results",
            "projects-folder/*/Code/Datasets", "projects-folder/*/Code/README.md",
            "projects-folder/*/paper_skeleton.md"],
  "contributes": { "projectViews": [{ "id": "assets", "title": "Assets", "entry": "index.html" }] } }
```

`Figs/` and `Baselines/` are not among the files every project must have
(`project-contract.toml:25-34`), and the template has no `Code/results/`, so every
group has a "no folder" state.

### 4.2 Every field, its rule

The mockup's `ASSETS` and `GROUPS` hold hand-written text for every file
(`views.html:1318-1343`). The rules below replace them.

**The rules:**
- **Walk.** Each group's folder is listed through `_os/list`, then each subfolder,
  depth first, in the channel's order (`protocol.ts:507-525`). The walk stops at
  depth 4, 40 listings, or 500 files a group. Names are shown relative to the
  group's folder (`openresearch-demo/README.md`). Dot files never appear, so
  `.gitkeep` does not count.
- **Description.** Only a `README.md` in the same folder can describe a file:
  the first list item or table row there whose first link resolves to the file.
  For a list item, the description is its text after that link, without a
  leading `:` or `—`; for a table row, its other cells joined with " · ". It is
  cut to 300 characters. In `nanochat_cpu` this describes the two data files of
  `Baselines/openresearch-demo/` (its `README.md:7-10`), and no other.
- **Used in.** Every block of `paper_skeleton.md` and of `Code/README.md` that
  names the file, either through a link or image whose target resolves to it
  (`../Figs/x.svg` from `Code/`), or through a code span whose whole text is its
  project path. Each place is shown as `<file>:<line>`, and for a table row also
  its first cell (`paper_skeleton.md:126 · Figure 1`). At most 10 places, then
  "and N more".
- **Datasets.** The first table in section "Data" of `Code/README.md`
  (`nanochat_cpu`: `Code/README.md:199-211`). Each body row is a dataset. Its
  name is the text of the first link in the row, or the first cell if it has no
  link. The section's blocks before the table are the group's note. After the
  table rows come the files the walk finds in `Code/Datasets/`, the template's
  own place for data (template `Code/README.md:16-19`).

| Field (mockup) | Rule | Absent or malformed | Against the mockup |
|---|---|---|---|
| Top bar count, "8 items · Figs/ · Baselines/ · Code/results/ · datasets" (`views.html:1355`) | Files listed plus dataset rows, and the groups present | — | Kept; Reload added |
| Group title and folder | Fixed: Figures `Figs/`, Reference runs `Baselines/`, Results `Code/results/`, Datasets "listed in Code/README.md" | Listing 404: "No Figs/ folder this view can read". Empty: "Figs/ is empty". Truncated or stopped walk: "more files than shown" | Kept |
| Group note (`views.html:1339-1343`) | **Dropped** for Figures and Reference runs. Results keeps one sentence true of every project: "The Code view also lists these files" (`HANDOFF.md:609`). Datasets: its rule above | — | **Departure** |
| Figure card and its thumbnail | Files ending `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, or `.svg` (`IMAGE`, `code-view/site/logic.ts:282`) anywhere under `Figs/` get a card, the image loaded as an `<img>` through the queue in §4.3. Other files in `Figs/` are rows | A failed load asks for the status with a `HEAD` and words it as the Code view does (`fileWords`, `imageWords`, `code-view/site/logic.ts:258-267`) | Changed: an `<img>`, not inline SVG |
| Size on cards and rows | The listing's `size` (`protocol.ts:388-392`), as "n bytes", "x.y KB", or "x.y MB" | — | Kept |
| "· 6,501 rows" in the list (`views.html:1348`) | **Moved to the panel**, because counting rows means reading the file | — | **Departure** |
| Row description (`views.html:1366`) | The description rule | No description: no second line | Partly kept |
| Panel heading and path | By extension: Figure (an image in `Figs/`), Image, Table (CSV), Data (JSON), Note (Markdown), Text, or File; then the project path | — | Kept |
| Preview: image | The file as an `<img>` | As for the card | Changed: not inline |
| Preview: CSV (`views.html:1378-1384`) | Parsed from the first 2 MiB (quoted fields, CRLF, uneven rows): its first 20 rows by 30 columns, cells cut at 200 characters. "First 20 of N rows" when the whole file was read, else "first 20 rows of a file over 2 MiB" | Binary or not UTF-8: said so | Kept |
| Preview: JSON (`views.html:1405-1408`) | The text as written, the first 40 lines, each cut at 2,000 characters, from the first 256 KiB; "First 40 of N lines" | The same | Kept |
| Preview: Markdown (`views.html:1385-1391`) | md-kit blocks, the first 200, drawn with `inlineNodes` (links as text; images not loaded) | The same | Kept |
| Preview: other text (`.txt`, `.log`, `.py`, `.tex`, `.yaml`, …) | The first 40 lines | Binary: "No preview" | Added |
| Preview: PDF | None: "PDF files are not previewed here" (the PDF reader belongs to the Paper view's site) | — | A limit |
| Panel: What | The description rule | "—" | Changed |
| Panel: Size | The listing's size, then "· N rows" or "· N lines" once the preview has read the file | — | Kept |
| Panel: Made by | **Dropped**: no file records which script made a file | — | **Departure** |
| Panel: Used in | The Used-in rule | "Not named in paper_skeleton.md or Code/README.md" | Changed: found, not hand-written |
| Panel: Committed (`views.html:1410`) | **Dropped** (§1, fact 4) | — | **Departure** (N-4) |
| Dataset rows (`views.html:1337`, `:1366-1368`) | The datasets rule. A row shows its name, the other cells as `<header>: <text>`, and "listed" on the right | `Code/README.md` 404: "No Code/README.md". No Data section: "Code/README.md has no Data section". No table: "No dataset table in Code/README.md's Data section", with the section's text as the note (the template's single bullet) | Kept; "not stored" becomes "listed" |
| Dataset panel: What, Used, Stored, Listed in, License (`views.html:1398-1399`) | Each header with its cell, a link's address as text after its text, and "Listed in `Code/README.md:<line>`" | — | Stored and License **dropped**; the group note carries the section's own words |

### 4.3 Selection, limits, what the first version does not do

- **Selection:** a card or row selects its file (label: the project path, no
  quote), and a dataset row selects its README line (§1, fact 5). Clicking the
  selected item again clears it.
- **The thumbnail queue.** At most 4 image loads in flight, leaving 12 of the
  origin's 16 open files for previews and Markdown reads (`READ_MAX_STREAMS`,
  `protocol.ts:145`). A card's image starts when the card comes within one
  screen of the view, in list order. A load answered 503 is tried once more
  after 1 s, then the card shows "Try again". Thumbnails stop at 200 figures; a
  card past that shows a **Show** button.
- Other limits: see §1, fact 6.
- **Not in the first version:**
  - inline SVG;
  - "Made by" and "Committed";
  - the per-project group notes;
  - PDF previews;
  - descriptions written anywhere but the folder's `README.md`;
  - "Used in" from `Code/README_zh.md` or other files;
  - datasets the code downloads but `Code/README.md` does not list. The app
    cannot read what code downloads: the decided row says "the list of datasets
    its code downloads" (`HANDOFF.md:609`), and the view shows what the project
    says it downloads;
  - selecting inside a preview;
  - opening a file outside the app.

## 5. Idea view (alternative A, a drawn graph)

### 5.1 The idea file (confirmed by the Human Owner on 2026-11-23, §7 I-1)

Within the decided vocabulary (`HANDOFF.md:606`, `:610`): one Markdown file, one
table, one row a node, four link words. An example, written from `nanochat_cpu`'s
files as the mockup drew them:

```markdown
# Idea graph

| ID | Kind | Statement | Status | Links | Points to | Source |
|---|---|---|---|---|---|---|
| Q1 | question | Does every stage run and does val bpb fall? | answered |  |  | paper_skeleton.md:83 |
| E2 | experiment | Every stage: `bash runs/runcpu_small.sh all`, on 2026-09-26 | done | tests Q1 | commit: none; files: Code/results/summary.json, Code/results/training_metrics.csv | Code/README.md:122 |
| R3 | result | Base val bpb 3.4564 → 2.2882 in 300 steps; SFT 2.2892 → 2.1456 | recorded | supports C2 | from: E2 | Code/results/summary.json |
| C2 | claim | base val bpb 3.4564 → 2.2882; SFT 2.2892 → 2.1456 | verified |  | claim: C2 | paper_skeleton.md:116 |
```

- **File.** `projects-folder/<P>/idea_graph.md`, UTF-8, at most 512 KiB.
- **The table.** The graph is the first table whose header cells are exactly
  `ID | Kind | Statement | Status | Links | Points to | Source`, in that order,
  matched ignoring case and surrounding spaces. Everything else in the file
  (title, notes, footnotes) is free text the view ignores.
- **Rows** follow md-kit's table rule (`\|` is a literal pipe). A row must have
  exactly seven cells.
- **ID:** `[A-Za-z][A-Za-z0-9_-]{0,15}`, unique ignoring case. The convention, not
  enforced, is the kind's letter and a number: Q1, H1, E1, R1, C1. The Kind
  column, not the letter, decides the kind; the mockup derived the kind from the
  letter (`views.html:792`).
- **Kind:** `question`, `hypothesis`, `experiment`, `result`, or `claim`.
- **Statement:** not empty; inline Markdown drawn as text.
- **Status**, by kind:

  | Kind | Status words |
  |---|---|
  | question | open, answered |
  | hypothesis | open, supported, refuted |
  | experiment | planned, running, done, failed |
  | result | recorded |
  | claim | planned, verified, weak, removed: the words of the template's claims table (`projects-folder/templates/ai_research_template/paper_skeleton.md:161`), not the mockup's "draft, verified" (`views.html:1515`) |

- **Links:** empty, or `<word> <ID>` items separated by `;`, from this row's node
  to the node named. The words, and the kinds each may join:

  | Word | From | To |
  |---|---|---|
  | motivates | any kind | question, hypothesis, experiment |
  | tests | experiment | question, hypothesis |
  | supports, refutes | result | hypothesis, claim |

- **Points to:** `key: value` pairs separated by `;`, by kind:

  | Kind | Points to |
  |---|---|
  | experiment | `commit: <7 to 64 lower-case hex digits, or none>; files: <path>, <path>, or none`. Both keys are required unless the status is `planned`, which may leave the cell empty. `commit: none` means the run recorded no commit, as `nanochat_cpu`'s did (`HANDOFF.md:610`); `files: none` means it left no result file (allowed by the Human Owner on 2026-11-24). `none` stands alone, never beside paths; a file really named `none` is written as a code span. A path is project-relative, with no `..` or dot segment, written bare or as a code span; a path containing `, ` must be a code span |
  | result | `from: <ID of an experiment>`, required. This carries "came from" without a fifth link word (§5.3) |
  | claim | `claim: <claim ID>`: the ID of a row in `paper_skeleton.md`'s Claims and Evidence table (§2's ID rule) |
  | question, hypothesis | empty |

- **Source:** free text, optional: where the node comes from, as `file:line`.
- **A DAG** (`HANDOFF.md:606`): a cycle through links and `from:` is reported as a
  problem, and the nodes are still drawn, since the layout does not need it. Each
  link counts from what must exist first to what follows from it: `A motivates B`
  is A → B; `E tests X` is X → E; `R supports X` and `R refutes X` are X → R; a
  result R with `from: E` is E → R. So "H1 motivates E1; E1 tests H1" is no cycle,
  and "R1 from E1; R1 motivates E1" is one. The problem names the cycle's nodes and
  one loop step by step ("E1 before R1 (R1 from E1) and R1 before E1 (R1 motivates
  E1)"), so it can be checked against the file. *This rule is a default the
  directing agent took on 2026-11-24 and told the Human Owner; it is not yet
  confirmed.* It is one constant, `FIRST` in
  [frontend/plugins/idea-view/site/logic.ts](frontend/plugins/idea-view/site/logic.ts); setting `tests`, `supports`,
  and `refutes` to `"row"` there reverses it to the first build's rule (each link
  from its row to its target).
- **Where an agent learns the format:** the template's own `idea_graph.md` (an
  empty table under a short paragraph that states these rules) and one line in the
  template's `AGENTS.md`, both in change 2.4 (§6). A CLI agent with no app running
  reads them there, which keeps the Bare-CLI row (`HANDOFF.md:611`).

**Choices made above, for the Human Owner.** Each has the default written above.
Questions I-1 to I-4 and N-6 in §7 ask about them, and I-1 covers every choice
without a question of its own:
1. the file's name and place (default `idea_graph.md` at the project root; I-1);
2. the seven columns and their order (as above; I-1);
3. the status words (as in the table; the claim's in I-2);
4. the experiment's pointer, `commit: …; files: …` with `none` (I-1);
5. "came from" carried as `from:` and drawn as a dotted line (N-6);
6. claims pointed to by a `C1:`-style ID, which the skeleton's claims must then
   start with (I-3);
7. which kinds each link word may join (as in the table; I-1);
8. IDs free but unique ignoring case, with Q1, E1, … as a convention only (I-1);
9. the limits: 512 KiB, 200 nodes, 1,000 links (I-1);
10. whether the template and the project check include the file (I-4).

### 5.2 States and validation

- **Empty state.** `idea_graph.md` answers 404, as it does for every project
  today. The view says: "No idea file to draw. The Idea view draws
  `idea_graph.md` in the project folder: a table with one row per question,
  hypothesis, experiment, result, or claim, and the links between them. This
  project has none, or it is a link the view may not follow. Ask the project
  agent to write one." It then shows the header line as text. The view writes
  nothing (`HANDOFF.md:611`).
- **Problems with the whole file** get an error screen with **Try again**: not
  UTF-8; over 512 KiB; no table with the expected header (the screen shows the
  first header it found, if any, beside the expected one); and the general
  states of §2.
- **Problems with a row** (seven cells, ID, kind, status, empty statement,
  Points-to keys and values, a duplicate ID) leave that row out. **Problems with
  a link** (an unknown word, an unknown target, a link to itself, kinds the word
  may not join, a duplicate) leave that link out. **Problems with a pointer** (a
  `from:` that names no experiment; a `claim:` that `paper_skeleton.md` does not
  have) leave the node drawn with the pointer shown as written.
- **A claim's status has two sources.** The node shows its own Status, from the
  idea file. When its `claim:` resolves and the skeleton row's Status differs, one
  problem is listed: "C2 is *planned* here, *verified* in paper_skeleton.md:116".
  The panel's "N of M verified" counts by the skeleton's Status, the authority
  for a claim.
- Every problem is listed under the top bar, "3 problems in idea_graph.md",
  opening to a list of `line N: …` entries. This adds to the mockup; a malformed
  file needs it.
- An unreadable `paper_skeleton.md` is one problem, "claims not checked", and
  claim pointers are shown as written.
- Past 200 nodes, the first 200 are drawn and the bar says so.

### 5.3 Layout by a general rule

The mockup's positions are hand-placed (`views.html:817-818`); the view's come
from a rule:
1. **Columns by kind**, in a fixed order: Questions, Hypotheses, Experiments,
   Results, Claims. A kind with no node has no column, and the legend says
   "hypotheses · none", as the mockup does.
2. **Order within a column.** The nodes start in file order, then four sweeps run,
   alternately left to right and right to left. Each sweep stably sorts a column by
   the mean position of each node's neighbours in the columns already swept,
   adjacent or not (a `tests` link from an experiment to a question skips the
   Hypotheses column; a `supports` link from a result to a hypothesis skips
   Experiments). A neighbour is one joined by a link or a `from:`. A node with no
   such neighbour keeps its place. The result is deterministic.
3. **Height.** In one pass from left to right, each node goes at the further
   down of two places: the column's next free place, and the mean height of its
   neighbours already placed to its left. Related nodes line up across columns
   and never overlap. Boxes are 150 × 48 px, as in the mockup.
4. **Lines.** Each line is a curve from the left node's right side to the right
   node's left side, its end points spread along each side by the other end's
   height, as in the mockup (`views.html:916-944`). A line within one column
   (a question that motivates a question) is an arc beside the column. Every line
   is always drawn, coloured by its word (the decided row: "every link always
   shown as a line"). Selecting a node dims the others and labels that node's
   lines.
5. **"Came from"** is drawn as a faint dotted line, named in the legend as "the
   result's experiment (from Points to)", not as a fifth link word. Without it the
   results would float apart from their experiments (§7, N-6).
6. **Scale.** The map fits the view's width at a scale between 0.8 and 1 and
   scrolls down when taller, as the mockup does (`views.html:995-1006`).

With 50 nodes the tallest column holds perhaps 20, about 1,200 px: the map
scrolls under the detail panel and its text stays readable. With the caps (200
nodes, 1,000 links), the sweeps cost a few thousand steps; a unit test bounds the
whole layout at 50 ms in Node.

No layout library is added. The kinds already give each node its column, which
is the hard part of laying out a general graph. What remains is ordering five
fixed columns, a known heuristic of perhaps a hundred lines. dagre or ELK would
be a new dependency for the Human Owner to approve, and would need constraints
to keep the columns.

### 5.4 Every field, its rule

| Field (mockup) | Rule | Absent or malformed | Against the mockup |
|---|---|---|---|
| Top bar (`views.html:529-532`, a "sample" note) | `idea_graph.md`, its path, "N nodes · M links", the problems line, Reload | — | Changed |
| Column heads, "Q Questions · 4" (`views.html:961-964`) | Kinds present, with counts | — | Kept |
| Node: ID, status, one-line statement (`views.html:975-980`) | ID, Kind (the colour), Status, Statement cut by the box | — | Kept |
| Node position | §5.3 | — | Changed: by rule |
| Lines: motivates, tests, supports, refutes | The Links column | Invalid links are left out and listed | Kept |
| "Came from" dotted line (`views.html:810-812`, `:973`) | A result's `from:` | — | Kept, not as a link (N-6) |
| "Inferred" links (`views.html:798`, `:803`, `:1067`) | **Dropped**: the file states every link it has | — | **Departure** |
| Legend, with "refutes · none here" (`views.html:965-974`) | Words and kinds with nothing in this graph are shown faint | — | Kept |
| Detail panel, nothing selected (`views.html:1080-1090`) | Counts by kind. "Still open": nodes whose status is open, planned, or running. "Claims: N of M verified in paper_skeleton.md": claim nodes whose skeleton row's Status is verified | Skeleton unreadable: "claims not checked" | Kept |
| Selected: kind, status, full statement | Its cells, with quote-class characters marked | — | Kept |
| Links by word, both directions; "Came from", "Its results" (`views.html:1093-1103`) | Links and `from:` | — | Kept |
| Points to, experiment (`views.html:1105-1109`) | "Commit c4d4a85" or "Commit: none recorded by the run"; the result files as text, not opened. The mockup's "first committed in c4d4a85 on 2026-09-28" came from Git and is **dropped** | Planned with an empty cell: "No run yet" | Partly kept |
| Points to, claim (`views.html:1110-1111`) | "Row C1 of the Claims and Evidence table, paper_skeleton.md:115", with that row's claim text and status | Not found: a problem, shown as written | Kept. The "Open it in the Skeleton view" button is **dropped** (N-5) |
| From the files | The Source cell | Empty: "—" | Kept |
| The mockup's notes on inferred links, step 3 commits, and proposed words (`views.html:1115-1118`) | Dropped; they were about the mockup | — | — |

### 5.5 Selection, limits, what the first version does not do

- **Selection.** Clicking a node selects it and opens its details. A link chip in
  the detail panel opens and selects the node it names. The label and quote are
  as in §1, fact 5.
- **Limits:** see §1, fact 6.
- **Not in the first version:**
  - hand-placed positions, dragging, or zoom other than fitting the width;
  - "inferred" marks;
  - commits read from Git;
  - jumps to the Skeleton view;
  - checking that an experiment's result files exist (they are outside this
    view's `reads`);
  - creating or editing the file;
  - the column alternative (B).

## 6. Sequence

Each view is one pull request on a topic branch into `main`. The order puts the
smallest change first, which also settles the shared pieces, and leaves the one
that waits for a decision last.

**2.1 Skeleton view.** It goes first because it is the smallest (one file root,
one view, no owner decision) and it settles every shared piece:
- file roots in `reads`, now under tests;
- `md-kit.ts`, and `readStart`/`readText` moved into `site-kit.ts`;
- how a new project tab is wired in;
- the end-to-end fixture of a project made from the template.

What the pull request holds:
- **Files:**
  - new: `os-ui/frontend/plugins/skeleton-view/plugin.json` (§3.1) and its `site/`
    (`index.html`, `style.css`, `main.ts`, `logic.ts`, `logic.test.ts`,
    `dom.test.ts`); `os-ui/frontend/plugins/md-kit.ts` and `md-kit.test.ts`;
  - changed: `site-kit.ts`; the Code view's `main.ts` and `logic.ts` (they import
    the moved functions);
  - [frontend/plugins/bundled.ts](frontend/plugins/bundled.ts): `skeleton-view`
    appended (`:7`);
  - [frontend/src/shell/layoutState.ts](frontend/src/shell/layoutState.ts): the
    Skeleton placeholder (`:126`) becomes `...tab("skeleton-view/skeleton")`, and
    the key joins `PLACED_VIEWS` (`:112`);
  - [frontend/src/plugins/registry.ts](frontend/src/plugins/registry.ts): an icon
    in `ICONS` (`:36-40`) from the shell's existing set;
  - [frontend/src/plugins/pages.test.ts](frontend/src/plugins/pages.test.ts): the
    tab pinned as the Code view's is (`:55-68`);
  - [client/test/protocol.test.ts](client/test/protocol.test.ts): the app
    policy's literal (`:215`) gains `app://skeleton-view`, and the file-root cases
    of §1, fact 1 become tests;
  - [client/e2e/app.test.ts](client/e2e/app.test.ts);
  - [client/README.md](client/README.md), [client/DESIGN.md](client/DESIGN.md),
    [frontend/README.md](frontend/README.md);
  - this file's status section.
- **Unit tests** (in the required CI):
  - md-kit on both real skeletons (`nanochat_cpu`: claims C1 to C5 on lines 115
    to 119, C1 used by "Main result" on line 83; the template: no claims, every
    Snapshot value empty but Status, and every non-blank line in exactly one
    block);
  - escaped pipes and uneven rows;
  - the 100,000-character inline case;
  - labels for section titles with invisible characters;
  - every screen's words;
  - the HTML-sink and fetch scans.
- **End-to-end:**
  - On `nanochat_cpu`, the Snapshot card shows; claim C2's evidence shows "Files
    it names: Code/results/summary.json" and "Used by: Main result"; the ask bar
    reads `paper_skeleton.md:116 · claim C2`; Ask adds a chip whose open text is
    `About paper_skeleton.md:116` followed by the row as written; and no
    conversation file is written (the check of `app.test.ts:617`).
  - A second project copied from the template in `before()` shows "No claims
    yet". Check that no existing assertion counts projects.
  - That project's file is then rewritten with `MARKUP_TEXT` in a claim, a
    `[x](javascript:…)` link, and `![x](https://md-image.invalid/a.png)`, and
    **Reload** is clicked: `__pwned` stays undefined, and the frame holds no
    `img`. The final "no CSP violations" test (`app.test.ts:1561-1573`) stays
    green. It ignores only the isolation probes and `csp-canary.invalid`, so the
    image's host must be another one.
  - Renaming the file shows the 404 screen; renaming it back and **Try again**
    restores the view.
- **Security assertions carried over** from the Code and Paper views
  (`app.test.ts:408-472`, `:1374-1390`): the frame is on its own origin;
  `window.osDesktop` is undefined, and reaching the parent's is a
  `SecurityError`; `paper_skeleton.md` is 200, while `AGENTS.md`,
  `Code/README.md`, `.env`, and a listing of the project are 404;
  `/api/code-view/git`, `/api/chat/sessions`, and `/api/paper-wiki/status` are
  404; fetches to `app://research-os` and `app://paper-wiki` are blocked; an
  inline script does not run; and a CSP violation inside the frame is seen.
- **Checklist** (`client/README.md`):
  - the sentence at `:131-133` now marks only **Idea** and **Assets** "step 2";
  - add: "- [ ] **The Skeleton view.** In the `nanochat_cpu` workspace, click
    **Skeleton**: a card shows the working title, thesis, audience, and research
    question; under it **Claims and evidence** lists C1 to C5, each *verified*;
    the rest of `paper_skeleton.md` is folded by section. Click C2: on the right,
    its evidence as the skeleton states it, the file it names, and the study that
    uses it. The dark bar names `paper_skeleton.md:116 · claim C2`. **Ask the
    agent about this** adds a chip, with the exact text under it. Open a section
    and click a line: the bar names that line. Make the window narrow: the
    evidence opens under the claim. Have the agent change a claim's status, then
    click **Reload**: it changes."
- **Done:**
  - `npm test` and `npm run build` pass in `os-ui/frontend`;
  - `desktop.yml` passes on macOS, Windows, and Linux;
  - the checklist line is in, and the status section records any departure from
    this Part;
  - the Human Owner ticks the line on `nanochat_cpu`.

**2.2 Assets view.** It needs no decision and reuses 2.1's md-kit, for the Data
table, the README descriptions, and "Used in"; it adds the image queue, the folder
walk, and the CSV parser, which stays in its own `logic.ts`. What the pull request
holds:
- **Files:**
  - new: `os-ui/frontend/plugins/assets-view/` (manifest §4.1, `site/` as in
    2.1);
  - changed: `bundled.ts`; `layoutState.ts` (the Assets placeholder, `:127`);
    `registry.ts`; `pages.test.ts`; `protocol.test.ts` (`:215`); the e2e suite;
    the three READMEs or design files; this file.
- **Unit tests:**
  - the walk's caps and its states: no folder, empty, truncated;
  - the description rule (two descriptions in `nanochat_cpu`'s
    `Baselines/openresearch-demo/`);
  - Used in (`Code/results/summary.json` found in `paper_skeleton.md` and
    `Code/README.md`);
  - datasets (four rows in `nanochat_cpu`; on the template, no table and the
    bullet as the note);
  - the CSV parser (quotes, embedded line breaks, CRLF, a cut at 2 MiB, a
    100,000-character field);
  - sizes, labels, and the scans.
- **End-to-end:**
  - On `nanochat_cpu`: two figure cards whose `img` comes from
    `./_os/files?path=…Figs/…svg` with `naturalWidth > 0`; the Baselines,
    Results, and Datasets groups; the CSV panel's first rows and its count; a
    dataset's label `Code/README.md:208 · dataset karpathy/climbmix-400b-shuffle`;
    a chip; and nothing sent.
  - On the template project: "No Code/results/ folder this view can read",
    "Figs/ is empty", and the Datasets note.
  - Hostile files:
    - `MARKUP_NAME` (not on Windows) and the `ODD_NAMES` in `Figs/` and
      `Code/results/`;
    - an SVG with `<script>` and an external `<image href>`: nothing runs or
      loads;
    - a sparse 33 MiB CSV: the 413 screen in the panel;
    - 60 small PNGs in `Figs/e2e/`: every thumbnail loads in the end, with no
      busy card left.
  - Isolation as in 2.1: `Figs/…`, `Code/README.md`, and `paper_skeleton.md`
    are 200; `Code/tools/…`, `Code/nanochat/…`, `AGENTS.md`, `.env`, and a
    listing of `Code` are 404.
- **Checklist:** "- [ ] **The Assets view.** Click **Assets**: **Figures** shows the
  two training-curve pictures; **Reference runs**, **Results**, and **Datasets**
  list their files and the four datasets, each file with its size. Click a figure:
  it appears large on the right with where it is used. Click
  `training-metrics.csv`: its first rows and how many rows it has. Click a dataset:
  what `Code/README.md` says about it, and which line. Select any of them and ask:
  a chip appears, and nothing is sent." The `:131-133` sentence then marks only
  **Idea**.
- **Done:** as in 2.1.

**2.3 Idea view** (after the Human Owner's word on §5.1). It goes last because it
alone waits for a decision, and it reuses md-kit's tables and the claim-ID rule.
What the pull request holds:
- **Files:**
  - new: `os-ui/frontend/plugins/idea-view/`, with this manifest:

    ```jsonc
    { "contract": "^1.0", "id": "idea-view", "name": "Idea view", "version": "0.1.0",
      "description": "A project's idea_graph.md drawn as a graph, read-only.",
      "reads": ["projects-folder/*/idea_graph.md", "projects-folder/*/paper_skeleton.md"],
      "contributes": { "projectViews": [{ "id": "idea", "title": "Idea", "entry": "index.html" }] } }
    ```
  - changed: the Idea placeholder in `layoutState.ts` (`:124`), and the rest as
    in 2.2.
- **Unit tests:**
  - every grammar rule and problem message of §5.1 and §5.2;
  - §5.1's example as a fixture;
  - the layout: deterministic, no overlaps, links within a column, 50-node and
    200-node fixtures within 50 ms;
  - cycles;
  - claim pointers resolved against `nanochat_cpu`'s skeleton.
- **End-to-end:**
  - The copy of `nanochat_cpu` first shows the empty state. The suite then writes
    a fixture `idea_graph.md` into the copy (not the project's own file, which is
    2.4) and clicks **Reload**. The nodes appear by column, and the number of
    lines equals the links plus the `from:` pointers.
  - Clicking E2 opens its details, and the bar reads `idea_graph.md · E2
    (experiment)`; Ask adds a chip.
  - A malformed fixture shows the error screen, and a fixture with one bad row
    shows the problems line.
  - `MARKUP_TEXT` in a statement runs nothing.
  - Isolation as in 2.1, with `idea_graph.md` and `paper_skeleton.md` 200.
- **Checklist:**
  - first, on a project with no `idea_graph.md`, the explanation;
  - after 2.4: "Click **Idea**: the questions, experiments, results, and claims
    of `nanochat_cpu` as boxes in columns, joined by coloured lines. Click a
    node: its full text, its links, and what it points to appear above the map.
    Ask about it: a chip appears."
  - the `:131-133` sentence is removed.
- **Done:** as in 2.1. Acceptance on `nanochat_cpu` needs 2.4; until then the
  Human Owner sees the empty state there.

**2.4 `nanochat_cpu`'s `idea_graph.md`, and the template.** This is not a view; it
waits for the Human Owner's word on the format. It is its own change, after 2.3,
so that the view that checks the file is in place first.
- It writes the project's file from its own files, as the mockup drew it. Any
  link the files do not state (the mockup's two "inferred" ones) is either left
  out, or kept with its reason in Source.
- It adds `projects-folder/templates/ai_research_template/idea_graph.md` (an
  empty table under the format's rules) and a line in that template's
  `AGENTS.md`.
- If the Human Owner wants every project to have the file, it also adds
  `idea_graph.md` to `required_files` (`project-contract.toml:25-34`); the
  default is not to. `validate` checks only that templates and projects have the
  required files (`research-skills-hub/open-paper-skills/research-project-manager/scripts/manage_research_project.py:674-679`,
  `:706-710`), so a template file that is not required passes.
- `./verify.sh` runs the project contract check.

**2.5 Skills Hub as a plugin.** It moves the trunk's Skills page and
`/api/skill/toggle` into a bundled plugin with a left-navigation page and a
`toggle` handler (Part 1 §4). It depends on none of the three views. Under the
standing rules (`HANDOFF.md:106-108`), its page needs a mockup the Human Owner has
chosen, unless it keeps today's Skills page unchanged.

**2.6 Loading a plugin from a local folder.** It depends on Q-PO1 (Part 1 §6). It
also needs the contract frozen in the same commit (A1), file-root `reads`
included; enablement kept in `userData` (Risk 4); an enable screen that shows
`reads` (Risk 3); and `usePlugins()` fetching local manifests (Risk 6).

## 7. Questions for the Human Owner

**Answered 2026-11-23** ([HANDOFF.md](../HANDOFF.md) Decisions, "Idea file format"
and "Step 2 views, first version"): I-1, I-2, and I-3 as proposed; I-4, new
projects start with an empty `idea_graph.md` and the project check does not
require it; N-1, the chips of all three views open by themselves; N-3, the cited
file's own text is left out. N-2 and N-4 to N-7 stand on their defaults. The
questions are kept below as they were asked.

**These block the Idea view (2.3, 2.4) only.** If unanswered, the Idea view is not
started, while the Skeleton and Assets views go ahead.
- **I-1.** "The Idea view draws a file the agent writes: `idea_graph.md` in the
  project folder, a table with one row per question, hypothesis, experiment,
  result, or claim, and the columns ID, Kind, Statement, Status, Links, Points to,
  Source (an example is in os-ui/PLUGINS.md, Part 3 §5.1). Is that the file you
  want?" Default: yes, as specified there. The rest of §5.1 comes with it: how
  an experiment names its run (`commit: …; files: …`, with `none` when no commit
  was recorded), which kinds of node each link word may join, the IDs, and the
  limits of 200 nodes and 1,000 links.
- **I-2.** "For a claim, should the idea file use the same status words as the
  claims table in `paper_skeleton.md` (planned, verified, weak, removed) rather
  than the mockup's (draft, verified)?" Default: the skeleton's words.
- **I-3.** "To point to a claim, the claim in `paper_skeleton.md` must start with
  a short name such as `C1:`, as `nanochat_cpu`'s claims do. Is that rule all
  right for every project?" Default: yes.
- **I-4** (affects only 2.4). "Should every new project start with an empty
  `idea_graph.md`? And should the project check fail when a project has none?"
  Default: new projects start with one, and the check does not require it.

**These do not block anything.** If unanswered, the default stands.
- **N-1.** "When you add an item from the Idea, Skeleton, or Assets view to your
  message, should the exact text that will be sent open by itself under the
  message box, as it does for the Paper view, or stay closed until you click it,
  as for the Code view?" Default: it opens by itself in all three. That is the
  app's rule for any view not on its list.
- **N-2.** "When you ask about a claim, a line of the skeleton, or an idea node,
  should the agent get the line exactly as written in the file, with link
  addresses and marks such as `|` and backticks, or only the words the view
  shows?" Default: the line as written. Choosing "only the words shown" is what
  would let N-1's "stay closed" hold for Skeleton and Idea.
- **N-3.** "Next to a claim, the mockup showed what the cited file itself says.
  For any project, that means letting the Skeleton view read every file in the
  project folder, and choosing the passage by a rule that cannot be made
  reliable. Leave it out of the first version, and show only the names of the
  files the claim cites?" Default: leave it out.
- **N-4.** "The Assets view's 'Committed' line needs a second copy of the Code
  view's Git reader, the part of the app with the most safety checks. Leave it
  out of the first version? The Code view's Changes already shows the history."
  Default: leave it out.
- **N-5.** "Buttons that jump from a claim in the Skeleton view to its node in the
  Idea view, and back, need a new kind of message from a view to the app. Leave
  them out of the first version?" Default: leave them out.
- **N-6.** "A result says which experiment it came from. Draw that as a faint
  dotted line, as the mockup does, or leave it out of the drawing?" Default: the
  dotted line, which the legend names as not one of the four link words.
- **N-7.** "The Assets view describes a file only when a `README.md` in the same
  folder describes it. It shows no 'Made by' (no file records it), and it shows a
  table's row count when you open the file rather than in the list. All right?"
  Default: yes.

Still open from Part 1: Q-PO1. It blocks only 2.6.

## 8. Contradictions and impossibilities found

1. **Claim status words.** The mockup's format panel gives a claim "draft,
   verified" and calls verified "the word paper_skeleton.md already uses"
   (`views.html:1515`). The template's claims table offers "planned / verified /
   weak / removed" (template `paper_skeleton.md:161`). §5.1 takes the template's
   words (I-2).
2. **A fifth relation.** The mockup draws "came from" as a line beside the four
   link words (`views.html:810-812`, `:973`), while the decided vocabulary has
   four. §5.1 carries it as `from:` in Points to, and draws it only as a dotted
   line the legend sets apart (N-6).
3. **"Committed" cannot be built as drawn.** It is a constant for every file
   (`views.html:1410`), and under the contract the Assets view has no Git
   access (§1, fact 4).
4. **"What the source file says" cannot be a rule.** It is a per-claim switch
   written by hand (`views.html:1221-1231`), so it is dropped (N-3).
5. **The jump buttons need contract growth** (§1, fact 5), so they are dropped
   (N-5).
6. **"Inferred" links have no place in a file**: every row is a statement by
   whoever wrote it (`views.html:798`, `:803`).
7. **Kind is stated twice in the mockup**: it derives the kind from the ID's
   first letter (`views.html:792`) and also writes a Kind column (`:835`). §5.1
   keeps the column as the authority.
8. **"The datasets its code downloads"** (`HANDOFF.md:609`) is not something the
   app can read. The view shows what `Code/README.md`'s Data section lists.
9. **The acceptance on `nanochat_cpu`** (`HANDOFF.md:80-82`) can show only the
   Idea view's empty state until 2.4 lands, and 2.4 waits for I-1
   (`HANDOFF.md:610`). This is a dependency, not a contradiction.
