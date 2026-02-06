# Field Studio — Screen-by-Screen Critical Analysis

Individual deep-dive critiques for each screenshot, identifying specific problems and actionable fixes.

---

## Screenshot 1: Welcome Modal

![Welcome Modal](screenshots/welcome-modal.png)

### What This Screen Is
First-run onboarding modal that appears before users see the application.

### Critical Problems

#### 1.1 Unnecessary Modal Blocking Empty State
**The Problem:** Users see a modal on top of an empty application. This creates two layers of "nothing to do here." The empty state behind the modal could handle onboarding more elegantly.

**Why It Hurts:** 
- Adds a click barrier before users can explore
- Creates cognitive disconnection — users don't see the app they're about to use
- Modal fatigue — users instinctively want to close it

**The Fix:** 
- Remove the modal entirely
- Integrate this content into the empty state of the main view
- Use progressive disclosure — show simple welcome, then expand on interaction

#### 1.2 "Get Started" Button is Vague
**The Problem:** The primary CTA says "Get Started →" but doesn't indicate what will happen. Will it open a file picker? Show a tutorial? Take me to settings?

**Why It Hurts:** Users hesitate when button labels don't match their mental model. Uncertainty reduces click-through.

**The Fix:** 
- Change to "Import Your First Folder" or "Create New Archive"
- Add a secondary "Explore Demo Archive" for users who want to learn first

#### 1.3 Feature Bullets Don't Communicate Value
**The Problem:** Three bullet points describe features, not benefits:
- "Drag folders to import" — So what?
- "Metadata extracted" — Why do I care?
- "Export to web" — For what purpose?

**Why It Hurts:** Users don't care about features; they care about solving their problem.

**The Fix:** 
- Reframe as benefits:
  - "Organize thousands of photos in minutes"
  - "Automatically capture dates, locations, and camera info"
  - "Share your archive as a professional website"

#### 1.4 "I'm an advanced user" is Hidden
**The Problem:** Tiny text link at the bottom for a major mode selection.

**Why It Hurts:** Users who need advanced features won't find this. Users who accidentally click it will be confused.

**The Fix:** 
- Make this a secondary button, not a link
- Or better: remove the choice and allow mode switching from the main interface

#### 1.5 No Illustration or Visual Interest
**The Problem:** Generic icon (folder with sparkle) doesn't communicate the product's purpose.

**Why It Hurts:** Visual appeal drives engagement. This looks like a generic file manager.

**The Fix:** 
- Show a mini-preview of the application
- Or an illustration showing messy photos → organized archive
- Animation showing the transformation

### Grade: C
**Summary:** Functional but creates unnecessary friction. The content is good; the presentation (modal) is the problem.

### Specific Implementation
**File to Modify:** `components/WelcomeModal.tsx` (legacy location) or create new component

**Recommended Approach:**
```typescript
// Instead of modal, create inline onboarding
export const EmptyStateOnboarding = () => (
  <div className="flex flex-col items-center justify-center h-full p-12">
    <Illustration src="archive-transformation.svg" />
    <h1 className="text-2xl font-bold mt-8">Welcome to Field Studio</h1>
    <p className="text-muted text-center max-w-md mt-4">
      Transform your field research photos into organized, shareable digital archives.
    </p>
    <div className="flex gap-4 mt-8">
      <Button size="lg" onClick={onImport}>
        <FolderIcon className="mr-2" />
        Import Your First Folder
      </Button>
      <Button variant="secondary" size="lg" onClick={onExploreDemo}>
        Explore Demo Archive
      </Button>
    </div>
  </div>
);
```

---

## Screenshot 2: Choose Your Experience

![Choose Experience](screenshots/choose-experience.png)

### What This Screen Is
Mode selection dialog allowing users to pick Simple, Standard, or Advanced complexity.

### Critical Problems

#### 2.1 No Context for Decision
**The Problem:** Users see three options with minimal descriptions but zero context about:
- What will change when I select a mode?
- Can I switch later?
- Which mode is right for my use case?

**Why It Hurts:** Users cannot make an informed decision. They'll pick randomly or default to "Standard" without understanding.

