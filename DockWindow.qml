import QtQuick
import Quickshell
import Quickshell.Wayland
import qs.Commons
import qs.Ui
import "Model.js" as Model

// One dock per monitor: a bottom-anchored layer-shell surface that hosts the
// Spaces content. The window is declared statically by Service.qml's Variants
// and only toggles `visible`; recreating windows that hold ScreencopyViews can
// leave a stale layer surface behind and wedge screen capture.
PanelWindow {
  id: dockWindow

  required property var service

  readonly property var cfg: service.cfg
  readonly property int dockHeight: cfg.dockHeight
  readonly property string screenName: screen ? String(screen.name || "") : ""
  readonly property bool selected: Model.screenSelected(cfg.monitors, screenName, service.primaryScreenName, service.screenNames)
  readonly property bool hiddenWithBar: cfg.hideWithBar && service.barHidden
  readonly property bool full: cfg.alignment === "full"
  property alias spaces: spaces

  visible: service.ready && selected && !hiddenWithBar

  anchors {
    bottom: true
    left: true
    right: true
  }
  implicitHeight: dockHeight
  margins.bottom: cfg.bottomMargin

  // Normal mode with an explicit zone: reserve the dock's height (the
  // compositor adds the bottom margin), or reserve nothing and float over
  // windows while still stacking above other bottom bars.
  exclusionMode: ExclusionMode.Normal
  exclusiveZone: cfg.reserveSpace ? dockHeight : 0

  color: "transparent"
  surfaceFormat.opaque: false
  WlrLayershell.namespace: "omarchy-spaces-dock"
  WlrLayershell.layer: WlrLayer.Top
  WlrLayershell.keyboardFocus: WlrKeyboardFocus.None

  // Clicks outside the dock and its islands fall through to the windows below.
  mask: Region {
    item: dockSurface
    Region { item: playerIsland }
    Region { item: statsIsland }
  }

  // ------------------------------------------------------------ stand-in bar

  // Spaces and the shared Ui popups expect the bar facade third-party widgets
  // get (Ui/PluginBarApi.qml). This provides the members they read.
  QtObject {
    id: dockBar

    readonly property string position: "bottom"
    readonly property bool vertical: false
    readonly property int barSize: dockWindow.dockHeight
    readonly property color foreground: Color.bar.text
    readonly property color barForeground: Color.bar.text
    readonly property color background: Color.bar.background
    readonly property color urgent: Color.bar.active
    readonly property string fontFamily: Style.font.family
    readonly property bool transparent: false
    readonly property var clickTargets: []
    property var activePopout: null

    // One popout at a time per dock, like the bar's coordinator.
    function requestPopout(owner) {
      var current = dockBar.activePopout
      if (current && current !== owner) {
        if (typeof current.closeForPopoutSwitch === "function") current.closeForPopoutSwitch()
        else if (typeof current.close === "function") current.close()
      }
      dockBar.activePopout = owner
    }

    function releasePopout(owner) {
      if (dockBar.activePopout === owner) dockBar.activePopout = null
    }

    function switchPanelFrom(owner, direction) { return false }

    function targetBelongsToWindow(target, window) {
      return !!target && !!target.QsWindow && target.QsWindow.window === window
    }

    function showTooltip(target, text) { dockWindow.showTooltip(target, text) }
    function hideTooltip(target) { dockWindow.hideTooltip(target) }
    function moduleWidgets(id) { return dockWindow.service.allSpaces() }

    function run(command) {
      if (command) Util.execDetached(String(command))
    }
  }

  // ------------------------------------------------------------ surface

  readonly property real sidePad: Math.max(0, Math.round((dockHeight - spaces.pillThickness) / 2))
  // Space between the workspace pill and the player / stats islands, and
  // from the screen edge in full-width mode.
  readonly property real islandGap: Style.space(10)
  readonly property real surfaceRadius: Style.cornerRadius <= 0 ? 0 : spaces.pillRadius + sidePad

  BorderSurface {
    id: dockSurface
    anchors.bottom: parent.bottom
    anchors.horizontalCenter: parent.horizontalCenter
    height: parent.height
    width: dockWindow.full ? parent.width : Math.min(parent.width, spaces.implicitWidth + dockWindow.sidePad * 2)
    radius: dockWindow.full ? 0 : dockWindow.surfaceRadius
    color: Color.bar.background
    borderSpec: Border.surfaceSpec("bar", "border", "transparent", 0)

    // The padding around the pills still takes right-click and the wheel.
    MouseArea {
      anchors.fill: parent
      acceptedButtons: Qt.RightButton
      onClicked: spaces.toggle()
      onWheel: function(wheel) { spaces.scrollBy(wheel.angleDelta.y || wheel.angleDelta.x) }
    }
  }

  // Player on the left and system stats on the right: separate pills beside
  // the centered dock, or the ends of the strip in full-width mode.
  PlayerIsland {
    id: playerIsland
    anchors.bottom: parent.bottom
    height: parent.height
    x: dockWindow.full ? dockWindow.islandGap : dockSurface.x - dockWindow.islandGap - width
    radius: dockWindow.surfaceRadius
    flat: dockWindow.full
    media: dockWindow.service.media
    spaces: spaces
    dock: dockWindow
  }

  StatsIsland {
    id: statsIsland
    anchors.bottom: parent.bottom
    height: parent.height
    x: dockWindow.full ? dockWindow.width - dockWindow.islandGap - width : dockSurface.x + dockSurface.width + dockWindow.islandGap
    radius: dockWindow.surfaceRadius
    flat: dockWindow.full
    stats: dockWindow.service.stats
    spaces: spaces
    dock: dockWindow
  }

  Spaces {
    id: spaces
    anchors.centerIn: dockSurface
    width: implicitWidth
    height: implicitHeight
    bar: dockBar
    service: dockWindow.service
    settings: dockWindow.service.settings
  }

  // ------------------------------------------------------------ tooltips

  // The bar's tooltip window only serves targets inside the bar, so the dock
  // keeps its own, shown above the hovered item.
  property Item tooltipTarget: null
  property string tooltipText: ""
  property bool tooltipShown: false

  function tooltipHovered(target) {
    return !!target && target.visible !== false && target.opacity !== 0 && target.tooltipHovered === true
  }

  function showTooltip(target, text) {
    if (!target || !text) return
    dockWindow.tooltipShown = false
    dockWindow.tooltipTarget = target
    dockWindow.tooltipText = String(text)
    tooltipTimer.restart()
  }

  function hideTooltip(target) {
    if (target && target !== dockWindow.tooltipTarget) return
    tooltipTimer.stop()
    dockWindow.tooltipShown = false
    dockWindow.tooltipTarget = null
    dockWindow.tooltipText = ""
  }

  Timer {
    id: tooltipTimer
    interval: 400
    onTriggered: {
      if (dockWindow.tooltipHovered(dockWindow.tooltipTarget)) dockWindow.tooltipShown = true
      else dockWindow.hideTooltip(dockWindow.tooltipTarget)
    }
  }

  Timer {
    interval: 100
    running: dockWindow.tooltipShown
    repeat: true
    onTriggered: if (!dockWindow.tooltipHovered(dockWindow.tooltipTarget)) dockWindow.hideTooltip(dockWindow.tooltipTarget)
  }

  PopupWindow {
    id: tooltipWindow

    visible: dockWindow.visible && dockWindow.tooltipShown && dockWindow.tooltipTarget !== null && dockWindow.tooltipText !== ""
    color: "transparent"
    implicitWidth: Math.ceil(tooltipBubble.implicitWidth)
    implicitHeight: Math.ceil(tooltipBubble.implicitHeight)

    anchor {
      id: tooltipAnchor
      window: dockWindow
      adjustment: PopupAdjustment.Slide
      edges: Edges.Top | Edges.Left
      gravity: Edges.Bottom | Edges.Right
      rect.width: 1
      rect.height: 1

      onAnchoring: {
        var target = dockWindow.tooltipTarget
        if (!target) return
        var localX = target.width / 2 - tooltipWindow.implicitWidth / 2
        var localY = -tooltipWindow.implicitHeight - 6
        var point = dockWindow.contentItem.mapFromItem(target, localX, localY)
        tooltipAnchor.rect.x = Math.round(point.x)
        tooltipAnchor.rect.y = Math.round(point.y)
      }
    }

    BorderSurface {
      id: tooltipBubble
      implicitWidth: tooltipLabel.implicitWidth + 20
      implicitHeight: tooltipLabel.implicitHeight + 14
      color: Color.tooltip.background
      borderSpec: Border.surfaceSpec("tooltip", "border", Color.tooltip.border, 1)
      radius: Style.cornerRadius

      Text {
        id: tooltipLabel
        anchors.centerIn: parent
        textFormat: Text.PlainText
        text: dockWindow.tooltipText
        color: Color.tooltip.text
        font.family: Style.font.family
        font.pixelSize: Style.font.body
        horizontalAlignment: Text.AlignHCenter
        verticalAlignment: Text.AlignVCenter
      }
    }
  }
}
