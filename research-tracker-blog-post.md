# Leveling Up Your Debate Software 5: Research Tracker Extension

Everyone in debate knows this workflow: you find a good article, copy the URL, paste it into Verbatim, then spend 30 seconds manually typing out the author, publication, date, and other bibliographic information. Sometimes the metadata is obvious—the author is right there at the top of the article. Sometimes it's hidden in tiny gray text at the bottom. Sometimes it's in a weird format that makes you squint to figure out if "2023-01-15" means January or March. And sometimes—worst of all—the automatic extraction gives you garbage, and you end up manually retyping everything anyway.

**No more.**

The Research Tracker Extension is fundamentally a **citation creation tool** that eliminates the tedious work of bibliographic data entry. Press Ctrl+Q on any webpage, and it copies a properly formatted citation to your clipboard, ready to paste into Verbatim using [Fast Debate Paste](https://debate-decoded.ghost.io/leveling-up-verbatim/). As a bonus, it also tracks your entire research process—every search, every page visit, every note—creating a record that helps students reflect on their research strategies and helps coaches diagnose research problems.

[**SCREENSHOT SUGGESTION: Show a webpage with the floating citation preview in the bottom-right corner, and the Ctrl+Q keyboard shortcut overlay demonstrating the copy function**]

## The Problem: Citation Creation Is Tedious

If you've used Aaron Hardy's Modern Cite Creator extension, you know the basic promise: click a button, get a citation. It's already a huge improvement over manual data entry. But it has limitations:

1. **Generic metadata extraction**: It uses the same baseline script for every website, which means it often misses site-specific metadata formats. Brookings articles have a different HTML structure than NBER working papers, which have a different structure than New York Times articles.

2. **No graphical editing interface**: If the automatic extraction fails or gets something wrong, you're stuck manually copying the citation text and editing it in Verbatim. There's no way to fix the metadata in the extension itself.

3. **No smart lookup**: If you're on a PDF or a webpage that doesn't have embedded metadata, you can't tell the extension "hey, the DOI is 10.1234/example.2024, go fetch the correct citation data."

4. **Fixed formatting**: The citation format is what it is. You can't easily adapt it to debate-specific needs or handle edge cases like missing information.

These aren't criticisms of Hardy's extension—it's a solid tool that works well for many use cases. But for debate research, where you're pulling from diverse sources (academic journals, think tank reports, news articles, legal databases) and need citation formats that include quals and other debate-specific fields, there's room for improvement.

## The Solution: Smart Citation Creation

Research Tracker builds on Aaron Hardy's excellent work with Modern Cite Creator. The basic idea—using keyboard shortcuts to quickly extract and copy citations—comes directly from Hardy's extension, and many of the design details (like using shortcuts to update specific metadata fields) are shamelessly cribbed from his implementation. Credit where it's due: Hardy figured out the right UX patterns for citation creation in a browser extension.

Research Tracker extends this foundation with four major improvements tailored specifically for debate research workflows:

### 1. Improved Automatic Bibliographic Detection

The extension includes **specialized extractors for 70+ websites** commonly used in debate research, meaning it knows exactly where to look for metadata on:

- Academic sources (arXiv, PubMed, JSTOR, SSRN, NBER)
- Major publishers (Nature, Springer, Wiley, ScienceDirect, SAGE)
- News organizations (NYT, WaPo, WSJ, Guardian, Reuters, Bloomberg)
- Think tanks (Brookings, RAND, Cato, Heritage, CNAS, CSIS, and 20+ more)
- Legal databases (LexisNexis)

A Brookings article gets Brookings-specific extraction logic. An NBER working paper gets NBER-specific logic. The extension doesn't treat all websites the same—it knows the idiosyncrasies of each source.

This means **higher accuracy** on first-pass extraction. You're not constantly fixing the author field because the extension grabbed the website's copyright notice instead of the actual author. The metadata extraction understands the structure of sources debaters actually cite.

For websites without specialized extractors, the extension falls back to a smart baseline that looks for common metadata patterns (Open Graph tags, Schema.org markup, Dublin Core metadata). So even on random websites, you get better results than manual typing.

[**SCREENSHOT SUGGESTION: Show side-by-side comparison of a Brookings article with correctly extracted metadata (author, think tank affiliation, publication date) vs. what a generic extractor might capture**]

### 2. Graphical Interface for Editing Bibliographic Information

This is the big quality-of-life improvement. When automatic extraction fails or needs adjustment, you don't edit raw text—you edit **structured fields** in a clean modal interface.

Press the "Edit Metadata" button (or use keyboard shortcuts—more on this below), and you get a form with separate fields for:

- Title
- Author(s)
- Date
- Journal/Publication
- Volume/Issue
- Pages
- DOI/ISBN/Other Identifiers
- **Quals** (yes, quals is a first-class field—this is for debate)
- Content type (journal article, book, webpage, etc.)

Each field is independently editable. If the author is wrong but the date is right, you fix just the author. The extension remembers your manual edits **across sessions**—if you fix the metadata for a specific article, that correction persists. Visit that URL again next month, and your edits are still there.

[**SCREENSHOT SUGGESTION: Show the metadata editing modal with all fields visible, highlighting the "quals" field and the "Content Type" dropdown**]

### 3. Smart Lookup from Identifiers

This is where things get powerful. You're reading a PDF that doesn't have embedded metadata. You can see the DOI printed on the first page: `10.1257/aer.20181169`

In a generic citation tool, you're stuck manually typing everything. In Research Tracker:

1. Highlight the DOI
2. Press **Ctrl/Cmd+0** (or click "Smart Lookup" in the metadata modal)
3. The extension queries external APIs (CrossRef, OpenLibrary, PubMed) and auto-fills all the fields

This works for DOIs, ISBNs, PMIDs, and arXiv IDs. The extension recognizes the identifier format and routes the query to the appropriate database.

Even better: you can use **Ctrl/Cmd+1 through Ctrl/Cmd+8** to set specific fields from selected text:

- **Ctrl/Cmd+1**: Set author from selection
- **Ctrl/Cmd+2**: Set quals from selection
- **Ctrl/Cmd+3**: Set date from selection
- **Ctrl/Cmd+4**: Set title from selection
- **Ctrl/Cmd+5**: Set journal from selection
- **Ctrl/Cmd+6**: Set publication info (volume/issue)
- **Ctrl/Cmd+7**: Set pages from selection
- **Ctrl/Cmd+8**: Set identifier (DOI/ISBN/etc.) from selection

This means you can rapidly fix metadata without opening the modal. See the author's name in the PDF? Highlight it, hit Ctrl/Cmd+1, done. See the date? Highlight, hit Ctrl/Cmd+3, done.

[**SCREENSHOT SUGGESTION: Show a PDF with a DOI highlighted, and an overlay demonstrating Ctrl/Cmd+0 triggering the smart lookup with a loading indicator**]

### 4. Adaptive Citation Formatting

The extension supports **multiple citation formats** (APA, MLA, Chicago, Harvard, IEEE) plus **custom templates**. But the killer feature is adaptive formatting based on available information and source type.

Custom templates use variable substitution:

```
{authorShort} {yearShort}, {quals}, "{title}," {journal}, {publicationInfo}, {pages}, {date}, {url}
```

This produces debate-style citations like:

> Smith '23, Professor of Economics at MIT, "The Impact of Trade Policy," Journal of Economic Perspectives, Vol. 37 No. 2, pp. 45-67, March 2023, https://example.com

The variables automatically adapt based on what information is available. If there's no journal (because it's a think tank report), the template skips that field. If there's no page range (because it's a webpage), it omits it. You're not stuck with citations that say "pp. N/A" or have awkward blank spots.