**The Fix:** 
- Add a "Help me choose" link that explains each mode
- Show a preview of what the interface looks like in each mode
- Indicate that the choice can be changed in Settings
- Add use case examples: "Simple: Great for quick photo organization"

#### 2.2 Arrow Icons Suggest Navigation, Not Selection
**The Problem:** Each option has a "→" arrow on the right, which typically indicates "this will take you somewhere" rather than "this will select a mode."

**Why It Hurts:** Wrong mental model. Users expect navigation, not state change.

**The Fix:** 
- Replace arrows with radio buttons or selection indicators
- Or remove icons entirely and use card selection pattern

#### 2.3 "Simple" Description is Condescending
**The Problem:** "Focus on content, hide technical details" implies that wanting simplicity is for less capable users.

**Why It Hurts:** Creates shame for choosing the "easy" option.

**The Fix:** 
- Reframe as positive choice:
  - "Essential — Clean interface for quick organization"
  - "Complete — Full editing with all metadata fields"
  - "Expert — Advanced IIIF control and custom options"

#### 2.4 No Visual Differentiation Between Modes
**The Problem:** All three options look identical except for the icon. Users can't quickly scan and understand the differences.

**Why It Hurts:** Comparison requires reading every word. Visual cues should support scanning.

**The Fix:** 
- Use color coding (green for Simple, blue for Standard, purple for Advanced)
- Add complexity indicators (1 dot, 2 dots, 3 dots)
- Show feature comparison in expandable section

#### 2.5 "Back" Button Placement is Ambiguous
**The Problem:** "← Back" appears to take users back to the Welcome Modal, but that's already closed.

**Why It Hurts:** Navigation confusion. Where does "back" go?

**The Fix:** 
- Remove "Back" button — users can close modal with X or escape
- Or change to "Skip for now" which defaults to Standard mode

### Grade: D
**Summary:** Critical decision point with insufficient guidance. Users will choose randomly.

### Specific Implementation
**File to Modify:** Create new or modify complexity selection component

**Recommended Approach:**
```typescript
export const ExperienceSelector = () => (
  <div className="space-y-4">
    <div className="text-center mb-6">
      <h2>Choose Your Experience Level</h2>
      <p className="text-muted">You can change this anytime in Settings</p>
    </div>
    
    <RadioGroup>
      <ExperienceOption 
        value="simple"
        icon={<EssentialIcon />}
        title="Essential"
        description="Clean interface for quick photo organization"
        features={["Drag & drop import", "Basic metadata", "Quick export"]}
        color="green"
      />
      <ExperienceOption 
        value="standard"
        icon={<CompleteIcon />}
        title="Complete"
        description="Full editing with all metadata fields"
        features={["Everything in Essential", "Batch editing", "Custom fields"]}
        color="blue"
      />
      <ExperienceOption 
        value="advanced"
        icon={<ExpertIcon />}
        title="Expert"
        description="Advanced IIIF control and custom options"
        features={["Everything in Complete", "JSON editing", "Custom IDs"]}
        color="purple"
      />
    </RadioGroup>
  </div>
);
```

---

## Screenshot 3: Empty Archive View (Main Interface)

![Empty Archive](screenshots/empty-archive.png)

### What This Screen Is
The main application interface with no data imported yet.

### Critical Problems

#### 3.1 The Sidebar is Information Soup
**The Problem:** The left sidebar contains 7+ distinct sections with no visual hierarchy:
- Navigation items (Archive, Structure, Staging - this is not a thing - the original ingest is the staging, Catalog, Boards, Search, Trash does this need to be on the sidebar, Viewer)
- "ARCHIVAL MODEL" with "Files | IIIF" tabs
- "COMPLEXITY" toggle (Simple/Standard/Advanced)
- "IMPORT" section with Folder/Photos buttons
- "ACTIONS" with EXPORT button
- "SETTINGS" with Help/Settings/Field buttons

**Why It Hurts:** Users cannot scan the sidebar. Everything competes for attention equally.

