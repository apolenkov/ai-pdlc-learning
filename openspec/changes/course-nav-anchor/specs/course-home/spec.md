## ADDED Requirements

### Requirement: Route navigation begins at the learning path
The map SHALL show its fixed route panel only from `course-introduction-title`, without reserving space above the introduction or shifting content when visibility changes. Guide pages SHALL keep their existing always-visible route behavior.

#### Scenario: Scroll through the map
- **WHEN** the introduction reaches the area below the global menu
- **THEN** the whole route appears and remains below that menu; scrolling back above the introduction hides it

#### Scenario: Read the route on a phone
- **WHEN** the viewport is 390 or 1440 pixels wide
- **THEN** all three groups and every existing number (1–8, 9а, 9б, 10) are visible without clipping or scrolling inside the panel; 9б remains lowercase and legible

### Requirement: Lesson films play at the beginning of the lesson
Each available primary lesson film SHALL use the shared player at the lesson goal, with chapters and title overlays, without duplicate players or download/new-tab video links. The extra 3+ film SHALL stay in its existing slot.

#### Scenario: Open a lesson on a phone
- **WHEN** a lesson with a film is opened at 390 pixels
- **THEN** the primary player fills its available width beside the lesson goal and the ending overlay stays within the upper 60 percent of the video, clear of playback controls