You can also configure **URL replacement** rules:
- Use DOI instead of URL when available (cleaner, more stable)
- Replace database URLs with database names (e.g., "JSTOR" instead of "https://www.jstor.org/stable/12345")

This flexibility means the citation format adapts to the source type. Academic papers get journal citations. News articles get newspaper citations. Think tank reports get think tank citations. All from the same template.

[**SCREENSHOT SUGGESTION: Show the citation settings modal with custom template editor and variable list visible**]

### The Core Workflow: Ctrl+Q

Here's what the actual research workflow looks like:

1. You're on a webpage with an article you want to cite
2. Press **Ctrl+Q**
3. A formatted citation copies to your clipboard
4. Paste it into Verbatim using Fast Debate Paste shortcuts

That's it. No opening modals, no clicking buttons, no manual data entry. The extension runs in the background, automatically extracting metadata from every page you visit. When you need a citation, hit Ctrl+Q.

If the auto-extracted metadata is wrong, you can fix it with keyboard shortcuts (Ctrl/Cmd+1-8) or open the edit modal. But for most sources with specialized extractors, the first-pass extraction is accurate enough that you never need to intervene.

The **Ctrl+Q shortcut is intentionally designed to work with Fast Debate Paste**, maintaining the same keyboard-driven workflow you already use for card cutting. No context switching between mouse and keyboard. Everything stays in muscle memory.