**The Fix:** 
- Separate into three zones:
  1. **Navigation** (top) — Archive, Structure, Staging, etc.
  2. **Tools** (middle) — Import actions
  3. **Settings** (bottom, collapsed by default)
- Remove "ARCHIVAL MODEL" entirely — it's meaningless to users
- Move "COMPLEXITY" to a settings gear menu
- Hide "ACTIONS" until there's something to export

#### 3.2 "ARCHIVAL MODEL" Screams at Users
**The Problem:** All-caps label "ARCHIVAL MODEL" in the sidebar. No other labels use all-caps.

**Why It Hurts:** Visual inconsistency. This arbitrary emphasis suggests importance that isn't justified.

**The Fix:** 
- Remove this section entirely
- If filter is needed, label it "Filter by Type" with normal casing
- "Files | IIIF" tabs are meaningless — remove or relabel

#### 3.3 Empty State is Tiny and Sad
**The Problem:** "No items in archive" is small, centered text with even smaller subtext "Import files to get started building your archive."

**Why It Hurts:** This is a dead end. Users don't know what to do next.

**The Fix:** 
- Make empty state HUGE — fill the content area
- Add illustration or animation
- Include prominent CTA button
- Show steps: 1. Import → 2. Organize → 3. Export

#### 3.4 Complexity Toggle is Buried
**The Problem:** Three small pills at the bottom of the sidebar for a fundamental mode switch.

**Why It Hurts:** Users may never discover this. When they do, they won't understand its importance. Investigate what each toggle does

**The Fix:** 
- Move to a settings menu
- Or make it a first-class toggle in the header
- Show current mode indicator

#### 3.5 "EXPORT ARCHIVE" Button is Always Visible
**The Problem:** Giant blue button in sidebar for an action that requires having data first.

**Why It Hurts:** Creates false affordance. Users will click it and get an error.

**The Fix:** 
- Hide until data exists
- Or disable with tooltip: "Import files to enable export"

#### 3.6 No Visual Separation Between Sections
**The Problem:** Navigation items blend into tools blend into settings. No dividers, no spacing hierarchy.

**Why It Hurts:** Users can't form a mental model of the application's structure.

**The Fix:** 
- Add clear section headers with dividers
- Use spacing to group related items
- Consider collapsible sections

### Grade: D
**Summary:** The main interface is overwhelming and unfocused. The empty state wastes a critical onboarding opportunity.

### Specific Implementation
**Files to Modify:**
- `src/widgets/NavigationHeader/NavigationHeader.tsx` — Restructure navigation
- `src/features/archive/ui/organisms/ArchiveView.tsx` — Redesign empty state
- Create new sidebar component with proper hierarchy

**Recommended Approach:**
```typescript
// New sidebar structure
export const Sidebar = () => (
  <aside className="w-64 flex flex-col h-full">
    {/* Navigation */}
    <nav className="flex-1 p-4">
      <NavSection title="Views">
        <NavItem icon="archive" label="Archive" active />
        <NavItem icon="structure" label="Structure" />
        <NavItem icon="staging" label="Staging" />
        <NavItem icon="catalog" label="Catalog" />
        <NavItem icon="boards" label="Boards" />
        <NavItem icon="search" label="Search" />
      </NavSection>
      
      <Divider className="my-4" />
      
      <NavSection title="Import">
        <Button variant="secondary" fullWidth onClick={onImportFolder}>
          <FolderIcon className="mr-2" />
          Import Folder
        </Button>
      </NavSection>
    </nav>
    
    {/* Settings - Collapsed by default */}
    <div className="p-4 border-t">
      <SettingsMenu />
    </div>
  </aside>
);
```

---

## Screenshot 4: File Picker Dialog

![File Picker](screenshots/file-picker.png)

### What This Screen Is
Native OS file picker for selecting folders to import.

### Problems

#### 4.1 "Upload" Button is Misleading
**The Problem:** The button says "Upload" but the application is local-first. Nothing is uploaded to a server.

**Why It Hurts:** Creates false expectation of cloud storage. Users concerned about privacy will hesitate.

**The Fix:** 
- Change button label to "Import" or "Add to Archive"
- Add tooltip: "Files stay on your computer"

