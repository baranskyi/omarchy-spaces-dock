import QtQuick
import Quickshell
import qs.Commons
import qs.Ui

// A narrow, frameless card above a dock ring with one ring per option,
// stacked top to bottom; the current option's ring is filled. Used for the
// battery's power profiles and the Stay Awake modes. Hover or the arrow keys
// show an option's name, click or Enter emits chosen(key), Esc closes.
Panel {
  id: root

  ipcTarget: ""
  manageIpc: false

  // The ring the card opens above.
  property Item anchor: null
  property int bottomMargin: 0
  property int ringSize: 40
  property bool active: true

  // [{ key, label, icon (glyph string) }], top to bottom.
  property var options: []
  property string current: ""
  // Caption with nothing hovered and no current option, and with no options.
  property string fallbackCaption: ""
  property string emptyCaption: ""
  // Keyboard or hover cursor; -1 for none.
  property int selectedIndex: -1
  // The option just chosen, shown as current until `current` catches up.
  property string pending: ""

  signal chosen(string key)

  readonly property string shownCurrent: pending !== "" ? pending : current

  // Popup content sits on the popup background, like the system panel.
  readonly property color foreground: bar ? bar.foreground : Color.popups.text
  readonly property string fontFamily: bar ? bar.fontFamily : Style.font.family

  readonly property string caption: {
    if (root.options.length === 0) return root.emptyCaption
    var shown = root.selectedIndex >= 0 && root.selectedIndex < root.options.length
      ? root.options[root.selectedIndex]
      : root.options.filter(function(o) { return o.key === root.shownCurrent })[0]
    return shown ? shown.label : root.fallbackCaption
  }

  // Wide enough for every label, so the card keeps its size while hovering.
  readonly property real captionWidth: {
    var labels = root.options.length === 0 ? [root.emptyCaption] : root.options.map(function(o) { return o.label })
    var width = captionMetrics.advanceWidth(root.fallbackCaption)
    for (var i = 0; i < labels.length; i++) width = Math.max(width, captionMetrics.advanceWidth(labels[i]))
    return Math.ceil(width)
  }

  function choose(key) {
    if (!key) return
    root.pending = key
    root.chosen(key)
    closeTimer.restart()
  }

  function moveCursor(delta) {
    if (delta === 0 || root.options.length === 0) return
    if (root.selectedIndex < 0) {
      var current = root.options.map(function(o) { return o.key }).indexOf(root.shownCurrent)
      root.selectedIndex = current >= 0 ? current : 0
      return
    }
    root.selectedIndex = Math.max(0, Math.min(root.options.length - 1, root.selectedIndex + delta))
  }

  function activateCursor() {
    if (root.selectedIndex >= 0 && root.selectedIndex < root.options.length)
      root.choose(root.options[root.selectedIndex].key)
  }

  visible: true
  implicitWidth: 0
  implicitHeight: 0

  onCurrentChanged: root.pending = ""

  onOpenedChanged: {
    if (opened) {
      closeTimer.stop()
      root.selectedIndex = -1
      root.pending = ""
      Qt.callLater(function() { keyCatcher.forceActiveFocus() })
    }
  }

  onActiveChanged: if (!active && opened) close()

  // Leaves the new choice on screen for a moment before closing.
  Timer {
    id: closeTimer
    interval: 350
    onTriggered: root.close()
  }

  FontMetrics {
    id: captionMetrics
    font.family: root.fontFamily
    font.pixelSize: Style.font.caption
    font.bold: true
  }

  KeyboardPanel {
    id: panel
    anchorItem: root.anchor
    owner: root
    bar: root.bar
    open: root.opened
    focusTarget: keyCatcher
    // Measured from the window edge; the dock floats bottomMargin above it.
    gap: Style.gapsOut + root.bottomMargin
    padding: Style.space(10)
    // No frame: the card reads as part of the dock, like its pills.
    borderSpec: Border.none()
    contentWidth: Math.ceil(content.implicitWidth) + panel.padding * 2 + Border.left(panel.borderSpec) + Border.right(panel.borderSpec)
    contentHeight: panel.fittedContentHeight(content.implicitHeight)

    PanelKeyCatcher {
      id: keyCatcher
      anchors.fill: parent
      onCloseRequested: root.close()
      onTabRequested: function(direction) { root.switchPanel(direction) }
      onMoveRequested: function(dx, dy) { root.moveCursor(dy !== 0 ? dy : dx) }
      onActivateRequested: root.activateCursor()

      Column {
        id: content
        anchors.horizontalCenter: parent.horizontalCenter
        spacing: Style.space(8)

        Text {
          anchors.horizontalCenter: parent.horizontalCenter
          width: Math.max(root.captionWidth, root.ringSize)
          horizontalAlignment: Text.AlignHCenter
          text: root.caption
          color: root.foreground
          opacity: 0.75
          font: captionMetrics.font
        }

        Repeater {
          model: root.options

          delegate: Item {
            id: option

            required property var modelData
            required property int index
            readonly property bool isCurrent: root.shownCurrent === modelData.key
            readonly property bool hasCursor: root.selectedIndex === index

            anchors.horizontalCenter: parent.horizontalCenter
            width: root.ringSize
            height: root.ringSize

            StatRing {
              anchors.fill: parent
              fraction: option.isCurrent ? 1 : -1
              color: root.foreground
              trackColor: Util.alpha(root.foreground, option.hasCursor ? 0.3 : 0.14)
              discColor: option.isCurrent ? Util.alpha(root.foreground, 0.16)
                : option.hasCursor ? Util.alpha(root.foreground, 0.08) : "transparent"
              glyph: option.modelData.icon
              glyphColor: root.foreground
              fontFamily: root.fontFamily
              dim: !option.isCurrent && !option.hasCursor
              scale: option.hasCursor ? 1.08 : 1
              Behavior on scale { NumberAnimation { duration: 120; easing.type: Easing.OutCubic } }
            }

            MouseArea {
              anchors.fill: parent
              hoverEnabled: true
              cursorShape: Qt.PointingHandCursor
              onContainsMouseChanged: {
                if (containsMouse) root.selectedIndex = option.index
                else if (root.selectedIndex === option.index) root.selectedIndex = -1
              }
              onClicked: root.choose(option.modelData.key)
            }
          }
        }
      }
    }
  }
}