[**SCREENSHOT SUGGESTION: Show the keyboard shortcuts help modal with all shortcuts listed**]

## Bonus Feature: Research Tracking

While the primary purpose is citation creation, the extension also tracks your entire research process as a side benefit. This is useful for:

### For Students: Reflecting on Research Strategies

Research gets better when you can analyze what's working. The extension automatically captures:

- Every search query you run (Google, Google Scholar, Bing, DuckDuckGo, Google News, LexisNexis)
- Every page you visit from those searches
- The relationship between searches and pages (which search led you to which evidence)
- Notes you add about specific pages or searches

All of this gets organized into **research sessions**—discrete time periods you can name, pause, resume, and export.

After a research session, you can export it and review:
- Which search queries led to good evidence
- Which sources you're relying on too heavily
- What your research path looked like chronologically
- Where you got stuck or went down rabbit holes

This kind of reflection is impossible when research is ephemeral. With Research Tracker, you have a complete record of your research process that you can analyze and improve.

[**SCREENSHOT SUGGESTION: Show a completed research session in the export view (JSON or TXT format) with search queries connected to resulting page visits**]

### For Coaches: Diagnosing Research Problems

How many times have you had this conversation?

**Coach**: "Did you look for evidence on [topic]?"

**Student**: "Yeah, I couldn't find anything."

**Coach**: "What did you search?"

**Student**: "Um... I don't remember. Like, '[topic] evidence' or something?"

With Research Tracker, this conversation changes. The student exports their research session and the coach can see:

- The exact search queries the student tried
- What sources they looked at
- How much time they spent on different pages
- Whether they explored related angles or gave up too quickly

This diagnostic capability is valuable for teaching research skills. Instead of vague advice like "search better," coaches can point to specific problems: "You searched '[topic]' but you didn't try '[topic] + [specific angle]'. Here's why that matters..."

[**SCREENSHOT SUGGESTION: Show the "View All Sessions" modal displaying multiple research sessions with statistics—number of searches, pages visited, duration—to illustrate how coaches can review student research activity**]

### Session Management

The extension stores research sessions with unlimited capacity (using IndexedDB). The main popup shows your 20 most recent sessions. Click "View All Sessions" to browse your entire research history.

For each session, you can:

- **Resume**: Pick up where you left off (useful for multi-day research projects)
- **Rename**: Give sessions descriptive names ("Econ DA Research - Jan 2025")
- **Export**: Download as JSON or TXT
- **Delete**: Remove sessions you don't need

Export formats:
- **JSON**: Structured data with complete metadata, relationships between searches and pages, timestamps, notes. Designed for eventual integration with a research visualizer (coming soon) that will let you graphically explore your research patterns.
- **TXT**: Human-readable summary—perfect for sharing research logs with coaches or partners

[**SCREENSHOT SUGGESTION: Show a session in the sessions list with all action buttons visible (Resume, Rename, Export JSON, Export TXT, Delete)**]

## Setup & Installation

**Requirements:**
- Chrome browser (the extension uses Chrome-specific APIs)
- ~10 seconds of your time

**Installation Steps:**