#### 4.2 No Guidance on What to Select
**The Problem:** Users see a file browser with no indication of:
- What folder structure works best
- How photos will be organized
- What file types are supported

**Why It Hurts:** Users may select wrong folder, leading to messy import.

**The Fix:** 
- Add sidebar to dialog with tips:
  - "Select a folder containing your photos"
  - "Subfolders will become collections"
  - "Supported: JPG, PNG, TIFF, RAW"

### Grade: B
**Summary:** Standard file picker that works fine. Minor labeling issue.

### Specific Implementation
**File to Modify:** The file picker is native, but the trigger button is in the sidebar import section.

---

## Screenshot 5: Staging Area

![Staging Area](screenshots/staging.png)

### What This Screen Is
Two-pane interface showing source files (left) and archive organization (right).

### Critical Problems

#### 5.1 Warning Banner Blends Into UI
**The Problem:** Yellow warning banner: "Some manifests are not in any collection..." looks like decoration, not important information.

**Why It Hurts:** Users will ignore warnings that look like part of the design.

**The Fix:** 
- Use stronger warning styling (red/orange, icon, dismiss button)
- Make dismissible with clear action
- Or better: fix the problem automatically or show inline

#### 5.2 Too Much Technical Metadata Visible
**The Problem:** Left pane shows:
- "3 manifests with detected sequence patterns"
- Manifest names with paths
- "14 canvases", "Simple numerical sequence" badges
- File counts in tiny text

**Why It Hurts:** Users must understand IIIF terminology (manifests, canvases) to use this screen.

**The Fix:** 
- In Simple mode: show just folders and photo counts
- Use friendly language: "14 photos" not "14 canvases"
- Hide sequence patterns until relevant

#### 5.3 Relationship Between Panes is Invisible
**The Problem:** Users see "Your Files" (left) and "Your Archive" (right) but the connection is unclear.

**Why It Hurts:** Drag-and-drop without visual affordances is undiscoverable.

**The Fix:** 
- Add visual connection between panes (arrow or flow line)
- Show drop zones explicitly
- Add "Drag files here" placeholder in empty archive
- Animate the relationship on first use

#### 5.4 "Unassigned Manifests" is Jargon
**The Problem:** Section title uses technical term "manifests" instead of user-friendly language.

**Why It Hurts:** Another barrier to understanding.

**The Fix:** 
- In Simple mode: "Photos not in a collection"
- In Advanced mode: keep technical terms

#### 5.5 "BIDRI (ROOT)" is Meaningless
**The Problem:** The root collection shows a cryptic name with "(ROOT)" parenthetical.

**Why It Hurts:** Technical implementation detail exposed to users.

**The Fix:** 
- Call it "My Archive" or "Top Level"
- Hide "(ROOT)" label entirely

#### 5.6 No Clear Action Path
**The Problem:** Users can see files and archive, but what do they do next?

**Why It Hurts:** No clear task flow.

**The Fix:** 
- Add prominent "Add to Archive" button
- Show drag handle icons on items
- Include tutorial overlay on first use

### Grade: C
**Summary:** Logical layout but overly technical. Drag-and-drop affordances missing.

### Specific Implementation
**Files to Modify:**
- `src/features/staging/ui/organisms/StagingView.tsx`
- `src/features/staging/ui/molecules/SourcePane.tsx`

**Recommended Approach:**
```typescript
// Simplified staging for Simple mode
export const StagingViewSimple = () => (
  <div className="flex h-full gap-6">
    <Pane title="Your Photos" subtitle={`${photoCount} photos found`}>
      <PhotoList photos={sourcePhotos} dragHandle />
    </Pane>
    
    <div className="flex items-center">
      <ArrowRightIcon className="text-muted" />
    </div>
    
    <Pane title="Your Archive" subtitle="Drag photos here to organize">
      {archive.collections.length === 0 ? (
        <DropZone onDrop={onDrop}>
          <DropIllustration />
          <p>Drag photos here</p>
          <p className="text-muted text-sm">or</p>
          <Button size="sm">Auto-organize by date</Button>
        </DropZone>
      ) : (
        <CollectionList collections={archive.collections} />
      )}
    </Pane>
  </div>
);
```

