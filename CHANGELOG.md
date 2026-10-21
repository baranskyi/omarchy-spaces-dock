# Changelog

## 0.1.0

First release: Spaces moved from the bar into a dock at the bottom of the screen.

- The dock is a `keepLoaded` service plugin with its own layer-shell window per monitor.
- New settings: dock height, alignment, monitors, bottom margin, reserve space, and hide with the bar.
- Icon size now goes up to 64 px. Pills, labels, spacing and badges scale with the dock height.
- The settings panel and previews open upward from the dock.
- Tooltips get their own window above the dock. Hovered items now report `tooltipHovered`, which the upstream widget lacked, so its tooltips never showed.
- Settings can be copied from the Spaces bar widget over IPC.
- The agent hook notifies both the dock and the Spaces bar widget.

Forked from Spaces 1.0.0 by Tornike Gomareli, commit f8306d7.