1. Download the extension ZIP from the [GitHub releases page](https://github.com/ant981228/research-tracker-extension/releases/latest)

2. Extract the ZIP to a **permanent location** on your computer. This is important—the extension loads from this folder, so if you delete it, the extension breaks.

3. Open Chrome and navigate to `chrome://extensions/`

4. Enable "Developer mode" (toggle in the top-right corner)

5. Click "Load unpacked" and select the extracted folder

6. Pin the extension to your toolbar for easy access

[**SCREENSHOT SUGGESTION: Show the chrome://extensions page with Developer mode enabled and the "Load unpacked" button highlighted**]

That's it. The extension is now installed and ready to create citations.

## Using the Extension

### Basic Citation Creation

The simplest workflow requires no interaction with the extension at all:

1. Visit any webpage
2. Press **Ctrl+Q** to copy the citation
3. Done

The extension automatically extracts metadata in the background. When you press Ctrl+Q, it formats a citation based on your configured citation style and copies it to your clipboard.

If you want to see the citation before copying, enable the **citation preview** in settings. This adds a small floating box in the bottom-right corner of every webpage showing the formatted citation. The preview updates automatically as you navigate between pages.

### Editing Metadata

If the auto-extracted metadata is wrong or incomplete:

1. Click the extension icon in your toolbar
2. Click "Edit Metadata" (or just use the keyboard shortcuts)
3. Fix the fields that need adjustment
4. Press Ctrl+Q to copy the corrected citation

Your manual edits persist across sessions. Fix it once, and it's fixed permanently for that URL.

### Starting a Research Session (Optional)

If you want to track your research process:

1. Click the extension icon
2. Click "Record"
3. Optionally name your session

The extension icon shows a red "REC" badge while recording. Research normally—the extension captures everything automatically. When you're done, click "Stop Recording" to save the session.

[**SCREENSHOT SUGGESTION: Show browser toolbar with the extension icon displaying the red "REC" badge during an active session**]

## Advanced Tips

**1. Master the keyboard shortcuts**

The Ctrl/Cmd+1-8 shortcuts for setting metadata from selected text are *way* faster than opening the modal. When you're reading a PDF or a webpage with visible metadata, just highlight and hit the corresponding shortcut.

**2. Customize your citation template**

The default formats (APA, MLA, etc.) are fine, but debate citations often need custom formatting. Create a custom template that matches your team's citation style, then never think about formatting again.

**3. Use URL replacement rules**

Configure the extension to use DOIs instead of URLs when available. DOIs don't break when websites reorganize. Also set up database URL replacement so you get clean citations like "JSTOR" instead of long database URLs.

**4. Export research sessions regularly**

If you're using the tracking feature, export sessions and store them in a team shared folder. This creates backup redundancy and makes research shareable with partners and coaches.

## A Word of Caution (and Future Development)

**Current limitations:**

1. **Chrome-only**: The extension uses Chrome-specific APIs and won't work in Firefox or Safari without significant rewrites.

2. **Metadata extraction isn't perfect**: The extension includes specialized extractors for 70+ sites, but websites change their HTML structure, and some sites don't expose metadata in easily extractable formats. You'll occasionally need to manually fix metadata.

3. **No automatic cloud sync**: Everything is stored locally in your browser. If you use multiple computers, you need to manually export/import sessions. (This is actually a privacy feature—your research stays on your machine—but it means no automatic cross-device sync.)

4. **The visualizer doesn't exist yet**: The JSON export is structured for visualization, but the actual visualization tool (which will let you graphically explore research patterns) is under development.

**What's coming:**

- **Research visualizer** for graphical analysis of research patterns
- **Improved metadata extraction** as sites update their structures
- **Potential Firefox support** (if there's demand and time)

## The Bigger Picture

Research Tracker fits into a broader philosophy about debate software: **make invisible work visible** and **automate tedious tasks**.

[Fast Debate Paste](https://debate-decoded.ghost.io/leveling-up-verbatim/) makes card formatting automatic. [BlockSearch](https://debate-decoded.ghost.io/blocksearch-making-large-files-usable/) makes file navigation instant. Research Tracker makes citation creation automatic.

The goal is to reduce cognitive overhead. You shouldn't have to think about formatting citations—the computer should do that. You shouldn't have to manually track your research—the computer should do that. You should spend your time *thinking about arguments*, not wrangling with software.

The citation creation functionality is immediately useful. The research tracking functionality provides long-term value for skill development. Both are designed to disappear into the background, letting you focus on the actual work of debate research.

## Download & Feedback

**Get the extension:**
- [GitHub Releases](https://github.com/ant981228/research-tracker-extension/releases/latest)
- Full documentation in README.md (included in download)
- Troubleshooting guide for common issues

**Report issues or request features:**
- [GitHub Issues](https://github.com/ant981228/research-tracker-extension/issues)

**Questions or suggestions?**
- Comment on this post or reach out through the usual channels

The extension is open-source. If you're technically inclined and want to add support for a new website's metadata extraction, check the ADDING_NEW_EXTRACTORS.md guide in the download.

---

*This is the fifth post in the "Leveling Up Your Debate Software" series. Previous posts covered [Fast Debate Paste](https://debate-decoded.ghost.io/leveling-up-verbatim/), [automatic citation processing](https://debate-decoded.ghost.io/leveling-up-your-debate-software-2-automatic-cites-and-quals-processing/), [Stylepox curing](https://debate-decoded.ghost.io/leveling-up-your-debate-software-3-curing-stylepox/), and [BlockSearch](https://debate-decoded.ghost.io/blocksearch-making-large-files-usable/).*