---

## Screenshot 6: Structure View (Tree)

![Structure View](screenshots/structure-view.png)

### What This Screen Is
Hierarchical tree view of the IIIF archive structure.

### Critical Problems

#### 6.1 Too Many Visual Elements Competing
**The Problem:** Tree contains:
- Folder icons
- Expand/collapse arrows
- "Expand All | Collapse All" links
- Search bar
- "My Archive" root
- "BIDRI" folder
- Color-coded item icons
- Depth indicator at bottom

**Why It Hurts:** Visual overload. Users can't focus on the content.

**The Fix:** 
- Remove "Expand All | Collapse All" — add to toolbar
- Simplify icons — use consistent style
- Move depth indicator to tooltip or status bar
- Add breathing room between items

#### 6.2 Search Bar Styling Doesn't Match
**The Problem:** Search input uses different border radius, padding, and placeholder text than other inputs in the app.

**Why It Hurts:** Inconsistency breaks user trust.

**The Fix:** 
- Use standard `SearchField` molecule component
- Ensure consistent styling across all inputs

#### 6.3 Status Bar is Overwhelming
**The Problem:** Bottom bar shows: "Depth: 6 | Types: Collection: 5, Manifest: 4, Canvas: 32, AnnotationPage: 32, Annotation: 32"

**Why It Hurts:** Technical data dump. Most users don't need this information.

**The Fix:** 
- In Simple mode: hide entirely or show "32 items in 5 collections"
- In Advanced mode: move to collapsible panel
- Use friendlier language: "5 albums, 32 photos"

#### 6.4 Tree Items Lack Clear Affordances
**The Problem:** Users can't tell what's:
- Clickable (to view)
- Editable (rename)
- Draggable (reorder)
- Right-clickable (context menu)

**Why It Hurts:** Discoverability failure.

**The Fix:** 
- Show hover states
- Add drag handles on hover
- Indicate editability with pencil icon on hover
- Use cursor changes

#### 6.5 "My Archive" vs "BIDRI" Confusion
**The Problem:** Two root-level items with unclear relationship.

**Why It Hurts:** Users don't understand the hierarchy.

**The Fix:** 
- Clarify structure:
  - "My Archive" (always present)
    - "BIDRI Project" (imported folder)
      - Sub-collections

### Grade: C
**Summary:** Functional tree but visually noisy. Technical details overwhelm.

### Specific Implementation
**Files to Modify:**
- `src/features/structure-view/ui/organisms/StructureTreeView.tsx`
- `src/features/structure-view/ui/molecules/TreeNodeItem.tsx`

---

## Screenshot 7: Archive Grid (With Content)

![Archive Grid](screenshots/archive-grid.png)

### What This Screen Is
Grid view of archive items with selection capability.

### Problems

#### 7.1 Badge Meanings Are Unclear
**The Problem:** Images have small colored badges (green, blue) with icons. What do they mean?

**Why It Hurts:** Users don't understand the visual language.

**The Fix:** 
- Add tooltips explaining badges
- Or use legend/key
- In Simple mode: hide badges

#### 7.2 Selection Toolbar Appears Below Grid
**The Problem:** When items are selected, the toolbar shows below the grid, far from the selection action.

**Why It Hurts:** Disconnect between action and feedback.

**The Fix:** 
- Float toolbar above grid
- Or use sticky toolbar at top
- Show inline with selected items

#### 7.3 No Zoom/Density Controls
**The Problem:** Grid shows fixed-size thumbnails. No way to see more or fewer items.

**Why It Hurts:** Inflexible for different screen sizes and user preferences.

**The Fix:** 
- Add zoom slider
- Or view options: Small / Medium / Large
- Remember preference

#### 7.4 Filename Truncation is Aggressive
**The Problem:** Filenames like "BHC001_BID_LAXMI..." are cut off with ellipsis.

**Why It Hurts:** Users can't identify items by name.

**The Fix:** 
- Show full name on hover
- Use multi-line if needed
- Or show metadata instead of filename

