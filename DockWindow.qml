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
  property alias systemPanel: systemPanel
  property alias powerPanel: powerPanel
  property alias awakePanel: awakePanel

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
    Region { item: quickfileIsland }
    Region { item: playerIsland }
    Region { item: limitsIsland }
    Region { item: statsIsland }
    Region { item: controlsIsland }
    Region { item: awakeIsland }
  }

  // ------------------------------------------------------------ stand-in bar

  // Spaces and the shared Ui popups expect the bar facade third-party widgets
  // get (Ui/PluginBarApi.qml). This provides the members they read.
  QtObject {
    id: dockBar

    readonly property string position: "bottom"
    readonly property bool vertical: false
    readonly property int barSize: dockWindow.dockHeight
    // `foreground` is read by popup content (settings sliders, system panel),
    // which sits on the popup background; the dock itself uses barForeground.
    readonly property color foreground: Color.popups.text
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

  // ------------------------------------------------------------ pill order

  // The workspace pill (dockSurface) is always centered. The other pills sit
  // beside it in cfg.islandOrder and can be dragged to a new place.
  readonly property var islandItems: ({ quickfile: quickfileIsland, player: playerIsland, limits: limitsIsland, stats: statsIsland, controls: controlsIsland, awake: awakeIsland })
  readonly property var islandX: Model.islandLayout(
    cfg.islandOrder,
    { quickfile: quickfileIsland.width, player: playerIsland.width, limits: limitsIsland.width, stats: statsIsland.width, controls: controlsIsland.width, awake: awakeIsland.width },
    { x: dockSurface.x, width: dockSurface.width },
    islandGap, full, width)

  property string draggingId: ""
  property real dragX: 0
  property real dragStartX: 0

  function islandPos(id) {
    return dockWindow.draggingId === id ? dockWindow.dragX : (dockWindow.islandX[id] || 0)
  }

  // Drops the dragged pill before the first pill to the right of its center.
  function dropIsland(id) {
    var item = dockWindow.islandItems[id]
    var centers = { spaces: dockSurface.x + dockSurface.width / 2 }
    for (var key in dockWindow.islandItems) {
      if (key === id) continue
      centers[key] = (dockWindow.islandX[key] || 0) + dockWindow.islandItems[key].width / 2
    }
    var next = Model.reorderIslands(dockWindow.cfg.islandOrder, id, dockWindow.dragX + item.width / 2, centers)
    if (JSON.stringify(next) !== JSON.stringify(dockWindow.cfg.islandOrder))
      spaces.applySetting({ islandOrder: next })
    dockWindow.draggingId = ""
  }

  // A transparent layer over a pill that turns a horizontal left-button drag
  // into a move. It has to own the press to see the drag, so a press that
  // never moves past the drag threshold is handed on as a click: to the
  // deepest item under the pointer that defines leftClick(). Right and middle
  // buttons, hover and the wheel go straight to the pill underneath.
  component IslandDrag: MouseArea {
    id: dragLayer
    required property Item island
    required property string islandId

    property real pressSceneX: 0
    property bool dragging: false

    x: island.x
    y: island.y
    width: island.width
    height: island.height
    visible: island.visible
    z: 50
    acceptedButtons: Qt.LeftButton
    hoverEnabled: false
    preventStealing: true
    cursorShape: dragging ? Qt.ClosedHandCursor : undefined

    function sceneX(mouse) { return dragLayer.mapToItem(null, mouse.x, mouse.y).x }

    // Deepest item under (x, y) inside the pill that handles a left click.
    function clickTargetAt(x, y) {
      var found = null
      var item = dragLayer.island
      var px = x, py = y
      while (item) {
        var child = item.childAt(px, py)
        if (!child) break
        var p = item.mapToItem(child, px, py)
        px = p.x
        py = p.y
        item = child
        if (child.enabled && typeof child.leftClick === "function") found = child
      }
      return found
    }

    onPressed: function(mouse) {
      dragLayer.pressSceneX = dragLayer.sceneX(mouse)
      dragLayer.dragging = false
    }

    onPositionChanged: function(mouse) {
      var x = dragLayer.sceneX(mouse)
      if (!dragLayer.dragging && Math.abs(x - dragLayer.pressSceneX) >= Qt.styleHints.startDragDistance) {
        dragLayer.dragging = true
        dockWindow.hideTooltip(dockWindow.tooltipTarget)
        dockWindow.dragStartX = dragLayer.island.x
        dockWindow.dragX = dragLayer.island.x
        dockWindow.draggingId = dragLayer.islandId
      }
      if (dragLayer.dragging) dockWindow.dragX = dockWindow.dragStartX + x - dragLayer.pressSceneX
    }

    onReleased: function(mouse) {
      if (dragLayer.dragging) {
        dragLayer.dragging = false
        dockWindow.dropIsland(dragLayer.islandId)
        return
      }
      var target = dragLayer.clickTargetAt(mouse.x, mouse.y)
      if (target) target.leftClick()
    }

    onCanceled: {
      if (dragLayer.dragging && dockWindow.draggingId === dragLayer.islandId) dockWindow.draggingId = ""
      dragLayer.dragging = false
    }

    onWheel: function(wheel) { wheel.accepted = false }
  }

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

  // Player, AI limits, system stats, controls and Stay Awake: separate pills beside the centered
  // dock (or at the ends of the strip in full-width mode), placed by islandX.
  QuickfileIsland {
    id: quickfileIsland
    anchors.bottom: parent.bottom
    height: parent.height
    x: dockWindow.islandPos("quickfile")
    z: dockWindow.draggingId === "quickfile" ? 10 : 0
    Behavior on x { enabled: dockWindow.draggingId !== "quickfile" && spaces.dur > 0; NumberAnimation { duration: spaces.dur; easing.type: Easing.OutCubic } }
    radius: dockWindow.surfaceRadius
    flat: dockWindow.full
    service: dockWindow.service
    spaces: spaces
    dock: dockWindow
  }

  PlayerIsland {
    id: playerIsland
    anchors.bottom: parent.bottom
    height: parent.height
    x: dockWindow.islandPos("player")
    z: dockWindow.draggingId === "player" ? 10 : 0
    Behavior on x { enabled: dockWindow.draggingId !== "player" && spaces.dur > 0; NumberAnimation { duration: spaces.dur; easing.type: Easing.OutCubic } }
    radius: dockWindow.surfaceRadius
    flat: dockWindow.full
    media: dockWindow.service.media
    spaces: spaces
    dock: dockWindow
  }

  LimitsIsland {
    id: limitsIsland
    anchors.bottom: parent.bottom
    height: parent.height
    x: dockWindow.islandPos("limits")
    z: dockWindow.draggingId === "limits" ? 10 : 0
    Behavior on x { enabled: dockWindow.draggingId !== "limits" && spaces.dur > 0; NumberAnimation { duration: spaces.dur; easing.type: Easing.OutCubic } }
    radius: dockWindow.surfaceRadius
    flat: dockWindow.full
    limits: dockWindow.service.limits
    spaces: spaces
    dock: dockWindow
  }

  StatsIsland {
    id: statsIsland
    anchors.bottom: parent.bottom
    height: parent.height
    x: dockWindow.islandPos("stats")
    z: dockWindow.draggingId === "stats" ? 10 : 0
    Behavior on x { enabled: dockWindow.draggingId !== "stats" && spaces.dur > 0; NumberAnimation { duration: spaces.dur; easing.type: Easing.OutCubic } }
    radius: dockWindow.surfaceRadius
    flat: dockWindow.full
    stats: dockWindow.service.stats
    systemPanel: systemPanel
    powerPanel: powerPanel
    spaces: spaces
    dock: dockWindow
  }

  ControlsIsland {
    id: controlsIsland
    anchors.bottom: parent.bottom
    height: parent.height
    x: dockWindow.islandPos("controls")
    z: dockWindow.draggingId === "controls" ? 10 : 0
    Behavior on x { enabled: dockWindow.draggingId !== "controls" && spaces.dur > 0; NumberAnimation { duration: spaces.dur; easing.type: Easing.OutCubic } }
    radius: dockWindow.surfaceRadius
    flat: dockWindow.full
    audio: dockWindow.service.audio
    keyboard: dockWindow.service.keyboard
    screenName: dockWindow.screenName
    active: dockWindow.visible
    spaces: spaces
    dock: dockWindow
  }

  AwakeIsland {
    id: awakeIsland
    anchors.bottom: parent.bottom
    height: parent.height
    x: dockWindow.islandPos("awake")
    z: dockWindow.draggingId === "awake" ? 10 : 0
    Behavior on x { enabled: dockWindow.draggingId !== "awake" && spaces.dur > 0; NumberAnimation { duration: spaces.dur; easing.type: Easing.OutCubic } }
    radius: dockWindow.surfaceRadius
    flat: dockWindow.full
    service: dockWindow.service
    picker: awakePanel
    spaces: spaces
    dock: dockWindow
  }

  IslandDrag { island: quickfileIsland; islandId: "quickfile" }
  IslandDrag { island: playerIsland; islandId: "player" }
  IslandDrag { island: limitsIsland; islandId: "limits" }
  IslandDrag { island: statsIsland; islandId: "stats" }
  IslandDrag { island: controlsIsland; islandId: "controls" }
  IslandDrag { island: awakeIsland; islandId: "awake" }

  // CPU, memory, network and disk dashboard above the stats island.
  SystemPanel {
    id: systemPanel
    bar: dockBar
    anchor: statsIsland
    spaces: spaces
    bottomMargin: dockWindow.cfg.bottomMargin
    active: dockWindow.visible && statsIsland.shown
  }

  // Power profile picker above the battery ring.
  RingPicker {
    id: powerPanel
    moduleName: "io.github.baranskyi.spaces-dock.power"
    bar: dockBar
    anchor: statsIsland.batteryItem || statsIsland
    bottomMargin: dockWindow.cfg.bottomMargin
    ringSize: statsIsland.ringSize
    active: dockWindow.visible && statsIsland.shown && statsIsland.batteryItem !== null
    options: dockWindow.service.power.unavailable ? [] : dockWindow.service.power.profiles
    current: dockWindow.service.power.active
    fallbackCaption: "Power"
    emptyCaption: "No power profiles"
    onOpenedChanged: if (opened) dockWindow.service.power.refresh()
    onChosen: function(key) { dockWindow.service.power.set(key) }
  }

  // Stay Awake mode picker above its pill.
  RingPicker {
    id: awakePanel
    moduleName: "io.github.baranskyi.spaces-dock.awake"
    bar: dockBar
    anchor: awakeIsland.ringItem
    bottomMargin: dockWindow.cfg.bottomMargin
    ringSize: awakeIsland.ringSize
    active: dockWindow.visible && awakeIsland.shown
    options: Model.awakeOptions()
    current: dockWindow.service.awake.mode
    fallbackCaption: "Stay Awake"
    onChosen: function(key) { dockWindow.service.setAwakeMode(key) }
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
        // Multi-line tooltips (stats details, AI limits) read as columns.
        horizontalAlignment: dockWindow.tooltipText.indexOf("\n") !== -1 ? Text.AlignLeft : Text.AlignHCenter
        verticalAlignment: Text.AlignVCenter
      }
    }
  }
}