#### 7.5 Selection Border is Subtle
**The Problem:** Selected item has blue border, but it's not prominent enough.

**Why It Hurts:** Hard to see what's selected, especially with multiple items.

**The Fix:** 
- Stronger border
- Background color change
- Checkmark overlay

### Grade: B
**Summary:** Functional grid with minor usability issues.

### Specific Implementation
**Files to Modify:**
- `src/features/archive/ui/organisms/ArchiveGrid.tsx`
- `src/shared/ui/molecules/SelectionToolbar.tsx`

---

## Screenshot 8: Metadata Editor

![Metadata Editor](screenshots/metadata-editor.png)

### What This Screen Is
Spreadsheet-style table for editing item metadata.

### Critical Problems

#### 8.1 Spreadsheet is Unreadable
**The Problem:** 12+ columns crammed into view:
- Column headers truncated ("NAVDATE", "TECHNICAL")
- Alternating row backgrounds with poor contrast
- No visual grouping of related fields
- Tiny text everywhere

**Why It Hurts:** This is a data dump, not a designed interface.

**The Fix (Complete Redesign):**
- Move to card-based or form-based editing
- Show ONE item at a time with clear navigation
- Group related fields (Basic Info, Technical, Rights)
- Use appropriate input types (date picker for dates)

#### 8.2 Edit Affordances Are Missing
**The Problem:** Users can't tell which fields are editable or how to edit them.

**Why It Hurts:** Interaction discovery failure.

**The Fix:** 
- Show edit icons on hover
- Use inline editing with clear focus states
- Save automatically or show explicit save/cancel

#### 8.3 No Visual Hierarchy in Data
**The Problem:** Every field has equal weight. "ID" (system field) same prominence as "Label" (user field).

**Why It Hurts:** Important fields get lost.

**The Fix:** 
- Primary fields larger/bolder
- System fields muted
- Group by importance

#### 8.4 Dates are Unreadable
**The Problem:** Dates shown as "2017-06-27T20:03:02Z" — ISO format is not human-friendly.

**Why It Hurts:** Users can't quickly understand dates.

**The Fix:** 
- Format: "June 27, 2017 at 8:03 PM"
- Show relative time where appropriate
- Allow editing via date picker

#### 8.5 Technical Data Overwhelms
**The Problem:** "Exposure: 1/8, Aperture: f/3.2" etc. shown in same table as user-editable fields.

**Why It Hurts:** Users don't know what they can change vs. what's read-only.

**The Fix:** 
- Separate read-only technical metadata
- Or put in expandable section
- Use different styling

### Grade: F
**Summary:** This screen is hostile to users. Complete redesign required.

### Specific Implementation
**Files to Modify:**
- `src/features/metadata-edit/ui/organisms/MetadataEditorPanel.tsx`

**Recommended Approach (Complete Rewrite):**
```typescript
// Card-based metadata editing
export const MetadataEditor = ({ item }) => (
  <div className="max-w-2xl mx-auto">
    <ItemPreview item={item} size="large" />
    
    <FormSection title="Basic Information" icon="info">
      <TextField label="Title" value={item.label} onChange={...} />
      <TextArea label="Description" value={item.summary} onChange={...} />
      <DateField label="Date Created" value={item.navDate} onChange={...} />
    </FormSection>
    
    <FormSection title="Rights & Licensing" icon="shield">
      <SelectField label="Rights Statement" options={rightsOptions} />
      <TextField label="Attribution" value={item.attribution} />
    </FormSection>
    
    <FormSection title="Technical Details" icon="cog" collapsed>
      <ReadOnlyField label="Camera" value={item.technical.camera} />
      <ReadOnlyField label="Exposure" value={item.technical.exposure} />
    </FormSection>
  </div>
);
```

---

## Screenshot 9: Board Design Canvas

![Board Design](screenshots/board-design.png)

### What This Screen Is
Empty canvas for creating visual boards/relationships between items.

### Critical Problems

#### 9.1 Empty State is Confusing
**The Problem:** Tiny grid icon, generic text "Start Designing Your Board", and one button.

**Why It Hurts:** Users don't understand:
- What a "board" is
- Why they would create one
- What the result looks like

**The Fix:** 
- Show example boards (gallery)
- Include video tutorial
- Start with template, not empty canvas

#### 9.2 No Value Proposition
**The Problem:** "Drag items from the archive or sidebar to arrange them on the canvas. Create connections between items to build relationships."

**Why It Hurts:** Describes mechanics, not benefits.

**The Fix:** 
- Reframe: "Create visual stories by connecting photos, videos, and documents"
- Show examples: "Photo essay", "Timeline story", "Comparison board"

#### 9.3 Single CTA is Not Compelling
**The Problem:** "Browse Archive" button doesn't explain what will happen.

**Why It Hurts:** Users need to leave this screen to add items. No clear path.

**The Fix:** 
- Add items inline with picker
- Or start with template that has sample items
- Include "Create from Archive" and "Start with Template" options

#### 9.4 No Examples or Templates
**The Problem:** Users face a blank canvas with no inspiration.

**Why It Hurts:** Blank canvas syndrome. Users don't know where to start.

**The Fix:** 
- Show template gallery:
  - "Photo Narrative" — connect photos in sequence
  - "Comparison" — side-by-side items
  - "Map Story" — items on geographic layout
- Include "Start with Demo" option

### Grade: D
**Summary:** Feature is undiscoverable and intimidating. Needs complete onboarding redesign.

### Specific Implementation
**Files to Modify:**
- Create new: `src/features/board-design/ui/organisms/BoardCanvas.tsx`

---

## Screenshot 10: Global Search

![Global Search](screenshots/global-search.png)

### What This Screen Is
Search interface for finding content across the archive.

### Problems

#### 10.1 "Updating Search Index" with No Progress
**The Problem:** Spinner with text "Updating Search Index..." but:
- No progress indicator
- No time estimate
- No cancel option
- No explanation of what this means

**Why It Hurts:** Users feel trapped. Is it stuck? Should they wait?

**The Fix:** 
- Show progress bar
- Add "This may take a few minutes for large archives"
- Allow cancel
- Do this in background, not blocking

#### 10.2 Type Filters Look Disabled
**The Problem:** Toggle pills "Manifest | Canvas | Annotation" appear grayed out.

**Why It Hurts:** Users think they can't interact with them.

**The Fix:** 
- Use standard toggle styling
- Show selected state clearly
- Add counts to each option

#### 10.3 No Search Tips or Examples
**The Problem:** Empty search field with placeholder "Search for manifests, annotations, content..."

**Why It Hurts:** Users don't know what they can search for.

**The Fix:** 
- Add examples below:
  - "Try: 'sunset', 'archaeological site', '2017'"
- Show recent searches
- Include search syntax help

#### 10.4 No Results State Shown
**The Problem:** Screen shows loading state, but no empty state designed.

**Why It Hurts:** Users will see blank screen if search returns nothing.

**The Fix:** 
- Design "No results" state with suggestions
- Include "Did you mean?" for typos
- Offer to search in different categories

### Grade: C
**Summary:** Functional but lacks polish and user guidance.

### Specific Implementation
**Files to Modify:**
- `src/features/search/ui/organisms/SearchView.tsx`

---

## Summary: Priority Fixes by Screen

| Screen | Grade | P0 Fix Required |
|--------|-------|-----------------|
| Welcome Modal | C | Remove modal, integrate into empty state |
| Choose Experience | D | Add preview, guidance, and context |
| Empty Archive | D | Redesign sidebar, fix empty state |
| File Picker | B | Minor — change "Upload" to "Import" |
| Staging | C | Simplify language, add drag affordances |
| Structure View | C | Reduce visual noise, hide technical details |
| Archive Grid | B | Minor — fix selection toolbar placement |
| **Metadata Editor** | **F** | **Complete redesign required** |
| Board Design | D | Add templates and onboarding |
| Search | C | Add progress and guidance |

**Overall Recommendation:**
- Immediate: Fix Metadata Editor (complete rewrite)
- This week: Redesign sidebar and empty states
- This month: Add onboarding flows and templates
